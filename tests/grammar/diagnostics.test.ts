import { describe, expect, it } from 'vitest';
import { interpret, type InterpretResult } from '../../src/core/interpreter';

// Kody i treść komunikatów interpretera (SPEC 3.4, 4.3, 4.4): każdy komunikat wskazuje miejsce
// błędu w tekście, punkt regulaminu i — gdzie się da — formę kanoniczną.

const lenient = (text: string) => interpret(text, { mode: 'lenient', squad: 1 });
const strict = (text: string) => interpret(text, { mode: 'strict', squad: 1 });

function underlined(result: InterpretResult, index = 0): string {
  const span = result.diagnostics[index]?.span;
  return span ? result.input.slice(span.start, span.end) : '';
}

describe('błędy składni', () => {
  it('tekst niepodobny do komendy → E_SYNTAX_UNKNOWN z przykładem budowy komendy (pkt 10)', () => {
    const result = lenient('zrób coś');
    expect(result.verdict).toBe('rejected');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_UNKNOWN');
    expect(result.diagnostics[0]?.points).toEqual(['10']);
    expect(underlined(result)).toBe('zrób coś');
  });

  it('pusty tekst → prośba o komendę', () => {
    const result = lenient('   ');
    expect(result.verdict).toBe('rejected');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_INCOMPLETE');
    expect(result.diagnostics[0]?.message).toMatch(/Wpisz komendę/);
  });

  it('brak hasła → E_SYNTAX_INCOMPLETE z oczekiwanym hasłem', () => {
    const result = lenient('W prawo');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_INCOMPLETE');
    expect(result.diagnostics[0]?.message).toContain('„ZWROT”');
  });

  it('samo hasło bez zapowiedzi → E_SYNTAX_INCOMPLETE z oczekiwaną zapowiedzią', () => {
    const result = lenient('ZBIÓRKA');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_INCOMPLETE');
    expect(result.diagnostics[0]?.message).toContain('„w szeregu”');
    expect(result.diagnostics[0]?.points).toContain('69');
    expect(underlined(result)).toBe('ZBIÓRKA');
  });

  it('błędna zapowiedź zbiórki: podkreślone „w szereg”, oczekiwane formy szyku', () => {
    const result = lenient('Pierwsza drużyna, w szereg – ZBIÓRKA');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_EXPECTED');
    expect(underlined(result)).toBe('w szereg');
    for (const form of ['w szeregu', 'w dwuszeregu', 'w rzędzie', 'w kolumnie dwójkowej']) {
      expect(result.diagnostics[0]?.message).toContain(`„${form}”`);
    }
    expect(result.diagnostics[0]?.points).toContain('69');
  });

  it('dobra zapowiedź, złe hasło: „W prawo – MARSZ” → oczekiwano ZWROT, podkreślone MARSZ', () => {
    const result = lenient('W prawo – MARSZ');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_EXPECTED');
    expect(underlined(result)).toBe('MARSZ');
    expect(result.diagnostics[0]?.message).toContain('„ZWROT”');
  });

  it('„W szereg, w lewo – ZWROT” → oczekiwano hasła FRONT', () => {
    const result = lenient('W szereg, w lewo – ZWROT');
    expect(result.diagnostics[0]?.message).toContain('„FRONT”');
    expect(underlined(result)).toBe('ZWROT');
  });

  it('nieznany obiekt terenowy: lista obiektów w podpowiedzi', () => {
    const result = lenient('Drużyna, w szeregu, prawe skrzydło na wysokości lotniska – ZBIÓRKA');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_EXPECTED');
    expect(underlined(result)).toBe('lotniska');
    expect(result.diagnostics[0]?.message).toContain('masztu, trybuny, koszar, garaży, hangaru, magazynu');
  });

  it('odliczanie „do jednego” → oczekiwano liczebnika od dwóch', () => {
    const result = lenient('Do jednego – ODLICZ');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_EXPECTED');
    expect(underlined(result)).toBe('jednego');
    expect(result.diagnostics[0]?.message).toContain('dwóch');
  });

  it('pełna komenda z nadmiarowym ciągiem → podkreślony nadmiar', () => {
    const result = lenient('Równaj w prawo – ZWROT');
    expect(result.diagnostics[0]?.code).toBe('E_SYNTAX_EXPECTED');
    expect(underlined(result)).toBe('– ZWROT');
  });
});

