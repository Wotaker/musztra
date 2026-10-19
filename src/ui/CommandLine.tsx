import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { Span } from '../core/grammar/normalize';
import { useCommandStore } from './commandStore';
import { ModeSwitch } from './ModeSwitch';
import { mergeSpans } from './spans';

function mirror(text: string, spans: readonly Span[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const span of mergeSpans(spans)) {
    if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
    // Pusty zakres (np. brak hasła na końcu) zaznaczamy podkreśloną spacją za tekstem.
    const fragment = span.end > span.start ? text.slice(span.start, span.end) : '\u00a0\u00a0';
    nodes.push(
      <span key={span.start} className="cmdline__error" data-testid="error-underline">
        {fragment}
      </span>,
    );
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function CommandLine() {
  const draft = useCommandStore((s) => s.draft);
  const result = useCommandStore((s) => s.result);
  const setDraft = useCommandStore((s) => s.setDraft);
  const submit = useCommandStore((s) => s.submit);
  const historyUp = useCommandStore((s) => s.historyUp);
  const historyDown = useCommandStore((s) => s.historyDown);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Podkreślenie dotyczy tekstu, który został sprawdzony — znika po pierwszej zmianie.
  const showErrors = result !== null && result.verdict === 'rejected' && result.input === draft;
  const spans = showErrors
    ? result.diagnostics.filter((d) => d.level === 'error' && d.span !== null).map((d) => d.span as Span)
    : [];

  const syncScroll = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      historyUp();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      historyDown();
    }
  };

  return (
    <div className="cmdline">
      <span className="cmdline__prompt" aria-hidden="true">
        ›
      </span>
      <div className="cmdline__field">
        <div className="cmdline__mirror" ref={mirrorRef} aria-hidden="true">
          {mirror(draft, spans)}
        </div>
        <input
          ref={inputRef}
          className="cmdline__input"
          data-testid="command-input"
          aria-label="Komenda"
          placeholder="Wpisz komendę, np. Pierwsza drużyna, w szeregu – ZBIÓRKA"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          onSelect={syncScroll}
          onKeyUp={syncScroll}
        />
      </div>
      <ModeSwitch />
    </div>
  );
}
