# Postęp prac

Etapy według `SPEC.md`, sekcja 10. Każdy etap kończy się wdrożoną wersją pod adresem **https://wotaker.github.io/musztra/** i podsumowaniem poniżej.

| Etap | Stan | Data ukończenia |
|---|---|---|
| E0 Szkielet | ✔ ukończony | 2026-10-19 |
| E1 Interpreter | ✔ ukończony | 2026-10-19 |
| E2 Stan i obraz | ✔ ukończony | 2026-10-20 |
| E3 Szyki w miejscu | ✔ ukończony | 2026-10-20 |
| E4 Ruch | ✔ ukończony | 2026-10-20 |
| EF Etap końcowy (dawne E5–E7, D-048) | w toku: K1 ✔, K2 —, K3 — | |

---

## EF Etap końcowy — postęp prac (do wznowienia po przerwie)

Zakres (decyzja autora, D-048): K1 LLM + ustawienia + CSP → K2 ściąga, podstawowe ćwiczenia, regulamin PDF z odnośnikami → K3 pierwsze uruchomienie, poprawka STÓJ na zakręcie kolumny, README. Po każdym kamieniu: testy, zielone CI, wdrożenie, wpis tutaj. Wszystko spoza zakresu → `docs/BACKLOG.md`.

Środowisko w chmurze: Node 26 z nodejs.org w `/opt/node26/…/bin` (dopisać do `PATH`); E2E lokalnie na preinstalowanym Chromium — `/opt/pw-browsers/chromium_headless_shell-1248` to dowiązania do wersji 1194 (obejście tylko w kontenerze, bez zmian w repozytorium i CI).

### K1 — LLM, ustawienia, CSP ✔ (2026-10-20)

- `src/llm/`: `prompt.ts` (prompt systemowy z katalogiem z danych, cache), `schema.ts` (walidacja JSON, objaśnienie ze strumienia), `client.ts` (SDK Anthropic, limit 15 s, błędy po polsku), `suggestion.ts` (kontrola propozycji przez interpreter).
- `src/ui/`: `SettingsPanel.tsx` + `settingsStore.ts` + `persist.ts` (klucz: sesja / urządzenie), `explainStore.ts` + `Explanation.tsx` („Objaśnij”, strumień, „Użyj”), `Dialog.tsx`; tryb zapisu przeniesiony do ustawień (wskaźnik w wierszu poleceń).
- CSP: wtyczka w `vite.config.ts` (tylko build). Mapa punkt → strona PDF: `src/core/regulationPages.ts` (z `scripts/regulation-pages.mjs`) — przygotowana dla K2.
- Testy: `tests/llm/*` (prompt, schemat, klient z zamockowanym `fetch`, propozycje), `tests/ui/persist.test.ts`, `tests/regulation/pages.test.ts`, `e2e/llm.spec.ts` (ustawienia, objaśnienia z atrapą API, zła propozycja, zły klucz, brak sieci, 15 s, intencja, auto-objaśnianie, CSP). Zmienione 3 testy w `e2e/command-line.spec.ts` — przełączanie trybu przez panel ustawień (D-054).
- Decyzje: D-048…D-054 (D-049…D-054 do akceptacji).
- Zrzuty: `docs/screenshots/k1-*.png`.

---

## E4 Ruch — podsumowanie (2026-10-20)

### Status

**✔ Ukończony.** Przechodzą `npm run lint`, `npm test` (879 testów, **0 testów „todo”** — wszystkie przykłady katalogu zależne od stanu są zwykłymi testami), `npm run build`, `npm run e2e` (32 testy). CI na GitHubie zielone, strona wdrożona przez CI.

- Wszystkie 20 testów „todo” etapu E4 (Z-1 w marszu, S-4 w rzędzie, M-2 w szeregu, M-3 w biegu, M-6 stojąc, M-8 w biegu, M-9 stojąc, M-10 w szeregu, MS-1 w rzędzie, MS-2 bez odliczenia w marszu — po 2 tryby) są zwykłymi testami.
- Scenariusze akceptacyjne E4: S09, S10, S11, S22, S23, S24, S26 — z kontrolą niezmienników SPEC 5.4. Wszystkie 27 scenariuszy z `COMMANDS.md` są teraz testami.
- Dodatkowe testy: rozpoczęcie marszu z każdego szyku (I-2 rozwieranie, I-3 kierunek w szyku rozwiniętym, w skos, w tył), zatrzymania (STÓJ, samo „STÓJ”, „Czoło – STÓJ”, „Stawaj”), marsz w miejscu i „Na wprost”, kroki (defiladowy, zwykły, dowolny), bieg, zmiana kierunku w kolumnie dwójkowej, „Za mną” z dowódcą, zachodzenie (I-13, blokada innych komend), odliczanie w marszu (I-4), WRÓĆ i rozejście w ruchu, determinizm marszu, ustępowanie dowódcy.
- **Zmieniony test (zgłoszenie zgodnie z CLAUDE.md):** test z E2 „poprawna komenda marszowa jest rozpoznana, ale jeszcze nie zmienia stanu” sprawdzał zachowanie przejściowe sprzed E4 (komendy marszowe czekały na E4). Od E4 jest odwrotnie, więc zastąpiłem go testem „od E4 komenda marszowa jest wykonywana” i testem, że każda komenda MVP ma etap ≤ E4. Analogicznie test E2E „komenda kolejnego etapu…” sprawdza teraz, że drużyna rusza. Żadnego testu nie usunięto bez zastępstwa.
- Zrzuty ekranu: `docs/screenshots/e4-*.png` (szereg w marszu, kolumna na zakręcie, bieg rzędu, zachodzenie, dwuszereg po „Stawaj”).

### 1. Co działa

- **Marsz**: „Drużyna, kierunek na wprost (w prawo, w lewo, w tył na prawo/lewo, w prawo/lewo w skos) – MARSZ”. Pierwsze trzy kroki defiladowe (w pasku „krok defiladowy”), potem krok zwykły; widać ruch nóg i rąk. Szereg i dwuszereg idą równo całym szykiem; rząd i kolumna dwójkowa — kierunkowy prowadzi, reszta po jego śladzie. Rząd utworzony zwrotem z szeregu (0,6 m) po ruszeniu sam rozwiera się do 1,2 m.
- **Zmiana kierunku**: „Kierunek – W LEWO (W PRAWO, W TYŁ NA PRAWO, …)” — kierunkowy robi trzy kroki, skręca po łuku, kolumna wchodzi w zakręt w tym samym miejscu. W szyku rozwiniętym — wykonanie indywidualne z uwagą (szereg staje się rzędem).
- **Zatrzymania**: „Drużyna – STÓJ” (jeszcze jeden krok, wszyscy jednocześnie, postawa zasadnicza); „Czoło – STÓJ” (czoło staje, reszta dochodzi, postawa swobodna); „Stawaj – W LEWO (W PRAWO)” (dochodzą, robią zwrot — z rzędu szereg, z kolumny dwuszereg).
- **Marsz w miejscu** („W miejscu – MARSZ”) i „Na wprost – MARSZ”; **bieg** („Biegiem – MARSZ”), „Zwykły – KROK” (z biegu jeszcze trzy kroki biegiem), „Dowolny – KROK” (marsz nie w nogę). BACZNOŚĆ w marszu → krok defiladowy, SPOCZNIJ → zwykły. STÓJ z biegu → błąd z pkt 29.
- **„Za mną – MARSZ”** (rząd, kolumna): kolumna idzie śladem dowódcy, którym sterujesz klawiszami (Esc, WASD); gdy dowódca stanie, drużyna dochodzi i maszeruje w miejscu (uwaga w Dzienniku).
- **Zachodzenie**: „Drużyna, w prawo (w lewo) zachodź – MARSZ” — szyk obraca się wokół skrzydłowego, aż do „Drużyna – STÓJ”.
- **Zmiany szyku w marszu**: „Do dwóch – ODLICZ” w rzędzie w marszu (liczby od czoła), „W dwójki – W PRZÓD” (dwójki wychodzą w lewo do przodu, czoło skraca krok; po wyrównaniu uwaga w Dzienniku „podaj Zwykły – KROK”), „W rząd – W TYŁ”.
- Pasek stanu pokazuje ruch („marsz”, „marsz w miejscu”, „bieg”, „zachodzenie”) i krok („krok defiladowy”, „krok dowolny”, „skrócony krok”, „za dowódcą”). Dowódca, którym nie sterujesz, odsuwa się z drogi maszerującej kolumny.

