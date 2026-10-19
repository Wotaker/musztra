/** Róża wiatrów w rogu ekranu; kamera nie obraca się, więc północ jest zawsze u góry (SPEC 3.9). */
export function CompassRose() {
  return (
    <svg className="compass-rose" viewBox="-50 -50 100 100" role="img" aria-label="Róża wiatrów: północ u góry">
      <circle r="44" className="compass-rose__disc" />
      <circle r="27" className="compass-rose__ring" />
      <g className="compass-rose__minor">
        <path d="M0 -6 L18 -18 L6 0 L18 18 L0 6 L-18 18 L-6 0 L-18 -18 Z" />
      </g>
      <path className="compass-rose__south" d="M0 0 L-7 0 L0 30 L7 0 Z" />
      <path className="compass-rose__side" d="M0 0 L0 -7 L30 0 L0 7 Z M0 0 L0 -7 L-30 0 L0 7 Z" />
      <path className="compass-rose__north" d="M0 0 L-7 0 L0 -27 L7 0 Z" />
      <text className="compass-rose__label" x="0" y="-30" textAnchor="middle">
        N
      </text>
    </svg>
  );
}
