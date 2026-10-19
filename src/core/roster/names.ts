/** Nazwiska żołnierzy z odmianą (COMMANDS, „Skład osobowy”). Stopień w MVP: szeregowy. */
export interface Surname {
  readonly nominative: string;
  readonly genitive: string;
}

export const RANK = { nominative: 'szeregowy', genitive: 'szeregowego' } as const;

export const SURNAMES: readonly Surname[] = [
  { nominative: 'Nowak', genitive: 'Nowaka' },
  { nominative: 'Kowalski', genitive: 'Kowalskiego' },
  { nominative: 'Wiśniewski', genitive: 'Wiśniewskiego' },
  { nominative: 'Wójcik', genitive: 'Wójcika' },
  { nominative: 'Kamiński', genitive: 'Kamińskiego' },
  { nominative: 'Lewandowski', genitive: 'Lewandowskiego' },
  { nominative: 'Zieliński', genitive: 'Zielińskiego' },
  { nominative: 'Szymański', genitive: 'Szymańskiego' },
  { nominative: 'Woźniak', genitive: 'Woźniaka' },
  { nominative: 'Dąbrowski', genitive: 'Dąbrowskiego' },
  { nominative: 'Kozłowski', genitive: 'Kozłowskiego' },
  { nominative: 'Mazur', genitive: 'Mazura' },
  { nominative: 'Krawczyk', genitive: 'Krawczyka' },
  { nominative: 'Malinowski', genitive: 'Malinowskiego' },
  { nominative: 'Król', genitive: 'Króla' },
  { nominative: 'Wieczorek', genitive: 'Wieczorka' },
  { nominative: 'Stępień', genitive: 'Stępnia' },
  { nominative: 'Kalinowski', genitive: 'Kalinowskiego' },
  { nominative: 'Wierzbicki', genitive: 'Wierzbickiego' },
  { nominative: 'Szczygieł', genitive: 'Szczygła' },
  { nominative: 'Pawlak', genitive: 'Pawlaka' },
  { nominative: 'Michalski', genitive: 'Michalskiego' },
  { nominative: 'Sikora', genitive: 'Sikory' },
  { nominative: 'Baran', genitive: 'Barana' },
];
