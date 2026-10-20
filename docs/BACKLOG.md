# Backlog usprawnień

Propozycje usprawnień zebrane przy etapach E2–E4 (decyzja autora z 2026-10-20: propozycje trafiają tu, nie do bieżącego etapu). Nowe funkcje poza MVP są w `SPEC.md`, sekcja 2.2 — ten plik ich nie powtarza. Kolejność w sekcjach — od najważniejszych. Pozycje do przeglądu przez autora; realizacja po etapie końcowym EF (zob. niżej).

## Poza zakresem EF (z pierwotnych etapów E5 i E7)

Decyzja autora z 2026-10-20: etapy E5, E6 i E7 połączono w etap końcowy EF o zamkniętym zakresie (`SPEC.md`, sekcja 10). Poniżej wszystko z E5 i E7 (oraz z SPEC sekcje 3 i 8), czego EF nie obejmuje.

Z E5 (Nauka):

1. Autouzupełnianie w wierszu poleceń (SPEC 3.3): szara podpowiedź pod kursorem przyjmowana klawiszem `Tab`, lista do 5 pasujących wzorców nad wierszem, sloty (liczby, nazwiska, obiekty) wypełniane wartościami z bieżącego stanu.
2. Wyszarzanie wzorców niewykonalnych w obecnym stanie z krótkim powodem (np. „wymaga BACZNOŚĆ”) i przełącznik „Podpowiedzi wł./wył.” w ustawieniach.
3. „Czy chodziło o…” bez LLM — propozycja na podstawie odległości edycyjnej od wzorców katalogu (SPEC 4.3). W EF rozpoznawanie intencji przy `E_SYNTAX_UNKNOWN` robi tylko LLM.
4. Pozostałe ustawienia z SPEC 3.8: nazwa drużyny (Drużyna / Pierwsza … Czwarta drużyna), „losuj ponownie” nazwiska, prędkość symulacji w ustawieniach (dziś przycisk ⏱ w pasku), reset placu ze startem „rozproszona / szereg”, wybór modelu LLM (SPEC 8.2: „konfigurowalny w ustawieniach”; w EF stały `claude-haiku-5-5`).
5. Szuflada katalogu w pełnym kształcie SPEC 3.7: warianty, cytat z regulaminu i przykład przy każdej komendzie (ściąga EF pokazuje formę kanoniczną, krótki opis i punkt regulaminu).
6. Kryterium E5 „nowy użytkownik wydaje poprawną komendę w < 1 min” — pomiar z udziałem osób z grupy.

Z E7 (Szlif):

1. Dopracowanie grafiki i animacji (zob. sekcja „Wygląd” niżej).
2. Dostępność: pełna obsługa klawiaturą wszystkich paneli, kontrast, czytniki ekranu (role ARIA, opisy stanu placu).
3. Wydajność: pomiar 60 kl./s przy 12 żołnierzach z dymkami, interpreter < 20 ms (SPEC 9.6) — zob. „Testy i infrastruktura”, p. 2.
4. Lista kontrolna UX z SPEC sekcja 3 jako formalne kryterium ukończenia.
5. Wersja angielska README i dokumentacja dla deweloperów (README EF jest dla kolegów z grupy, po polsku).

## Uwagi UI autora

- Uwagi UI „na później” — autor zgłosi je po ukończeniu wszystkich etapów (decyzja z 2026-10-20).

## Dokumentacja (`COMMANDS.md`)

Z D-047 — doprecyzowania zgodne z obecnym działaniem symulatora:

1. S-4: „Drużyna – STÓJ” kończy zachodzenie bez dodatkowego kroku (D-043).
2. M-11: odległość między szeregami po „Stawaj” z kolumny dwójkowej — 0,6 m, szyk nieregularny do SPOCZNIJ (D-044); albo decyzja, że prawy rząd sam odsuwa się na 1,2 m (zob. „Symulacja”, p. 3).
3. M-1, M-9: zachowanie szyku rozwiniętego przy kierunku „w skos” (D-046).
4. Pola „Warunki” komend M uzupełnione o tabelę warunków ruchu z D-042 (`E_PRECOND_MOTION`, `W_NO_EFFECT`).

