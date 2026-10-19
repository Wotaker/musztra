/**
 * Losowość z ziarnem (SPEC 5.5): generator mulberry32. Stan generatora jest liczbą w stanie
 * symulacji, więc ten sam skrypt komend daje zawsze ten sam wynik.
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Liczba z przedziału [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Bieżący stan generatora — do zapisania w stanie symulacji. */
  get seed(): number {
    return this.state;
  }
}
