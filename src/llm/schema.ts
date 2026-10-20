import { REGULATION_POINT_COUNT } from '../core/regulation';

/** Odpowiedź LLM (SPEC 8.2), po walidacji. */
export interface Explanation {
  readonly explanation: string;
  /** Propozycja komendy — jeszcze niesprawdzona przez interpreter (zob. `suggestion.ts`). */
  readonly suggestion: string | null;
  readonly regulationPoints: readonly number[];
}

/** Schemat JSON odpowiedzi dla `output_config.format` (structured outputs). */
export const EXPLANATION_SCHEMA = {
  type: 'object',
  properties: {
    explanation: { type: 'string', description: 'Objaśnienie po polsku, najwyżej 3–4 zdania.' },
    suggestion: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Jedna poprawna komenda w formie kanonicznej z katalogu albo null.',
    },
    regulationPoints: { type: 'array', items: { type: 'integer' }, description: 'Numery punktów regulaminu.' },
  },
  required: ['explanation', 'suggestion', 'regulationPoints'],
  additionalProperties: false,
} as const;

const MAX_EXPLANATION = 2000;
const MAX_SUGGESTION = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walidacja pełnej odpowiedzi; `null`, gdy nie pasuje do schematu. */
export function parseExplanation(text: string): Explanation | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const { explanation, suggestion, regulationPoints } = data;
  if (typeof explanation !== 'string') return null;
  const trimmed = explanation.trim();
  if (trimmed === '' || trimmed.length > MAX_EXPLANATION) return null;
  if (suggestion !== null && typeof suggestion !== 'string') return null;
  if (typeof suggestion === 'string' && suggestion.length > MAX_SUGGESTION) return null;
  if (!Array.isArray(regulationPoints)) return null;
  const points = regulationPoints.filter(
    (p): p is number => typeof p === 'number' && Number.isInteger(p) && p >= 1 && p <= REGULATION_POINT_COUNT,
  );
  const proposal = typeof suggestion === 'string' && suggestion.trim() !== '' ? suggestion.trim() : null;
  return { explanation: trimmed, suggestion: proposal, regulationPoints: [...new Set(points)] };
}

const ESCAPES: Readonly<Record<string, string>> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };

/**
 * Objaśnienie z początku odpowiedzi, która jeszcze napływa (strumień): wartość pola `explanation`
 * odczytana do miejsca, w którym kończy się bufor. Niepełne sekwencje ucieczki są pomijane.
 */
export function partialExplanation(buffer: string): string {
  const start = /"explanation"\s*:\s*"/.exec(buffer);
  if (!start) return '';
  let out = '';
  for (let i = start.index + start[0].length; i < buffer.length; i++) {
    const c = buffer.charAt(i);
    if (c === '"') break;
    if (c !== '\\') {
      out += c;
      continue;
    }
    const next = buffer[i + 1];
    if (next === undefined) break;
    if (next === 'u') {
      const hex = buffer.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(Number.parseInt(hex, 16));
      i += 5;
    } else {
      out += ESCAPES[next] ?? next;
      i += 1;
    }
  }
  return out;
}