### 2. Lista kontrolna do ręcznego sprawdzenia w przeglądarce

Otwórz **https://wotaker.github.io/musztra/**, odśwież przed każdą sekcją. Kamera sama śledzi drużynę; kółkiem myszy możesz oddalić widok. Prędkość ⏱ 2× skraca czekanie.

**A. Marsz i zatrzymanie (S09, S10)**

1. `Pierwsza drużyna, w rzędzie – ZBIÓRKA` → rząd za dowódcą.
2. `Drużyna, kierunek na wprost – MARSZ` → rząd rusza na północ; przez pierwsze trzy kroki pasek pokazuje „krok defiladowy” (wyższy krok), potem zwykły; dowódca odsuwa się w bok, gdy kolumna do niego dochodzi. Pasek: „rząd · zasadnicza · marsz · front 0°”.
3. Po kilku sekundach `Kierunek – W LEWO` → kierunkowy robi trzy kroki, skręca w lewo po łuku; każdy kolejny żołnierz skręca w tym samym miejscu; po chwili wszyscy idą na zachód (front 270°).
4. `Drużyna – STÓJ` → jeszcze jeden krok i wszyscy stają jednocześnie, postawa zasadnicza, odległości równe.
5. `Drużyna – STÓJ` jeszcze raz → ✖ „Drużyna stoi. Nie ma czego zatrzymywać.”

**B. Bieg i kroki (S11)**

6. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, `Biegiem – MARSZ` → rząd biegnie (szybciej, krótszy wymach rąk), pasek „bieg”.
7. `Drużyna – STÓJ` → ✖ „Z biegu nie zatrzymuje się drużyny: najpierw „Zwykły – KROK”…” (pkt 29); bieg trwa.
8. `Zwykły – KROK` → jeszcze trzy kroki biegiem, potem marsz. `Dowolny – KROK` → żołnierze idą nie w nogę (różne fazy kroku), pasek „krok dowolny”. `Zwykły – KROK` → znów w nogę.
9. `BACZNOŚĆ` → krok defiladowy (pasek „krok defiladowy”); `Zwykły – KROK` → ✖ „…przechodzi się komendą SPOCZNIJ” (pkt 26); `SPOCZNIJ` → krok zwykły.
10. `W miejscu – MARSZ` → jeszcze krok i marsz w miejscu (nogi pracują, kolumna stoi), pasek „marsz w miejscu”. `Na wprost – MARSZ` → rusza dalej. `Drużyna – STÓJ`.

**C. Kolumna dwójkowa, „Stawaj” (S22) i „Czoło – STÓJ”**

11. `Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA`, `Drużyna, kierunek na wprost – MARSZ`, po kilku sekundach `Kierunek – W PRAWO W SKOS` → kolumna skręca o 45°, pary zostają razem.
12. `Stawaj – W LEWO` → czoło staje, kolejne pary dochodzą blisko i kolejno robią zwrot w lewo → dwuszereg, pierwszy szereg to dawny lewy rząd, postawa swobodna; pasek „dwuszereg · swobodna · stoi” i „odstępy nieregulaminowe”. `SPOCZNIJ` → szeregi rozsuwają się na regulaminową odległość.
13. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, `Drużyna, kierunek na wprost – MARSZ`, `Czoło – STÓJ` → kierunkowy staje, pozostali dochodzą na 1,2 m i stają; wszyscy w postawie swobodnej.

**D. Zachodzenie (S23)**

14. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Drużyna, w prawo zachodź – MARSZ` → Wieczorek (prawe skrzydło) drepcze w miejscu, reszta szeregu zatacza łuk; pasek „zachodzenie”, front rośnie.
15. W trakcie `Kierunek – W PRAWO` → ✖ „Drużyna zachodzi — zachodzenie trwa do komendy Drużyna – STÓJ”.
16. Gdy pasek pokaże ok. „front 90°” — `Drużyna – STÓJ` → szereg stoi frontem na wschód, Wieczorek na swoim miejscu.

**E. Zmiany szyku w marszu (S24)**

17. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, `Drużyna, kierunek na wprost – MARSZ`.
18. `W dwójki – W PRZÓD` → ✖ „…potrzebne jest odliczenie „do dwóch” w marszu…”.
19. `Do dwóch – ODLICZ` → w marszu, od czoła, dymki 1, 2, 1, 2…; marsz bez zmiany tempa.
20. `W dwójki – W PRZÓD` → dwójki wychodzą w lewo i do przodu obok swoich jedynek, czoło idzie skróconym krokiem (pasek „skrócony krok”); po wyrównaniu w Dzienniku uwaga „Kolumna wyrównała odstępy… podaj Zwykły – KROK” (W_AWAIT_QUICK_STEP).
21. `Zwykły – KROK` → normalny krok. `W rząd – W TYŁ` → lewy rząd zwalnia i wchodzi za prawych sąsiadów, dalsi skracają krok; powstaje rząd z odległościami 1,2 m. `Drużyna – STÓJ`.

**F. „Za mną” i dowódca**

22. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Za mną – MARSZ` → ✖ „„Za mną – MARSZ” podaje się drużynie w rzędzie lub kolumnie dwójkowej…” (I-15).
23. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, `Za mną – MARSZ` (pasek „za dowódcą”), potem **Esc** i chodź dowódcą (W, A, D, łuki, Shift) → kierunkowy idzie dokładnie po śladzie dowódcy, 3 kroki za nim, reszta za kierunkowym.
24. Zatrzymaj dowódcę → kolumna dochodzi i maszeruje w miejscu; w Dzienniku „Dowódca stanął — drużyna maszeruje w miejscu…”. Ruszysz — idą dalej.
25. **Enter**, `Drużyna – STÓJ` → drużyna staje.

**G. Pozostałe reguły**

