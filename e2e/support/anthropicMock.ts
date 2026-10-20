// Atrapa odpowiedzi Anthropic Messages API (strumień SSE) — wspólna dla testów Vitest i Playwright.
// Testy LLM działają wyłącznie z zamockowanym API (CLAUDE.md); klucz w testach jest fikcyjny.

export const FAKE_API_KEY = 'sk-ant-test-0000-fikcyjny-klucz';

export interface MockExplanation {
  readonly explanation: string;
  readonly suggestion: string | null;
  readonly regulationPoints: readonly number[];
}

function event(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Strumień SSE z tekstem odpowiedzi podzielonym na fragmenty `chunks` (jak `text_delta`). */
export function sseBody(text: string, options: { chunks?: number; stopReason?: string } = {}): string {
  const parts: string[] = [];
  const count = Math.max(1, options.chunks ?? 4);
  const size = Math.ceil(text.length / count);
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return [
    event('message_start', {
      type: 'message_start',
      message: {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-haiku-5-5',
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }),
    event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }),
    ...parts.map((part) =>
      event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: part } }),
    ),
    event('content_block_stop', { type: 'content_block_stop', index: 0 }),
    event('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: options.stopReason ?? 'end_turn', stop_sequence: null },
      usage: { output_tokens: 40 },
    }),
    event('message_stop', { type: 'message_stop' }),
  ].join('');
}

export function explanationBody(explanation: MockExplanation, options: { chunks?: number } = {}): string {
  return sseBody(JSON.stringify(explanation), options);
}

/** Treść błędu API w formacie Anthropic. */
export function errorBody(type: string, message: string): string {
  return JSON.stringify({ type: 'error', error: { type, message }, request_id: 'req_test' });
}
