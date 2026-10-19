// Plik gramatyki jest wczytywany jako tekst (Vite/Vitest: sufiks `?raw`).
declare module '*.ohm?raw' {
  const source: string;
  export default source;
}
