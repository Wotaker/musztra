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
