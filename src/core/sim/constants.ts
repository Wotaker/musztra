/** Wielkości z SPEC 5.2 (metry, sekundy) i stałe symulacji. */

/** Odstęp w szeregu (środek–środek), pkt 4. */
export const INTERVAL = 0.6;
/** Odległość między szeregami i w kolumnie, pkt 5, 6. */
export const DISTANCE = 1.2;
/** Odstęp między rzędami kolumny, pkt 6. */
export const COLUMN_INTERVAL = 0.6;
/** Długość kroku zwykłego, pkt 26; także „krok” w komendach przesunięcia i odstępowania. */
export const STEP = 0.7;
/** Tempo marszu: 114 kroków/min (pkt 25–26). */
export const MARCH_SPEED = (STEP * 114) / 60;
/** Bieg: krok 0,9 m, 170 kroków/min (pkt 28). */
export const RUN_SPEED = (0.9 * 170) / 60;
/** Czas zwrotu w miejscu (uproszczenie). */
export const TURN_TIME = 0.6;
/** Dowódca przed kolumną: 3 kroki (rys. 25). */
export const COMMANDER_LEAD = 3 * STEP;

/** Stały krok symulacji (SPEC 5.5). */
export const DT = 1 / 60;

/** Tolerancje niezmienników (SPEC 5.4). */
export const POSITION_TOLERANCE = 0.05;
export const FACING_TOLERANCE = 1;
