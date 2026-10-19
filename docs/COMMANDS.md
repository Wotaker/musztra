# Katalog komend MVP — drużyna, musztra bez broni

Źródło: Regulamin musztry SZ RP, Szt. Gen. 1427/94 (dalej „pkt N”). Dokument jest specyfikacją: każdy wpis ma odpowiednik w danych katalogu (`src/core/catalog`), w gramatyce i w testach. Zmiany w katalogu zaczynają się od tego pliku.

Spis grup: [0. Konwencje](#0-konwencje) · [P. Wezwanie i postawy](#p-wezwanie-i-postawy) · [Z. Zwroty](#z-zwroty) · [ZB. Zbiórki i rozejście](#zb-zbiórki-i-rozejście) · [R. Równanie i odliczanie](#r-równanie-i-odliczanie) · [O. Odstępowanie i łączenie](#o-odstępowanie-i-łączenie) · [S. Zmiany szyku w miejscu](#s-zmiany-szyku-w-miejscu) · [M. Marsz i zatrzymanie](#m-marsz-i-zatrzymanie) · [MS. Zmiany szyku w marszu](#ms-zmiany-szyku-w-marszu) · [X. Specjalne](#x-specjalne) · [Poza MVP](#poza-mvp-rozpoznawane-nieobsługiwane) · [Scenariusze akceptacyjne](#scenariusze-akceptacyjne) · [Dane pomocnicze](#dane-pomocnicze)

---

## 0. Konwencje

### 0.1 Budowa komendy (pkt 10)

```ebnf
komenda          = [ adresat sep ] zapowiedź "–" HASŁO
                 | [ adresat "–" ] HASŁO_SAMODZIELNE
                 | adresat ;                              (* samo wezwanie, P-1 *)
sep              = "," ;
adresat          = "Drużyna" | porządkowy "drużyna" ;     (* zgodny z ustawieniem nazwy *)
porządkowy       = "Pierwsza" | "Druga" | "Trzecia" | "Czwarta" ;
HASŁO_SAMODZIELNE = "BACZNOŚĆ" | "SPOCZNIJ" | "ROZEJŚĆ SIĘ" | "WRÓĆ" ;
```

- **Forma kanoniczna:** pierwsza litera komendy wielka; zapowiedź małymi literami (poza nazwiskami); myślnik `–` otoczony spacjami; HASŁO wielkimi literami; przecinek po adresacie, gdy następuje zapowiedź.
- **Tryb łagodny:** dopuszcza dowolną wielkość liter, dowolny myślnik lub jego brak, brak polskich znaków, cyfry zamiast liczebników, błędną odmianę liczebnika lub nazwiska; wynik ✔ z `I_NORMALIZED` i formą kanoniczną.
- **Tryb ścisły:** wymaga formy kanonicznej; każda rozbieżność to `E_STRICT_FORM` (odmiana: `E_GRAMMAR_AGREEMENT`).
- **Adresat** jest opcjonalny (na placu jest jedna drużyna). Adresat wskazujący inny pododdział: `E_ADDRESSEE`, nikt nie reaguje.

### 0.2 Reguła BACZNOŚĆ (pkt 11)

Każda komenda z zapowiedzią podawana drużynie **stojącej w szyku** wymaga postawy zasadniczej; w przeciwnym razie `E_PRECOND_POSTURE` z podpowiedzią „najpierw BACZNOŚĆ”. Wyjątki: komendy z samego hasła (P-2, P-3, ZB-4, X-1), wezwanie (P-1), zbiórki (mają własną regułę, ZB). W marszu reguła nie obowiązuje.

### 0.3 Liczebniki i odmiana

| Kontekst | Formy |
|---|---|
| kroki (przesunięcie, odstępowanie) | krok · dwa / trzy / cztery kroki · pięć … dziesięć kroków |
| odliczanie („Do … – ODLICZ”) | dwóch · trzech · czterech · pięciu · sześciu · siedmiu · ośmiu · dziewięciu · dziesięciu |
| nazwisko po „Od / Do szeregowego” | dopełniacz z tabeli w [Danych pomocniczych](#dane-pomocnicze) |
| obiekt po „na wysokości / frontem do / Do” | dopełniacz z tabeli obiektów |

### 0.4 Pola wpisu

**Składnia** (kanoniczna, warianty w nawiasach jak w regulaminie) · **Pkt** · **Warunki** (stan wymagany; naruszenie → kod) · **Efekt** · **Odzywki** · **Przykłady** (✔ poprawne, ✖ błędne → kod).

Skróty stanu: *rozwinięty* = szereg lub dwuszereg; *marszowy* = rząd lub kolumna dwójkowa; *stoi* / *marsz* / *marsz w miejscu* / *bieg* = ruch; *zasadnicza* / *swobodna* = postawa.

---

## P. Wezwanie i postawy

### P-1 Wezwanie
- **Składnia:** `Pierwsza drużyna` (sam adresat, bez hasła)
- **Pkt:** 11, 18a, 69
- **Warunki:** brak (dowolny stan).
- **Efekt:** drużyna rozproszona: żołnierze zatrzymują się, zwracają frontem do dowódcy, przyjmują postawę zasadniczą; drużyna oznaczona jako „uważna” (`attending`), co uprawnia do zbiórki bez adresata. Drużyna w szyku: postawa zasadnicza. W marszu: bez zmian (uwaga `W_NO_EFFECT`).
- **Przykłady:** ✔ `Pierwsza drużyna` · ✔ `Drużyna` · ✖ `Druga drużyna` (gdy na placu jest pierwsza) → `E_ADDRESSEE`

### P-2 BACZNOŚĆ
- **Składnia:** `BACZNOŚĆ` · `Drużyna – BACZNOŚĆ`
- **Pkt:** 18, 25b, 69, 71
- **Warunki:** brak.
- **Efekt:**
  - stoi w szyku: postawa zasadnicza; jeśli głowy zwrócone po „Równaj”, zwracają się na wprost (`headTurned` = brak);
  - rozproszona: jak P-1 (zwrot frontem do dowódcy, zasadnicza, `attending`);
  - marsz: przejście na krok defiladowy (do komendy SPOCZNIJ);
  - marsz w miejscu, bieg: bez zmiany ruchu, uwaga `W_NO_EFFECT`.
- **Przykłady:** ✔ `BACZNOŚĆ` · ✔ `Drużyna – BACZNOŚĆ` · ✔ (łagodny) `bacznosc` → `I_NORMALIZED` · ✖ (ścisły) `Baczność` → `E_STRICT_FORM`

### P-3 SPOCZNIJ
- **Składnia:** `SPOCZNIJ` · `Drużyna – SPOCZNIJ`
- **Pkt:** 20, 26, 69, 71
- **Warunki:** brak.
- **Efekt:**
  - stoi w szyku: postawa swobodna i **samoczynne wyrównanie i krycie**: pozycje korygowane do regulaminowych względem prawego skrzydła (czoła), flaga `irregularSpacing` czyszczona; niedozwolone przy zwróconych głowach (zob. R-1);
  - rozproszona: postawa swobodna, `attending` zostaje;
  - marsz krokiem defiladowym: przejście na krok zwykły; marsz krokiem zwykłym: `W_NO_EFFECT`.
- **Przykłady:** ✔ `SPOCZNIJ` · ✔ `Drużyna – SPOCZNIJ` · ✖ `Drużyna, spocznij` (ścisły) → `E_STRICT_FORM`

---

## Z. Zwroty

### Z-1 Zwroty w miejscu
- **Składnia:** `W lewo (w prawo, w tył) – ZWROT` · `Drużyna, w prawo – ZWROT`
- **Pkt:** 22, 76, 83
- **Warunki:** stoi (`E_PRECOND_MOTION`); szyk inny niż rozproszona (`E_PRECOND_FORMATION`); zasadnicza (`E_PRECOND_POSTURE`).
- **Efekt:** każdy żołnierz obraca się w miejscu o −90° / +90° / 180° (w tył przez lewe ramię). Pozycje bez zmian. Szyk po zwrocie:

| Przed | W prawo | W lewo | W tył |
|---|---|---|---|
| szereg | rząd (czoło = dotychczasowe prawe skrzydło) | rząd z uwagą `W_FORMATION_DIRECTION` („rząd z szeregu formuje się w prawo”, pkt 76) | szereg frontem w tył |
| dwuszereg | kolumna dwójkowa | kolumna dwójkowa z `W_FORMATION_DIRECTION` | dwuszereg frontem w tył (drugi szereg z przodu) |
| rząd | szereg z `W_FORMATION_DIRECTION` („szereg z rzędu formuje się w lewo”) | szereg | rząd zawrócony (czoło = dotychczasowy ogon) |
| kolumna dwójkowa | dwuszereg z `W_FORMATION_DIRECTION` | dwuszereg | kolumna zawrócona |

  Odległości po zwrocie wynikają z geometrii: rząd z szeregu ma odległość 0,6 m (rozwiera się po ruszeniu, I-2); szereg z rzędu o odległości 1,2 m ma odstępy 1,2 m i flagę `irregularSpacing` (korekta: SPOCZNIJ lub R-1, I-1). Role (skrzydła, kierunkowy, czoło) wyznaczane geometrycznie z nowego frontu. Kolumna dwójkowa z pkt S-1 (`formedFrom = BY_TWOS`) po zwrocie traci to oznaczenie.
- **Przykłady:** ✔ `W prawo – ZWROT` · ✔ `Drużyna, w tył – ZWROT` · ✖ `W prawo – ZWROT` w postawie swobodnej → `E_PRECOND_POSTURE` · ✖ `W prawo – ZWROT` w marszu → `E_PRECOND_MOTION` (zmiana kierunku w marszu: M-9) · ✖ `W prawo – MARSZ` → `E_SYNTAX_EXPECTED` (czy chodziło o „Kierunek – W PRAWO” lub „W prawo – ZWROT”?)

---

## ZB. Zbiórki i rozejście

Wspólne dla ZB-1…ZB-3:
- **Szyk** w zapowiedzi: `w szeregu` · `w dwuszeregu` · `w rzędzie` · `w kolumnie dwójkowej`.
- **Warunek uwagi (pkt 69):** zbiórka bez adresata wymaga wcześniejszego wezwania lub BACZNOŚĆ (`attending`); inaczej `E_PRECOND_ATTENTION`. Komenda z adresatem pełni rolę wezwania (I-9).
- **Warunek ruchu:** stoi lub rozproszona; w marszu `E_PRECOND_MOTION` (zbiórka w marszu: backlog).
- **Wykonanie:** żołnierze biegną na miejsca i stają w postawie zasadniczej. Kolejność miejsc według kolejności w składzie (żołnierz nr 1 = prawoskrzydłowy / kierunkowy). Dwuszereg: pierwszy szereg ⌈N/2⌉, drugi ⌊N/2⌋, oba od prawej (I-7); przy nieparzystym N dwuszereg niepełny. Kolumna dwójkowa: pary od czoła, prawy rząd = nieparzyści, lewy = parzyści.
- **Po zbiórce:** odliczenie, odstępowanie, `irregularSpacing`, `formedFrom` wyczyszczone; zapisane miejsce zbiórki (punkt zaczepienia, front, szyk) dla ZB-3.

### ZB-1 Zbiórka przy dowódcy
- **Składnia:** `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA` · po wezwaniu: `W dwuszeregu – ZBIÓRKA`
- **Pkt:** 69
- **Efekt:** front drużyny = front dowódcy. Szyk rozwinięty: prawoskrzydłowy staje po lewej stronie dowódcy w odstępie 0,6 m, szyk ciągnie się w lewo od dowódcy. Szyk marszowy: kierunkowy staje 3 kroki za dowódcą (I-6).
- **Przykłady:** ✔ `Pierwsza drużyna, w szeregu – ZBIÓRKA` · ✔ `Drużyna, w kolumnie dwójkowej – ZBIÓRKA` · ✖ `W szeregu – ZBIÓRKA` bez wezwania → `E_PRECOND_ATTENTION` · ✖ `Pierwsza drużyna, w szereg – ZBIÓRKA` → `E_SYNTAX_EXPECTED` (oczekiwano „w szeregu”)

### ZB-2 Zbiórka we wskazanym miejscu
- **Składnia:** `Pierwsza drużyna, w dwuszeregu (w kolumnie dwójkowej), na placu (na drodze), prawe skrzydło (czoło) na wysokości trybuny, frontem do hangaru – ZBIÓRKA`
- **Gramatyka:**
  ```ebnf
  zbiórka_miejsce = [ adresat "," ] szyk [ "," teren ] "," odniesienie [ "," front ] "–" "ZBIÓRKA" ;
  teren           = "na placu" | "na drodze" ;
  odniesienie     = ( "prawe skrzydło" | "czoło" ) "na wysokości" obiekt_D ;
  front           = "frontem do" obiekt_D ;
  ```
  Kolejność elementów stała, jak w regulaminie.
- **Pkt:** 69
- **Warunki:** jak wyżej; `prawe skrzydło` tylko z szykiem rozwiniętym, `czoło` tylko z marszowym → `E_PRECOND_FORMATION` („prawe skrzydło dotyczy szyku rozwiniętego, czoło — kolumny”).
- **Efekt:** punkt zaczepienia = punkt obiektu (na placu: przedpole obiektu; na drodze: najbliższy punkt osi drogi). Prawoskrzydłowy (kierunkowy) staje w tym punkcie. Front: w stronę obiektu z części „frontem do”; gdy jej brak — front dowódcy. Dowódca nie musi się przemieszczać.
- **Przykłady:** ✔ `Pierwsza drużyna, w dwuszeregu, na placu, prawe skrzydło na wysokości masztu, frontem do koszar – ZBIÓRKA` · ✔ `Drużyna, w rzędzie, czoło na wysokości garaży – ZBIÓRKA` · ✖ `Drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA` → `E_PRECOND_FORMATION` · ✖ `…, frontem do lotniska – ZBIÓRKA` → `E_SYNTAX_EXPECTED` (nieznany obiekt; lista obiektów w podpowiedzi) · ✖ (ścisły) `…na wysokości maszt…` → `E_GRAMMAR_AGREEMENT`

### ZB-3 Zbiórka na poprzednim miejscu
- **Składnia:** `Pierwsza drużyna, w dwuszeregu, na poprzednim miejscu – ZBIÓRKA`
- **Pkt:** 69
- **Warunki:** zapisane miejsce poprzedniej zbiórki → inaczej `E_PRECOND_STATE`.
- **Efekt:** jak ZB-2 z zapisanym punktem zaczepienia i frontem; szyk z bieżącej komendy (może różnić się od poprzedniego).
- **Przykłady:** ✔ jw. · ✖ jw. na początku sesji → `E_PRECOND_STATE`

### ZB-4 Rozejście
- **Składnia:** `ROZEJŚĆ SIĘ` · `Drużyna – ROZEJŚĆ SIĘ` · `Do koszar – ROZEJŚĆ SIĘ` · `Do koszar, biegiem – ROZEJŚĆ SIĘ` (regulamin zapisuje „(biegiem)” w nawiasie)
- **Pkt:** 70
- **Warunki:** brak; dozwolona w każdym szyku, w miejscu i w marszu.
- **Efekt:** szyk = rozproszona; żołnierze odchodzą (biegną) do losowych punktów 8–15 m od miejsca (w wariancie z obiektem: wokół przedpola obiektu), potem stoją swobodnie z drobnym, spokojnym ruchem. `attending` wyczyszczone. Losowość z ziarnem.
- **Przykłady:** ✔ `ROZEJŚĆ SIĘ` · ✔ `Do garaży, biegiem – ROZEJŚĆ SIĘ` · ✔ (łagodny) `do garazy biegiem rozejsc sie` → `I_NORMALIZED` · ✖ `Rozejść się` (ścisły) → `E_STRICT_FORM`

---

## R. Równanie i odliczanie

### R-1 Równanie
- **Składnia:** `Równaj – W PRAWO (W LEWO)` · `Drużyna, równaj – W PRAWO`
- **Pkt:** 71
- **Warunki:** rozwinięty; stoi; zasadnicza.
- **Efekt:** wszyscy oprócz skrzydłowego (prawego / lewego) zwracają głowy w nakazaną stronę; pozycje korygowane do regulaminowych względem tego skrzydłowego; `irregularSpacing` czyszczone; `headTurned` ustawione. **Dopóki głowy są zwrócone,** dozwolone tylko BACZNOŚĆ, WRÓĆ i ROZEJŚĆ SIĘ; inne komendy → `E_PRECOND_STATE` („po wyrównaniu podaj BACZNOŚĆ”, pkt 71).
- **Przykłady:** ✔ `Równaj – W PRAWO` · ✖ `Równaj w prawo – ZWROT` → `E_SYNTAX_EXPECTED` · ✖ w kolumnie → `E_PRECOND_FORMATION` (w kolumnie żołnierze kryją, nie równają)

### R-2 Odliczanie
- **Składnia:** `Kolejno – ODLICZ` · `Do dwóch (trzech, … dziesięciu) – ODLICZ` · z adresatem: `Drużyna, kolejno – ODLICZ`
- **Pkt:** 72, 76, 77
- **Warunki:** w miejscu: rozwinięty, zasadnicza; w marszu: rząd, marsz (I-4); w pozostałych przypadkach `E_PRECOND_FORMATION` / `E_PRECOND_MOTION`.
- **Efekt w miejscu:** żołnierze pierwszego szeregu kolejno od prawego skrzydła podają liczby (dymki co ok. 0,5 s); żołnierze drugiego szeregu przejmują liczbę poprzednika. Numer: kolejno 1…k; „do n”: ((i−1) mod n)+1. Jeśli dwuszereg niepełny, lewoskrzydłowy drugiego szeregu melduje **„Niepełny”**. Potem wszyscy przyjmują postawę swobodną. Zapisane `countMode` i `countInMarch = false`.
- **Efekt w marszu (rząd):** liczby podawane bez zmiany tempa, `countInMarch = true`.
- **Odzywki:** liczby, „Niepełny”; wpisy w Dzienniku.
- **Unieważnienie odliczenia:** zbiórka, rozejście, WRÓĆ do stanu sprzed odliczenia, zwroty Z-1 zmieniające ugrupowanie.
- **Przykłady:** ✔ `Kolejno – ODLICZ` · ✔ `Do dwóch – ODLICZ` · ✖ `Do dwa – ODLICZ` → `E_GRAMMAR_AGREEMENT` (ścisły) / `I_NORMALIZED` (łagodny) · ✖ w swobodnej → `E_PRECOND_POSTURE` · ✖ `Do jednego – ODLICZ` → `E_SYNTAX_EXPECTED`

---

## O. Odstępowanie i łączenie

### O-1 Odstępowanie
- **Składnia:**
  - `Od prawoskrzydłowego (lewoskrzydłowego), pięć kroków – ODSTĄP` · `…, pięć kroków, biegiem – ODSTĄP`
  - `Od szeregowego Malinowskiego, krok – ODSTĄP` (w obie strony)
  - `Od szeregowego Malinowskiego, w prawo (w lewo), krok – ODSTĄP` (w jedną stronę)
  - Kanonicznie wariant biegiem: `…, biegiem – ODSTĄP` (regulamin zapisuje „(biegiem – ODSTĄP)”).
- **Pkt:** 73
- **Warunki:** rozwinięty; stoi; zasadnicza; drużyna nie jest już w stanie odstąpionym (`E_PRECOND_STATE`, „najpierw ŁĄCZ”); wskazany żołnierz istnieje i stoi w pierwszym szeregu (`E_PRECOND_STATE`).
- **Efekt:** żołnierz, od którego odstępuje się, pozostaje. Wskazany po nazwisku melduje **„Jestem”** i na sekundę unosi lewą rękę (w dwuszeregu także kryjący go żołnierz drugiego szeregu unosi rękę). Pozostali robią zwrot w stronę odstępowania, maszerują (biegną) i zatrzymują się kolejno, aż odstęp między sąsiadami wyniesie 0,6 m + n × 0,7 m; zwrot do frontu, postawa swobodna. Drugi szereg kryje. Zapisany stan odstępowania (od kogo, n, strona).
- **Przykłady:** ✔ `Od prawoskrzydłowego, dwa kroki – ODSTĄP` · ✔ `Od szeregowego Nowaka, w lewo, trzy kroki – ODSTĄP` · ✖ `Od prawoskrzydłowego, pięć kroki – ODSTĄP` → `E_GRAMMAR_AGREEMENT` · ✖ `Od szeregowego Zawadzkiego, krok – ODSTĄP` (brak w składzie) → `E_PRECOND_STATE`

### O-2 Łączenie
- **Składnia:** `Do prawoskrzydłowego (lewoskrzydłowego) – ŁĄCZ` · `Do szeregowego Malinowskiego – ŁĄCZ` · `Do szeregowego Stępnia w lewo (w prawo) – ŁĄCZ` · warianty `biegiem – ŁĄCZ`
- **Pkt:** 73
- **Warunki:** stan odstąpiony (`E_PRECOND_STATE`, „nie było odstępowania”); stoi; zasadnicza (po odstępowaniu drużyna stoi swobodnie, więc najpierw BACZNOŚĆ — pkt 11).
- **Efekt:** ruch odwrotny do odstępowania w stronę wskazanego żołnierza (skrzydłowego) do odstępów regulaminowych; zwrot do frontu, postawa swobodna (I-14). Stan odstępowania wyczyszczony.
- **Przykłady:** ✔ `Do prawoskrzydłowego – ŁĄCZ` · ✔ `Do szeregowego Nowaka, biegiem – ŁĄCZ` · ✖ bez wcześniejszego ODSTĄP → `E_PRECOND_STATE`

---

## S. Zmiany szyku w miejscu

Przejścia przez zwroty (szereg ↔ rząd, dwuszereg ↔ kolumna dwójkowa) opisuje Z-1 (pkt 76, 83).

### S-1 Z szeregu w kolumnę dwójkową
- **Składnia:** `W dwójki, w prawo – ZWROT` · `Drużyna, w dwójki, w prawo – ZWROT`
- **Pkt:** 76
- **Warunki:** szereg (`E_PRECOND_FORMATION`); stoi; zasadnicza; odliczenie „do dwóch” wykonane w miejscu w obecnym szyku (`E_PRECOND_COUNT`, „najpierw Do dwóch – ODLICZ”).
- **Efekt:** jedynki: zwrot w prawo w miejscu. Dwójki: zwrot w prawo z wykrokiem w lewo w skos, stają na lewo od swojego prawego sąsiada (jedynki). Wynik: kolumna dwójkowa, front +90°, prawy rząd = jedynki, lewy = dwójki; przy nieparzystym N ostatnia jedynka bez pary. `formedFrom = BY_TWOS`.
- **Przykłady:** ✔ `W dwójki, w prawo – ZWROT` · ✖ bez odliczenia → `E_PRECOND_COUNT` · ✖ w dwuszeregu → `E_PRECOND_FORMATION` (z dwuszeregu: „W prawo – ZWROT”)

### S-2 Z kolumny dwójkowej do szeregu
- **Składnia:** `W szereg, w lewo – FRONT`
- **Pkt:** 76
- **Warunki:** kolumna dwójkowa z `formedFrom = BY_TWOS` (inaczej `E_PRECOND_FORMATION`: „kolumnę utworzoną z dwuszeregu zamienia się w dwuszereg komendą W lewo – ZWROT”); stoi; zasadnicza.
- **Efekt:** dwójki: zwrot w lewo w miejscu. Jedynki: część zwrotu w lewo i wykrok, stają na prawo od swojego sąsiada (dwójki); samotna jedynka z końca staje na lewo od ostatniej dwójki (I-8). Wynik: szereg, front −90°, kolejność 1, 2, 3… od prawego skrzydła, odstępy regulaminowe.
- **Przykłady:** ✔ `W szereg, w lewo – FRONT` · ✖ `W szereg, w lewo – ZWROT` → `E_SYNTAX_EXPECTED` (hasło: FRONT)

### S-3 Przesunięcie szyku
- **Składnia:** `Drużyna, krok na wprost (w tył) – MARSZ` · `Drużyna, sześć kroków na wprost – MARSZ` · `Drużyna, na wprost – MARSZ` (bez liczby: zob. M-4)
- **Pkt:** 74
- **Warunki:** szyk inny niż rozproszona; stoi; zasadnicza. W tył więcej niż krok → `E_RULE` („najpierw W tył – ZWROT”, pkt 74). W prawo lub w lewo → `E_RULE` („przesunięcie w bok po zmianie frontu”, pkt 74).
- **Efekt:** krok: wszyscy robią jeden krok w nakazanym kierunku bez zmiany frontu. N kroków: marsz N kroków na wprost i zatrzymanie w postawie zasadniczej.
- **Przykłady:** ✔ `Drużyna, krok w tył – MARSZ` · ✔ `Drużyna, trzy kroki na wprost – MARSZ` · ✖ `Drużyna, trzy kroki w tył – MARSZ` → `E_RULE` · ✖ `Drużyna, krok w prawo – MARSZ` → `E_RULE`

### S-4 Zmiana frontu (zachodzenie)
- **Składnia:** `Drużyna, w prawo (w lewo) zachodź – MARSZ`
- **Pkt:** 75
- **Warunki:** rozwinięty (`E_PRECOND_FORMATION`); stoi; zasadnicza.
- **Efekt:** skrzydłowy nieruchomego skrzydła (prawy przy „w prawo”) obraca się w miejscu, pozostali maszerują krokiem zwykłym po łukach, zachowując równanie; szyk obraca się sztywno wokół skrzydłowego. Ruch ciągły do komendy M-8 (`Drużyna – STÓJ`), bez limitu kąta (I-13).
- **Przykłady:** ✔ `Drużyna, w prawo zachodź – MARSZ` · ✖ w rzędzie → `E_PRECOND_FORMATION` (w marszu: M-9)

---

## M. Marsz i zatrzymanie

### M-1 Rozpoczęcie marszu
- **Składnia:** `Drużyna, kierunek na wprost (w prawo, w lewo, w tył na prawo, w tył na lewo, w prawo w skos, w lewo w skos) – MARSZ`
- **Pkt:** 24, 26, 100
- **Warunki:** szyk inny niż rozproszona; stoi; zasadnicza.
- **Efekt:** pierwsze trzy kroki defiladowe na wprost, następnie zmiana kierunku (jeśli inny niż na wprost) i marsz krokiem zwykłym. Szyk marszowy: zmiana kierunku przez kierunkowego, reszta po jego śladzie (I-5); odległości rozwierają się do 1,2 m (I-2). Szyk rozwinięty: na wprost — cały szyk naprzód; inny kierunek — wykonanie indywidualne (pkt 24), szyk staje się marszowym, uwaga `W_DIRECTION_DEPLOYED` („do zmiany frontu szyku rozwiniętego służy zachodzenie, pkt 75”) (I-3).
- **Przykłady:** ✔ `Drużyna, kierunek na wprost – MARSZ` · ✔ `Kierunek w prawo – MARSZ` · ✖ `Drużyna, kierunek prosto – MARSZ` → `E_SYNTAX_EXPECTED` (oczekiwano „na wprost”)

### M-2 Za mną
- **Składnia:** `Drużyna, za mną – MARSZ`
- **Pkt:** 24, 100
- **Warunki:** szyk marszowy (`E_PRECOND_FORMATION`, I-15); stoi i zasadnicza, albo marsz.
- **Efekt:** kierunkowy podąża śladem dowódcy w odległości 3 kroków, reszta jak w kolumnie. Gdy dowódca stanie, kierunkowy dochodzi na 3 kroki i drużyna maszeruje w miejscu (`W_FOLLOW_HALT`). Trwa do M-8, M-9, M-3 lub ZB-4.
- **Przykłady:** ✔ `Za mną – MARSZ` · ✖ w szeregu → `E_PRECOND_FORMATION`

### M-3 Marsz w miejscu
- **Składnia:** `W miejscu – MARSZ`
- **Pkt:** 27, 100
- **Warunki:** stoi i zasadnicza (szyk inny niż rozproszona), albo marsz.
- **Efekt:** z miejsca: marsz w miejscu od lewej nogi; z ruchu: jeszcze jeden krok w ruchu, potem marsz w miejscu. Szyk i odległości bez zmian.
- **Przykłady:** ✔ `W miejscu – MARSZ` · ✖ w biegu → `E_PRECOND_MOTION` (najpierw „Zwykły – KROK”)

### M-4 Na wprost
- **Składnia:** `Na wprost – MARSZ` · `Drużyna, na wprost – MARSZ`
- **Pkt:** 27, 74
- **Warunki:** marsz w miejscu, albo stoi i zasadnicza (szyk inny niż rozproszona).
- **Efekt:** z marszu w miejscu: jeszcze jeden krok w miejscu, potem marsz na wprost. Z miejsca: marsz na wprost do zatrzymania (ta sama komenda w dwóch kontekstach — dobry przykład zależności od stanu).
- **Przykłady:** ✔ `Na wprost – MARSZ`

### M-5 Bieg
- **Składnia:** `Biegiem – MARSZ`
- **Pkt:** 28
- **Warunki:** stoi i zasadnicza, albo marsz / marsz w miejscu.
- **Efekt:** bieg (0,9 m, 170 kroków/min) w bieżącym kierunku; z ruchu jeszcze jeden krok, potem bieg.
- **Przykłady:** ✔ `Biegiem – MARSZ`

### M-6 Krok zwykły
- **Składnia:** `Zwykły – KROK`
- **Pkt:** 28, 77, 82, 102
- **Warunki:** bieg, krok dowolny albo oczekiwanie po MS-2. Krok defiladowy → `E_RULE` („z defiladowego do zwykłego: SPOCZNIJ”, pkt 26). Stoi → `E_PRECOND_MOTION`.
- **Efekt:** z biegu: jeszcze trzy kroki biegiem, potem marsz krokiem zwykłym; z kroku dowolnego: powrót do marszu w nogę; po MS-2: przywrócenie pełnej długości kroku czoła (`awaitingQuickStep` wyczyszczone).
- **Przykłady:** ✔ `Zwykły – KROK` · ✖ w miejscu → `E_PRECOND_MOTION`

### M-7 Krok dowolny
- **Składnia:** `Dowolny – KROK`
- **Pkt:** 102
- **Warunki:** marsz (nie bieg).
- **Efekt:** marsz nie w nogę (losowe fazy kroku, z ziarnem), szyk zachowany.
- **Przykłady:** ✔ `Dowolny – KROK`

### M-8 Zatrzymanie
- **Składnia:** `Drużyna – STÓJ`
- **Pkt:** 29, 75, 100
- **Warunki:** marsz, marsz w miejscu, zachodzenie, „Za mną”. Bieg → `E_RULE` („zatrzymanie z biegu: najpierw Zwykły – KROK”, pkt 29). Stoi → `E_PRECOND_MOTION`. Samo `STÓJ` bez adresata: tryb łagodny — wykonane z uwagą `W_MISSING_ADDRESSEE` („Drużyna – STÓJ”, pkt 100); ścisły — `E_STRICT_FORM`.
- **Efekt:** jeszcze jeden krok (defiladowy), zatrzymanie, postawa zasadnicza; w szyku marszowym wszyscy jednocześnie, z zachowaniem odległości.
- **Przykłady:** ✔ `Drużyna – STÓJ` · ✖ w biegu → `E_RULE`

### M-9 Zmiana kierunku w marszu
- **Składnia:** `Kierunek – W LEWO (W PRAWO, W TYŁ NA PRAWO, W TYŁ NA LEWO, W LEWO W SKOS, W PRAWO W SKOS)` (kierunek jest hasłem — wielkie litery)
- **Pkt:** 30, 101
- **Warunki:** marsz lub bieg (`E_PRECOND_MOTION`).
- **Efekt:** szyk marszowy: kierunkowy robi trzy kroki na wprost, potem zmienia kierunek; reszta po jego śladzie. Szyk rozwinięty: wykonanie indywidualne z `W_DIRECTION_DEPLOYED` (I-3).
- **Przykłady:** ✔ `Kierunek – W LEWO` · ✖ (ścisły) `Kierunek – w lewo` → `E_STRICT_FORM` (hasło wielkimi literami) · ✖ stojąc → `E_PRECOND_MOTION` (z miejsca: M-1)

### M-10 Czoło stój
- **Składnia:** `Czoło – STÓJ`
- **Pkt:** 100
- **Warunki:** szyk marszowy; marsz.
- **Efekt:** czołowy żołnierz (dwójka) zatrzymuje się; następni dochodzą do poprzedników na odległość 1,2 m i zatrzymują się; wszyscy przyjmują postawę swobodną (I-17).
- **Przykłady:** ✔ `Czoło – STÓJ` · ✖ w szeregu → `E_PRECOND_FORMATION`

### M-11 Stawaj
- **Składnia:** `Stawaj – W LEWO (W PRAWO)`
- **Pkt:** 100
- **Warunki:** szyk marszowy; marsz.
- **Efekt:** czołowy (dwójka) zatrzymuje się i robi zwrot w nakazaną stronę; następni dochodzą, stają obok poprzedników w odstępie regulaminowym i robią ten sam zwrot. Wynik: rząd → szereg, kolumna dwójkowa → dwuszereg (pierwszy szereg = rząd po stronie zwrotu); front = kierunek marszu ∓ 90°; postawa swobodna.
- **Przykłady:** ✔ `Stawaj – W LEWO`

---

## MS. Zmiany szyku w marszu

### MS-1 Z kolumny dwójkowej w rząd
- **Składnia:** `W rząd – W TYŁ`
- **Pkt:** 77
- **Warunki:** kolumna dwójkowa; marsz.
- **Efekt:** żołnierze lewego rzędu przesuwają się w takt marszu za swoich prawych sąsiadów; dalsi żołnierze skracają krok, by zrobić miejsce. Wynik: rząd z odległościami 1,2 m.
- **Przykłady:** ✔ `W rząd – W TYŁ` · ✖ w rzędzie → `E_PRECOND_FORMATION`

### MS-2 Z rzędu w kolumnę dwójkową
- **Składnia:** `W dwójki – W PRZÓD`
- **Pkt:** 72, 77
- **Warunki:** rząd; marsz; odliczenie „do dwóch” wykonane w marszu (`countInMarch`) → inaczej `E_PRECOND_COUNT`.
- **Efekt:** dwójki przesuwają się w przód na lewo od poprzedników; czoło skraca krok bez komendy (`awaitingQuickStep`); dwójki dołączają i kryją dwójkę czołową. Gdy szyk osiągnie regulaminowe odstępy i odległości, a komendy „Zwykły – KROK” nie było: uwaga `W_AWAIT_QUICK_STEP` („podaj Zwykły – KROK”, pkt 77); do tego czasu kolumna maszeruje skróconym krokiem.
- **Przykłady:** ✔ `W dwójki – W PRZÓD` · ✖ bez odliczenia w marszu → `E_PRECOND_COUNT`

---

## X. Specjalne

### X-1 WRÓĆ
- **Składnia:** `WRÓĆ`
- **Pkt:** 13
- **Warunki:** istnieje poprzednia komenda w historii (`E_PRECOND_STATE`). Dozwolona także w trakcie czynności przejściowej i przy zwróconych głowach.
- **Efekt:** przerwanie bieżącej czynności i powrót drużyny do migawki sprzed ostatniej wykonanej komendy (szybka animacja przejścia); dowódca nie jest cofany. Kolejne WRÓĆ cofa o kolejną komendę (I-12).
- **Przykłady:** ✔ `WRÓĆ` · ✖ na początku sesji → `E_PRECOND_STATE`

---

## Poza MVP (rozpoznawane, nieobsługiwane)

Gramatyka rozpoznaje te komendy i zwraca `E_OUT_OF_SCOPE` z numerem punktu, żeby użytkownik wiedział, że komenda istnieje, a nie że jest błędna:

| Komenda (przykład) | Pkt |
|---|---|
| `Szeregowy Król` (wywołanie), `WYSTĄP`, `WSTĄP`, `DO MNIE` | 57–59 |
| `Na prawo – PATRZ`, `Na lewo – PATRZ` | 105, 107 |
| `Przez pierś – BROŃ`, `Na pas – BROŃ`, `Połóż – BROŃ`, `Za – BROŃ`, `Bagnet na – BROŃ` | 31–47, 109 |
| `Czapkę – ZDEJMIJ`, `Czapkę – WŁÓŻ` | 61 |
| `Druga drużyna, zagiąć skrzydło – MARSZ` | 80 |
| `Lewa – WOLNA`, `ŚPIEW`, `DOŚĆ` | 103–104 |
| `Funkcjami – OZNAJMIJ` | 72 |
| zbiórka w marszu (`…, za mną, w marszu – ZBIÓRKA`) | 69 |
| komendy plutonu, kompanii, batalionu, z pojazdami | 78–130 |

---

## Scenariusze akceptacyjne

Stan początkowy (o ile nie podano inaczej): N = 9, ziarno 1, dowódca w (0, 0) z frontem 0°, drużyna rozproszona w promieniu 10 m, tryb łagodny. Współrzędne: x na wschód, y na północ, metry. „Po wykonaniu” = po zakończeniu czynności przejściowych. Po każdej komendzie sprawdzane niezmienniki z SPEC 5.4.

| # | Kroki | Oczekiwany wynik |
|---|---|---|
| S01 | `Pierwsza drużyna, w szeregu – ZBIÓRKA` | szereg, front 0°, nr 1 w (−0,6; 0), nr k w (−0,6k; 0), wszyscy zasadnicza, stoi |
| S02 | S01 + `W prawo – ZWROT` | rząd, front 90°, czoło = nr 1, odległości 0,6 m, zasadnicza |
| S03 | S01 + `SPOCZNIJ` + `W prawo – ZWROT` | `E_PRECOND_POSTURE`, stan bez zmian (swobodna) |
| S04 | S01 + `W dwójki, w prawo – ZWROT` | `E_PRECOND_COUNT`, stan bez zmian |
| S05 | S01 + `Do dwóch – ODLICZ` + `BACZNOŚĆ` + `W dwójki, w prawo – ZWROT` | odliczanie: dymki 1,2,1,…,1 od prawego skrzydła, potem swobodna; po zwrocie kolumna dwójkowa, front 90°, prawy rząd = nr 1,3,5,7,9 na swoich miejscach, lewy rząd = nr 2,4,6,8 każdy 0,6 m na północ od nr 1,3,5,7; nr 9 bez pary |
| S06 | S05 + `W szereg, w lewo – FRONT` | szereg, front 0°, kolejność 1…9 z odstępem 0,6 m; dwójki nie zmieniły pozycji (tylko zwrot) |
| S07 | `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA` + `Kolejno – ODLICZ` | 1. szereg: nr 1–5, 2. szereg: nr 6–9 od prawej; dymki 1–5 tylko w 1. szeregu; lewoskrzydłowy 2. szeregu melduje „Niepełny”; wpis w Dzienniku; wszyscy swobodna |
| S08 | jak S07, N = 8 | brak meldunku „Niepełny” |
| S09 | `Pierwsza drużyna, w rzędzie – ZBIÓRKA` + `Drużyna, kierunek na wprost – MARSZ`, 10 s, `Drużyna – STÓJ` | pierwsze 3 kroki defiladowe, potem zwykły; odległości 1,2 m; po STÓJ rząd, zasadnicza, odległości 1,2 m, front 0° |
| S10 | S09 bez STÓJ + `Kierunek – W LEWO`, 15 s | wszyscy maszerują z frontem 270°, każdy na śladzie kierunkowego, odległości 1,2 m |
| S11 | S09 bez STÓJ + `Biegiem – MARSZ` + `Drużyna – STÓJ` → potem `Zwykły – KROK` + `Drużyna – STÓJ` | pierwsze STÓJ: `E_RULE`, bieg trwa; po „Zwykły – KROK” 3 kroki biegiem, marsz; drugie STÓJ wykonane |
| S12 | S01 + `Drużyna, trzy kroki w tył – MARSZ` → `Drużyna, krok w tył – MARSZ` | pierwsza: `E_RULE`; druga: cały szyk przesunięty o 0,7 m na południe, front 0° |
| S13 | S01 + `Od prawoskrzydłowego, dwa kroki – ODSTĄP` + `BACZNOŚĆ` + `Do prawoskrzydłowego – ŁĄCZ` | po ODSTĄP nr 1 na miejscu, odstępy 2,0 m, swobodna; po ŁĄCZ odstępy 0,6 m |
| S14 | S01 + `BACZNOŚĆ` + `Do prawoskrzydłowego – ŁĄCZ` | `E_PRECOND_STATE` |
| S15 | `Pierwsza drużyna, w dwuszeregu, na placu, prawe skrzydło na wysokości masztu, frontem do koszar – ZBIÓRKA` | dwuszereg; prawoskrzydłowy w punkcie zaczepienia masztu; front skierowany ku koszarom (±1°) |
| S16 | `Pierwsza drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA` | `E_PRECOND_FORMATION` |
| S17 | `Pierwsza drużyna, w dwuszeregu, na poprzednim miejscu – ZBIÓRKA` na starcie → potem S15 + `ROZEJŚĆ SIĘ` + ta sama komenda | pierwsza: `E_PRECOND_STATE`; ostatnia: pozycje i front jak w S15 |
| S18 | S02 + `WRÓĆ` | szereg, front 0°, pozycje jak w S01 |
| S19 | `w prawo zwrot` po S01 (łagodny) → to samo w trybie ścisłym | łagodny: wykonane, `I_NORMALIZED`, forma kanoniczna „W prawo – ZWROT”; ścisły: `E_STRICT_FORM` ze wskazaniem: wielka litera, brak myślnika, hasło małymi literami |
| S20 | `Druga drużyna – BACZNOŚĆ` (drużyna nazywa się „Pierwsza drużyna”) | `E_ADDRESSEE`, nikt nie reaguje |
| S21 | `Przez pierś – BROŃ` | `E_OUT_OF_SCOPE`, wskazany pkt 34 |
| S22 | `Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA` + `Drużyna, kierunek na wprost – MARSZ`, 10 s, `Stawaj – W LEWO` | dwuszereg z frontem 270°, pierwszy szereg = dawny lewy rząd, swobodna |
| S23 | S01 + `Drużyna, w prawo zachodź – MARSZ`, symulacja aż front ≈ 90°, `Drużyna – STÓJ` | szereg, front 90° (±3°), nr 1 w (−0,6; 0) z dokładnością 0,1 m, zasadnicza |
| S24 | `Pierwsza drużyna, w rzędzie – ZBIÓRKA` + `Drużyna, kierunek na wprost – MARSZ`, 5 s + `Do dwóch – ODLICZ` + `W dwójki – W PRZÓD`, czekaj na wyrównanie | kolumna dwójkowa w marszu; po wyrównaniu `W_AWAIT_QUICK_STEP`; po `Zwykły – KROK` normalny krok; następnie `W rząd – W TYŁ` → rząd, odległości 1,2 m |
| S25 | S01 + `Równaj – W PRAWO` + `W prawo – ZWROT` → `BACZNOŚĆ` + `W prawo – ZWROT` | pierwszy zwrot: `E_PRECOND_STATE` (głowy zwrócone); po BACZNOŚĆ zwrot wykonany |
| S26 | S02 + `Drużyna, kierunek na wprost – MARSZ`, 10 s + `Drużyna – STÓJ` + `W lewo – ZWROT` | szereg z odstępami 1,2 m, `irregularSpacing`; po `SPOCZNIJ` odstępy 0,6 m względem prawoskrzydłowego |
| S27 | `W szeregu – ZBIÓRKA` na starcie (bez wezwania) | `E_PRECOND_ATTENTION`; po `Pierwsza drużyna` (żołnierze zwracają się do dowódcy) ta sama komenda wykonana |

---

## Dane pomocnicze

### Obiekty terenowe

| Obiekt | Dopełniacz | Rola | Położenie orientacyjne (m) |
|---|---|---|---|
| maszt | masztu | punkt zaczepienia, cel frontu | (0, 25) |
| trybuna | trybuny | j.w. | (−30, 20) |
| koszary | koszar | j.w., cel rozejścia | (0, 60) |
| garaże | garaży | j.w. | (45, 10) |
| hangar | hangaru | j.w. | (60, −40) |
| magazyn | magazynu | j.w. | (−50, −30) |
| plac | — („na placu”) | teren | wokół środka |
| droga | — („na drodze”) | teren, oś wschód–zachód | y = −15 |

Przedpole obiektu (punkt zaczepienia „na placu”): 3 m od frontu obiektu w stronę środka placu.

### Skład osobowy (nazwiska z odmianą)

Stopień w MVP: szeregowy (dopełniacz: szeregowego). Skład losowany z ziarnem z listy:

| Mianownik | Dopełniacz | Mianownik | Dopełniacz |
|---|---|---|---|
| Nowak | Nowaka | Kowalski | Kowalskiego |
| Wiśniewski | Wiśniewskiego | Wójcik | Wójcika |
| Kamiński | Kamińskiego | Lewandowski | Lewandowskiego |
| Zieliński | Zielińskiego | Szymański | Szymańskiego |
| Woźniak | Woźniaka | Dąbrowski | Dąbrowskiego |
| Kozłowski | Kozłowskiego | Mazur | Mazura |
| Krawczyk | Krawczyka | Malinowski | Malinowskiego |
| Król | Króla | Wieczorek | Wieczorka |
| Stępień | Stępnia | Kalinowski | Kalinowskiego |
| Wierzbicki | Wierzbickiego | Szczygieł | Szczygła |
| Pawlak | Pawlaka | Michalski | Michalskiego |
| Sikora | Sikory | Baran | Barana |

Formy odmiany są zapisane w danych, nie generowane algorytmicznie.
