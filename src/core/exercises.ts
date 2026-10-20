/**
 * Podstawowe ćwiczenia (etap EF, K2): gotowe sekwencje komend od najprostszej do marszu i zmian szyku.
 * Każda komenda jest w formie kanonicznej z katalogu; test `tests/exercises.test.ts` wykonuje każdą
 * sekwencję od stanu początkowego i sprawdza, że interpreter przyjmuje wszystkie komendy bez uwag.
 */

export interface Exercise {
  readonly id: string;
  readonly title: string;
  /** Jedno zdanie: czego uczy ćwiczenie. */
  readonly goal: string;
  readonly commands: readonly string[];
}

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'postawy',
    title: 'Zbiórka i postawy',
    goal: 'Zbierz rozproszoną drużynę w szeregu i przećwicz postawę zasadniczą i swobodną.',
    commands: ['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'SPOCZNIJ', 'BACZNOŚĆ', 'SPOCZNIJ', 'ROZEJŚĆ SIĘ'],
  },
  {
    id: 'zwroty',
    title: 'Zwroty w miejscu',
    goal: 'Wykonaj zwroty w miejscu i zapamiętaj, że w szyku poprzedza je BACZNOŚĆ.',
    commands: [
      'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA',
      'W prawo – ZWROT',
      'W lewo – ZWROT',
      'W tył – ZWROT',
      'W tył – ZWROT',
      'SPOCZNIJ',
    ],
  },
  {
    id: 'odliczanie',
    title: 'Odliczanie i równanie',
    goal: 'Odlicz drużynę w szeregu, wyrównaj ją do prawego skrzydła i zwolnij głowy komendą BACZNOŚĆ.',
    commands: [
      'Pierwsza drużyna, w szeregu – ZBIÓRKA',
      'Kolejno – ODLICZ',
      'BACZNOŚĆ',
      'Równaj – W PRAWO',
      'BACZNOŚĆ',
      'SPOCZNIJ',
    ],
  },
  {
    id: 'marsz',
    title: 'Marsz i zatrzymanie',
    goal: 'Poprowadź drużynę w rzędzie, zmień kierunek marszu i zatrzymaj ją.',
    commands: [
      'Pierwsza drużyna, w rzędzie – ZBIÓRKA',
      'Drużyna, kierunek na wprost – MARSZ',
      'Kierunek – W LEWO',
      'Kierunek – W PRAWO',
      'Drużyna – STÓJ',
    ],
  },
  {
    id: 'bieg',
    title: 'Bieg i kroki',
    goal: 'Przejdź z marszu do biegu i z powrotem na krok zwykły, zanim zatrzymasz drużynę.',
    commands: [
      'Pierwsza drużyna, w rzędzie – ZBIÓRKA',
      'Drużyna, kierunek na wprost – MARSZ',
      'Biegiem – MARSZ',
      'Zwykły – KROK',
      'W miejscu – MARSZ',
      'Na wprost – MARSZ',
      'Drużyna – STÓJ',
    ],
  },
  {
    id: 'dwojki',
    title: 'Zmiana szyku w miejscu',
    goal: 'Przejdź z szeregu do kolumny dwójkowej i z powrotem — po odliczeniu do dwóch.',
    commands: [
      'Pierwsza drużyna, w szeregu – ZBIÓRKA',
      'Do dwóch – ODLICZ',
      'BACZNOŚĆ',
      'W dwójki, w prawo – ZWROT',
      'W szereg, w lewo – FRONT',
      'SPOCZNIJ',
    ],
  },
  {
    id: 'szyk-w-marszu',
    title: 'Zmiany szyku w marszu',
    goal: 'W marszu odlicz rząd do dwóch, uformuj kolumnę dwójkową i wróć do rzędu.',
    commands: [
      'Pierwsza drużyna, w rzędzie – ZBIÓRKA',
      'Drużyna, kierunek na wprost – MARSZ',
      'Do dwóch – ODLICZ',
      'W dwójki – W PRZÓD',
      'Zwykły – KROK',
      'W rząd – W TYŁ',
      'Drużyna – STÓJ',
    ],
  },
];