26. W marszu: `W prawo – ZWROT`, `W szeregu – ZBIÓRKA`, `Równaj – W PRAWO` → ✖ „Drużyna maszeruje… Najpierw zatrzymaj ją: Drużyna – STÓJ” (`E_PRECOND_MOTION`).
27. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `W prawo – ZWROT`, `Drużyna, kierunek na wprost – MARSZ` → rząd rozwiera się (tylni ruszają, gdy poprzednik oddali się na 1,2 m); flaga „odstępy nieregulaminowe” znika po rozwarciu. `Drużyna – STÓJ`, `W lewo – ZWROT` → szereg z odstępami 1,2 m; `SPOCZNIJ` → 0,6 m (S26).
28. W marszu `WRÓĆ` → drużyna szybko wraca na miejsce sprzed ostatniej komendy (po ruszeniu — do postoju). `ROZEJŚĆ SIĘ` w marszu → żołnierze się rozchodzą.
29. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Drużyna, kierunek w prawo – MARSZ` → ⚠ „Szyk rozwinięty zmienia kierunek marszu indywidualnie…”; po trzech krokach każdy skręca w prawo i szereg idzie jako rząd na wschód.

### 3. Decyzje i otwarte pytania

Decyzje (szczegóły w `docs/DECISIONS.md`; wszystkie zatwierdzone 2026-10-20):

- D-040 Dowódca niesterowany klawiszami ustępuje maszerującym.
- D-041 Model ruchu ciągłego (ślad kierunkowego, łuk 0,6 m, rozwieranie i doganianie, „jeszcze jeden krok”, czynności przejściowe w ruchu, WRÓĆ w ruchu).
- D-042 Warunki ruchu tam, gdzie `COMMANDS.md` milczy (`E_PRECOND_MOTION`, `W_NO_EFFECT`).
- D-043 Zachodzenie: tempo, STÓJ bez dodatkowego kroku.
- D-044 „Stawaj” (szeregi 0,6 m — nieregularne do SPOCZNIJ) i „Czoło – STÓJ” bez cofania.
- D-045 „Za mną”: ślad dowódcy, kiedy pojawia się W_FOLLOW_HALT.
- D-046 Szyk rozwinięty „w skos”: rzut ukośny, nieregularny do SPOCZNIJ.
- D-047 Propozycje doprecyzowań w `COMMANDS.md` — przeniesione do backlogu (zob. p. 5).

Interpretacje E4 — każda jako osobna reguła w `src/core/interpretations.ts`: I-2 (rozwieranie po ruszeniu, `marchDepth`), I-3 (`deployedDirectionIsIndividual`), I-5 (`COLUMN_FOLLOWS_GUIDE_TRAIL`), I-13 (`WHEEL_ANGLE_LIMIT`), I-15 (`followAllowed`), I-17 (`POSTURE_AFTER_HEAD_HALT`). Wszystkie I-1…I-17 działają.

Otwarte pytania: zob. D-047.

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · CI: https://github.com/Wotaker/musztra/actions

### 5. Po bramce E4 (2026-10-20)

- Autor zatwierdził wszystkie decyzje etapu E4 (D-040…D-047). Etap zamknięty.
- Propozycje usprawnień — w tym doprecyzowania `COMMANDS.md` z D-047, znane ograniczenia (STÓJ w trakcie zakrętu kolumny, przenikanie żołnierzy przy zbiórce, brak drobnego ruchu po rozejściu) i pomysły na wygląd, interfejs i testy — przeniesione do **`docs/BACKLOG.md`** (decyzja autora). `COMMANDS.md` i `SPEC.md` bez zmian.
- Następny etap: E5 Nauka (podpowiedzi, szuflada katalogu, „czy chodziło o”, ustawienia, pierwsze uruchomienie).

---

## E3 Szyki w miejscu — podsumowanie (2026-10-20)

### Status

**✔ Ukończony.** Przechodzą `npm run lint`, `npm test` (813 testów; 20 testów „todo” — wyłącznie etap E4), `npm run build`, `npm run e2e` (28 testów; lokalnie na preinstalowanym Chromium, testy E2E etapów E2–E3 dodatkowo 3× z rzędu bez błędu). CI na GitHubie zielone, strona wdrożona przez CI.

Wszystkie 12 testów „todo” etapu E3 są zwykłymi testami (R-1 w kolumnie, R-2 w postawie swobodnej, O-1 z nazwiskiem spoza składu, O-2 bez ODSTĄP, S-1 bez odliczenia, S-1 w dwuszeregu — po 2 tryby zapisu). Scenariusze akceptacyjne E3: S04, S05, S06, S07, S08, S12, S13, S14, S25 — po każdej komendzie sprawdzane niezmienniki SPEC 5.4. Dodatkowe testy: numeracja „do n”, odliczanie w złym szyku, w trakcie (E_BUSY), unieważnianie odliczenia, „Równaj – W LEWO”, blokada przy zwróconych głowach, dwójki dla N parzystego, przesunięcie o 6 kroków i w kolumnie, odstępowanie w jedną stronę, od nazwiska (gest „Jestem”), w dwuszeregu, biegiem, łączenie do wskazanego żołnierza.

Uwagi UI na później: w `PROGRESS.md` nie było takiej sekcji (zob. E2 i D-032) — nie było czego realizować.

Zrzuty ekranu: `docs/screenshots/e3-*.png` (odliczanie z dymkami, meldunek „Niepełny”, kolumna dwójkowa z szeregu, „Jestem” przy odstępowaniu, szereg po odstąpieniu, równanie).

### 1. Co działa

- **Odliczanie** („Kolejno – ODLICZ”, „Do dwóch (trzech, …) – ODLICZ”): żołnierze pierwszego szeregu kolejno od prawego skrzydła podają liczby — nad głowami pojawiają się dymki z liczbami co pół sekundy, głowy obracają się jak w pkt 72. Drugi szereg przejmuje liczby poprzedników. W niepełnym dwuszeregu lewoskrzydłowy drugiego szeregu melduje **„Niepełny”** (żółty dymek). Potem wszyscy przyjmują postawę swobodną. Liczbę każdego żołnierza widać po najechaniu myszą.
- **Równanie** („Równaj – W PRAWO / W LEWO”): wszyscy poza skrzydłowym zwracają głowy, szyk drobnymi krokami wyrównuje się do skrzydłowego (np. nierówne odstępy po zwrocie z rzędu). Dopóki głowy są zwrócone, przyjmowane są tylko BACZNOŚĆ, WRÓĆ i ROZEJŚĆ SIĘ.
- **Dwójki**: z szeregu po „Do dwóch – ODLICZ” i BACZNOŚĆ — „W dwójki, w prawo – ZWROT”: jedynki robią zwrot, dwójki wykrok w skos na lewo od jedynek → kolumna dwójkowa. „W szereg, w lewo – FRONT” — z powrotem do szeregu (samotna jedynka staje na lewo od ostatniej dwójki).
- **Przesunięcie**: „Drużyna, krok na wprost (w tył) – MARSZ”, „Drużyna, trzy (sześć…) kroki na wprost – MARSZ” — cały szyk przesuwa się bez zmiany frontu; w tył o więcej niż krok — błąd z pkt 74.
- **Odstępowanie i łączenie**: „Od prawoskrzydłowego (lewoskrzydłowego), dwa kroki (, biegiem) – ODSTĄP”, „Od szeregowego Barana (, w lewo), krok – ODSTĄP” — wskazany mówi „Jestem” i unosi lewą rękę (wyraźny żółty znacznik; w dwuszeregu także kryjący go żołnierz), pozostali robią zwrot, odchodzą i zatrzymują się kolejno, wracają frontem, stają swobodnie. „Do prawoskrzydłowego (szeregowego X) – ŁĄCZ” — po BACZNOŚĆ szyk wraca do odstępów 0,6 m.
- **Dziennik** po prawej stronie: komendy z ikoną wyniku (✔ ⚠ ✖) i kodem problemu, meldunki („szer. Woźniak: Niepełny”, „szer. Baran: Jestem”) i zgrupowane odliczanie („Odliczanie: Wieczorek 1 · Nowak 2 · …”). Klik w komendę wstawia ją do wiersza poleceń; nagłówek zwija i rozwija panel.
- Pasek stanu pokazuje dodatkowo „odliczona kolejno / do 2”, „odstąpiona”, „głowy zwrócone”, a w trakcie — „odliczanie”, „równanie”, „formowanie dwójek”, „formowanie szeregu”, „przesunięcie”, „odstępowanie”, „łączenie”.
- Wszystko z E2 działa jak wcześniej (komendy marszowe nadal tylko rozpoznawane — E4).

### 2. Lista kontrolna do ręcznego sprawdzenia w przeglądarce

Otwórz **https://wotaker.github.io/musztra/**, odśwież przed każdą sekcją. Skład: nr 1 Wieczorek, 2 Nowak, 3 Krawczyk, 4 Baran, 5 Sikora, 6 Zieliński, 7 Król, 8 Kalinowski, 9 Woźniak. Czekaj, aż w pasku stanu zniknie pulsująca nazwa czynności, zanim wpiszesz kolejną komendę.

**A. Odliczanie i „Niepełny”**

1. `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA` → dwuszereg 5 + 4.
2. `Kolejno – ODLICZ` → w pasku „odliczanie”; nad pierwszym szeregiem od prawej (przy dowódcy) kolejno dymki **1, 2, 3, 4, 5** co pół sekundy; drugi szereg milczy; potem nad lewym żołnierzem drugiego szeregu żółty dymek **„Niepełny”**; wszyscy przechodzą w postawę swobodną (jaśnieją). Dziennik: „Odliczanie: Wieczorek 1 · Nowak 2 · Krawczyk 3 · Baran 4 · Sikora 5” i „szer. Woźniak: Niepełny”. Pasek: „… swobodna … niepełny · odliczona kolejno”.
3. Najedź na żołnierza drugiego szeregu za Nowakiem → „szer. Król · nr 7 · odliczenie: 2”.
4. `Kolejno – ODLICZ` jeszcze raz → ✖ „Drużyna stoi w postawie swobodnej… najpierw BACZNOŚĆ” (pkt 11).
5. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, potem `Kolejno – ODLICZ` → ✖ „Odliczanie w miejscu wykonuje się w szeregu lub dwuszeregu…” (`E_PRECOND_FORMATION`).

**B. Dwójki (S05, S06)**

6. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, potem `W dwójki, w prawo – ZWROT` → ✖ „…potrzebne jest odliczenie „do dwóch”…” (`E_PRECOND_COUNT`).
7. `Do dwóch – ODLICZ` → dymki 1, 2, 1, 2, …, 1 od prawego skrzydła; postawa swobodna.
8. `W dwójki, w prawo – ZWROT` → ✖ najpierw BACZNOŚĆ. `BACZNOŚĆ`, potem `W dwójki, w prawo – ZWROT` → jedynki obracają się w prawo w miejscu, dwójki robią wykrok w skos i stają na północ od jedynek (po lewej ręce nowego frontu); pasek „kolumna dwójkowa · zasadnicza · stoi · front 90° · niepełna”; Woźniak (nr 9) bez pary na końcu kolumny.
9. `W szereg, w lewo – FRONT` → dwójki obracają się w lewo, jedynki wykrokiem stają po ich prawej, Woźniak na lewym końcu; szereg frontem na północ, równe odstępy, przesunięty o jeden odstęp na północ i w prawo względem pierwotnego.
10. `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA`, `W prawo – ZWROT`, `W szereg, w lewo – FRONT` → ✖ „Kolumnę dwójkową utworzoną z dwuszeregu zamienia się w dwuszereg komendą „W lewo – ZWROT”…”.

**C. Równanie (S25)**

11. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, potem `W lewo – ZWROT` → szereg z dużymi odstępami, pasek „odstępy nieregulaminowe”.
12. `Równaj – W PRAWO` → wszyscy poza prawoskrzydłowym obracają głowy w prawo, drobnymi krokami dosuwają się do niego; pasek „głowy zwrócone”.
13. `W prawo – ZWROT` → ✖ „Żołnierze mają zwrócone głowy… podaj BACZNOŚĆ” (`E_PRECOND_STATE`).
14. `BACZNOŚĆ` → głowy na wprost; `W prawo – ZWROT` → wykonane.
15. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Równaj – W LEWO` → wszyscy poza lewoskrzydłowym (Woźniak) obracają głowy w lewo.

