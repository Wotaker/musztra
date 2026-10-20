import { linkPoints } from './pointLinks';
import { regulationHref } from './regulationPdf';

/** Tekst z odnośnikami: każde „pkt N” otwiera regulamin (PDF) na stronie z tym punktem. */
export function PointLinks({ text }: { text: string }) {
  return (
    <>
      {linkPoints(text).map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <a
            key={`${String(index)}-${segment.text}`}
            className="point-link"
            data-testid="point-link"
            data-page={segment.page}
            href={regulationHref(segment.page)}
            target="_blank"
            rel="noopener"
            title={`Regulamin, pkt ${segment.text} — strona ${String(segment.page)} (nowa karta)`}
            onMouseDown={(event) => {
              // Fokus zostaje w wierszu poleceń.
              event.preventDefault();
            }}
          >
            {segment.text}
          </a>
        ),
      )}
    </>
  );
}
