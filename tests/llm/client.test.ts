import { describe, expect, it, vi } from 'vitest';
import { interpret } from '../../src/core/interpreter';
import { runScript } from '../../src/core/script';
import { describeStatus } from '../../src/core/sim/describe';
import { explain, LlmError, type LlmErrorKind } from '../../src/llm/client';
import { TIMEOUT_MS, type ExplainRequest } from '../../src/llm/prompt';
import { errorBody, explanationBody, FAKE_API_KEY, sseBody } from '../../e2e/support/anthropicMock';

// Klient LLM (SPEC 8.2–8.3) wyłącznie z zamockowanym API: strumień, błędy, limit czasu, bezpieczeństwo klucza.

const run = runScript(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'SPOCZNIJ']);
const request: ExplainRequest = {
  result: interpret('W prawo – ZWROT', { mode: 'lenient', squad: 1, state: run.state, historyLength: 2 }),
  status: describeStatus(run.state),
  squadName: 'Pierwsza drużyna',
  squadSize: 9,
};

const answer = {
  explanation: 'Drużyna stoi w postawie swobodnej, a zwrot wymaga postawy zasadniczej (pkt 11). Podaj najpierw „BACZNOŚĆ”.',
  suggestion: 'BACZNOŚĆ',
  regulationPoints: [11, 22],
};

type FetchArgs = [input: string | URL | Request, init?: RequestInit];

function respond(body: string, status = 200, contentType = 'text/event-stream') {
  return vi.fn((..._args: FetchArgs) => Promise.resolve(new Response(body, { status, headers: { 'content-type': contentType } })));
}

/** fetch, który nie odpowiada, dopóki żądanie nie zostanie przerwane. */
function hanging() {
  return vi.fn((_input: FetchArgs[0], init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  });
}

/** Strumień, który wysyła początek odpowiedzi i zawiesza się. */
function stalled() {
  return vi.fn((_input: FetchArgs[0], init?: RequestInit) => {
    const head = sseBody('{"explanation":"Począ').split('event: content_block_stop')[0] ?? '';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(head));
        init?.signal?.addEventListener('abort', () => {
          controller.error(new DOMException('The operation was aborted.', 'AbortError'));
        });
      },
    });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  });
}

async function failure(promise: Promise<unknown>): Promise<LlmError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof LlmError) return error;
    throw error;
  }
  throw new Error('Oczekiwano błędu LlmError');
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