**D. Przesunięcie (S12)**

16. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Drużyna, trzy kroki w tył – MARSZ` → ✖ „Szyk przesuwa się w tył najwyżej o krok…” (pkt 74).
17. `Drużyna, krok w tył – MARSZ` → cały szereg cofa się o krok, nadal frontem na północ.
18. `Drużyna, sześć kroków na wprost – MARSZ` → szereg maszeruje sześć kroków (pierwsze trzy defiladowym — wyższy krok) i staje w postawie zasadniczej.

**E. Odstępowanie i łączenie (S13, S14)**

19. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `BACZNOŚĆ` (bez skutku), `Do prawoskrzydłowego – ŁĄCZ` → ✖ „Nie było odstępowania…”.
20. `Od prawoskrzydłowego, dwa kroki – ODSTĄP` → Wieczorek stoi, pozostali obracają się w lewo, odchodzą i zatrzymują się kolejno (dalsi później), wracają frontem; odstępy ok. 2 m; postawa swobodna; pasek „odstąpiona”.
21. `Do prawoskrzydłowego – ŁĄCZ` → ✖ najpierw BACZNOŚĆ. `BACZNOŚĆ`, `Do prawoskrzydłowego – ŁĄCZ` → wszyscy wracają do Wieczorka, odstępy jak po zbiórce, postawa swobodna.
22. `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA`, `Od szeregowego Krawczyka, dwa kroki – ODSTĄP` → nad Krawczykiem dymek **„Jestem”**, Krawczyk i żołnierz za nim (Kalinowski) unoszą lewą rękę (żółty znacznik na ok. sekundę); potem obie strony odstępują od Krawczyka, drugi szereg kryje. Dziennik: „szer. Krawczyk: Jestem”.
23. `BACZNOŚĆ`, `Do szeregowego Krawczyka – ŁĄCZ` → szyk wraca do odstępów 0,6 m wokół Krawczyka.
24. `Od szeregowego Zielińskiego, krok – ODSTĄP` (Zieliński jest w drugim szeregu) → ✖ „…stoi w drugim szeregu…”. `Od szeregowego Zawadzkiego, krok – ODSTĄP` → ✖ „Szeregowego Zawadzkiego nie ma w składzie drużyny. Skład: …”.
25. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Od szeregowego Barana, w lewo, krok – ODSTĄP` → Baran mówi „Jestem”, odstępują tylko żołnierze na lewo od niego; Wieczorek, Nowak i Krawczyk stoją w miejscu.
26. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, `Od lewoskrzydłowego, pięć kroków, biegiem – ODSTĄP` → Woźniak (lewe skrzydło) stoi, pozostali biegną w prawo (szybciej niż marszem), odstępy ok. 4,1 m.

**F. Dziennik, WRÓĆ, sterowanie**

27. Wpisz kilka komend, w tym błędną → w Dzienniku ✔/✖ z kodem; kliknij wpis → komenda wraca do wiersza poleceń, kursor w wierszu.
28. Kliknij nagłówek „Dziennik” → panel się zwija (zostaje licznik wpisów); po odświeżeniu strony pozostaje zwinięty; kliknij znowu → rozwija się.
29. W trakcie odliczania wpisz `BACZNOŚĆ` → ✖ `E_BUSY`; `WRÓĆ` → odliczanie przerwane, drużyna w postawie zasadniczej bez liczb.
30. Po odstąpieniu `WRÓĆ` → żołnierze szybko wracają do szeregu sprzed odstępowania.
31. Sterowanie dowódcą (Esc, WASD, Shift, Q/E, Enter) działa jak w E2; Dziennik nie przeszkadza w kadrowaniu (kamera omija jego obszar).

### 3. Decyzje i otwarte pytania

Decyzje (szczegóły w `docs/DECISIONS.md`):

- D-033 Odstępowanie i łączenie: strona = kierunek ruchu, „Jestem” i gest, drugi szereg kryje, łączenie zawsze do odstępów regulaminowych — **do akceptacji**.
- D-034 Odliczanie: czas odzywek, liczby drugiego szeregu, grupowanie w Dzienniku, kiedy odliczenie pozostaje ważne — **do akceptacji**.
- D-035 Równanie w dwuszeregu (skrzydłowy każdego szeregu bez zwrotu głowy).
- D-036 Dwójki w miejscu: pary według liczb z odliczania — **do akceptacji**.
- D-037 Przesunięcie szyku (czas, trzy kroki defiladowe).
- D-038 Dziennik.
- D-039 Propozycje doprecyzowań w `COMMANDS.md` (dokumentu nie zmieniano).

W E3 działają dodatkowo interpretacje I-4 (odliczanie w miejscu tylko w szyku rozwiniętym), I-8 (samotna jedynka) i I-14 (postawa swobodna po ŁĄCZ) — każda jako osobna reguła w `src/core/interpretations.ts`.

Otwarte pytania: patrz „Do akceptacji” w `DECISIONS.md` (D-024…D-029, D-032…D-039).

**Po bramce E3 (2026-10-20):** autor zatwierdził wszystkie decyzje D-022…D-039, w tym propozycje D-032 i D-039 — wprowadzone do `COMMANDS.md` (R-2: unieważnianie odliczenia i szyk odwrócony; O-1: strona odstępowania; O-2: łączenie w całym szyku; S-1: pary według liczb; „Dane pomocnicze”: wymiary i orientacja obiektów) i `SPEC.md` (5.4: żołnierz bez pary w szyku odwróconym; 5.5: lista czynności przejściowych). „Uwagi UI na później” — po ukończeniu wszystkich etapów (decyzja autora).

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · CI: https://github.com/Wotaker/musztra/actions

---

## E2 Stan i obraz — podsumowanie (2026-10-20)

### Status

**✔ Ukończony.** Przechodzą `npm run lint`, `npm test` (wszystkie testy E2 zwykłe; 32 testy „todo” zostają tylko dla E3 i E4), `npm run build`, `npm run e2e` (22 testy; lokalnie na preinstalowanym Chromium). CI na GitHubie zielone, strona wdrożona przez CI.

