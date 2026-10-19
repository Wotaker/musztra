# Postęp prac

Etapy według `SPEC.md`, sekcja 10. Każdy etap kończy się wdrożoną wersją pod adresem **https://wotaker.github.io/musztra/** i podsumowaniem poniżej.

| Etap | Stan | Data ukończenia |
|---|---|---|
| E0 Szkielet | ✔ ukończony | 2026-10-19 |
| E1 Interpreter | — | |
| E2 Stan i obraz | — | |
| E3 Szyki w miejscu | — | |
| E4 Ruch | — | |
| E5 Nauka | — | |
| E6 LLM | — | |
| E7 Szlif | — | |

---

## E0 Szkielet — podsumowanie (2026-10-19)

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

Do akceptacji (sekcja „Do akceptacji” w `DECISIONS.md`): wygląd placu (D-007), adres strony (D-004), wersja Node (D-001).

Otwarte pytania:

- Czy przybliżenie startowe (ok. 53 × 30 m na ekranie 1280×720) jest dobre? W E2 kamera i tak będzie śledzić drużynę z automatycznym zoomem.
- Content Security Policy (SPEC 8.3) dodam w E6 razem z klientem API; teraz utrudniałaby pracę serwera deweloperskiego, a aplikacja nie łączy się jeszcze z niczym.

Propozycje zmian w `SPEC.md` / `COMMANDS.md`: brak.

### 4. Adres wdrożenia

**https://wotaker.github.io/musztra/** · repozytorium: https://github.com/Wotaker/musztra
