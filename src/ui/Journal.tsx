import { useEffect, useRef, useState } from 'react';
import type { JournalEntry } from '../core/session';
import { useCommandStore } from './commandStore';
import { useSimStore } from './simStore';
import { useViewStore } from './store';

const COLLAPSED_KEY = 'musztra.journalCollapsed';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveCollapsed(value: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    // Brak dostępu do pamięci przeglądarki: stan panelu do zamknięcia strony.
  }
}

const ICONS = { ok: '✔', warning: '⚠', error: '✖', info: 'ℹ' } as const;

/** Czas symulacji jako mm:ss. */
function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

type Row =
  | { readonly kind: 'command'; readonly entry: Extract<JournalEntry, { kind: 'command' }> }
  | { readonly kind: 'report'; readonly entry: Extract<JournalEntry, { kind: 'report' }> }
  | { readonly kind: 'note'; readonly entry: Extract<JournalEntry, { kind: 'note' }> }
  | { readonly kind: 'count'; readonly id: number; readonly time: number; readonly items: readonly Extract<JournalEntry, { kind: 'report' }>[] };

/** Kolejne liczby z jednego odliczania łączone w jeden wpis — Dziennik pozostaje czytelny. */
function rows(journal: readonly JournalEntry[]): Row[] {
  const result: Row[] = [];
  for (const entry of journal) {
    if (entry.kind === 'command') {
      result.push({ kind: 'command', entry });
      continue;
    }
    if (entry.kind === 'note') {
      result.push({ kind: 'note', entry });
      continue;
    }
    if (entry.reportKind === 'count') {
      const last = result[result.length - 1];
      if (last?.kind === 'count') {
        result[result.length - 1] = { ...last, items: [...last.items, entry] };
      } else {
        result.push({ kind: 'count', id: entry.id, time: entry.time, items: [entry] });
      }
      continue;
    }
    result.push({ kind: 'report', entry });
  }
  return result;
}

/** Dziennik (SPEC 3.6): komendy z ikoną wyniku, meldunki i odzywki; klik w komendę wstawia ją do wiersza. */
export function Journal() {
  const journal = useSimStore((s) => s.session.journal);
  const setDraft = useCommandStore((s) => s.setDraft);
  const setFocusMode = useViewStore((s) => s.setFocusMode);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [journal, collapsed]);

  const items = rows(journal);

  return (
    <aside className={`journal${collapsed ? ' journal--collapsed' : ''}`} data-testid="journal" aria-label="Dziennik">
      <button
        type="button"
        className="journal__header"
        aria-expanded={!collapsed}
        data-testid="journal-toggle"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          setCollapsed(!collapsed);
          saveCollapsed(!collapsed);
        }}
      >
        <span className="journal__title">Dziennik</span>
        <span className="journal__count">{journal.length}</span>
        <span className="journal__chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {!collapsed && (
        <ol className="journal__list" ref={listRef}>
          {items.length === 0 && <li className="journal__empty">Tu pojawią się komendy i meldunki żołnierzy.</li>}
          {items.map((row) => {
            if (row.kind === 'command') {
              const { entry } = row;
              const text = entry.level === 'error' ? entry.input : (entry.canonical ?? entry.input);
              return (
                <li key={entry.id} className={`journal__item journal__item--${entry.level}`} data-testid="journal-command">
                  <time className="journal__time">{clock(entry.time)}</time>
                  <button
                    type="button"
                    className="journal__command"
                    title="Wstaw do wiersza poleceń"
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      setDraft(text);
                      setFocusMode('command');
                    }}
                  >
                    <span className="journal__icon" aria-hidden="true">
                      {ICONS[entry.level]}
                    </span>
                    <span className="journal__text">{text}</span>
                    {entry.note && <code className="journal__note">{entry.note}</code>}
                  </button>
                </li>
              );
            }
            if (row.kind === 'count') {
              return (
                <li key={row.id} className="journal__item journal__item--count" data-testid="journal-count">
                  <time className="journal__time">{clock(row.time)}</time>
                  <span className="journal__report">
                    <span className="journal__speech" aria-hidden="true" />
                    Odliczanie: {row.items.map((r) => `${r.soldier} ${r.text}`).join(' · ')}
                  </span>
                </li>
              );
            }
            if (row.kind === 'note') {
              return (
                <li key={row.entry.id} className="journal__item journal__item--warning" data-testid="journal-note">
                  <time className="journal__time">{clock(row.entry.time)}</time>
                  <span className="journal__report">
                    <span className="journal__icon" aria-hidden="true">
                      ⚠
                    </span>{' '}
                    {row.entry.text}
                    {row.entry.code && <code className="journal__note"> {row.entry.code}</code>}
                  </span>
                </li>
              );
            }
            const { entry } = row;
            return (
              <li key={entry.id} className="journal__item journal__item--report" data-testid="journal-report">
                <time className="journal__time">{clock(entry.time)}</time>
                <span className="journal__report">
                  <span className="journal__speech" aria-hidden="true" />
                  szer. {entry.soldier}: <strong>{entry.text}</strong>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
