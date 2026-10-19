import { formatPoints, groupName } from '../core/catalog';
import { worstLevel, type Diagnostic, type InterpretResult } from '../core/interpreter';
import { useCommandStore } from './commandStore';

const TITLES = {
  ok: { icon: '✔', title: 'Komenda poprawna' },
  info: { icon: 'ℹ', title: 'Komenda spoza zakresu symulatora' },
  warning: { icon: '⚠', title: 'Uwaga' },
  error: { icon: '✖', title: 'Błąd' },
} as const;

/** Tytuł błędu według rodzaju pierwszego błędu (SPEC 4.4). */
function errorTitle(code: string | undefined): string {
  if (code?.startsWith('E_SYNTAX')) return 'Błąd składni';
  if (code === 'E_STRICT_FORM' || code === 'E_GRAMMAR_AGREEMENT') return 'Niezgodność z formą kanoniczną (tryb ścisły)';
  if (code === 'E_RULE') return 'Komenda sprzeczna z regulaminem';
  if (code?.startsWith('E_PRECOND')) return 'Komenda niewykonalna';
  return TITLES.error.title;
}

function titleOf(result: InterpretResult) {
  const level = worstLevel(result);
  if (result.verdict === 'ignored') return { level, icon: '⚠', title: 'Nikt nie reaguje' };
  if (result.verdict === 'accepted' && level === 'warning') return { level, icon: '⚠', title: 'Komenda poprawna, z uwagą' };
  if (level === 'error') {
    const firstError = result.diagnostics.find((d) => d.level === 'error');
    return { level, icon: TITLES.error.icon, title: errorTitle(firstError?.code) };
  }
  return { level, ...TITLES[level] };
}

function DiagnosticItem({ diagnostic }: { diagnostic: Diagnostic }) {
  const points = formatPoints(diagnostic.points);
  return (
    <li className={`feedback__item feedback__item--${diagnostic.level}`} data-testid="feedback-message">
      <span className="feedback__message">{diagnostic.message}</span>
      {points && <span className="feedback__points">{points}</span>}
      <code className="feedback__code">{diagnostic.code}</code>
      {diagnostic.details.length > 0 && (
        <ul className="feedback__details">
          {diagnostic.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Panel informacji zwrotnej po komendzie (SPEC 3.4). */
export function FeedbackPanel() {
  const result = useCommandStore((s) => s.result);
  const setDraft = useCommandStore((s) => s.setDraft);
  if (!result) return null;

  const { level, icon, title } = titleOf(result);
  const { entry } = result;

  return (
    <section className={`feedback feedback--${level}`} data-testid="feedback" data-level={level} aria-live="polite">
      <header className="feedback__header">
        <span className="feedback__icon" aria-hidden="true">
          {icon}
        </span>
        <h2 className="feedback__title" data-testid="feedback-title">
          {title}
        </h2>
        {entry && (
          <span className="feedback__entry" data-testid="feedback-entry" title={entry.quote}>
            {result.verdict === 'rejected' ? 'Rozpoznano: ' : ''}
            {entry.id} · {entry.name} · {formatPoints(entry.points)}
          </span>
        )}
      </header>
      {result.verdict === 'accepted' && result.canonical && (
        <p className="feedback__canonical" data-testid="feedback-canonical">
          {result.diagnostics.some((d) => d.code === 'I_NORMALIZED') ? 'Zapisano jako: ' : 'Forma kanoniczna: '}
          <strong>{result.canonical}</strong>
        </p>
      )}
      {result.diagnostics.length > 0 && (
        <ul className="feedback__list">
          {result.diagnostics.map((diagnostic, index) => (
            <DiagnosticItem key={`${diagnostic.code}-${String(index)}`} diagnostic={diagnostic} />
          ))}
        </ul>
      )}
      {result.suggestion && (
        <div className="feedback__actions">
          <button
            type="button"
            className="feedback__use"
            data-testid="use-suggestion"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              if (result.suggestion) setDraft(result.suggestion);
            }}
          >
            Użyj: {result.suggestion}
          </button>
        </div>
      )}
      {result.verdict === 'accepted' && entry && (
        <p className="feedback__note">
          {groupName(entry.group)}: {entry.description} Wykonanie na placu pojawi się w kolejnym etapie (E2).
        </p>
      )}
    </section>
  );
}
