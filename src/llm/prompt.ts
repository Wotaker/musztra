import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages/messages';
import { COMMANDS, formatPoints, GROUPS, OUT_OF_SCOPE, type CatalogEntry } from '../core/catalog';
import type { Diagnostic, InterpretResult } from '../core/interpreter';
import { MESSAGE_CODES } from '../core/messages';
import { REGULATION } from '../core/regulation';
import type { StatusSummary } from '../core/sim/describe';
import { EXPLANATION_SCHEMA } from './schema';

/** Model domyślny (SPEC 8.2): szybki i tani. */
export const MODEL = 'claude-haiku-5-5';
/** Limit czasu całego wywołania, łącznie ze strumieniem (SPEC 8.2). */
export const TIMEOUT_MS = 15_000;
const MAX_TOKENS = 2048;

/** Dane do objaśnienia: werdykt interpretera i stan drużyny, w którym komenda została podana. */
export interface ExplainRequest {
  readonly result: InterpretResult;
  readonly status: StatusSummary;
  readonly squadName: string;
  readonly squadSize: number;
}

const INSTRUCTIONS = `Jesteś instruktorem musztry w aplikacji „Interpreter Języka Musztry”. Użytkownik (podchorąży) dowodzi drużyną — musztra zespołowa bez broni — wpisując komendy. Deterministyczny interpreter sprawdził komendę według dokumentu „${REGULATION.title}” (${REGULATION.signature}) i wydał werdykt. Werdykt interpretera jest ostateczny: nie podważaj go i nie oceniaj poprawności inaczej niż interpreter.

Twoje zadania:
1. Objaśnij werdykt prostym językiem: co jest nie tak (albo dlaczego jest uwaga), dlaczego tak mówi regulamin i jak to poprawić. Powołuj się na punkty regulaminu w zapisie „pkt N”.
2. Gdy interpreter nie rozpoznał komendy (E_SYNTAX_UNKNOWN), rozpoznaj intencję: odgadnij, o którą komendę z katalogu chodziło użytkownikowi, i powiedz to wprost („Prawdopodobnie chodziło o …”).
3. Zaproponuj jedną komendę (pole „suggestion”), która realizuje zamiar użytkownika i jest wykonalna w obecnym stanie drużyny — dokładnie w formie kanonicznej z katalogu (pierwsza litera wielka, zapowiedź małymi, myślnik „–” ze spacjami, HASŁO wielkimi). Jeśli najpierw potrzebna jest inna komenda (np. „BACZNOŚĆ” przed zwrotem), zaproponuj tę pierwszą. Gdy nie masz pewnej propozycji, wpisz null. Propozycja zostanie sprawdzona przez interpreter, a niepoprawna odrzucona.

Zasady:
- Opieraj się wyłącznie na katalogu komend poniżej i na regulaminie. Nie wymyślaj komend, haseł ani punktów regulaminu.
- Pisz po polsku, do użytkownika w drugiej osobie, zwięźle: pole „explanation” ma najwyżej 3–4 zdania zwykłego tekstu, bez Markdown i list.
- Przy niepewności powiedz to wprost zamiast zgadywać.
- Pole „regulationPoints”: numery punktów regulaminu (liczby całkowite, np. 11, 22), na których opierasz objaśnienie — tylko punkty podane w katalogu przy danej komendzie lub w komunikacie interpretera.
- Odpowiadasz wyłącznie obiektem JSON { "explanation", "suggestion", "regulationPoints" }.

Konwencje (pkt 10, 11): komenda składa się z zapowiedzi i hasła oddzielonych myślnikiem, np. „W prawo – ZWROT”; zapowiedź może poprzedzać adresat („Pierwsza drużyna, …”). Każda komenda z zapowiedzią podana drużynie stojącej w szyku wymaga postawy zasadniczej (najpierw „BACZNOŚĆ”); wyjątki: komendy z samego hasła, wezwanie i zbiórki. W marszu ta reguła nie obowiązuje. Tryb łagodny wybacza drobne różnice zapisu (wielkość liter, myślnik, polskie znaki, cyfry), tryb ścisły wymaga formy kanonicznej.`;

function entryText(entry: CatalogEntry): string {
  const lines = [`${entry.id} ${entry.name} (${formatPoints(entry.points)})`];
  if (entry.forms.length > 0) lines.push(`  Formy kanoniczne: ${entry.forms.map((f) => `„${f}”`).join(' | ')}`);
  else lines.push(`  Przykłady: ${entry.examples.map((e) => `„${e.text}”`).join(' | ')}`);
  lines.push(`  Wzorzec: ${entry.pattern}`);
  lines.push(`  Opis: ${entry.description}`);
  if (entry.group !== 'N') {
    lines.push(`  Warunki: ${entry.preconditions}`);
    lines.push(`  Efekt: ${entry.effect}`);
  }
  lines.push(`  Regulamin: „${entry.quote}”`);
  return lines.join('\n');
}