describe('wywołanie API z przeglądarki', () => {
  it('wysyła żądanie strumieniowe do api.anthropic.com z nagłówkiem dla przeglądarki; klucz tylko w nagłówku', async () => {
    const fetch = respond(explanationBody(answer));
    await explain(request, { apiKey: FAKE_API_KEY, fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [input, init] = fetch.mock.calls[0] ?? [];
    const url = String(input instanceof Request ? input.url : input);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(url).not.toContain(FAKE_API_KEY);
    expect(headerOf(init, 'x-api-key')).toBe(FAKE_API_KEY);
    expect(headerOf(init, 'anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(headerOf(init, 'anthropic-version')).toBeTruthy();
    const sent = typeof init?.body === 'string' ? init.body : '';
    const body = JSON.parse(sent) as { model: string; stream: boolean };
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.stream).toBe(true);
    expect(sent).not.toContain(FAKE_API_KEY);
  });

  it('strumieniuje objaśnienie i zwraca zwalidowany wynik', async () => {
    const fetch = respond(explanationBody(answer, { chunks: 8 }));
    const partials: string[] = [];
    const result = await explain(request, {
      apiKey: FAKE_API_KEY,
      fetch,
      onText: (text) => partials.push(text),
    });
    expect(result).toEqual(answer);
    expect(partials.length).toBeGreaterThan(2);
    for (const partial of partials) expect(answer.explanation.startsWith(partial)).toBe(true);
    expect(partials[partials.length - 1]).toBe(answer.explanation);
  });

  it('domyślny limit czasu to 15 s', () => {
    expect(TIMEOUT_MS).toBe(15_000);
  });
});

describe('błędy jako zrozumiały komunikat po polsku', () => {
  const cases: readonly [string, () => ReturnType<typeof vi.fn>, LlmErrorKind, RegExp][] = [
    ['zły klucz (401)', () => respond(errorBody('authentication_error', 'invalid x-api-key'), 401, 'application/json'), 'auth', /klucz/i],
    ['brak uprawnień (403)', () => respond(errorBody('permission_error', 'not allowed'), 403, 'application/json'), 'permission', /uprawnie|dostęp/i],
    ['brak środków (400)', () => respond(errorBody('invalid_request_error', 'Your credit balance is too low to access the Anthropic API.'), 400, 'application/json'), 'billing', /środk|limit wydatków/i],
    ['limit zapytań (429)', () => respond(errorBody('rate_limit_error', 'rate limited'), 429, 'application/json'), 'rate_limit', /limit/i],
    ['przeciążenie (529)', () => respond(errorBody('overloaded_error', 'Overloaded'), 529, 'application/json'), 'overloaded', /przeciąż|niedostępn/i],
    ['błąd serwera (500)', () => respond(errorBody('api_error', 'Internal'), 500, 'application/json'), 'overloaded', /przeciąż|niedostępn/i],
    ['model niedostępny (404)', () => respond(errorBody('not_found_error', 'model: claude-haiku-5-5'), 404, 'application/json'), 'model', /model/i],
    ['brak sieci', () => vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))), 'network', /połączeni|internet/i],
    ['odpowiedź nie w formacie JSON', () => respond(sseBody('To nie jest JSON.')), 'invalid_response', /nieoczekiwanym formacie/i],
    ['odmowa modelu', () => respond(sseBody('', { stopReason: 'refusal' })), 'refusal', /odmówił|nie udzielił/i],
  ];

  it.each(cases)('%s', async (_name, makeFetch, kind, pattern) => {
    const fetch = makeFetch();
    const error = await failure(explain(request, { apiKey: FAKE_API_KEY, fetch }));
    expect(error.kind).toBe(kind);
    expect(error.message).toMatch(pattern);
    expect(error.message).not.toContain(FAKE_API_KEY);
    expect(error.message).not.toMatch(/[a-z]+_error/);
  });

  it('nie ponawia nieudanego żądania (limit czasu obejmuje jedno wywołanie)', async () => {
    const fetch = respond(errorBody('overloaded_error', 'Overloaded'), 529, 'application/json');
    await failure(explain(request, { apiKey: FAKE_API_KEY, fetch }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('przekroczony czas oczekiwania na odpowiedź', async () => {
    const error = await failure(explain(request, { apiKey: FAKE_API_KEY, fetch: hanging(), timeoutMs: 50 }));
    expect(error.kind).toBe('timeout');
    expect(error.message).toMatch(/15 s|czas/);
  });

  it('przekroczony czas w trakcie strumienia', async () => {
    const partials: string[] = [];
    const error = await failure(
      explain(request, { apiKey: FAKE_API_KEY, fetch: stalled(), timeoutMs: 80, onText: (t) => partials.push(t) }),
    );
    expect(error.kind).toBe('timeout');
    expect(partials).toContain('Począ');
  });

  it('przerwanie przez użytkownika (nowa komenda) nie jest zgłaszane jako błąd sieci', async () => {
    const controller = new AbortController();
    const pending = explain(request, { apiKey: FAKE_API_KEY, fetch: hanging(), signal: controller.signal });
    controller.abort();
    const error = await failure(pending);
    expect(error.kind).toBe('aborted');
  });

  it('pusty klucz — błąd bez wywołania API', async () => {
    const fetch = respond(explanationBody(answer));
    const error = await failure(explain(request, { apiKey: '  ', fetch }));
    expect(error.kind).toBe('auth');
    expect(fetch).not.toHaveBeenCalled();
  });
});
