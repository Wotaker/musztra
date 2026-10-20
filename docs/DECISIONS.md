# Dziennik decyzji

Decyzje podjęte tam, gdzie `SPEC.md`, `COMMANDS.md` i regulamin milczą lub są niejednoznaczne. Format: data, kontekst, decyzja, alternatywy. Numeracja ciągła (D-NNN); decyzji się nie usuwa — zmienioną oznacza się jako „zastąpiona przez D-NNN”.

## Do akceptacji

Decyzje, które autor powinien potwierdzić lub odrzucić. Po akceptacji pozycja przechodzi do sekcji „Zatwierdzone” (wpis w dzienniku zostaje).

| Decyzja | Czego dotyczy | Etap |
|---|---|---|
| [D-024](#d-024-obiekty-terenowe-i-punkty-zaczepienia) | wymiary obiektów, front do środka placu wzdłuż osi siatki, przedpole, „na drodze” | E2 |
| [D-025](#d-025-czynności-przejściowe-i-kolejność-warunków) | które komendy blokują (E_BUSY), pierwszy naruszony warunek, W_NO_EFFECT bez wpisu do historii WRÓĆ | E2 |
| [D-026](#d-026-żołnierz-bez-pary-w-szyku-odwróconym) | niezmiennik „żołnierz bez pary” po zwrocie w tył / w nieregulaminową stronę | E2 |
| [D-027](#d-027-skutki-zwrotów-dla-odliczenia-odstępowania-i-odległości) | każdy zwrot unieważnia odliczenie; zwrot zmieniający ugrupowanie kasuje odstąpienie; rząd 0,6 m oznaczony jako nieregularny | E2 |
| [D-029](#d-029-wezwanie-drużyny-attending) | kiedy drużyna jest „wezwana” (zbiórka bez adresata) | E2 |
| [D-032](#d-032-propozycje-zmian-w-commandsmd-i-specmd-po-e2) | propozycje doprecyzowań w `COMMANDS.md` (bez zmian w dokumencie) | E2 |
| [D-033](#d-033-odstępowanie-i-łączenie) | kierunek odstępowania, „Jestem”, łączenie zawsze do odstępów regulaminowych w całym szyku | E3 |
| [D-034](#d-034-odliczanie) | czas i kolejność odzywek, liczby drugiego szeregu, kiedy odliczenie zostaje ważne | E3 |
| [D-036](#d-036-dwójki-w-miejscu) | geometria „W dwójki, w prawo – ZWROT” i „W szereg, w lewo – FRONT” (pary według liczb z odliczania) | E3 |
| [D-039](#d-039-propozycje-zmian-w-commandsmd-po-e3) | propozycje doprecyzowań w `COMMANDS.md` po E3 | E3 |

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

## D-022 Model stanu i symulacja

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 5.3–5.5 opisuje stan, stały krok i `runScript`, bez szczegółów realizacji.
- **Decyzja:**
  - Stan jest niezmienny (`src/core/sim/state.ts`). Pola drużyny opisują od razu stan **docelowy** komendy (szyk, układ, flagi), a żołnierze dochodzą do niego według **planów ruchu**: ciągu odcinków „czekaj / przejdź z obrotem / natychmiastowe skutki” (postawa, głowa, dymek, meldunek, uniesiona ręka). Dzięki temu warunki wstępne zawsze odnoszą się do stanu po zakończeniu komendy, a w trakcie obowiązuje E_BUSY (I-11).
  - Układ szyku to front, punkt odniesienia (prawe skrzydło pierwszego szeregu / czoło) i miejsca żołnierzy (w lewo i w głąb). Szeregi, rzędy i role (prawoskrzydłowy, lewoskrzydłowy, kierunkowy) są wyznaczane geometrycznie, więc po zwrocie wynikają z nowego frontu (COMMANDS Z-1).
  - Stały krok 1/60 s (`step`), `simulate(state, dt)` z akumulatorem; interfejs interpoluje między krokami. Losowość: generator mulberry32 z ziarnem zapisanym w stanie.
  - Sesja (`src/core/session.ts`): stan, historia migawek dla WRÓĆ (najwyżej 200), Dziennik (komendy z wynikiem, meldunki). Migawka obejmuje drużynę, nie dowódcę (SPEC 6).
  - `runScript` (`src/core/script.ts`) po każdej komendzie przewija symulację do zakończenia czynności i sprawdza niezmienniki SPEC 5.4.
- **Alternatywy:** zmiana pól drużyny dopiero po zakończeniu animacji — komplikuje WRÓĆ i warunki wstępne, a w czasie animacji i tak obowiązuje E_BUSY.

## D-023 Etap wykonania komend w danych katalogu

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** Komendy późniejszych etapów (marsz — E4) są rozpoznawane od E1, ale ich wykonania jeszcze nie ma. Testy „todo” (D-016) mają stać się zwykłymi testami w swoim etapie.
- **Decyzja:**
  - Każdy wpis katalogu ma pole `stage` (etap, w którym komenda działa na placu). Stała `SIMULATED_STAGE` (`src/core/sim/stage.ts`) mówi, do którego etapu komendy są wykonywane. Komenda z późniejszego etapu jest sprawdzana (składnia, forma, czynność w toku, głowy zwrócone), a panel pisze: „Komenda jest poprawna, ale jej wykonanie na placu dojdzie w etapie E4”. Stan się nie zmienia, komenda nie trafia do historii WRÓĆ.
  - Przykłady zależne od stanu mają pole `setup`: komendy, które od stanu początkowego prowadzą do opisanego stanu. Test generowany wykonuje `setup`, potem przykład, i sprawdza kod błędu. Przykłady z etapów ≤ `SIMULATED_STAGE` są zwykłymi testami, późniejsze — nadal `todo` z numerem etapu.
- **Alternatywy:** osobne, ręcznie pisane testy dla przykładów stanowych — ryzyko rozjechania się z danymi katalogu.

## D-024 Obiekty terenowe i punkty zaczepienia

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** COMMANDS („Dane pomocnicze”) podaje położenia orientacyjne i przedpole „3 m od frontu obiektu w stronę środka placu”, bez wymiarów i orientacji.
- **Decyzja:**
  - Wymiary (szerokość × głębokość, m): maszt — podstawa ⌀ 2,4; trybuna 16 × 6; koszary 42 × 14; garaże 24 × 7; hangar 30 × 24; magazyn 18 × 11. Droga: pas wschód–zachód, oś y = −15, szerokość 7 m.
  - Budynki są równoległe do siatki placu, front zwrócony do środka placu wzdłuż dominującej osi (koszary i maszt — na południe, trybuna i magazyn — na wschód, garaże i hangar — na zachód). Przedpole: środek frontu + 3 m na zewnątrz (maszt: 4,2 m od osi na południe, czyli (0; 20,8)).
  - „Na drodze” — punkt osi drogi na wysokości obiektu: (x obiektu; −15). Brak „na placu / na drodze” = na placu.
  - „Frontem do X” — kierunek od punktu zaczepienia do środka obiektu X (dowolny kąt, nie tylko wielokrotność 45°). Bez tej części — front dowódcy.
  - Obiekty poza kadrem są wskazane etykietą z odległością przy krawędzi ekranu; nazwa obiektu na placu widoczna po najechaniu albo stale od przybliżenia 26 px/m (SPEC 3.9).
- **Alternatywy:** budynki obrócone dokładnie do środka placu — wyglądały nienaturalnie na siatce placu apelowego.

## D-025 Czynności przejściowe i kolejność warunków

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 5.5 wymienia czynności przejściowe (zwrot, zbiórka, zmiana szyku, odstępowanie, łączenie, przesunięcie, odliczanie); nie mówi o wezwaniu, SPOCZNIJ z korektą i rozejściu.
- **Decyzja:**
  - Blokujące (E_BUSY, dozwolone WRÓĆ — I-11): zwrot, zbiórki, WRÓĆ (szybki powrót), wezwanie / BACZNOŚĆ drużyny rozproszonej (zwrot do dowódcy), SPOCZNIJ z korektą odstępów (tylko gdy ktoś się przesuwa), a od E3 — odliczanie, równanie, zmiany szyku, odstępowanie, łączenie, przesunięcie.
  - Nieblokujące: rozejście (można od razu wezwać drużynę — wezwanie zatrzymuje żołnierzy tam, gdzie są).
  - Warunki sprawdzane są po kolei od najbardziej podstawowego: czynność w toku → zwrócone głowy (pkt 71) → szyk → postawa (pkt 11) → odliczenie → pozostały stan; komunikat dotyczy pierwszego naruszonego warunku (jeden konkretny powód zamiast listy).
  - W_NO_EFFECT: BACZNOŚĆ (wezwanie) drużyny już stojącej w postawie zasadniczej i SPOCZNIJ drużyny już w postawie swobodnej (bez odstępów do korekty). Komenda bez skutku nie trafia do historii WRÓĆ (WRÓĆ cofa ostatnią komendę, która coś zmieniła).
- **Alternatywy:** lista wszystkich naruszonych warunków — przy kilku naraz komunikat był mało czytelny.

## D-026 Żołnierz bez pary w szyku odwróconym

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 5.4: „co najwyżej jeden żołnierz bez pary, zawsze na lewym skrzydle pierwszego szeregu (w dwuszeregu) lub na końcu kolumny”. COMMANDS Z-1 dopuszcza jednak „dwuszereg frontem w tył (drugi szereg z przodu)” i zwroty w nieregulaminową stronę (pkt 76) — wtedy żołnierz bez pary jest po przeciwnej stronie.
- **Decyzja:** niezmiennik sprawdza, że jest najwyżej jeden żołnierz bez pary i stoi na **skraju** szyku: w dwuszeregu w skrajnej kolumnie krycia (lewe skrzydło; po zwrocie w tył — prawe), w kolumnie dwójkowej w pierwszej albo ostatniej parze. Dokładne położenie po zbiórce sprawdzają scenariusze (S01, S05, S07).
- **Alternatywy:** osobna flaga „szyk odwrócony” w stanie — więcej stanu tylko na potrzeby testu.

## D-027 Skutki zwrotów dla odliczenia, odstępowania i odległości

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** COMMANDS R-2 unieważnia odliczenie po „zwrotach Z-1 zmieniających ugrupowanie”; S-1 wymaga odliczenia „w obecnym szyku”. I-2 mówi, że rząd z szeregu ma odległość 0,6 m i rozwiera się po ruszeniu.
- **Decyzja:**
  - **Każdy** zwrot Z-1 unieważnia odliczenie — także „W tył – ZWROT”: zmienia się prawe skrzydło, więc liczby nie odpowiadają już kolejności „w obecnym szyku”.
  - Zwrot zmieniający ugrupowanie kasuje stan odstąpienia (odstępy zostają, ale są oznaczone jako nieregulaminowe); zwrot w tył go zachowuje.
  - Odległość 0,6 m rzędu po zwrocie z szeregu (I-2) i odstępy 1,2 m szeregu po zwrocie z rzędu (I-1) oznaczają szyk flagą `irregularSpacing`. SPOCZNIJ (i od E3 „Równaj”) przywraca odstępy regulaminowe względem prawoskrzydłowego (czoła) — w rzędzie także rozsuwa do 1,2 m. Rozwieranie po ruszeniu dojdzie w E4.
- **Alternatywy:** zwrot w tył zachowuje odliczenie — wtedy „W dwójki, w prawo – ZWROT” po dwóch zwrotach w tył działałby, ale po jednym tworzyłby dwójki z liczb liczonych od drugiego skrzydła.

## D-028 Wygląd placu, postaci i kamery

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 3.9 opisuje kierunek wizualny bez konkretnych wartości.
- **Decyzja:**
  - Postać z góry (ok. 0,53 m szerokości): owal ramion w kolorze munduru, ręce po bokach, głowa z twarzą z przodu i czarnym beretem ściągniętym na prawo z oznaką nad lewym okiem, jasny trójkąt na piersi jako znacznik frontu. W ruchu stopy i ręce wykonują wymach (krok defiladowy — dłuższy, bieg — krótszy łuk rąk, drobne kroki przy korektach). Postawa swobodna: jaśniejszy mundur i obrys, wysunięta lewa stopa, ręce luźno. Dowódca: ciemniejszy mundur, złote naramienniki, bordowy beret, jasne kółko pod nim, nieco większy.
  - Przy oddaleniu postacie są powiększane (najwyżej 1,6×), żeby miały co najmniej ok. 15 px szerokości.
  - Kamera kadruje drużynę i dowódcę z marginesem 2,2 m w części ekranu niezasłoniętej przez pasek stanu i wiersz poleceń; zoom automatyczny 9–72 px/m, ręczny (kółko) 3–140 px/m, obowiązuje do „dużego ruchu” (przesunięcie kadru o > 8 m lub zmiana jego wielkości > 1,6×). Gdy dowódca i drużyna nie mieszczą się przy 9 px/m, kamera śledzi drużynę, a strzałka „dowódca” na krawędzi wskazuje dowódcę.
  - Sceneria: droga z linią przerywaną, maszt z biało-czerwoną flagą, trybuna ze stopniami, koszary z dachem dwuspadowym, garaże z bramami, hangar z dachem łukowym, magazyn z rampą; cień od północnego zachodu.
- **Alternatywy:** sprite’y bitmapowe — zewnętrzne zasoby i gorsze skalowanie.

## D-029 Wezwanie drużyny („attending”)

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** COMMANDS ZB: zbiórka bez adresata wymaga wcześniejszego wezwania lub BACZNOŚĆ; nie mówi, jak długo wezwanie obowiązuje.
- **Decyzja:** drużyna jest „wezwana” po P-1, P-2 i po każdej zbiórce (stoi w szyku przed dowódcą). Wezwanie kasuje tylko ROZEJŚĆ SIĘ. SPOCZNIJ go nie kasuje (COMMANDS P-3).
- **Alternatywy:** wezwanie ważne tylko dla jednej następnej komendy — w szyku wymagałoby ponownego wezwania przed każdą zmianą szyku przez zbiórkę.

## D-030 Interfejs etapu E2

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 3.1–3.2, 3.9; pełne ustawienia to E5.
- **Decyzja:**
  - Pasek stanu u góry zastępuje tymczasową plakietkę z E0 (D-007): nazwa drużyny, „Stan: szyk · postawa · ruch · front”, dodatkowe oznaczenia (niepełny, odliczona, odstąpiona, odstępy nieregulaminowe, głowy zwrócone) i pulsująca nazwa czynności w toku. Po prawej: przycisk trybu (Komenda / Ruch, z podpowiedzią klawiszy), „Role” (SPEC 3.9) i prędkość symulacji ⏱ (0,5× · 1× · 2× · 3×, kliknięcie zmienia) — ta jedna pozycja ustawień jest już teraz, bo pasek ze SPEC 3.1 ją pokazuje.
  - Tryb Ruch: wiersz poleceń przygaszony z przerywaną ramką i podpowiedzią „Enter lub / wraca do komend”, przycisk trybu w kolorze bursztynowym.
  - Najechanie na żołnierza: dymek z nazwiskiem, numerem w składzie i liczbą z ostatniego odliczania.
  - Skład i rozproszenie w przeglądarce z ziarnem 1 (te same nazwiska po każdym odświeżeniu) — losowanie ponowne dojdzie z ustawieniami w E5.
  - Płótno ma atrybuty `data-formation`, `data-activity`, `data-commander`, `data-zoom` dla testów E2E.
  - Panel informacji zwrotnej: „✔ Wykonano” / „⚠ Wykonano, z uwagą” / „⚠ Bez zmian” / „Komenda poprawna” z notką o etapie dla komend jeszcze niewykonywanych (SPEC 3.4).
  - Zrzuty ekranu: `scripts/screenshots.mjs` (ręcznie, poza CI) zapisuje je w `docs/screenshots/`.
- **Alternatywy:** prędkość dopiero w E5 — autor nie mógłby przyspieszyć długich zbiórek przy sprawdzaniu.

## D-031 Dowódca

- **Data:** 2026-10-19 · **Etap:** E2
- **Kontekst:** SPEC 3.2, 6.
- **Decyzja:** prędkość marszu 1,33 m/s, bieg (Shift) 2,55 m/s; front podąża za kierunkiem ruchu (8 kierunków co 45°) z płynnym obrotem 540°/s; Q/E obraca o 45° w miejscu. Zbiórka przy dowódcy przyjmuje front docelowy (wielokrotność 45°), nawet jeśli obrót jeszcze trwa. Dowódca może przechodzić przez szyk (bez kolizji). Żołnierze biegnący na zbiórkę omijają dowódcę łukiem.
- **Alternatywy:** obrót dowódcy dowolny (myszą) — SPEC przewiduje Q/E o 45°.

## D-032 Propozycje zmian w COMMANDS.md i SPEC.md po E2

- **Data:** 2026-10-19 · **Etap:** E2 · do decyzji autora (dokumentów nie zmieniano)
- R-2, „Unieważnienie odliczenia”: dopisać „W tył – ZWROT” (D-027).
- SPEC 5.4: doprecyzować położenie żołnierza bez pary w szyku po zwrocie w tył (D-026).
- SPEC 5.5: dopisać do czynności przejściowych wezwanie drużyny rozproszonej, SPOCZNIJ z korektą i WRÓĆ, a rozejście oznaczyć jako nieblokujące (D-025).
- ZB-2: podać wymiary/orientację obiektów lub przyjąć D-024.
- PROGRESS.md / polecenie etapów wspomina „Uwagi UI na później” — takiej sekcji nie było w repozytorium (stan z 2026-10-19), więc nie było czego realizować; jeśli autor ma takie uwagi, proszę o ich dopisanie.

## D-033 Odstępowanie i łączenie

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** COMMANDS O-1, O-2, pkt 73. Nie jest powiedziane, kto się porusza przy „Od szeregowego X, w prawo”, kiedy rusza reszta po „Jestem” ani co oznacza strona w „Do szeregowego Stępnia w lewo – ŁĄCZ”.
- **Decyzja:**
  - Strona w komendzie odstępowania to kierunek ruchu: „w prawo” — odstępują żołnierze na prawo od wskazanego (w prawo), „w lewo” — na lewo; bez strony — obie strony. „Od prawoskrzydłowego” — wszyscy w lewo, „od lewoskrzydłowego” — w prawo.
  - Wszyscy ruszają jednocześnie: zwrot w stronę ruchu, marsz (bieg), zatrzymanie, zwrot do frontu, postawa swobodna. Dalsi idą dłużej, więc zatrzymują się kolejno, jak w pkt 73. Odstęp między sąsiadami: 0,6 m + n × 0,7 m. Żołnierze, którzy stoją w miejscu, przyjmują postawę swobodną, gdy wszyscy skończą.
  - Wskazany po nazwisku mówi „Jestem” (dymek, wpis w Dzienniku) i na sekundę unosi lewą rękę; w dwuszeregu rękę unosi też kryjący go żołnierz drugiego szeregu. Reszta rusza 0,6 s po haśle, żeby gest był widoczny. Przy odstępowaniu od skrzydłowego nikt nie mówi „Jestem” (regulamin wymaga tego tylko przy wskazaniu po nazwisku).
  - Drugi szereg kryje: każdy przesuwa się tak jak jego poprzednik.
  - Wskazany żołnierz musi być w składzie i w pierwszym szeregu — dotyczy także łączenia „Do szeregowego X”.
  - Łączenie zawsze przywraca odstępy regulaminowe (0,6 m) w całym szyku względem wskazanego żołnierza, który stoi w miejscu; strona w komendzie („w lewo / w prawo”) opisuje kierunek ruchu łączących się i nie zmienia wyniku. Dzięki temu po łączeniu szyk jest zawsze regulaminowy.
  - Po odstąpieniu SPOCZNIJ i „Równaj” zachowują odstępy z odstępowania.
- **Alternatywy:** łączenie tylko po stronie wskazanej w komendzie — po niepasującej komendzie część szyku zostałaby odstąpiona bez stanu odstąpienia.

## D-034 Odliczanie

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** COMMANDS R-2, pkt 72, SPEC 3.5.
- **Decyzja:**
  - Pierwszy szereg zwraca głowy w prawo, prawoskrzydłowy w lewo; liczby padają od prawego skrzydła co 0,5 s (pierwsza 0,3 s po haśle); mówiący zwraca głowę w lewo, potem na wprost. Dymek z liczbą (cyframi) widać ok. 2 s.
  - Drugi szereg przejmuje liczby poprzedników bez dymków (widać je po najechaniu na żołnierza).
  - W niepełnym dwuszeregu lewoskrzydłowy drugiego szeregu 0,3 s po ostatniej liczbie zwraca głowę w stronę dowódcy i melduje „Niepełny” (dymek w innym kolorze, wpis w Dzienniku). Potem wszyscy przyjmują postawę swobodną.
  - W Dzienniku liczby jednego odliczania są jednym wpisem („Odliczanie: Wieczorek 1 · Nowak 2 · …”), meldunki — osobnymi („szer. Woźniak: Niepełny”).
  - Odliczenie pozostaje ważne po SPOCZNIJ, BACZNOŚĆ, „Równaj”, przesunięciu, odstępowaniu i łączeniu oraz po „W dwójki, w prawo – ZWROT” i powrocie „W szereg, w lewo – FRONT” (kolejność żołnierzy się nie zmienia). Unieważniają je zbiórka, rozejście, każdy zwrot Z-1 (D-027) i WRÓĆ do stanu sprzed odliczenia.
- **Alternatywy:** osobny wpis w Dzienniku dla każdej liczby — przy 12 żołnierzach Dziennik szybko stawał się nieczytelny.

## D-035 Równanie

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** COMMANDS R-1, pkt 71 („z wyjątkiem prawoskrzydłowego”).
- **Decyzja:** w dwuszeregu głów nie zwraca skrzydłowy każdego szeregu (prawy przy „W PRAWO”, lewy przy „W LEWO”) — nie ma do kogo się równać. Pozycje są korygowane drobnymi krokami do odstępów regulaminowych (albo odstępów z odstępowania) względem tego skrzydłowego; przy „W LEWO” lewoskrzydłowy zostaje na miejscu. Głowy zwrócone są widoczne na placu i w pasku stanu („głowy zwrócone”) do komendy BACZNOŚĆ.
- **Alternatywy:** tylko prawoskrzydłowy pierwszego szeregu bez zwrotu głowy — drugi szereg i tak kryje, a jego skrzydłowy nie miałby kogo widzieć.

## D-036 Dwójki w miejscu

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** COMMANDS S-1, S-2, pkt 76, I-8, scenariusze S05, S06.
- **Decyzja:**
  - Pary tworzą się według liczb z odliczania: dwójka staje na lewo od swojego prawego sąsiada (jedynki), w odstępie 0,6 m w kierunku dotychczasowego frontu (po zwrocie — w lewo). Animacja: połowa zwrotu w miejscu, potem wykrok w skos z dokończeniem zwrotu.
  - „W szereg, w lewo – FRONT”: dwójki tylko się zwracają, jedynka staje 0,6 m na prawo od swojej dwójki, samotna jedynka — 0,6 m na lewo od ostatniej dwójki (I-8, osobna stała w `interpretations.ts`).
  - Jeśli odstępy po zmianie szyku nie są regulaminowe (np. szereg był nieregularny), szyk dostaje flagę `irregularSpacing`; stan odstąpienia jest kasowany.
- **Alternatywy:** pary według pozycji (co drugi żołnierz) bez patrzenia na liczby — regulamin mówi o „oznaczonych liczbą dwa”.

## D-037 Przesunięcie szyku

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** COMMANDS S-3, pkt 24, 74.
- **Decyzja:** przesunięcie o krok (na wprost lub w tył) trwa 0,55 s, bez zmiany frontu; „N kroków na wprost”: pierwsze trzy kroki defiladowe, dalej krok zwykły, zatrzymanie w postawie zasadniczej. Przesunięcie jest czynnością przejściową. „Drużyna, na wprost – MARSZ” bez liczby kroków to M-4 (marsz, etap E4).
- **Alternatywy:** —

## D-038 Dziennik

- **Data:** 2026-10-20 · **Etap:** E3
- **Kontekst:** SPEC 3.1, 3.6.
- **Decyzja:** zwijany panel po prawej stronie (stan zwinięcia pamiętany w przeglądarce), pod różą wiatrów. Wpis komendy: czas symulacji (mm:ss), ikona wyniku (✔ ⚠ ✖ ℹ), tekst — dla przyjętej forma kanoniczna, dla odrzuconej tekst wpisany — i kod pierwszego problemu. Klik w komendę wstawia ją do wiersza poleceń (i przełącza na tryb Komenda). Meldunki: „szer. Nazwisko: tekst” na bursztynowym tle; liczby odliczania zgrupowane (D-034). Najwyżej 500 wpisów. Kamera omija obszar Dziennika przy kadrowaniu.
- **Alternatywy:** Dziennik jako szuflada otwierana przyciskiem — mniej widoczne meldunki.

## D-039 Propozycje zmian w COMMANDS.md po E3

- **Data:** 2026-10-20 · **Etap:** E3 · do decyzji autora (dokumentów nie zmieniano)
- O-1: dopisać, że strona („w prawo / w lewo”) to kierunek ruchu odstępujących (D-033).
- O-2: dopisać, że łączenie przywraca odstępy regulaminowe w całym szyku, a wskazany żołnierz musi być w pierwszym szeregu (D-033).
- R-2: dopisać, kiedy odliczenie pozostaje ważne (D-034) i że w dwuszeregu odwróconym (po „W tył – ZWROT”) liczy szereg, który jest z przodu.
- S-1: doprecyzować, że pary tworzą się według liczb z odliczania (D-036).