Wszystkie 8 testów „todo” etapu E2 są zwykłymi testami (Z-1 w postawie swobodnej, ZB-1 bez wezwania, ZB-3 na początku sesji, WRÓĆ na początku sesji — po 2 tryby zapisu). Scenariusze akceptacyjne E2: S01, S02, S03, S15, S16, S17, S18, S19, S20, S27 — po każdej komendzie sprawdzane niezmienniki SPEC 5.4. Dodatkowo testy: zbiórki we wszystkich szykach dla N = 3, 4, 9, 12; zwroty z każdego szyku w każdą stronę (N = 8 i 9); determinizm (prędkość 0,5×–3×, 30–144 klatek/s); reguły warunków (E_BUSY, wezwanie, postawa, WRÓĆ, rozejście); kamera.

Uwaga do polecenia: w `PROGRESS.md` nie było sekcji „Uwagi UI na później” (sprawdzone 2026-10-19), więc nie było takich uwag do realizacji w E2 ani E3 — zob. D-032.

Zrzuty ekranu: `docs/screenshots/e2-*.png` (start, zbiórka w biegu, dwuszereg po zbiórce, kolumna dwójkowa, zbiórka przy maszcie, dowódca w ruchu).

### 1. Co działa

- Na placu widać **drużynę (9 żołnierzy)** rozproszoną wokół dowódcy, **dowódcę** (ciemniejszy mundur, złote naramienniki, jasne kółko pod nim), drogę na południu i obiekty terenowe: maszt z flagą, trybunę, koszary, garaże, hangar, magazyn. Obiekty poza kadrem wskazują etykiety przy krawędzi ekranu ze strzałką i odległością („koszary · 60 m”). Nazwa obiektu na placu pojawia się po najechaniu myszą (albo stale przy dużym zbliżeniu).
- Komendy są **wykonywane na placu**: wezwanie, BACZNOŚĆ, SPOCZNIJ (z samoczynnym wyrównaniem), zwroty, trzy sposoby zbiórki (przy dowódcy, przy obiekcie, na poprzednim miejscu), ROZEJŚĆ SIĘ (także „Do koszar, biegiem – …”), WRÓĆ.
- Żołnierze biegną na zbiórkę z animacją kroków i rąk, omijają dowódcę, stają w szyku frontem jak dowódca. Postawa swobodna jest widoczna (jaśniejszy mundur, wysunięta lewa stopa).
- **Pasek stanu** u góry: „Pierwsza drużyna · Stan: dwuszereg · zasadnicza · stoi · front 0°”, dodatkowe oznaczenia (np. „niepełny”, „odstępy nieregulaminowe”) i pulsująca nazwa czynności w toku („zbiórka”, „zwrot”…).
- **Panel informacji zwrotnej**: „✔ Wykonano”, „⚠ Wykonano, z uwagą” (np. zwrot w nieregulaminową stronę), „⚠ Bez zmian”, a dla błędów — dlaczego komendy nie da się wykonać w tym stanie, z punktem regulaminu (np. „Drużyna stoi w postawie swobodnej… najpierw BACZNOŚĆ”, pkt 11). Komendy marszowe (etap E4) są rozpoznawane, ale panel mówi, że wykonanie dojdzie w E4.
- W trakcie zbiórki, zwrotu itp. inne komendy są odrzucane („Drużyna jeszcze wykonuje…”), ale **WRÓĆ** przerywa czynność i szybko przywraca stan sprzed ostatniej komendy; kolejne WRÓĆ cofa dalej. Dowódca nie jest cofany.
- **Dwa tryby klawiatury**: Komenda (pisanie) i Ruch (sterowanie dowódcą). Esc albo klik w plac → Ruch: WASD/strzałki (8 kierunków), Shift — bieg, Q/E — obrót o 45°. Enter albo / → z powrotem do pisania. Tryb widać na przycisku w pasku (bursztynowy w trybie Ruch) i po przygaszonym wierszu poleceń.
- **Kamera** płynnie kadruje drużynę i dowódcę; kółko myszy przybliża/oddala (do kolejnego dużego ruchu). Gdy dowódca odejdzie daleko, kamera zostaje przy drużynie, a strzałka „dowódca” na krawędzi ekranu pokazuje, gdzie jest.
- Najechanie na żołnierza pokazuje jego nazwisko i numer w składzie. Przycisk „Role” oznacza prawoskrzydłowego (P), lewoskrzydłowego (L), kierunkowego (K). Przycisk „⏱ 1×” zmienia prędkość symulacji (0,5×, 1×, 2×, 3×).
- Skład (stały do E5): nr 1 Wieczorek, 2 Nowak, 3 Krawczyk, 4 Baran, 5 Sikora, 6 Zieliński, 7 Król, 8 Kalinowski, 9 Woźniak.

### 2. Lista kontrolna do ręcznego sprawdzenia w przeglądarce

Otwórz **https://wotaker.github.io/musztra/** (najlepiej odśwież stronę przed każdą sekcją). Komendy wpisuj i zatwierdzaj Enterem.

**A. Zbiórki i postawy**

1. Po otwarciu → 9 żołnierzy stoi swobodnie w różnych kierunkach wokół dowódcy (środek), pasek: „Stan: rozproszona · swobodna · stoi”; przy krawędziach etykiety obiektów (trybuna, maszt, koszary, garaże, magazyn, hangar).
2. `W szeregu – ZBIÓRKA` → ✖ „Komenda niewykonalna”: drużyna nie została wezwana (pkt 69), `E_PRECOND_ATTENTION`; nikt się nie rusza.
3. `Pierwsza drużyna` → żołnierze odwracają się twarzą do dowódcy i przyjmują postawę zasadniczą (ciemniejszy obrys, stopy razem).
4. `W szeregu – ZBIÓRKA` → żołnierze biegną (widać kroki i ruch rąk), omijają dowódcę i stają **w jednej linii po lewej stronie dowódcy**, frontem na północ; w pasku przez chwilę „zbiórka”, potem „Stan: szereg · zasadnicza · stoi · front 0°”.
5. `SPOCZNIJ` → wszyscy jaśnieją, lewa stopa wysunięta (postawa swobodna); pasek „swobodna”.
6. `W prawo – ZWROT` → ✖ „Drużyna stoi w postawie swobodnej… najpierw BACZNOŚĆ”, pkt 11.
7. `BACZNOŚĆ`, potem `BACZNOŚĆ` jeszcze raz → za drugim razem „⚠ Bez zmian: Drużyna już stoi w postawie zasadniczej”.
8. `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA` → dwa szeregi: z przodu 5 żołnierzy, z tyłu 4, wyrównani do prawej; pasek „dwuszereg … niepełny”.
9. `Drużyna, w kolumnie dwójkowej – ZBIÓRKA` → kolumna par za dowódcą (prawy rząd tuż za nim), ostatni żołnierz bez pary na końcu.
10. `Pierwsza drużyna, w rzędzie – ZBIÓRKA` → jeden rząd za dowódcą, 3 kroki odstępu od dowódcy.

**B. Zwroty i WRÓĆ**

11. `Pierwsza drużyna, w szeregu – ZBIÓRKA`, potem `W prawo – ZWROT` → każdy obraca się w miejscu w prawo; pasek „rząd · … · front 90°” i „odstępy nieregulaminowe” (rząd z szeregu ma 0,6 m odległości).
12. `WRÓĆ` → żołnierze szybko wracają do szeregu frontem na północ.
13. `W lewo – ZWROT` → wykonane z uwagą ⚠ „Rząd i kolumnę z szeregu formuje się zwrotem w prawo…” (pkt 76).
14. `W tył – ZWROT` (po powrocie do szeregu przez WRÓĆ) → obrót przez lewe ramię, front 180°.
15. `Pierwsza drużyna, w rzędzie – ZBIÓRKA`, `W lewo – ZWROT` → szereg z dużymi odstępami (1,2 m), pasek „odstępy nieregulaminowe”; `SPOCZNIJ` → żołnierze dosuwają się drobnymi krokami do prawoskrzydłowego.
16. Wpisz `Pierwsza drużyna, w dwuszeregu – ZBIÓRKA` i od razu, w trakcie biegu, `W prawo – ZWROT` → ✖ „Drużyna jeszcze wykonuje poprzednią komendę…” (`E_BUSY`); `WRÓĆ` → zbiórka przerwana, żołnierze wracają na miejsca sprzed zbiórki.
17. Na początku (po odświeżeniu) `WRÓĆ` → ✖ „Nie ma czego cofać” (`E_PRECOND_STATE`).

