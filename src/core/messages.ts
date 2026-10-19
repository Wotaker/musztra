/**
 * Kody komunikatów interpretera (SPEC 4.4). Poziom mówi, jak komunikat wpływa na wynik:
 * błąd odrzuca komendę, uwaga jej nie blokuje (chyba że nikt nie reaguje), informacja tylko objaśnia.
 */
export const MESSAGE_CODES = {
  E_SYNTAX_UNKNOWN: { level: 'error', summary: 'tekst nie przypomina żadnej komendy' },
  E_SYNTAX_EXPECTED: { level: 'error', summary: 'w danym miejscu oczekiwano innego elementu' },
  E_SYNTAX_INCOMPLETE: { level: 'error', summary: 'brak hasła lub części zapowiedzi' },
  E_GRAMMAR_AGREEMENT: { level: 'error', summary: 'błędna odmiana (tryb ścisły)' },
  E_RULE: { level: 'error', summary: 'komenda sprzeczna z wyraźną regułą regulaminu' },
  E_STRICT_FORM: { level: 'error', summary: 'rozbieżność z formą kanoniczną (tryb ścisły)' },
  E_OUT_OF_SCOPE: { level: 'info', summary: 'komenda z regulaminu, jeszcze nieobsługiwana' },
  E_ADDRESSEE: { level: 'warning', summary: 'adresat nie istnieje na placu; nikt nie reaguje' },
  E_PRECOND_POSTURE: { level: 'error', summary: 'wymaga postawy zasadniczej' },
  E_PRECOND_ATTENTION: { level: 'error', summary: 'zbiórka bez wcześniejszego wezwania lub BACZNOŚĆ' },
  E_PRECOND_FORMATION: { level: 'error', summary: 'komenda niedostępna w tym szyku' },
  E_PRECOND_MOTION: { level: 'error', summary: 'komenda niedostępna w bieżącym ruchu' },
  E_PRECOND_COUNT: { level: 'error', summary: 'brak wymaganego odliczenia' },
  E_PRECOND_STATE: { level: 'error', summary: 'brak stanu wymaganego przez komendę' },
  E_BUSY: { level: 'error', summary: 'drużyna wykonuje czynność przejściową; dozwolone tylko WRÓĆ' },
  W_FORMATION_DIRECTION: { level: 'warning', summary: 'zmiana ugrupowania zwrotem w nieregulaminową stronę' },
  W_DIRECTION_DEPLOYED: { level: 'warning', summary: 'zmiana kierunku marszu w szyku rozwiniętym' },
  W_FOLLOW_HALT: { level: 'warning', summary: 'dowódca stanął, drużyna maszeruje w miejscu' },
  W_MISSING_ADDRESSEE: { level: 'warning', summary: 'STÓJ bez adresata' },
  W_AWAIT_QUICK_STEP: { level: 'warning', summary: 'brak komendy „Zwykły – KROK”' },
  W_NO_EFFECT: { level: 'warning', summary: 'komenda poprawna, ale w tym stanie nic nie zmienia' },
  I_NORMALIZED: { level: 'info', summary: 'zapis znormalizowany do formy kanonicznej' },
} as const satisfies Record<string, { level: MessageLevel; summary: string }>;

export type MessageLevel = 'error' | 'warning' | 'info';
export type MessageCode = keyof typeof MESSAGE_CODES;

export function levelOf(code: MessageCode): MessageLevel {
  return MESSAGE_CODES[code].level;
}