## Symulacja i ruch

1. ~~„Drużyna – STÓJ” w trakcie zakrętu kolumny zatrzymuje kolumnę wygiętą~~ — naprawione w etapie EF (D-055). Pozostaje: „Czoło – STÓJ” i „Stawaj” w trakcie zakrętu — kolumna może dojść do czoła częściowo na łuku (do sprawdzenia).
2. Żołnierze biegnący na zbiórkę i rozchodzący się po rozejściu mogą przenikać przez siebie nawzajem. Propozycja: proste omijanie (rozsunięcie torów, kolejność dobiegania od najbliższych miejsc).
3. „Stawaj” z kolumny dwójkowej: prawy rząd mógłby sam odsunąć się na regulaminowe 1,2 m, bez flagi odstępów nieregularnych (alternatywa z D-044).
4. Dwuszereg idący „w skos” (D-046): obecnie szyk ukośny; propozycja — dokładniejsze odwzorowanie wykonania indywidualnego dla dwuszeregu.
5. Rozproszona drużyna stoi nieruchomo; COMMANDS ZB-4 przewiduje „drobny, spokojny ruch” po rozejściu (np. żołnierz co jakiś czas obraca się lub przestępuje). Do dodania w rendererze lub w symulacji (z ziarnem).
6. Ustępowanie dowódcy (D-040) jest proste (krok w bok, gdy żołnierz podejdzie bliżej niż 0,55 m). Propozycja: płynniejsze schodzenie z drogi z wyprzedzeniem, także przy zbiórce.
7. Zakręt kolumny dwójkowej: obie kolumny rzędów skręcają po śladzie kierunkowego z przesunięciem w bok; propozycja — wierniejsze „zachodzenie” pary na zakręcie (wewnętrzny skraca, zewnętrzny wydłuża krok).
8. Komendy w takt kroku (lewa/prawa noga) — już w SPEC 2.2, p. 7; tu przypomnienie, że czasy „jeszcze jeden krok” (D-041) są uproszczeniem.

## Wygląd

1. Zwrot głowy (równanie, odliczanie) jest słabo widoczny przy małym przybliżeniu — wyraźniejszy znacznik (np. mała strzałka nad głową).
2. Panel informacji zwrotnej po poprawnej komendzie zasłania dolną część placu — automatyczne zwijanie po kilku sekundach albo wersja skrócona.
3. Postacie: więcej szczegółów przy dużym zbliżeniu (pas, kieszenie, buty w kroku defiladowym), płynniejsze przejście postawa zasadnicza ↔ swobodna.
4. Nawierzchnia placu: subtelna faktura i winieta przy krawędziach; obiekty: więcej detali (okna koszar, ławki trybuny).
5. Etykiety obiektów poza kadrem mogą się zagęszczać w rogach ekranu — lepsze rozmieszczenie.
6. Dymki odzywek: lekkie „wyskoczenie” przy pojawieniu się, dźwięk (opcjonalnie, wyłączony domyślnie).

## Interfejs

1. Dziennik: filtr (tylko komendy / tylko meldunki), kopiowanie całej sesji, czas rzeczywisty obok czasu symulacji.
2. Strzałka „dowódca” na krawędzi ekranu: klik przenosi kamerę do dowódcy.
3. Przycisk „pokaż ślad” — rysowanie śladu kierunkowego (I-5) w czasie marszu, do nauki zmian kierunku.
4. Skrót klawiszowy do pauzy symulacji (spacja w trybie Ruch).

## Testy i infrastruktura

1. E2E także w Firefoksie i WebKicie (D-005).
2. Automatyczny pomiar wydajności (60 kl./s przy 12 żołnierzach z dymkami, SPEC 9.6) w przeglądarce.
3. Zrzuty ekranu generowane w CI jako artefakt (dziś `scripts/screenshots.mjs` uruchamiany ręcznie).
