import Anthropic from '@anthropic-ai/sdk';
import { messageParams, TIMEOUT_MS, type ExplainRequest } from './prompt';
import { parseExplanation, partialExplanation, type Explanation } from './schema';

/**
 * Klient LLM (SPEC 8.2–8.3): wywołanie Messages API bezpośrednio z przeglądarki kluczem użytkownika.
 * Klucz trafia wyłącznie do nagłówka żądania do api.anthropic.com — nigdy do adresu URL, logów
 * ani komunikatów błędów. Każdy błąd zamieniany jest na zrozumiały komunikat po polsku.
 */

export type LlmErrorKind =
  | 'auth'
  | 'permission'
  | 'billing'
  | 'rate_limit'
  | 'overloaded'
  | 'model'
  | 'network'
  | 'timeout'
  | 'invalid_response'
  | 'refusal'
  | 'aborted'
  | 'unknown';

export const LLM_ERROR_MESSAGES: Readonly<Record<LlmErrorKind, string>> = {
  auth: 'Klucz API jest nieprawidłowy albo nieaktywny. Sprawdź go w ustawieniach (⚙) — klucz z Claude Console zaczyna się od „sk-ant-”.',
  permission: 'Ten klucz API nie ma uprawnień do wybranego modelu. Sprawdź ustawienia klucza w Claude Console.',
  billing: 'Brak środków na koncie API albo osiągnięto limit wydatków. Sprawdź „Billing” i „Limits” w Claude Console.',
  rate_limit: 'Przekroczono limit zapytań API. Odczekaj chwilę i spróbuj ponownie.',
  overloaded: 'Usługa Anthropic jest chwilowo przeciążona lub niedostępna. Spróbuj ponownie za chwilę.',
  model: 'Model nie jest dostępny dla tego klucza API.',
  network: 'Brak połączenia z api.anthropic.com. Sprawdź połączenie z internetem i spróbuj ponownie.',
  timeout: `Model nie odpowiedział w ciągu ${String(TIMEOUT_MS / 1000)} s — przekroczony czas oczekiwania. Spróbuj ponownie.`,
  invalid_response: 'Model zwrócił odpowiedź w nieoczekiwanym formacie. Spróbuj ponownie.',
  refusal: 'Model odmówił odpowiedzi na to pytanie.',
  aborted: 'Objaśnianie przerwane.',
  unknown: 'Nie udało się uzyskać objaśnienia. Spróbuj ponownie.',
};

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  constructor(kind: LlmErrorKind) {
    super(LLM_ERROR_MESSAGES[kind]);
    this.name = 'LlmError';
    this.kind = kind;
  }
}

export interface ExplainOptions {
  readonly apiKey: string;
  /** Własna implementacja `fetch` (testy z zamockowanym API). */
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
  /** Przerwanie z zewnątrz, np. gdy użytkownik wydał nową komendę. */
  readonly signal?: AbortSignal;
  /** Objaśnienie odczytane z dotychczasowej części strumienia. */
  readonly onText?: (explanation: string) => void;
}

function errorKind(error: unknown): LlmErrorKind {
  if (error instanceof Anthropic.AuthenticationError) return 'auth';
  if (error instanceof Anthropic.PermissionDeniedError) return 'permission';
  if (error instanceof Anthropic.NotFoundError) return 'model';
  if (error instanceof Anthropic.RateLimitError) return 'rate_limit';
  if (error instanceof Anthropic.APIConnectionError) return 'network';
  if (error instanceof Anthropic.APIError) {
    const type = (error.error as { error?: { type?: string } } | undefined)?.error?.type;
    if (error.status === 402 || type === 'billing_error') return 'billing';
    // Brak środków API zgłasza jako 400 z opisem w treści błędu.
    if (error.status === 400 && /credit balance|billing|spend limit/i.test(error.message)) return 'billing';
    if (type === 'overloaded_error' || type === 'api_error' || (error.status !== undefined && error.status >= 500)) return 'overloaded';
    if (type === 'rate_limit_error') return 'rate_limit';
    if (type === 'authentication_error') return 'auth';
  }
  if (error instanceof TypeError) return 'network';
  return 'unknown';
}

const TIMEOUT_REASON = 'timeout';

/** Objaśnienie werdyktu interpretera przez LLM (odpowiedź strumieniowa, wynik walidowany schematem). */
export async function explain(request: ExplainRequest, options: ExplainOptions): Promise<Explanation> {
  const apiKey = options.apiKey.trim();
  if (apiKey === '') throw new LlmError('auth');

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    logLevel: 'off',
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(TIMEOUT_REASON);
  }, options.timeoutMs ?? TIMEOUT_MS);
  const onAbort = () => {
    controller.abort();
  };
  options.signal?.addEventListener('abort', onAbort);

  let text = '';
  try {
    if (options.signal?.aborted) throw new LlmError('aborted');
    const stream = client.messages.stream(messageParams(request), { signal: controller.signal });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        options.onText?.(partialExplanation(text));
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === 'refusal') throw new LlmError('refusal');
    const parsed = parseExplanation(text);
    if (!parsed) throw new LlmError('invalid_response');
    return parsed;
  } catch (error) {
    if (error instanceof LlmError) throw error;
    if (controller.signal.reason === TIMEOUT_REASON) throw new LlmError('timeout');
    if (options.signal?.aborted) throw new LlmError('aborted');
    throw new LlmError(errorKind(error));
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