describe('tryb łagodny: normalizacja', () => {
  it('cyfry zamiast liczebników', () => {
    const result = lenient('Od prawoskrzydłowego, 5 kroków – ODSTĄP');
    expect(result.verdict).toBe('accepted');
    expect(result.canonical).toBe('Od prawoskrzydłowego, pięć kroków – ODSTĄP');
    expect(result.diagnostics.map((d) => d.code)).toEqual(['I_NORMALIZED']);
  });

  it('nazwisko w mianowniku → dopełniacz z danych składu', () => {
    expect(lenient('Od szeregowego Stępień, krok – ODSTĄP').canonical).toBe('Od szeregowego Stępnia, krok – ODSTĄP');
  });

  it('nieznane nazwisko zostaje jak wpisane, z wielkiej litery', () => {
    expect(lenient('od szeregowego zawadzkiego, krok – ODSTĄP').canonical).toBe('Od szeregowego Zawadzkiego, krok – ODSTĄP');
  });

  it('dowolny myślnik i jego brak', () => {
    for (const text of ['W prawo - ZWROT', 'W prawo — ZWROT', 'W prawo ZWROT', 'W prawo–ZWROT']) {
      const result = lenient(text);
      expect(result.verdict, text).toBe('accepted');
      expect(result.canonical, text).toBe('W prawo – ZWROT');
    }
  });

  it('I_NORMALIZED zawiera listę poprawek', () => {
    const result = lenient('w prawo zwrot');
    expect(result.diagnostics[0]?.details).toEqual([
      'Komenda zaczyna się wielką literą: „W”.',
      'Brak myślnika przed hasłem: „prawo – ZWROT”.',
      'Hasło wielkimi literami: „ZWROT”.',
    ]);
  });

  it('„jeden krok” → „krok”', () => {
    expect(lenient('Drużyna, jeden krok w tył – MARSZ').canonical).toBe('Drużyna, krok w tył – MARSZ');
  });

  it('forma kanoniczna bez zmian → bez komunikatów', () => {
    expect(lenient('Pierwsza drużyna, w szeregu – ZBIÓRKA').diagnostics).toEqual([]);
  });
});

describe('tryb ścisły: każda rozbieżność osobno, z podkreśleniem', () => {
  it('hasło małymi literami, brak polskich znaków — jeden komunikat na wielowyrazowe hasło', () => {
    const result = strict('Rozejsc sie');
    expect(result.verdict).toBe('rejected');
    expect(result.diagnostics.map((d) => [d.code, d.message])).toEqual([
      ['E_STRICT_FORM', 'Hasło wielkimi literami: „ROZEJŚĆ SIĘ”.'],
      ['E_STRICT_FORM', 'Polskie znaki: „ROZEJŚĆ SIĘ” zamiast „Rozejsc sie”.'],
    ]);
    expect(underlined(result)).toBe('Rozejsc sie');
    expect(result.suggestion).toBe('ROZEJŚĆ SIĘ');
  });

  it('cyfra zamiast liczebnika → E_STRICT_FORM, odmiana → E_GRAMMAR_AGREEMENT', () => {
    expect(strict('Do 2 – ODLICZ').diagnostics.map((d) => d.code)).toEqual(['E_STRICT_FORM']);
    expect(strict('Do dwa – ODLICZ').diagnostics.map((d) => d.code)).toEqual(['E_GRAMMAR_AGREEMENT']);
    expect(underlined(strict('Do dwa – ODLICZ'))).toBe('dwa');
  });

  it('separatory: przecinek po adresacie przed zapowiedzią, myślnik przed hasłem', () => {
    expect(strict('Drużyna w prawo – ZWROT').diagnostics[0]?.message).toBe('Brak przecinka: „Drużyna, w”.');
    expect(strict('Drużyna, w prawo, ZWROT').diagnostics[0]?.message).toBe('Przed hasłem myślnik, nie przecinek: „prawo – ZWROT”.');
    expect(strict('Drużyna – w prawo – ZWROT').diagnostics[0]?.message).toBe('Przecinek zamiast myślnika: „Drużyna, w”.');
    expect(strict('W prawo–ZWROT').diagnostics[0]?.message).toBe('Myślnik otoczony spacjami: „prawo – ZWROT”.');
    expect(strict('Do szeregowego Stępnia, w lewo – ŁĄCZ').diagnostics[0]?.message).toBe(
      'Zbędny znak „,”: „Stępnia w”.',
    );
  });

  it('każdy znak myślnika jest dopuszczony, jeśli otaczają go spacje (D-013)', () => {
    for (const text of ['W prawo - ZWROT', 'W prawo — ZWROT']) expect(strict(text).verdict, text).toBe('accepted');
  });

  it('wielka litera na początku, zapowiedź małymi literami, nazwisko wielką literą', () => {
    expect(strict('w prawo – ZWROT').diagnostics[0]?.message).toBe('Komenda zaczyna się wielką literą: „W”.');
    expect(strict('W PRAWO – ZWROT').diagnostics[0]?.message).toBe('Zapowiedź małymi literami: „prawo” zamiast „PRAWO”.');
    expect(strict('Od szeregowego nowaka, krok – ODSTĄP').diagnostics[0]?.message).toBe('Nazwisko wielką literą: „Nowaka”.');
  });

  it('kropka na końcu jest rozbieżnością', () => {
    expect(strict('BACZNOŚĆ.').diagnostics.map((d) => d.message)).toEqual(['Komenda bez kropki i wykrzyknika na końcu.']);
  });
});