**C. Zbiórka we wskazanym miejscu i rozejście**

18. `Pierwsza drużyna, w dwuszeregu, na poprzednim miejscu – ZBIÓRKA` na starcie → ✖ „Nie było jeszcze zbiórki…”.
19. `Pierwsza drużyna, w dwuszeregu, na placu, prawe skrzydło na wysokości masztu, frontem do koszar – ZBIÓRKA` → drużyna biegnie na północ i staje przed masztem (biało-czerwona flaga), frontem do koszar (na północ); kamera obejmuje drużynę i dowódcę.
20. `ROZEJŚĆ SIĘ` → żołnierze rozchodzą się spacerem 8–15 m w różne strony i stoją swobodnie; pasek „rozproszona”.
21. `Pierwsza drużyna, w dwuszeregu, na poprzednim miejscu – ZBIÓRKA` → drużyna wraca dokładnie na miejsce przy maszcie, frontem do koszar.
22. `Do garaży, biegiem – ROZEJŚĆ SIĘ` → żołnierze biegną na wschód, pod garaże.
23. `Drużyna, w rzędzie, czoło na wysokości garaży – ZBIÓRKA` → rząd z kierunkowym przed garażami. `Drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA` → ✖ „„Czoło” dotyczy kolumny…”.
24. `Druga drużyna – BACZNOŚĆ` → ⚠ „Nikt nie reaguje”.

**D. Dowódca, kamera, widok**

