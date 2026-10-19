# Postęp prac

Etapy według `SPEC.md`, sekcja 10. Każdy etap kończy się wdrożoną wersją pod adresem **https://wotaker.github.io/musztra/** i podsumowaniem poniżej.

| Etap | Stan | Data ukończenia |
|---|---|---|
| E0 Szkielet | ✔ ukończony | 2026-10-19 |
| E1 Interpreter | ✔ ukończony | 2026-10-19 |
| E2 Stan i obraz | — | |
| E3 Szyki w miejscu | — | |
| E4 Ruch | — | |
| E5 Nauka | — | |
| E6 LLM | — | |
| E7 Szlif | — | |

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

- **E2** (4 przykłady, 8 testów): Z-1 w postawie swobodnej, ZB-1 bez wezwania, ZB-3 na początku sesji, X-1 na początku sesji.
- **E3** (6 przykładów, 12 testów): R-1 w kolumnie, R-2 w postawie swobodnej, O-1 z nazwiskiem spoza składu, O-2 bez ODSTĄP, S-1 bez odliczenia, S-1 w dwuszeregu.
- **E4** (10 przykładów, 20 testów): Z-1 w marszu, S-4 w rzędzie, M-2 w szeregu, M-3 w biegu, M-6 stojąc, M-8 w biegu, M-9 stojąc, M-10 w szeregu, MS-1 w rzędzie, MS-2 bez odliczenia w marszu.

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