describe('reguły regulaminu niezależne od stanu', () => {
  it('przesunięcie w tył o więcej niż krok → E_RULE, pkt 74', () => {
    const result = lenient('Drużyna, dwa kroki w tył – MARSZ');
    expect(result.verdict).toBe('rejected');
    expect(result.diagnostics[0]?.code).toBe('E_RULE');
    expect(result.diagnostics[0]?.points).toEqual(['74']);
    expect(result.diagnostics[0]?.message).toContain('W tył – ZWROT');
  });

  it('przesunięcie w bok → E_RULE, pkt 74', () => {
    expect(lenient('Drużyna, krok w lewo – MARSZ').diagnostics[0]?.code).toBe('E_RULE');
  });

  it('zbiórka: „prawe skrzydło” z szykiem marszowym → E_PRECOND_FORMATION', () => {
    const result = lenient('Drużyna, w rzędzie, prawe skrzydło na wysokości masztu – ZBIÓRKA');
    expect(result.diagnostics[0]?.code).toBe('E_PRECOND_FORMATION');
    expect(result.diagnostics[0]?.points).toEqual(['69']);
  });

  it('błąd reguły w trybie łagodnym zachowuje informację o normalizacji', () => {
    const result = lenient('druzyna 3 kroki w tyl marsz');
    expect(result.diagnostics.map((d) => d.code)).toEqual(['E_RULE', 'I_NORMALIZED']);
  });
});

describe('adresat (I-10)', () => {
  it('„Drużyna” bez liczebnika dotyczy drużyny na placu', () => {
    expect(lenient('Drużyna – BACZNOŚĆ').verdict).toBe('accepted');
    expect(interpret('Drużyna – BACZNOŚĆ', { mode: 'lenient', squad: 3 }).verdict).toBe('accepted');
  });

  it('inna drużyna → E_ADDRESSEE (uwaga), nikt nie reaguje, podkreślony adresat', () => {
    const result = lenient('Trzecia drużyna, w prawo – ZWROT');
    expect(result.verdict).toBe('ignored');
    expect(result.diagnostics[0]?.code).toBe('E_ADDRESSEE');
    expect(result.diagnostics[0]?.level).toBe('warning');
    expect(underlined(result)).toBe('Trzecia drużyna');
  });

  it('nazwa drużyny z ustawień: „Trzecia drużyna” na placu reaguje na swoją nazwę', () => {
    expect(interpret('Trzecia drużyna – BACZNOŚĆ', { mode: 'strict', squad: 3 }).verdict).toBe('accepted');
    expect(interpret('Pierwsza drużyna – BACZNOŚĆ', { mode: 'strict', squad: null }).verdict).toBe('ignored');
  });
});

describe('komendy spoza MVP', () => {
  it('rozpoznane, z nazwą i punktem regulaminu, bez wykonania', () => {
    const result = strict('Na prawo – PATRZ');
    expect(result.verdict).toBe('out_of_scope');
    expect(result.diagnostics[0]?.code).toBe('E_OUT_OF_SCOPE');
    expect(result.diagnostics[0]?.level).toBe('info');
    expect(result.diagnostics[0]?.points).toEqual(['105', '107']);
  });

  it('dowolny chwyt bronią rozpoznany jako poza MVP', () => {
    expect(lenient('Na ramię – BROŃ').verdict).toBe('out_of_scope');
  });
});

describe('punkty regulaminu przy błędach składni', () => {
  it('złe hasło: punkty komendy z oczekiwanym hasłem', () => {
    expect(lenient('W prawo – MARSZ').diagnostics[0]?.points).toEqual(['22', '76', '83']);
  });

  it('błąd w zapowiedzi: punkty najbliższej komendy z tym hasłem', () => {
    expect(lenient('Drużyna, kierunek prosto – MARSZ').diagnostics[0]?.points).toEqual(['24', '26', '100']);
  });

  it('bez rozpoznanego hasła: pkt 10 (budowa komendy)', () => {
    expect(lenient('Równaj w prawo – ZWROT').diagnostics[0]?.points).toEqual(['10']);
  });
});