function catalogText(): string {
  const sections = GROUPS.map((group) => {
    const entries = [...COMMANDS, ...OUT_OF_SCOPE].filter((e) => e.group === group.id);
    return `### ${group.id}. ${group.name}\n\n${entries.map(entryText).join('\n\n')}`;
  });
  const codes = Object.entries(MESSAGE_CODES)
    .map(([code, { level, summary }]) => `- ${code} (${level === 'error' ? 'błąd' : level === 'warning' ? 'uwaga' : 'informacja'}): ${summary}`)
    .join('\n');
  return `## Katalog komend symulatora\n\nKomendy z grupy „Poza MVP” istnieją w regulaminie, ale symulator ich nie wykonuje — nie proponuj ich.\n\n${sections.join('\n\n')}\n\n## Kody komunikatów interpretera\n\n${codes}`;
}

let cachedSystem: string | null = null;

/** Prompt systemowy: rola, zasady i katalog komend. Stały, więc trafia w cache (prompt caching). */
export function systemPrompt(): string {
  cachedSystem ??= `${INSTRUCTIONS}\n\n${catalogText()}`;
  return cachedSystem;
}

const VERDICTS: Readonly<Record<InterpretResult['verdict'], string>> = {
  accepted: 'komenda przyjęta i wykonana',
  rejected: 'komenda odrzucona — stan drużyny bez zmian',
  ignored: 'komenda poprawna, ale nikt nie reaguje',
  out_of_scope: 'komenda z regulaminu, ale spoza zakresu symulatora',
};

const LEVELS = { error: 'błąd', warning: 'uwaga', info: 'informacja' } as const;

function diagnosticText(result: InterpretResult, d: Diagnostic): string {
  const fragment = d.span && d.span.end > d.span.start ? ` — dotyczy fragmentu „${result.input.slice(d.span.start, d.span.end)}”` : '';
  const points = d.points.length > 0 ? ` (${formatPoints(d.points)})` : '';
  const details = d.details.map((detail) => `\n    · ${detail}`).join('');
  return `- [${d.code}, ${LEVELS[d.level]}] ${d.message}${points}${fragment}${details}`;
}

const soldiersWord = (n: number) => (n === 1 ? 'żołnierz' : 'żołnierzy');

/** Wiadomość użytkownika: zmienna część zapytania, po stałym prefiksie. */
export function userPrompt(request: ExplainRequest): string {
  const { result, status } = request;
  const unknown = result.diagnostics.some((d) => d.code === 'E_SYNTAX_UNKNOWN');
  const hasError = result.verdict === 'rejected' || result.diagnostics.some((d) => d.level === 'error');
  const stateParts = [
    `szyk: ${status.formation}`,
    `postawa: ${status.posture}`,
    `ruch: ${status.motion}`,
    status.facing === null ? null : `front ${String(status.facing)}°`,
    status.activity ? `w toku: ${status.activity}` : null,
    status.flags.length > 0 ? `oznaczenia: ${status.flags.join(', ')}` : null,
  ].filter((part): part is string => part !== null);
  const recognized = result.entry
    ? `${result.entry.id} ${result.entry.name} (${formatPoints(result.entry.points)})`
    : 'nie rozpoznano komendy z katalogu';
  const task = unknown
    ? 'Zadanie: Rozpoznaj intencję — interpreter nie rozpoznał komendy. Odgadnij, o którą komendę z katalogu chodziło, objaśnij jej budowę i zaproponuj ją w formie kanonicznej (jeśli jest wykonalna w obecnym stanie).'
    : hasError
      ? 'Zadanie: Objaśnij błąd i jak go poprawić; zaproponuj poprawną komendę.'
      : 'Zadanie: Objaśnij uwagę interpretera — komenda została wykonana, ale z niedociągnięciem — i powiedz, jak zrobić to lepiej.';

  return [
    `Wpisana komenda: „${result.input}”`,
    `Tryb zapisu: ${result.mode === 'strict' ? 'ścisły' : 'łagodny'}`,
    `Werdykt interpretera: ${VERDICTS[result.verdict]}`,
    `Rozpoznana komenda: ${recognized}`,
    result.canonical ? `Forma kanoniczna rozpoznanej komendy: „${result.canonical}”` : null,
    `Komunikaty interpretera:\n${result.diagnostics.map((d) => diagnosticText(result, d)).join('\n') || '- brak'}`,
    `Stan drużyny w chwili komendy: ${request.squadName}, ${String(request.squadSize)} ${soldiersWord(request.squadSize)}; ${stateParts.join('; ')}.`,
    task,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

/** Parametry wywołania Messages API (bez klucza — ten trafia wyłącznie do nagłówka). */
export function messageParams(request: ExplainRequest): MessageCreateParamsBase {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt(request) }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: EXPLANATION_SCHEMA } },
  };
}
