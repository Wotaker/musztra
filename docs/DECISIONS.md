# Dziennik decyzji

Decyzje podjęte tam, gdzie `SPEC.md`, `COMMANDS.md` i regulamin milczą lub są niejednoznaczne. Format: data, kontekst, decyzja, alternatywy. Numeracja ciągła (D-NNN); decyzji się nie usuwa — zmienioną oznacza się jako „zastąpiona przez D-NNN”.

## Do akceptacji

Decyzje, które autor powinien potwierdzić lub odrzucić. Po akceptacji pozycja przechodzi do sekcji „Zatwierdzone” (wpis w dzienniku zostaje).

Brak pozycji oczekujących.

## Zatwierdzone

| Decyzja | Czego dotyczy | Zatwierdzona |
|---|---|---|
| [D-001](#d-001-wersja-nodejs) | Node.js 26 w CI i lokalnie | 2026-10-19 |
| [D-004](#d-004-adres-strony-i-ścieżka-bazowa) | publiczny adres `https://wotaker.github.io/musztra/` | 2026-10-19 |
| [D-007](#d-007-wygląd-pustego-placu) | wygląd placu, w tym przybliżenie startowe 24 px/m bez zmian | 2026-10-19 |
| [D-010](#d-010-content-security-policy-w-e6) | Content Security Policy dodawana w E6 | 2026-10-19 (decyzja autora) |
| [D-013](#d-013-myślnik-w-trybie-ścisłym) | tryb ścisły przyjmuje każdy znak myślnika otoczony spacjami (nie wymagamy wyłącznie „–”) | 2026-10-19 |
| [D-014](#d-014-co-wybacza-tryb-łagodny) | zakres tolerancji trybu łagodnego | 2026-10-19 |
| [D-016](#d-016-przykłady-zależne-od-stanu-i-reguły-bez-stanu-w-e1) | 40 testów „todo” zależnych od stanu; każdy ma stać się zwykłym testem w etapie, w którym pojawi się potrzebny stan | 2026-10-19 |
| [D-017](#d-017-komendy-spoza-mvp) | lista komend rozpoznawanych jako „poza MVP” | 2026-10-19 |
| [D-019](#d-019-adresat-i-nazwiska) | „Drużyna” bez liczebnika trafia zawsze; „Szeregowy X, …” poza MVP | 2026-10-19 |
| [D-021](#d-021-propozycje-zmian-w-commandsmd) | poprawki w `COMMANDS.md` (wprowadzone), „18a” → „18” | 2026-10-19 |

---

## D-001 Wersja Node.js

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** SPEC nie określa wersji środowiska uruchomieniowego. Na komputerze autora jest Node 26.12.
- **Decyzja:** Node 26 (plik `.nvmrc`, z którego korzysta też CI). W `package.json` minimalna wersja `>=24`.
- **Alternatywy:** Node 24 LTS w CI — odrzucone, żeby CI i komputer autora używały tej samej wersji.

## D-002 Zależności etapu E0

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** CLAUDE.md wymaga uzasadnienia każdej nowej zależności.
- **Decyzja:**
  - Uruchomieniowe: `react`, `react-dom`, `zustand` — wybrane w SPEC 4.1.
  - Narzędziowe (tylko przy budowie i testach, nie trafiają do przeglądarki):
    - `vite`, `@vitejs/plugin-react` — build (SPEC 4.1);
    - `typescript` — język (SPEC 4.1);
    - `vitest`, `@playwright/test` — testy (SPEC 4.1);
    - `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` — lint (wymagany przez CLAUDE.md); standardowy zestaw dla React + TS;
    - `@types/react`, `@types/react-dom`, `@types/node` — typy dla trybu strict.
  - `ohm-js` (SPEC 4.1) zostanie dodany w E1, gdy powstanie gramatyka.
- **Alternatywy:** Prettier — pominięty na razie; formatowanie pilnuje ESLint, a dodatkowe narzędzie nie wnosi nic, co autor zobaczy w przeglądarce.

## D-003 Uzupełnienia struktury katalogów

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** SPEC 4.2 podaje strukturę, ale nie mówi, gdzie są punkt wejścia aplikacji i testy warstw `render`/`ui`.
- **Decyzja:**
  - `src/main.tsx` — punkt wejścia (montuje React); poza warstwami.
  - `src/core/regulation.ts` — dane o regulaminie (tytuł, sygnatura), z których korzysta UI.
  - Puste katalogi ze SPEC 4.2 (`src/core/grammar`, `catalog`, `semantics`, `sim`, `roster`, `src/llm`, `tests/grammar`, `semantics`, `scenarios`) utrzymywane plikami `.gitkeep` do czasu, aż wypełnią je kolejne etapy.
  - Dodatkowe katalogi testów: `tests/render` (kamera i siatka), `tests/ui` (stan widoku) oraz `tests/architecture.test.ts` (zob. D-006).
- **Alternatywy:** testy obok kodu (`*.test.ts` w `src/`) — odrzucone, bo SPEC 4.2 umieszcza testy w `tests/`.

## D-004 Adres strony i ścieżka bazowa

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** GitHub Pages serwuje projekt pod `https://<użytkownik>.github.io/<repozytorium>/`.
- **Decyzja:** repozytorium `Wotaker/musztra` (publiczne), adres `https://wotaker.github.io/musztra/`, ścieżka bazowa Vite `/musztra/` (stała `BASE_PATH` w `vite.config.ts`). Serwer deweloperski też działa pod `/musztra/`, więc adresy są identyczne lokalnie i na Pages.
- **Alternatywy:** ścieżka względna `./` — działałaby wszędzie, ale przy przyszłych zasobach ładowanych dynamicznie bywa zawodna; własna domena — niepotrzebna.

## D-005 Testy E2E na wersji produkcyjnej

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** E2E może działać na serwerze deweloperskim albo na zbudowanej aplikacji.
- **Decyzja:** Playwright testuje build produkcyjny serwowany przez `vite preview` pod `/musztra/` — tak, jak zobaczy go użytkownik na Pages. Lokalnie `npm run e2e` sam buduje aplikację; w CI używa buildu z poprzedniego kroku. Przeglądarka: Chromium; okno 1280×720 (minimum z SPEC 3.1).
- **Alternatywy:** serwer deweloperski (szybszy, ale nie wychwyci błędów ścieżki bazowej ani buildu); dodatkowo Firefox i WebKit — do rozważenia w E7.

## D-006 Strażnicy czystości warstwy core

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** CLAUDE.md: `src/core` to czysty TypeScript, bez DOM, Reacta i sieci, deterministyczny, i nie importuje z `render`, `ui`, `llm`. Autor nie czyta kodu, więc zasadę muszą egzekwować narzędzia.
- **Decyzja:** trzy niezależne zabezpieczenia, każde zatrzymuje CI:
  1. ESLint (`npm run lint`): zakaz importów `react`, `react-dom`, `zustand` i z katalogów `render`/`ui`/`llm`; zakaz `window`, `document`, `fetch`, `Math.random`, `Date.now`.
  2. `tsconfig.core.json` (część `npm run lint`): kompilacja `src/core` bez bibliotek DOM — użycie API przeglądarki to błąd typów.
  3. `tests/architecture.test.ts` (`npm test`): skanuje pliki `src/core` pod kątem zakazanych importów i API.
  Działanie sprawdzone celowo błędnym plikiem: wszystkie trzy zgłosiły błąd.
- **Alternatywy:** osobny pakiet npm dla core (workspace) — zbyt ciężkie na tym etapie.

## D-007 Wygląd pustego placu

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** SPEC 3.9 opisuje kierunek wizualny (kafelkowana nawierzchnia, delikatna siatka co 5 m, róża wiatrów w rogu, paleta oliwka/piasek/grafit), bez konkretnych wartości.
- **Decyzja:**
  - Nawierzchnia: jasny piasek `#d8d2c1`; płyty 1 × 1 m zaznaczone ledwie widocznymi spoinami (tylko przy przybliżeniu ≥ 12 px/m, żeby przy oddaleniu nie tworzyły szumu); siatka 5 m oliwkowymi liniami o 16% krycia, ostrymi (wyrównanymi do pikseli ekranu).
  - Przybliżenie startowe 24 px/m: na ekranie 1280×720 widać ok. 53 × 30 m, kamera wycentrowana na stanowisku dowódcy (0, 0). Kamera się nie obraca — północ zawsze u góry.
  - Róża wiatrów: element SVG w prawym górnym rogu (z opisem dla czytników ekranu). W E2 pasek stanu z SPEC 3.1 zajmie górną krawędź, więc róża może się przesunąć.
  - Plakietka z nazwą aplikacji i sygnaturą regulaminu w lewym górnym rogu — tymczasowa, do zastąpienia paskiem stanu w E2.
  - Krój pisma systemowy (bez zewnętrznych czcionek, zgodnie z zakazem zewnętrznych zasobów).
- **Alternatywy:** róża wiatrów rysowana na canvasie — odrzucone, bo SVG jest dostępne dla czytników ekranu i testów; siatka 1 m bez siatki 5 m — sprzeczne z SPEC 3.9.

## D-008 Potok CI i wdrożenie

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** SPEC 9.7: lint, testy, build, E2E; wdrożenie tylko gdy wszystko przechodzi.
- **Decyzja:** jeden workflow `.github/workflows/ci.yml`, uruchamiany przy każdym pushu (każda gałąź), przy pull requeście i ręcznie. Zadanie `check`: lint → testy → build → E2E; na `main` pakuje `dist` jako artefakt Pages. Zadanie `deploy` zależy od `check` i działa tylko na `main` — wdrażany jest dokładnie ten build, który przeszedł E2E. Przy błędzie E2E raport Playwright jest dostępny jako artefakt przebiegu. GitHub Pages włączone ze źródłem „GitHub Actions” przez `gh api`.
- **Alternatywy:** osobne workflow dla CI i wdrożenia — więcej plików, a ryzyko wdrożenia innego buildu niż przetestowany.

## D-009 Rygor TypeScript i lint

- **Data:** 2026-10-19 · **Etap:** E0
- **Kontekst:** CLAUDE.md wymaga trybu strict.
- **Decyzja:** poza `strict` włączone także `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `erasableSyntaxOnly`; ESLint w zestawie `strictTypeChecked`, ostrzeżenia traktowane jak błędy (`--max-warnings 0`).
- **Alternatywy:** samo `strict` — słabsza ochrona przed błędami indeksowania tablic, które w kodzie szyków (pozycje, kolejność żołnierzy) będą częste.

## D-010 Content Security Policy w E6

- **Data:** 2026-10-19 · **Etap:** E0 (decyzja autora)
- **Kontekst:** SPEC 8.3 wymaga CSP ograniczającej połączenia do `api.anthropic.com`. W E0 aplikacja nie łączy się z niczym, a CSP w `index.html` blokowałaby skrypty wstrzykiwane przez serwer deweloperski Vite.
- **Decyzja:** CSP zostanie dodana w E6, razem z klientem API.
- **Alternatywy:** CSP od razu, tylko w buildzie produkcyjnym — odłożone, bo bez połączeń sieciowych nic by nie chroniła.

## D-011 Zależność `ohm-js`

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** SPEC 4.1 wybiera Ohm.js do gramatyki; D-002 zapowiadało dodanie w E1.
- **Decyzja:** `ohm-js` 17.5 jako zależność uruchomieniowa (gramatyka działa w przeglądarce). Bez innych nowych zależności. W chmurze doinstalowano Node 26.12.0 z nodejs.org — wymagania projektu (D-001) bez zmian.
- **Alternatywy:** własny parser — sprzeczny ze SPEC 4.1.

## D-012 Budowa gramatyki

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** Tryb łagodny wymaga dopuszczenia dowolnej wielkości liter, braku polskich znaków i myślnika, a tryb ścisły — wskazania każdej rozbieżności. Listy obiektów, liczebników i nazwisk mają mieć jedno źródło (CLAUDE.md).
- **Decyzja:**
  - Gramatyka `musztra.ohm` działa na **postaci złożonej** tekstu: małe litery, bez znaków diakrytycznych, każde słowo i znak z jedną spacją na końcu. Literały w pliku gramatyki są zapisane czytelnie, w formie kanonicznej (z polskimi znakami, hasła wielkimi literami) i zamieniane przy wczytaniu. Dzięki spacji na końcu literał dopasowuje się zawsze do całych słów.
  - `Exec<…>` oznacza HASŁO; `Sep` to miejsce przecinka lub myślnika (oba przyjmowane, także brak); `Gap` — miejsce bez znaku w formie kanonicznej, gdzie zbędny przecinek jest przyjmowany i usuwany.
  - Słownictwo (obiekty terenowe w mianowniku i dopełniaczu, liczebniki, liczebniki porządkowe, nazwy wyższych pododdziałów) to gramatyka `MusztraLexicon` **generowana z danych katalogu**. Nazwisko to dowolne słowo; znane nazwiska są odmieniane wg danych składu (COMMANDS, „Skład osobowy”), nieznane zostają jak wpisane.
  - Forma kanoniczna powstaje z drzewa składni: wielkość liter wynika z roli słowa (hasło — wielkie, nazwisko — z wielkiej, reszta małe, pierwsza litera komendy wielka), separator przed hasłem to myślnik, w pozostałych miejscach przecinek.
  - Kontrola formy porównuje każde wpisane słowo i każdy separator z formą kanoniczną; każda rozbieżność to osobny komunikat z zaznaczonym fragmentem. Błędna odmiana (inne słowo po złożeniu) → `E_GRAMMAR_AGREEMENT`, pozostałe → `E_STRICT_FORM`.
  - Każda alternatywa reguły `Command` kończy się na `end`, więc kolejność alternatyw nie wpływa na rozbiór poprawnych komend.
  - Testy: każda reguła gramatyki (z alternatywami nazwanymi i słownictwem) pokryta przykładem z katalogu; słownik pisowni bez niejednoznaczności; każdy wariant z pola `forms` przechodzi tryb ścisły bez zmian.
- **Alternatywy:** gramatyka z wariantami pisowni wpisanymi ręcznie (bez polskich znaków, wielkości liter) — wielokrotnie dłuższa i łatwa do rozspójnienia z katalogiem.

## D-013 Myślnik w trybie ścisłym

- **Data:** 2026-10-19 · **Etap:** E1 · **Zatwierdzona 2026-10-19**
- **Kontekst:** COMMANDS 0.1 podaje formę kanoniczną z myślnikiem „–” otoczonym spacjami. Na klawiaturze jest tylko „-”, a sam regulamin zapisuje komendy raz z „-”, raz z „—” (np. pkt 29, 30, 36).
- **Decyzja:** tryb ścisły przyjmuje każdy znak myślnika (`-`, `–`, `—`), ale wymaga spacji po obu stronach i myślnika tylko przed hasłem. Forma kanoniczna jest zawsze wyświetlana z „–”.
- **Alternatywy:** wymaganie wyłącznie „–” — zgodne z dosłownym brzmieniem COMMANDS 0.1, ale tryb ścisły byłby niewygodny i nie uczyłby niczego, czego wymaga regulamin.

## D-014 Co wybacza tryb łagodny

- **Data:** 2026-10-19 · **Etap:** E1 · **Zatwierdzona 2026-10-19**
- **Kontekst:** COMMANDS 0.1 wylicza tolerancje trybu łagodnego; kilka przypadków nie jest wymienionych.
- **Decyzja:** tryb łagodny przyjmuje (z `I_NORMALIZED` i listą poprawek), a ścisły odrzuca:
  - wielkość liter, brak polskich znaków, dowolny myślnik lub jego brak, przecinek zamiast myślnika i odwrotnie, brak przecinka;
  - cyfry zamiast liczebników (`5 kroków`, `Do 3`), błędną odmianę liczebnika, nazwy obiektu i znanego nazwiska (`pięć kroki`, `Do dwa`, `maszt`, `Nowak`);
  - zbędny przecinek tam, gdzie forma kanoniczna go nie ma (`Do szeregowego Stępnia, w lewo – ŁĄCZ`);
  - `jeden krok` (kanonicznie „krok”), kropkę lub wykrzyknik na końcu.
  - Samo `STÓJ`: łagodny wykonuje z uwagą `W_MISSING_ADDRESSEE` (I-16), ścisły odrzuca (`E_STRICT_FORM`).
  - Nie są przyjmowane słowa spoza gramatyki, np. „w szereg” zamiast „w szeregu” (COMMANDS ZB-1: `E_SYNTAX_EXPECTED`).
- **Alternatywy:** węższa tolerancja (np. bez kropki na końcu) — wpisanie „BACZNOŚĆ!” to naturalny odruch, a tryb łagodny ma uczyć formy, nie karać.

## D-015 Klasyfikacja błędów składni

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** SPEC 4.4 rozróżnia `E_SYNTAX_UNKNOWN`, `E_SYNTAX_EXPECTED`, `E_SYNTAX_INCOMPLETE`, nie mówi, jak je odróżnić ani które miejsce wskazać.
- **Decyzja:** diagnoza „prowadzona hasłem”:
  1. tekst urywa się, a gramatyka oczekuje dalszego ciągu → `E_SYNTAX_INCOMPLETE` (np. `W prawo`);
  2. jeśli na końcu jest rozpoznane HASŁO, a zapowiedź pasuje do innej komendy, której brakuje tylko właściwego hasła → `E_SYNTAX_EXPECTED` na haśle (np. `W prawo – MARSZ` → oczekiwano ZWROT);
  3. w przeciwnym razie błędu szukamy w zapowiedziach komend z tym hasłem: brak całej zapowiedzi → `E_SYNTAX_INCOMPLETE` (np. samo `ZBIÓRKA`), błędne słowo → `E_SYNTAX_EXPECTED` na tym słowie z listą możliwych (np. `w szereg` → „w szeregu”, „w dwuszeregu”…);
  4. nic nie pasuje od pierwszego słowa → `E_SYNTAX_UNKNOWN`.
  Punkty regulaminu w komunikacie: komendy, której dotyczy błąd; bez rozpoznanej komendy — pkt 10 (budowa komendy). Propozycje „czy chodziło o” (odległość edycyjna) zostają na E5 zgodnie ze SPEC 10.
- **Alternatywy:** sam komunikat Ohm („najdalsze miejsce błędu”) — przy „Pierwsza drużyna, w szereg – ZBIÓRKA” wskazywał hasło zamiast „w szereg”.

## D-016 Przykłady zależne od stanu i reguły bez stanu w E1

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** Wiele przykładów ✖ w COMMANDS.md zależy od stanu drużyny (postawa, szyk, ruch), którego w E1 jeszcze nie ma.
- **Decyzja:** takie przykłady są w danych katalogu z opisem stanu i etapem (`inState`). W E1 test generowany sprawdza, że tekst jest rozpoznaną, poprawną komendą właściwego wpisu, a sam werdykt zależny od stanu jest zapisany jako test „do zrobienia” (`it.todo`) z numerem etapu — 40 takich pozycji (20 przykładów × 2 tryby), widocznych w wyniku `npm test`. Reguły niezależne od stanu działają już w E1: zbiórka „prawe skrzydło/czoło” niezgodne z szykiem (`E_PRECOND_FORMATION`, S16), przesunięcie w tył o więcej niż krok i w bok (`E_RULE`, pkt 74), adresat (`E_ADDRESSEE`, S20), komendy spoza MVP (S21).
- **Alternatywy:** pominięcie tych przykładów do E2 — gorzej, bo zgodność danych z dokumentem nie byłaby sprawdzana.
- **Zatwierdzona 2026-10-19 z wymogiem:** każdy z 40 testów „todo” ma stać się zwykłym testem w etapie, w którym pojawi się potrzebny stan (lista w `PROGRESS.md`).

## D-017 Komendy spoza MVP

- **Data:** 2026-10-19 · **Etap:** E1 · **Zatwierdzona 2026-10-19**
- **Kontekst:** COMMANDS „Poza MVP” podaje przykłady i zakresy punktów; S21 wymaga wskazania konkretnego punktu (34).
- **Decyzja:** 20 wpisów `N-1…N-20` z punktami dla każdej komendy (np. „Przez pierś – BROŃ” pkt 34, „Na pas – BROŃ” pkt 36, „Połóż – BROŃ” pkt 42, 109). Poza tabelą COMMANDS dodane: „Przez plecy”, „Do nogi”, „Bagnet”, kolba i zabezpieczenie broni, dowolny inny chwyt „… – BROŃ” (pkt 31–47), rozejście w kierunku („Od czoła, w prawo – ROZEJŚĆ SIĘ”, „W tył – ROZEJŚĆ SIĘ”, pkt 70, backlog SPEC 2.2 p. 5), musztra z pojazdami („DO POJAZDÓW”, „Z POJAZDÓW”, „Silniki – W RUCH”), dowolna komenda z adresatem „Szeregowy …” (musztra indywidualna, pkt 57–59). Komenda do plutonu, kompanii, batalionu, brygady → poza MVP (pkt 78–99), nie `E_ADDRESSEE`.
- **Alternatywy:** tylko przykłady z tabeli — użytkownik dostawałby „nie rozpoznano” przy prawdziwych komendach regulaminowych.

## D-018 Punkty regulaminu jako tekst

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** COMMANDS podaje punkty w postaci „18a”, „25b” i zakresów.
- **Decyzja:** punkty są w danych tekstem (`'18a'`, `'31–47'`), dokładnie jak w dokumencie; test zgodności porównuje je z `COMMANDS.md`. Do promptu LLM (E6, `regulationPoints: number[]`) zostaną zamienione na liczby.
- **Alternatywy:** liczby — gubią „18a” i zakresy.

## D-019 Adresat i nazwiska

- **Data:** 2026-10-19 · **Etap:** E1 · **Zatwierdzona 2026-10-19**
- **Kontekst:** COMMANDS 0.1: adresat zgodny z ustawieniem nazwy; I-10.
- **Decyzja:** „Drużyna” bez liczebnika dotyczy drużyny na placu niezależnie od jej nazwy. Liczebnik inny niż w nazwie (domyślnie „Pierwsza drużyna”) → `E_ADDRESSEE`, poziom uwagi, werdykt „nikt nie reaguje”. Nazwisko po „szeregowego” to dowolne słowo — sprawdzenie, czy żołnierz jest w składzie, wymaga stanu (E3, `E_PRECOND_STATE`).
- **Alternatywy:** „Drużyna” trafia tylko, gdy nazwa to „Drużyna” — sprzeczne z przykładem P-1 (✔ `Drużyna` przy „Pierwszej drużynie”).

## D-020 Wiersz poleceń w E1

- **Data:** 2026-10-19 · **Etap:** E1
- **Kontekst:** SPEC 10 (E1): „prosty wiersz poleceń z informacją zwrotną (bez symulacji)”; pełne ustawienia to E5.
- **Decyzja:** wiersz poleceń u dołu ekranu z panelem informacji zwrotnej nad nim (układ SPEC 3.1): ikona i tytuł wg rodzaju wyniku, rozpoznany wpis katalogu z punktami (cytat po najechaniu), forma kanoniczna, komunikaty z punktem regulaminu i kodem, lista poprawek normalizacji, przycisk „Użyj” w trybie ścisłym. Błędny fragment podkreślony falistą linią w samym wierszu; po błędzie tekst zostaje do poprawy, po przyjęciu wiersz się czyści. Historia ↑/↓. Przełącznik trybu zapisu (łagodny/ścisły) obok wiersza, zapamiętany w przeglądarce — tymczasowo, do panelu ustawień w E5. Kolorowanie składni na żywo i podpowiedzi — E5.
- **Alternatywy:** przełącznik trybu dopiero w E5 — autor nie mógłby sprawdzić trybu ścisłego w E1.

## D-021 Propozycje zmian w COMMANDS.md

- **Data:** 2026-10-19 · **Etap:** E1 · **Zatwierdzona 2026-10-19, wprowadzona** (zmiany w `COMMANDS.md` i danych katalogu)
- P-1, pole **Pkt**: „18a” → „18” (literówka, potwierdzona przez autora); poprawione w dokumencie i danych.
- ZB-3, **Przykłady**: „✔ jw. · ✖ jw. na początku sesji” — proponuję wpisać tekst w cudzysłowie (test zgodności pomija pozycje bez tekstu komendy).
- „Poza MVP”: dopisać rozejście w kierunku (pkt 70) i komendy z pojazdami (pkt 121–126) z D-017.
- 0.1: doprecyzować myślnik w trybie ścisłym (D-013) i tolerancje trybu łagodnego (D-014).
- R-1, **Przykłady**: `Równaj w prawo – ZWROT` w trybie łagodnym jest rozbierane jako pełna komenda „Równaj – W PRAWO” z nadmiarowym „– ZWROT”; kod `E_SYNTAX_EXPECTED` się zgadza, ale komunikat brzmi „zbędny dalszy ciąg”.