25. Naciśnij **Esc** → przycisk w pasku zmienia się na bursztynowy „Ruch: WASD Shift Q/E · Enter”, wiersz poleceń przygasa.
26. Przytrzymaj **D** → dowódca idzie na wschód (kroki, ruch rąk), obraca się frontem w stronę ruchu; z **Shift** biegnie szybciej. **W**, **A**, **S** i ich pary (np. W+D) → ruch w 8 kierunkach.
27. **Q**, **E** → dowódca obraca się w miejscu o 45°.
28. Odejdź daleko na północ (Shift+W przez ok. 25 s, ok. 60 m) → kamera oddala się, a potem zostaje przy drużynie; przy górnej krawędzi ekranu pojawia się strzałka „dowódca”. Wróć (Shift+S) → kamera znów obejmuje obu.
29. **Enter** → kursor wraca do wiersza poleceń. Kliknięcie w plac → znów tryb Ruch; **/** → powrót do komend.
30. Obróć dowódcę dwa razy **E** (front na wschód), Enter, `Pierwsza drużyna, w szeregu – ZBIÓRKA` → szereg frontem na wschód, ciągnie się na północ od dowódcy (po jego lewej ręce); pasek „front 90°”.
31. Kółko myszy → przybliżenie/oddalenie; przy dużym przybliżeniu widać berety, twarze, naramienniki dowódcy; po następnej zbiórce kamera wraca do automatycznego kadrowania.
32. Najedź na żołnierza → dymek „szer. Wieczorek · nr 1 w składzie” (dla nr 1). Najedź na maszt/koszary (po oddaleniu kółkiem) → nazwa obiektu.
33. „Role” → pod prawoskrzydłowym „P”, lewoskrzydłowym „L” (w kolumnie: „K” — kierunkowy). „⏱ 1×” → 2×, 3×, 0,5×: zbiórka przebiega szybciej/wolniej.
34. `Drużyna, kierunek na wprost – MARSZ` (po zbiórce) → „Komenda poprawna” i notka, że wykonanie dojdzie w etapie E4; drużyna stoi.

### 3. Decyzje i otwarte pytania

Decyzje (szczegóły w `docs/DECISIONS.md`):

- D-022 Model stanu i symulacja: stan docelowy od razu, żołnierze dochodzą do niego według planów ruchu; stały krok 1/60 s; sesja z historią WRÓĆ i Dziennikiem.
- D-023 Etap wykonania w danych katalogu (`stage`) i skrypty przygotowania stanu (`setup`) dla przykładów zależnych od stanu.
- D-024 Wymiary i orientacja obiektów, przedpole, „na drodze” — **do akceptacji**.
- D-025 Które czynności blokują (E_BUSY), pierwszy naruszony warunek, W_NO_EFFECT bez wpisu do historii — **do akceptacji**.
- D-026 Żołnierz bez pary po zwrocie w tył — **do akceptacji**.
- D-027 Każdy zwrot unieważnia odliczenie; zwrot zmieniający ugrupowanie kasuje odstąpienie; rząd 0,6 m oznaczony jako nieregularny, SPOCZNIJ rozsuwa do 1,2 m — **do akceptacji**.
- D-028 Wygląd postaci, sceny i kamery.
- D-029 Kiedy drużyna jest „wezwana” — **do akceptacji**.
- D-030 Interfejs E2 (pasek stanu z prędkością symulacji już teraz, stały skład do E5).
- D-031 Dowódca (prędkości, obrót, omijanie przez biegnących).
- D-032 Propozycje doprecyzowań w `COMMANDS.md` / `SPEC.md` (dokumentów nie zmieniano).

Interpretacje I-1…I-17 są zebrane w jednym module (`src/core/interpretations.ts`), każda jako osobna funkcja lub stała; test pilnuje zgodności listy z tabelą SPEC 11. W E2 działają I-1, I-2 (bez marszu), I-6, I-7, I-9, I-10, I-11, I-12, I-16.

Otwarte pytania: patrz „Do akceptacji” w `DECISIONS.md`.

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · CI: https://github.com/Wotaker/musztra/actions

---

## E1 Interpreter — podsumowanie (2026-10-19)

### Status

**✔ Ukończony, przyjęty przez autora (bramka E1: ACCEPT, 2026-10-19).** Przechodzą `npm run lint`, `npm test` (618 testów + 40 zaplanowanych na E2–E4, zob. niżej), `npm run build` i `npm run e2e` (12 testów; lokalnie na preinstalowanym Chromium). CI na GitHubie (lint, testy, build, E2E) jest zielone, strona wdrożona przez CI.

Środowisko w chmurze: Node 26.12.0 doinstalowany z nodejs.org (wymagania projektu bez zmian, D-011).

### 1. Co działa

- Na dole ekranu jest **wiersz poleceń** (od razu z kursorem). Wpisujesz komendę i naciskasz Enter.
- Interpreter rozpoznaje **każdą komendę z katalogu MVP** (31 komend: postawy, zwroty, zbiórki, rozejście, równanie, odliczanie, odstępowanie i łączenie, zmiany szyku, przesunięcie, zachodzenie, marsz, bieg, zatrzymania, zmiany kierunku, WRÓĆ) oraz rozpoznaje — i oznacza jako „jeszcze nieobsługiwane” — ok. 40 komend regulaminu spoza MVP (chwyty bronią, honory, wywołanie z szyku, śpiew, pluton/kompania, pojazdy…), z numerem punktu.
- Nad wierszem pojawia się **panel informacji zwrotnej**:
  - ✔ zielony „Komenda poprawna” — z nazwą komendy, jej numerem w katalogu i punktami regulaminu (najedź myszą — zobaczysz cytat z regulaminu), formą kanoniczną i krótkim opisem;
  - ✖ czerwony błąd — tytuł mówi, jaki to błąd (składni, formy w trybie ścisłym, sprzeczność z regulaminem), każdy komunikat ma punkt regulaminu i kod; **błędny fragment jest podkreślony falistą linią w samym wierszu**, a tekst zostaje do poprawienia;
  - ⚠ żółty „Nikt nie reaguje” — komenda do innej drużyny niż ta na placu; ⚠ także przy „STÓJ” bez adresata;
  - ℹ niebieski — komenda z regulaminu spoza zakresu symulatora.
- **Dwa tryby zapisu**, przełącznik „Łagodny | Ścisły” po prawej stronie wiersza (zapamiętywany w przeglądarce; pełne ustawienia przyjdą w E5):
  - łagodny przyjmuje małe/wielkie litery, brak polskich znaków, brak lub inny myślnik, brak przecinków, cyfry zamiast liczebników, błędną odmianę — i pokazuje „Zapisano jako: …” z listą poprawek;
  - ścisły wymaga formy kanonicznej i każdą rozbieżność pokazuje osobno, z podkreśleniem i przyciskiem **„Użyj: …”**, który wstawia poprawną komendę.
- **Historia komend**: strzałka ↑ przywraca poprzednie komendy, ↓ wraca.
- Drużyna na placu jeszcze się nie rusza — wykonanie komend to etap E2 (panel o tym przypomina).

### 2. Lista kontrolna do ręcznego sprawdzenia w przeglądarce

Otwórz **https://wotaker.github.io/musztra/**. Każdą komendę wpisz i zatwierdź Enterem. Kod komunikatu jest w panelu drobnym pismem.

**A. Tryb łagodny** (domyślny; przycisk „Łagodny” podświetlony na oliwkowo)

1. `Pierwsza drużyna, w szeregu – ZBIÓRKA` → ✔ „Komenda poprawna”, po prawej „ZB-1 · Zbiórka przy dowódcy · pkt 69”, „Forma kanoniczna: Pierwsza drużyna, w szeregu – ZBIÓRKA”; wiersz się czyści.
2. `pierwsza druzyna w dwuszeregu zbiorka` → ✔, „Zapisano jako: **Pierwsza drużyna, w dwuszeregu – ZBIÓRKA**” i lista poprawek (wielka litera, polskie znaki „drużyna”, brak przecinka, brak myślnika przed hasłem, hasło wielkimi literami, polskie znaki „ZBIÓRKA”), kod `I_NORMALIZED`.
3. `w prawo zwrot` → ✔, „Zapisano jako: W prawo – ZWROT”, trzy poprawki.
4. `Od prawoskrzydłowego, 5 kroków – ODSTĄP` → ✔, „Zapisano jako: Od prawoskrzydłowego, pięć kroków – ODSTĄP”, poprawka „Liczebnik słownie: „pięć” zamiast „5””.
5. `Do dwa – ODLICZ` → ✔, „Zapisano jako: Do dwóch – ODLICZ”, poprawka „Odmiana: „dwóch” zamiast „dwa””.
6. `STÓJ` → ⚠ „Komenda poprawna, z uwagą”: „Regulamin podaje zatrzymanie z adresatem: „Drużyna – STÓJ”.”, pkt 100, `W_MISSING_ADDRESSEE`.
7. `Druga drużyna – BACZNOŚĆ` → ⚠ „Nikt nie reaguje”: „Na placu jest „Pierwsza drużyna”, a komenda jest do „Druga drużyna” — nikt nie reaguje.”, `E_ADDRESSEE`.
8. `Przez pierś – BROŃ` → ℹ „Komenda spoza zakresu symulatora”: „To komenda z regulaminu (Przez pierś – BROŃ, pkt 34), ale symulator jej jeszcze nie obsługuje…”, `E_OUT_OF_SCOPE`.
9. `W prawo – MARSZ` → ✖ „Błąd składni”: „W miejscu „MARSZ” oczekiwano: „ZWROT”.”, pkt 22, 76, 83; słowo **MARSZ** podkreślone, tekst zostaje w wierszu.
10. `Pierwsza drużyna, w szereg – ZBIÓRKA` → ✖ „Błąd składni”: „W miejscu „w szereg” oczekiwano: „w szeregu”, „w dwuszeregu”, „w rzędzie” albo „w kolumnie dwójkowej”.”, pkt 69; podkreślone **w szereg**.
11. `ZBIÓRKA` → ✖ „Przed hasłem „ZBIÓRKA” brakuje części zapowiedzi. Oczekiwano: „w szeregu”, …”, `E_SYNTAX_INCOMPLETE`.
12. `Drużyna, w dwuszeregu, prawe skrzydło na wysokości lotniska – ZBIÓRKA` → ✖ „W miejscu „lotniska” oczekiwano: nazwa obiektu (masztu, trybuny, koszar, garaży, hangaru, magazynu).”; podkreślone **lotniska**.
13. `Do jednego – ODLICZ` → ✖ „W miejscu „jednego” oczekiwano: liczebnik w dopełniaczu (dwóch, trzech, …).”, pkt 72, 76, 77.
14. `Drużyna, trzy kroki w tył – MARSZ` → ✖ „Komenda sprzeczna z regulaminem”: „Szyk przesuwa się w tył najwyżej o krok. Aby przesunąć go dalej, najpierw „W tył – ZWROT”, potem przesunięcie na wprost.”, pkt 74, `E_RULE`.
15. `Drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA` → ✖ „Komenda niewykonalna”: „„Czoło” dotyczy kolumny (rząd, kolumna dwójkowa)…”, pkt 69, `E_PRECOND_FORMATION`.
16. `zrób coś` → ✖ „Nie rozpoznano komendy. Komenda składa się z zapowiedzi i hasła, np. „W prawo – ZWROT”…”, pkt 10, `E_SYNTAX_UNKNOWN`; podkreślony cały tekst.

**B. Tryb ścisły** (kliknij „Ścisły”; kursor zostaje w wierszu)

17. `Pierwsza drużyna, w szeregu – ZBIÓRKA` → ✔ jak w p. 1.
18. `W prawo - ZWROT` (zwykły minus z klawiatury, ze spacjami) → ✔, „Forma kanoniczna: W prawo – ZWROT” (decyzja D-013).
19. `w prawo zwrot` → ✖ „Niezgodność z formą kanoniczną (tryb ścisły)”, trzy komunikaty `E_STRICT_FORM`: „Komenda zaczyna się wielką literą: „W”.”, „Brak myślnika przed hasłem: „prawo – ZWROT”.”, „Hasło wielkimi literami: „ZWROT”.”; podkreślone „w”, odstęp przed „zwrot” i „zwrot”. Kliknij **„Użyj: W prawo – ZWROT”** → w wierszu pojawia się poprawna komenda, podkreślenia znikają; Enter → ✔.
20. `Baczność` → ✖ „Hasło wielkimi literami: „BACZNOŚĆ”.”
21. `Drużyna, spocznij` → ✖ „Przed hasłem myślnik, nie przecinek: „Drużyna – SPOCZNIJ”.” oraz „Hasło wielkimi literami: „SPOCZNIJ”.”
22. `W prawo–ZWROT` (myślnik bez spacji) → ✖ „Myślnik otoczony spacjami: „prawo – ZWROT”.”
23. `Do dwa – ODLICZ` → ✖ `E_GRAMMAR_AGREEMENT`: „Odmiana: „dwóch” zamiast „dwa”.”; podkreślone „dwa”.
24. `Od prawoskrzydłowego, 5 kroków – ODSTĄP` → ✖ „Liczebnik słownie: „pięć” zamiast „5”.”
25. `STÓJ` → ✖ „Brak adresata: regulamin podaje „Drużyna – STÓJ” (pkt 100).”
26. `pierwsza druzyna w dwuszeregu zbiorka` → ✖ sześć osobnych komunikatów (jak lista poprawek z p. 2), przycisk „Użyj: Pierwsza drużyna, w dwuszeregu – ZBIÓRKA”.
27. `Druga drużyna – BACZNOŚĆ`, `Przez pierś – BROŃ`, `W prawo – MARSZ` → te same wyniki co w p. 7, 8, 9 (tryb nie ma na nie wpływu).

**C. Pozostałe**

28. Naciśnij ↑ kilka razy → wracają poprzednie komendy (od najnowszej); ↓ przewija z powrotem aż do pustego wiersza.
29. Odśwież stronę (F5) w trybie ścisłym → przełącznik nadal na „Ścisły”.
30. Najedź myszą na „ZB-1 · Zbiórka przy dowódcy · pkt 69” w panelu → dymek z cytatem z pkt 69 regulaminu.

### 3. Decyzje i otwarte pytania

Decyzje (szczegóły w `docs/DECISIONS.md`):

- D-011 Zależność `ohm-js` (SPEC 4.1); Node 26 doinstalowany w chmurze.
- D-012 Budowa gramatyki: postać złożona tekstu, słownictwo generowane z danych katalogu, forma kanoniczna z drzewa składni.
- D-013 Tryb ścisły przyjmuje każdy znak myślnika ze spacjami — **do akceptacji**.
- D-014 Zakres tolerancji trybu łagodnego (m.in. kropka/wykrzyknik na końcu, „jeden krok”, zbędny przecinek) — **do akceptacji**.
- D-015 Rozróżnianie błędów składni i wskazywanie miejsca błędu („diagnoza prowadzona hasłem”).
- D-016 Przykłady zależne od stanu: w E1 sprawdzane jako rozpoznane komendy; werdykt (np. `E_PRECOND_POSTURE`) — 40 testów zaplanowanych (`todo`) na E2–E4. Reguły bez stanu (S16, S19–S21, `E_RULE` z pkt 74) działają już teraz.
- D-017 Lista komend spoza MVP, szersza niż tabela w COMMANDS.md — **do akceptacji**.
- D-018 Punkty regulaminu zapisane tekstem („18a”, „31–47”).
- D-019 „Drużyna” bez liczebnika zawsze trafia; „Szeregowy X, …” to musztra indywidualna (poza MVP) — **do akceptacji**.
- D-020 Wygląd i zachowanie wiersza poleceń w E1 (przełącznik trybu tymczasowo przy wierszu).
- D-021 Propozycje drobnych zmian w `COMMANDS.md` — **do akceptacji**.

Otwarte pytania:

- P-1 ma w polu „Pkt” wartość „18a” — w regulaminie pkt 18 nie ma części „a”. Czy chodzi o pkt 18? (D-021)
- Czy w trybie ścisłym wymagać wyłącznie półpauzy „–”? (D-013; obecnie wystarczy „-” ze spacjami.)

Propozycje zmian w `SPEC.md` / `COMMANDS.md`: zob. D-021 (dokumentów nie zmieniano).

Testy oznaczone jako `todo` nie są pominiętymi testami: to werdykty zależne od stanu drużyny, których w E1 nie da się sprawdzić; staną się zwykłymi testami w etapach E2–E4.

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · CI: https://github.com/Wotaker/musztra/actions

### 5. Po bramce E1 (2026-10-19)

- Autor zatwierdził D-013, D-014, D-016, D-017, D-019 i D-021. W trybie ścisłym nie wymagamy wyłącznie półpauzy „–” (otwarte pytanie 2 zamknięte); „18a” w P-1 to literówka → „11, 18, 69” (pytanie 1 zamknięte).
- Poprawki z D-021 wprowadzone do `docs/COMMANDS.md` i danych katalogu; żadna nie zmienia zachowania komend. Testy zgodności objęły nowe przykłady (625 testów).

### Wymóg na kolejne etapy: testy „todo” z E1

Każdy z 40 testów oznaczonych jako `todo` (20 przykładów zależnych od stanu × 2 tryby zapisu, D-016) **musi stać się zwykłym testem w etapie, w którym pojawi się potrzebny stan**. Etap jest zapisany w danych katalogu (pole `stage` przykładu `inState`) i w nazwie testu:

- **E2** (4 przykłady, 8 testów) — ✔ zwykłe testy od E2: Z-1 w postawie swobodnej, ZB-1 bez wezwania, ZB-3 na początku sesji, X-1 na początku sesji.
- **E3** (6 przykładów, 12 testów) — ✔ zwykłe testy od E3: R-1 w kolumnie, R-2 w postawie swobodnej, O-1 z nazwiskiem spoza składu, O-2 bez ODSTĄP, S-1 bez odliczenia, S-1 w dwuszeregu.
- **E4** (10 przykładów, 20 testów) — ✔ zwykłe testy od E4: Z-1 w marszu, S-4 w rzędzie, M-2 w szeregu, M-3 w biegu, M-6 stojąc, M-8 w biegu, M-9 stojąc, M-10 w szeregu, MS-1 w rzędzie, MS-2 bez odliczenia w marszu.

Etap nie jest ukończony, dopóki zostają w nim testy `todo` przypisane do tego etapu.

---

## E0 Szkielet — podsumowanie (2026-10-19)

### Status

**✔ Ukończony.** Lokalnie przechodzą `npm run lint`, `npm test` (14 testów), `npm run build`, `npm run e2e` (3 testy). Przebieg CI #2 jest zielony (oba zadania). Wdrożenie opóźniła awaria GitHub Actions i Pages 2026-10-19 (od 15:49 UTC), konfiguracji nie zmieniano. Autor sprawdził stronę według listy kontrolnej, wszystko się zgadza.

### 1. Co działa

- Pod publicznym adresem **https://wotaker.github.io/musztra/** otwiera się aplikacja z pustym placem apelowym na całym ekranie.
- Plac ma piaskową nawierzchnię z ledwie widocznymi spoinami płyt co 1 m i delikatną oliwkową siatką co 5 m. Środek ekranu to środek placu (tam w kolejnych etapach stanie dowódca).
- W prawym górnym rogu jest róża wiatrów (północ u góry), w lewym górnym plakietka z nazwą aplikacji i sygnaturą regulaminu (tymczasowa — w E2 zastąpi ją pasek stanu).
- Plac dopasowuje się do rozmiaru okna i pozostaje ostry na ekranach Retina.
- Każda zmiana wypchnięta na GitHuba przechodzi automatycznie lint, testy jednostkowe, build i testy E2E. Strona wdraża się tylko z gałęzi `main` i tylko wtedy, gdy wszystko przeszło.
- Zabezpieczenia architektury: jeśli w przyszłości kod logiki musztry (`src/core`) sięgnie po przeglądarkę, Reacta albo niezasianą losowość, CI się zatrzyma (D-006).

### 2. Lista kontrolna do ręcznego sprawdzenia w przeglądarce

Na tym etapie nie ma jeszcze wiersza poleceń, więc komend się nie wpisuje — sprawdzamy sam plac.

1. Otwórz https://wotaker.github.io/musztra/ → widać plac w kolorze jasnego piasku, bez białych pasów i bez pasków przewijania.
2. Przyjrzyj się nawierzchni → wyraźniejsza siatka kwadratów (5 m) i bardzo subtelne mniejsze kratki w środku (płyty 1 m, po 5 × 5 w każdym kwadracie). Linie ostre, nie rozmyte.
3. Prawy górny róg → róża wiatrów z literą **N** i ciemniejszą strzałką skierowaną w górę.
4. Lewy górny róg → plakietka „Interpreter Języka Musztry · Regulamin musztry SZ RP · Szt. Gen. 1427/94”.
5. Zmień rozmiar okna (lub przejdź w tryb pełnoekranowy) → plac natychmiast wypełnia całe okno, siatka nie rozciąga się ani nie rozmywa.
6. Karta przeglądarki → tytuł „Musztra — Interpreter Języka Musztry” i ikonka z oliwkowym żołnierzem na placu.
7. (Opcjonalnie) zakładka *Actions* repozytorium https://github.com/Wotaker/musztra/actions → ostatni przebieg „CI” zielony, z dwoma zadaniami: „Lint, testy, build, E2E” i „Wdrożenie na GitHub Pages”.

### 3. Decyzje i otwarte pytania

Decyzje (szczegóły w `docs/DECISIONS.md`):

- D-001 Node.js 26 lokalnie i w CI.
- D-002 Zależności etapu (wszystkie wynikają z SPEC 4.1; Ohm.js dojdzie w E1).
- D-003 Uzupełnienia struktury katalogów (punkt wejścia, dodatkowe katalogi testów).
- D-004 Adres strony i ścieżka bazowa `/musztra/`.
- D-005 Testy E2E na wersji produkcyjnej, Chromium, okno 1280×720.
- D-006 Trzy niezależne zabezpieczenia czystości warstwy `core`.
- D-007 Wygląd pustego placu (kolory, siatka, przybliżenie startowe, położenie róży wiatrów).
- D-008 Jeden workflow CI z wdrożeniem dokładnie przetestowanego buildu.
- D-009 Rygor TypeScript i lint ponad samo `strict`.
- D-010 Content Security Policy dodawana w E6 (decyzja autora).

Zatwierdzone przez autora (2026-10-19): D-001, D-004, D-007 (przybliżenie startowe bez zmian) oraz D-010 — CSP dodajemy w E6.

Otwarte pytania: brak.

Propozycje zmian w `SPEC.md` / `COMMANDS.md`: brak.

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · repozytorium: https://github.com/Wotaker/musztra
