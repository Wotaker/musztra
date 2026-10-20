import { describe, expect, it } from 'vitest';
import { COMMANDS, OUT_OF_SCOPE } from '../../src/core/catalog';
import { interpret } from '../../src/core/interpreter';
import { MESSAGE_CODES } from '../../src/core/messages';
import { runScript } from '../../src/core/script';
import { describeStatus } from '../../src/core/sim/describe';
import { MODEL, messageParams, systemPrompt, userPrompt, type ExplainRequest } from '../../src/llm/prompt';

// Prompt LLM (SPEC 8.2): katalog komend jako stały prefiks z prompt caching, werdykt interpretera
// i skrócony opis stanu w wiadomości użytkownika.

function request(steps: readonly string[], input: string): ExplainRequest {
  const run = runScript(steps);
  const result = interpret(input, { mode: 'lenient', squad: 1, state: run.state, historyLength: run.session.history.length });
  return { result, status: describeStatus(run.state), squadName: 'Pierwsza drużyna', squadSize: run.state.soldiers.length };
}

describe('prompt systemowy', () => {
  const system = systemPrompt();

  it('zawiera cały katalog komend z danych (jedno źródło) i punkty regulaminu', () => {
    for (const entry of COMMANDS) {
      expect(system).toContain(`${entry.id} ${entry.name}`);
      for (const form of entry.forms) expect(system).toContain(form);
      expect(system).toContain(entry.preconditions);
    }
    for (const entry of OUT_OF_SCOPE) expect(system).toContain(entry.name);
  });

  it('opisuje kody komunikatów interpretera', () => {
    for (const code of Object.keys(MESSAGE_CODES)) expect(system).toContain(code);
  });

  it('wyznacza rolę i zasady: werdykt interpretera jest ostateczny, po polsku, 3–4 zdania, bez wymyślania komend', () => {
    expect(system).toMatch(/instruktor/i);
    expect(system).toMatch(/nie wymyślaj/i);
    expect(system).toMatch(/po polsku/i);
    expect(system).toMatch(/3–4 zda/);
    expect(system).toMatch(/ostateczn/);
    expect(system).toMatch(/niepewn/i);
  });

  it('jest stały — bez stanu i czasu, żeby prefiks trafiał w cache', () => {
    expect(systemPrompt()).toBe(system);
    expect(system).not.toContain('Wpisana komenda');
  });
});

describe('wiadomość użytkownika', () => {
  it('zawiera wpisany tekst, werdykt, kody, komunikaty i stan drużyny', () => {
    const req = request(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'SPOCZNIJ'], 'W prawo – ZWROT');
    const text = userPrompt(req);
    expect(text).toContain('„W prawo – ZWROT”');
    expect(text).toContain('E_PRECOND_POSTURE');
    expect(text).toContain(req.result.diagnostics[0]?.message ?? '—');
    expect(text).toContain('szereg');
    expect(text).toContain('swobodna');
    expect(text).toContain('Pierwsza drużyna');
    expect(text).toContain('9 żołnierzy');
    expect(text).toContain('Z-1');
    expect(text).not.toMatch(/Rozpoznaj intencję/);
  });

  it('przy E_SYNTAX_UNKNOWN prosi o rozpoznanie intencji', () => {
    const req = request([], 'drużyno stańcie ładnie w linii');
    expect(req.result.diagnostics[0]?.code).toBe('E_SYNTAX_UNKNOWN');
    expect(userPrompt(req)).toMatch(/Rozpoznaj intencję/);
  });

  it('przy uwadze prosi o objaśnienie uwagi', () => {
    const req = request(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'Drużyna, kierunek na wprost – MARSZ'], 'STÓJ');
    expect(req.result.verdict).toBe('accepted');
    const text = userPrompt(req);
    expect(text).toContain('W_MISSING_ADDRESSEE');
    expect(text).toMatch(/uwag/i);
  });
});

describe('parametry wywołania', () => {
  const params = messageParams(request([], 'W prawo – ZWROT'));

  it('domyślny model claude-haiku-5-5, odpowiedź strumieniowa w JSON według schematu', () => {
    expect(MODEL).toBe('claude-haiku-5-5');
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config?.format?.type).toBe('json_schema');
    expect(params.max_tokens).toBeGreaterThanOrEqual(1024);
  });

  it('katalog w prompcie systemowym z prompt caching', () => {
    const system = params.system;
    expect(Array.isArray(system)).toBe(true);
    if (!Array.isArray(system)) return;
    expect(system).toHaveLength(1);
    expect(system[0]?.text).toBe(systemPrompt());
    expect(system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('jedna wiadomość użytkownika ze zmienną treścią po prefiksie', () => {
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]?.role).toBe('user');
  });
});
