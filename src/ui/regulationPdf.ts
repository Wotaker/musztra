import regulationPdf from '../../docs/regulamin-musztry-1994.pdf?url';

/**
 * Regulamin musztry (PDF) w zasobach strony — źródło prawdy (CLAUDE.md). Plik jest kopiowany do buildu
 * przez Vite; odnośnik z `#page=N` otwiera wbudowaną przeglądarkę PDF na wskazanej stronie.
 */
export function regulationHref(page?: number): string {
  return page === undefined ? regulationPdf : `${regulationPdf}#page=${String(page)}`;
}
