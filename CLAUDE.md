# CLAUDE.md — zasady pracy nad Interpreterem Języka Musztry

## Projekt w jednym akapicie

Przeglądarkowy symulator musztry: użytkownik dowodzi drużyną, wpisując komendy; deterministyczny interpreter sprawdza je z Regulaminem musztry SZ RP (1994) i wykonuje na animowanym placu albo wyjaśnia błąd. LLM (opcjonalny, klucz użytkownika) tylko objaśnia werdykt interpretera. Statyczna SPA na GitHub Pages, bez serwera.

## Źródła prawdy (w tej kolejności)

1. `docs/regulamin-musztry-1994.pdf` — regulamin.
2. `docs/COMMANDS.md` — katalog komend, warunki, efekty, scenariusze akceptacyjne.
3. `docs/SPEC.md` — wymagania, UX, architektura, etapy.
4. Kod.

Przy sprzeczności wygrywa źródło wyżej. Gdy dokumenty milczą lub są niejednoznaczne: wybierz rozwiązanie najbliższe literze regulaminu, zapisz je w `docs/DECISIONS.md` (data, kontekst, decyzja, alternatywy) i wspomnij w podsumowaniu etapu. Nie zmieniaj `COMMANDS.md` ani `SPEC.md` bez wyraźnej zgody autora; propozycje zmian zgłaszaj w podsumowaniu.

## Autor i sposób współpracy

- Autor jest informatykiem (Python, ML), nie frontendowcem. **Nie czyta kodu.** Weryfikuje działanie, UX i UI w przeglądarce.
- Dlatego jakość pilnowana jest testami. Testy są wymaganiem, nie dodatkiem.
- Pracuj etapami z `SPEC.md` sekcja 10. Nie wychodź poza bieżący etap bez prośby.
- **Podsumowanie każdego etapu, po polsku, językiem zachowania, nie kodu:**
  1. co działa (z perspektywy użytkownika);
  2. lista kontrolna do ręcznego sprawdzenia w przeglądarce — konkretne komendy do wpisania i co powinno się stać;
  3. podjęte decyzje (odnośniki do `DECISIONS.md`) i otwarte pytania;
  4. adres wdrożenia na GitHub Pages.

## Zasady inżynierskie

- **Testy najpierw.** Dla każdej funkcji najpierw testy wynikające ze specyfikacji (w tym scenariusze z `COMMANDS.md`), potem implementacja.
- **Nigdy nie osłabiaj, nie usuwaj i nie pomijaj testu, żeby przeszedł.** Jeśli test wydaje się błędny względem specyfikacji, zgłoś to w podsumowaniu.
- Etap jest ukończony dopiero, gdy przechodzą: `npm run lint`, `npm test`, `npm run build`, `npm run e2e`.
- `src/core` to czysty TypeScript: bez DOM, Reacta, sieci; deterministyczny (losowość tylko z ziarnem, stały krok symulacji). Nic z `core` nie importuje z `render`, `ui`, `llm`.
- Katalog komend jest **danymi** w `src/core/catalog` i jedynym źródłem dla gramatyki (test spójności), testów, autouzupełniania, szuflady katalogu i promptu LLM. Bez duplikowania list komend w innych miejscach.
- TypeScript w trybie strict. Identyfikatory w kodzie po angielsku wg glosariusza `SPEC.md` 5.1; teksty interfejsu i komunikaty po polsku.
- Nowe zależności tylko z uzasadnieniem w `DECISIONS.md`. Bez analityki i zewnętrznych skryptów.
- Klucz API: nigdy w logach, URL-ach, komunikatach błędów ani testach; testy LLM wyłącznie z zamockowanym API.
- Małe, opisowe commity; gałąź `main` zawsze zielona i wdrażalna.

## Jak dodać lub zmienić komendę

1. Wpis w `docs/COMMANDS.md` (składnia, pkt, warunki, efekt, przykłady ✔/✖) — za zgodą autora.
2. Wpis w danych katalogu (`src/core/catalog`) z przykładami poprawnymi i błędnymi.
3. Reguła w gramatyce `src/core/grammar/musztra.ohm`.
4. Warunki wstępne w `src/core/semantics`, efekt w `src/core/sim`.
5. Testy: przykłady z katalogu (generowane), scenariusz akceptacyjny, ewentualnie E2E.
6. Komenda pojawia się automatycznie w podpowiedziach i szufladzie katalogu — bez zmian w UI.

## Polecenia

- `npm run dev` — serwer deweloperski
- `npm test` — testy jednostkowe i scenariuszowe (Vitest)
- `npm run e2e` — testy E2E (Playwright)
- `npm run lint`, `npm run build`
