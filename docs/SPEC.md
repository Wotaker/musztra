# Interpreter Języka Musztry — specyfikacja MVP

Wersja: 1.0 (2026-10-18) · Status: zatwierdzona do pierwszej iteracji
Dokumenty powiązane: `docs/COMMANDS.md` (katalog komend), `CLAUDE.md` (zasady pracy), `docs/regulamin-musztry-1994.pdf` (źródło prawdy), `docs/DECISIONS.md` (dziennik decyzji, prowadzi Claude Code).

---

## 1. Wizja

Przeglądarkowy symulator musztry, w którym użytkownik jest dowódcą drużyny. Wpisuje komendy w wierszu poleceń, a interpreter sprawdza je z Regulaminem musztry SZ RP (Szt. Gen. 1427/94) i albo wykonuje na animowanej drużynie widzianej z góry, albo wyjaśnia, co jest nie tak i jak to poprawić.

Metafora przewodnia: **musztra jest imperatywnym językiem programowania typu SIMD**. Regulamin to gramatyka i semantyka tego języka, drużyna to procesor wykonujący jedną instrukcję na wielu jednostkach naraz. Aplikacja ma tę metaforę uwidaczniać, nie tylko wykorzystywać.

### 1.1 Zasady nadrzędne

1. **Wartość dydaktyczna** przy budowie i użytkowaniu. Każdy komunikat aplikacji uczy: wskazuje punkt regulaminu, pokazuje formę kanoniczną, tłumaczy przyczynę.
2. **Prostota i UX.** Płynnie (60 kl./s), intuicyjnie, ładnie. Pierwsza poprawna komenda w mniej niż minutę od otwarcia aplikacji, bez czytania instrukcji.

### 1.2 Użytkownicy

- Główny: autor (podchorąży/kursant uczący się musztry).
- Dodatkowi: koledzy z grupy, przez link do strony. Udostępnienie nie może generować kosztów ani wymagać serwera.

---

## 2. Zakres

### 2.1 MVP (ta specyfikacja)

- Jeden pododdział: **drużyna**, musztra zespołowa **bez broni**.
- Szyki: szereg, dwuszereg (pełny i niepełny), rząd, kolumna dwójkowa; stan „rozproszona” (start i po „ROZEJŚĆ SIĘ”).
- Komendy z katalogu `docs/COMMANDS.md`: postawy, zwroty, zbiórki (3 sposoby), rozejście, równanie, odliczanie, odstępowanie i łączenie, przesunięcia, zachodzenie, zmiany szyku w miejscu i w marszu, marsz, bieg, zatrzymanie, zmiany kierunku, WRÓĆ.
- Dowódca sterowany z klawiatury na nieskończonym placu z obiektami terenowymi.
- Interpreter deterministyczny (3 warstwy walidacji), tryb łagodny i ścisły.
- Meldunki i odzywki żołnierzy w interfejsie („Niepełny”, liczby z odliczania, „Jestem”).
- Podpowiadanie komend (autouzupełnianie) i przeglądarka katalogu komend w aplikacji.
- Opcjonalne objaśnienia błędów przez LLM z kluczem API użytkownika.

### 2.2 Poza MVP (backlog, w kolejności orientacyjnej)

1. Zadania i scenariusze z oceną („ustaw drużynę w dwuszeregu frontem do koszar”).
2. Interfejs głosowy (Web Speech API, pl-PL; zapowiedź i hasło rozróżniane pauzą).
3. Wywołanie z szyku: „WYSTĄP”, „WSTĄP”, „DO MNIE”, odzew „Jestem” (pkt 57–59).
4. Pluton, następnie kompania, batalion (pkt 78–94).
5. Zbiórka w marszu (pkt 69, ostatnie akapity), warianty kierunkowe „ROZEJŚĆ SIĘ”, „Lewa – WOLNA”, „ŚPIEW”.
6. Chwyty bronią, oddawanie honorów, meldunki dowódcy, sztandar.
7. Synchronizacja komend z krokiem (lewa/prawa noga).
8. Błędy wykonania po stronie żołnierzy (realizm, ćwiczenie korygowania).
9. Wersja mobilna z wirtualnym joystickiem; tryb egzaminu; statystyki postępów.

### 2.3 Świadome uproszczenia MVP

- **Czas:** komendy padają zawsze we właściwym momencie kroku. Nie modelujemy nóg, na którą pada hasło.
- **Ruchy ciała:** animacja uproszczona (np. półzwroty i wykroki pokazane jako płynne przemieszczenie i obrót).
- **Dowódca jest poza szykiem.** Użytkownik jest dowódcą prowadzącym zajęcia; drużyna ma N żołnierzy bez dowódcy w szyku.
- Żołnierze wykonują komendy bezbłędnie.

---

## 3. Doświadczenie użytkownika

### 3.1 Układ ekranu (desktop, minimum 1280×720)

```
┌───────────────────────────────────────────────────────────────┐
│ [Stan: dwuszereg · zasadnicza · stoi · front 0°]   [⏱1×] [⚙] │  pasek górny
│                                                               │
│                       PLAC (canvas, pełny ekran)              │
│        żołnierze, dowódca, obiekty, dymki meldunków           │
│                                               ┌─────────────┐ │
│                                               │ Dziennik    │ │  zwijany
│                                               └─────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ✖ Brak komendy BACZNOŚĆ przed komendą w miejscu (pkt 11)  │ │  panel informacji
│ │   [Objaśnij] [Użyj: BACZNOŚĆ]                             │ │  zwrotnej
│ ├───────────────────────────────────────────────────────────┤ │
│ │ > W prawo – ZWROT▌            W prawo – ZWROT  (Tab)      │ │  wiersz poleceń
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
        [Katalog komend] — szuflada z prawej (klawisz F1 lub ?)
```

### 3.2 Tryby fokusu klawiatury

Klawisze liter służą i do pisania, i do sterowania, więc są dwa tryby, zawsze wyraźnie oznaczone (np. obwódka wiersza poleceń i ikonka w rogu):

| Tryb | Wejście | Klawisze |
|---|---|---|
| **Komenda** (domyślny po starcie) | klik w wiersz, `Enter` lub `/` z trybu Ruch | pisanie; `Enter` wysyła (fokus zostaje); `Tab` przyjmuje podpowiedź; `↑`/`↓` historia komend; `Esc` → tryb Ruch |
| **Ruch** | `Esc` z wiersza lub klik w plac | `WASD` lub strzałki: ruch dowódcy w 8 kierunkach; `Shift` bieg; `Q`/`E` obrót w miejscu o 45°; `Enter` lub `/` → tryb Komenda |

Kółko myszy: zoom w obu trybach.

### 3.3 Wiersz poleceń i podpowiedzi

- Duża, czytelna czcionka. Wpisany tekst z kolorowaniem składni na żywo: adresat, zapowiedź, myślnik, HASŁO.
- **Autouzupełnianie** z katalogu komend: pod kursorem szara podpowiedź (przyjmowana klawiszem `Tab`), a nad wierszem lista do 5 pasujących wzorców. Sloty wzorca (liczby, nazwiska, obiekty) wypełniane wartościami dostępnymi w bieżącym stanie.
- Wzorce niewykonalne w obecnym stanie są wyszarzone z krótkim powodem (np. „wymaga BACZNOŚĆ”). Uczy to warunków wstępnych bez popełniania błędu.
- Podpowiedzi można wyłączyć w ustawieniach (ćwiczenie z pamięci).

### 3.4 Informacja zwrotna po komendzie

Trzy poziomy, każdy z ikoną i kolorem:

- **✔ Wykonano** — pokazuje formę kanoniczną, gdy wpisana różniła się zapisem (tryb łagodny): „Zapisano jako: Drużyna, w prawo – ZWROT”.
- **⚠ Uwaga** — komenda wykonana, ale z niedociągnięciem (np. brak „Zwykły – KROK” po wyrównaniu dwójek).
- **✖ Błąd** — komenda odrzucona, stan bez zmian. Podkreślenie błędnego fragmentu w wierszu (jak w edytorze kodu), komunikat interpretera, punkt regulaminu, propozycja poprawki z przyciskiem „Użyj”. Gdy jest klucz API: objaśnienie LLM (automatyczne lub przyciskiem „Objaśnij”, wg ustawień).

Komunikaty interpretera są po polsku, konkretne i samodzielnie zrozumiałe także bez LLM.

### 3.5 Meldunki i odzywki

- Dymki nad żołnierzami (ok. 2 s): liczby z odliczania pojawiające się kolejno od prawego skrzydła, „Niepełny”, „Jestem”.
- Wpis w Dzienniku: `szer. Nowak: Niepełny`.
- Gest towarzyszący (np. uniesiona lewa ręka przy „Jestem”) zaznaczony prostym znacznikiem graficznym.

### 3.6 Dziennik

Chronologiczna lista: komendy (z ikoną wyniku), meldunki, uwagi. Klik w komendę wstawia ją do wiersza poleceń.

### 3.7 Katalog komend w aplikacji

Szuflada z listą komend pogrupowaną jak w `docs/COMMANDS.md`, z wyszukiwarką. Każda pozycja: forma kanoniczna, warianty, krótki opis, punkt regulaminu z cytatem, przykład. Klik wstawia wzorzec do wiersza. Katalog w UI jest generowany z tych samych danych co gramatyka i testy (jedno źródło).

### 3.8 Ustawienia

| Ustawienie | Wartości | Domyślnie |
|---|---|---|
| Liczebność drużyny | 3–12 | 9 |
| Nazwa drużyny | Drużyna / Pierwsza … Czwarta drużyna | Pierwsza drużyna |
| Nazwiska żołnierzy | losuj ponownie | losowe z listy |
| Tryb zapisu | łagodny / ścisły | łagodny |
| Podpowiedzi | wł. / wył. | wł. |
| Prędkość symulacji | 0,5× · 1× · 2× · 3× | 1× |
| Klucz API, model, auto-objaśnianie | zob. sekcja 8 | brak klucza |
| Reset placu | start: rozproszona / szereg | rozproszona |

Ustawienia zapisywane lokalnie w przeglądarce.

### 3.9 Plac, kamera, wygląd

- **Plac nieskończony.** Kafelkowana nawierzchnia placu apelowego z delikatną siatką co 5 m i różą wiatrów w rogu ekranu (północ u góry).
- **Obiekty terenowe** w stałych miejscach wokół środka placu (służą jako punkty odniesienia w komendach zbiórki i jako dekoracja): maszt, trybuna, koszary, garaże, hangar, magazyn, droga (pas przecinający plac). Każdy obiekt ma nazwę widoczną po najechaniu lub stale przy dużym zbliżeniu oraz punkt zaczepienia do komend („na wysokości masztu”).
- **Kamera** płynnie śledzi prostokąt obejmujący drużynę i dowódcę, z automatycznym zoomem w granicach. Gdy się rozjadą ponad limit, kamera śledzi drużynę, a na krawędzi ekranu pojawia się strzałka wskazująca dowódcę. Kółko myszy przestawia zoom ręcznie (do kolejnego dużego ruchu).
- **Żołnierz z góry:** owal ramion, głowa w berecie, wyraźny znacznik kierunku frontu, animacja wymachu rąk i kroku w marszu (inna dla kroku defiladowego, zwykłego, biegu). Postawa swobodna rozróżnialna (np. lżejszy obrys, ręce luźno). Dowódca odróżniony kolorem i dystynkcją.
- **Kierunkowy** i **skrzydłowi** subtelnie oznaczeni (przełącznik „pokaż role”); podgląd numerów z ostatniego odliczania po najechaniu.
- Paleta stonowana, wojskowa (oliwka, piasek, grafit), płaskie ilustracje wektorowe, przejścia animowane. Interfejs nie przesłania placu bardziej niż to konieczne.

### 3.10 Pierwsze uruchomienie

Nakładka z trzema krótkimi wskazówkami: „Drużyna rozeszła się po placu. Wydaj komendę zbiórki, np. *Pierwsza drużyna, w dwuszeregu – ZBIÓRKA*”, „Esc — sterujesz dowódcą (WASD), Enter — wracasz do komend”, „F1 — katalog komend”. Do ponownego wyświetlenia z menu.

---

## 4. Architektura

### 4.1 Decyzje

| Obszar | Wybór | Uzasadnienie |
|---|---|---|
| Typ aplikacji | statyczna SPA, bez serwera | zero kosztów i utrzymania |
| Hosting | GitHub Pages, wdrożenie przez GitHub Actions z gałęzi `main` | darmowe, znane autorowi |
| Język | TypeScript (strict) | typy chronią model domeny |
| Build | Vite | szybki, prosty |
| UI | React + lekki store (Zustand) | standard, dobre wsparcie |
| Renderowanie placu | Canvas 2D, własny renderer poza Reactem | wydajne, deterministyczne, wystarczy do setek żołnierzy (pluton/kompania później) |
| Gramatyka | Ohm.js, gramatyka w osobnym pliku `src/core/grammar/musztra.ohm` | czytelny plik gramatyki, dobre komunikaty błędów; zmiana narzędzia tylko z wpisem w `DECISIONS.md` |
| Testy | Vitest (jednostkowe i scenariuszowe), Playwright (E2E) | presja środowiskowa na poprawność |
| LLM | Anthropic Messages API wywoływane bezpośrednio z przeglądarki, klucz użytkownika | brak pośrednika i kosztów autora |

### 4.2 Warstwy i struktura repozytorium

```
CLAUDE.md
docs/
  SPEC.md  COMMANDS.md  DECISIONS.md  regulamin-musztry-1994.pdf
src/
  core/                 ← czysty TypeScript, bez DOM i Reacta, w pełni testowalny w Node
    grammar/            musztra.ohm, normalize.ts, parse.ts  → AST lub ParseError
    catalog/            dane katalogu komend (jedno źródło dla gramatyki, testów, UI, LLM)
    semantics/          warunki wstępne: (AST, stan) → błędy/uwagi
    sim/                model stanu, plany ruchu, krok symulacji (stały dt)
    roster/             nazwiska z odmianą (mianownik, dopełniacz)
    interpreter.ts      potok: normalizacja → parsowanie → forma → semantyka → wykonanie
  render/               renderer canvas, kamera, animacje, dymki
  ui/                   komponenty React: wiersz poleceń, panel informacji, dziennik, katalog, ustawienia
  llm/                  klient API, prompt, walidacja odpowiedzi
tests/
  grammar/  semantics/  scenarios/      (Vitest)
e2e/                                     (Playwright)
```

Zasada: `core` nie importuje niczego z `render`, `ui`, `llm`. Cała logika musztry jest w `core` i działa bez przeglądarki.

### 4.3 Potok interpretera

```
tekst ─▶ 1. normalizacja ─▶ 2. parsowanie ─▶ 3. kontrola formy ─▶ 4. semantyka ─▶ 5. wykonanie ─▶ 6. informacja zwrotna
          (tryb łagodny)     (gramatyka)      (tryb ścisły)       (stan)          (symulacja)
```

1. **Normalizacja** (tryb łagodny): przycięcie i scalenie spacji; ujednolicenie myślników (`-`, `–`, `—` → `–`); dopuszczenie braku myślnika; ignorowanie wielkości liter; dopuszczenie braku polskich znaków (z informacją); cyfry → liczebniki słowne. Zachowana mapa pozycji do oryginału (do podkreślania błędów).
2. **Parsowanie** gramatyką do typowanego AST (unia komend z identyfikatorem z katalogu) albo `ParseError { pozycja, oczekiwane[], znalezione }`. Komendy istniejące w regulaminie, ale poza MVP (np. „Przez pierś – BROŃ”), są rozpoznawane i zwracają `E_OUT_OF_SCOPE` z numerem punktu.
3. **Kontrola formy** (tylko tryb ścisły): zgodność z formą kanoniczną: hasło wielkimi literami, myślnik ze spacjami, przecinki, polskie znaki, liczebniki słowne z poprawną odmianą. Każda rozbieżność wskazana osobno.
4. **Semantyka:** warunki wstępne komendy względem stanu (postawa, szyk, ruch, odliczenie, poprzednie miejsce zbiórki, adresat). Wynik: lista błędów i uwag.
5. **Wykonanie:** komenda zamieniana na plan działań dla każdego żołnierza (SIMD), symulacja go realizuje.
6. **Informacja zwrotna:** wynik, forma kanoniczna, komunikaty, meldunki.

Dodatkowo, bez LLM: dla błędów składni propozycja „czy chodziło o…” na podstawie odległości edycyjnej od wzorców katalogu.

### 4.4 Kody komunikatów

| Kod | Poziom | Znaczenie |
|---|---|---|
| `E_SYNTAX_UNKNOWN` | błąd | tekst nie przypomina żadnej komendy |
| `E_SYNTAX_EXPECTED` | błąd | w danym miejscu oczekiwano innego elementu |
| `E_SYNTAX_INCOMPLETE` | błąd | brak hasła lub części zapowiedzi |
| `E_GRAMMAR_AGREEMENT` | błąd (ścisły) / informacja `I_NORMALIZED` (łagodny) | błędna odmiana (np. „pięć kroki”, „od szeregowego Nowak”) |
| `E_RULE` | błąd | komenda sprzeczna z wyraźną regułą regulaminu (np. przesunięcie w tył o więcej niż krok, pkt 74; STÓJ z biegu, pkt 29) |
| `E_STRICT_FORM` | błąd (tylko ścisły) | rozbieżność z formą kanoniczną |
| `E_OUT_OF_SCOPE` | informacja | komenda z regulaminu, jeszcze nieobsługiwana |
| `E_ADDRESSEE` | uwaga | adresat nie istnieje na placu; nikt nie reaguje |
| `E_PRECOND_POSTURE` | błąd | wymaga postawy zasadniczej (pkt 11) |
| `E_PRECOND_ATTENTION` | błąd | zbiórka bez wcześniejszego wezwania lub BACZNOŚĆ (pkt 69) |
| `E_PRECOND_FORMATION` | błąd | komenda niedostępna w bieżącym szyku |
| `E_PRECOND_MOTION` | błąd | komenda niedostępna w bieżącym ruchu (stoi / marsz / bieg) |
| `E_PRECOND_COUNT` | błąd | brak wymaganego odliczenia |
| `E_PRECOND_STATE` | błąd | brak stanu wymaganego przez komendę (np. ŁĄCZ bez ODSTĄP, brak poprzedniego miejsca) |
| `E_BUSY` | błąd | drużyna wykonuje czynność przejściową; dozwolone tylko WRÓĆ |
| `W_FORMATION_DIRECTION` | uwaga | zmiana ugrupowania zwrotem w nieregulaminową stronę (pkt 76) |
| `W_DIRECTION_DEPLOYED` | uwaga | zmiana kierunku marszu w szyku rozwiniętym (I-3) |
| `W_FOLLOW_HALT` | uwaga | „Za mną”: dowódca stanął, drużyna maszeruje w miejscu |
| `W_MISSING_ADDRESSEE` | uwaga | STÓJ bez adresata w trybie łagodnym (I-16) |
| `W_AWAIT_QUICK_STEP` | uwaga | po „W dwójki – W PRZÓD” brak „Zwykły – KROK” (pkt 77) |
| `W_NO_EFFECT` | uwaga | komenda poprawna, ale w tym stanie nic nie zmienia |
| `I_NORMALIZED` | informacja | zapis znormalizowany do formy kanonicznej |

---

## 5. Model domeny

### 5.1 Glosariusz (PL → identyfikatory w kodzie)

| Regulamin | Kod | Uwagi |
|---|---|---|
| szyk | `formation` | `SINGLE_RANK`, `DOUBLE_RANK`, `FILE`, `COLUMN_OF_TWOS`, `DISPERSED` |
| szereg / dwuszereg | `SINGLE_RANK` / `DOUBLE_RANK` | ugrupowanie rozwinięte (`deployed`) |
| rząd / kolumna dwójkowa | `FILE` / `COLUMN_OF_TWOS` | ugrupowanie marszowe (`march`) |
| front | `facing` | azymut w stopniach, 0° = północ, zgodnie z ruchem wskazówek zegara |
| skrzydło prawe/lewe | `rightFlank` / `leftFlank` | |
| kierunkowy | `guide` | |
| odstęp / odległość | `interval` / `distance` | wzdłuż frontu / w głąb |
| zapowiedź / hasło | `preparatory` / `executive` | |
| adresat (wezwanie) | `addressee` | |
| postawa zasadnicza / swobodna | `ATTENTION` / `AT_EASE` | |
| krok defiladowy / zwykły / dowolny | `PARADE` / `QUICK` / `ROUTE` | |

### 5.2 Wielkości (metry, sekundy)

| Wielkość | Wartość | Źródło |
|---|---|---|
| odstęp w szeregu (środek–środek) | 0,6 m | pkt 4 (szerokość dłoni) + szerokość barków |
| odległość między szeregami / w kolumnie | 1,2 m | pkt 5, 6 |
| odstęp między rzędami kolumny | 0,6 m | pkt 6 |
| długość kroku zwykłego | 0,7 m | pkt 26 (60–70 cm) |
| tempo marszu | 114 kroków/min | pkt 25–26 |
| długość kroku biegu / tempo | 0,9 m / 170 kroków/min | pkt 28 |
| „krok” w komendach przesunięcia i odstępowania | 0,7 m | |
| dowódca przed kolumną | 3 kroki | rys. 25 |
| czas zwrotu w miejscu | ok. 0,6 s | uproszczenie |

### 5.3 Stan

- **Żołnierz:** `id`, nazwisko (z odmianą), stopień (MVP: szeregowy), pozycja `(x, y)`, `facing`, `posture`, `motion` (`STANDING`, `MARCHING`, `MARCHING_IN_PLACE`, `RUNNING`), `step` (`PARADE`/`QUICK`/`ROUTE`), `countNumber` (z ostatniego odliczania lub brak), `headTurned` (równanie), bieżący plan ruchu.
- **Drużyna:** nazwa, `formation`, `facing`, kolejność żołnierzy w szyku (indeksy pozycji), kierunkowy, `incomplete` (dwuszereg/kolumna niepełna), `countMode` (`SEQUENTIAL` / `BY_N` / brak, oraz czy odliczenie było w marszu), stan odstępowania (od kogo, ile kroków), flaga `irregularSpacing` (odstępy nieregulaminowe, do skorygowania przez SPOCZNIJ lub Równaj), ostatnie miejsce zbiórki, czynność przejściowa w toku.
- **Dowódca:** pozycja, `facing`, ruch.
- **Świat:** obiekty terenowe z punktami zaczepienia.
- **Historia:** migawka stanu przed każdą wykonaną komendą (dla WRÓĆ).

### 5.4 Niezmienniki szyku (sprawdzane w testach po każdej komendzie)

Po zakończeniu każdej czynności przejściowej drużyna w szyku innym niż `DISPERSED` spełnia:

- wszyscy żołnierze mają ten sam `facing` (tolerancja 1°), poza czasem trwania zmiany kierunku kolumny;
- pozycje leżą na liniach szyku (tolerancja 5 cm), a kolejność od prawego skrzydła (czoła) odpowiada kolejności w stanie;
- odstępy i odległości są regulaminowe (tolerancja 5 cm), chyba że `irregularSpacing` lub stan odstępowania mówi inaczej;
- w dwuszeregu i kolumnie dwójkowej żołnierze drugiego szeregu (rzędu) kryją poprzedników; co najwyżej jeden żołnierz bez pary, zawsze na lewym skrzydle pierwszego szeregu (w dwuszeregu) lub na końcu kolumny — a w szyku odwróconym (po „W tył – ZWROT” lub zwrocie w nieregulaminową stronę, pkt 76) na przeciwnym skraju szyku (DECISIONS.md, D-026).

### 5.5 Symulacja

- Stały krok czasu (np. 1/60 s), niezależny od klatek renderowania; renderer interpoluje.
- Funkcja czysta `simulate(state, dt) → state` oraz pomocnicza `runScript(initialState, commands[], options) → { states, feedback }` do testów scenariuszowych, w tym przewijanie do zakończenia czynności przejściowych.
- **Czynności przejściowe** (zwrot, zbiórka, zmiana szyku, odstępowanie, łączenie, przesunięcie o N kroków, odliczanie z dymkami, równanie, wezwanie drużyny rozproszonej, SPOCZNIJ z korektą odstępów, WRÓĆ): w trakcie dozwolone tylko WRÓĆ, pozostałe komendy → `E_BUSY`. Rozejście nie jest czynnością przejściową — drużynę można od razu wezwać (DECISIONS.md, D-025).
- **Ruchy ciągłe** (marsz, marsz w miejscu, bieg, zachodzenie, „na wprost” bez liczby kroków, „Za mną”): przyjmują kolejne komendy.
- **Prowadzenie kolumny:** kierunkowy wyznacza ścieżkę, każdy żołnierz podąża śladem z opóźnieniem odpowiadającym jego odległości w szyku i przesunięciem bocznym wynikającym z rzędu.
- **Rozwieranie odległości:** w ugrupowaniu marszowym po ruszeniu każdy żołnierz rusza, gdy poprzednik oddali się na 1,2 m.
- **Prędkość symulacji** mnoży dt; nie wpływa na wynik.
- Wszelka losowość (rozproszenie, nazwiska) z ziarnem, żeby testy były deterministyczne.

---

## 6. Dowódca

- Pozycja i front; porusza się klawiszami (sekcja 3.2) z prędkością marszu, z `Shift` biegiem; front podąża za kierunkiem ruchu; `Q`/`E` obrót o 45° w miejscu.
- Zbiórka bez wskazania miejsca odbywa się względem pozycji i frontu dowódcy (pkt 69).
- „Za mną – MARSZ”: kierunkowy podąża śladem dowódcy w odległości 3 kroków, reszta jak w kolumnie; zatrzymanie dowódcy nie zatrzymuje drużyny (kierunkowy dochodzi na 3 kroki i maszeruje w miejscu, z uwagą `W_FOLLOW_HALT`), do zatrzymania służy STÓJ.
- Dowódca nie jest cofany przez WRÓĆ.

---

## 7. Katalog komend

Pełny katalog: `docs/COMMANDS.md`. Wymagania wobec implementacji:

- Katalog jest **danymi** (`src/core/catalog`), z których korzystają: gramatyka (spójność), testy (przykłady poprawne i błędne każdej komendy), autouzupełnianie, szuflada katalogu w UI, prompt LLM.
- Każdy wpis: `id`, grupa, forma kanoniczna, warianty, wzorzec ze slotami, punkt regulaminu z krótkim cytatem, warunki wstępne, efekt, przykłady poprawne, przykłady błędne z oczekiwanym kodem.
- Test spójności: każdy przykład poprawny parsuje się do deklarowanego `id`; każdy przykład błędny daje deklarowany kod; każda reguła gramatyki jest pokryta co najmniej jednym przykładem.
- **Rozszerzanie katalogu** (procedura w `CLAUDE.md`) nie wymaga zmian w UI: nowa komenda pojawia się automatycznie w podpowiedziach i szufladzie.

---

## 8. LLM (opcjonalny)

### 8.1 Rola

LLM nigdy nie decyduje o poprawności. Dostaje werdykt interpretera i:

- tłumaczy błąd prostym językiem z odwołaniem do punktu regulaminu;
- rozpoznaje intencję przy mocno zniekształconym wpisie;
- proponuje poprawną komendę.

**Każda propozycja LLM przechodzi przez interpreter (parsowanie i semantykę) przed pokazaniem przycisku „Użyj”.** Propozycja niepoprawna jest odrzucana; pokazywane jest wtedy samo objaśnienie.

### 8.2 Wywołanie

- Wyzwalacz: błąd (automatycznie, gdy włączone „auto-objaśnianie”, inaczej przyciskiem „Objaśnij”); opcjonalnie także uwagi.
- Wejście: wpisany tekst, wynik interpretera (kod, pozycja, oczekiwane elementy, komunikat), skrócony opis stanu drużyny, katalog komend (stały prefiks promptu z cache).
- Wyjście: JSON `{ "explanation": string, "suggestion": string | null, "regulationPoints": number[] }`, walidowany schematem; strumieniowe wyświetlanie objaśnienia.
- System prompt: rola instruktora musztry; wyłącznie na podstawie dostarczonego katalogu i regulaminu; nie wymyślać komend; po polsku; najwyżej 3–4 zdania; przy niepewności powiedzieć to wprost.
- Model domyślny: szybki i tani (`claude-haiku-5-5`), konfigurowalny w ustawieniach.
- Limit czasu 15 s; błędy (zły klucz, brak sieci, limit) zamieniane na zrozumiały komunikat, aplikacja działa dalej.

### 8.3 Klucz API

- Wprowadzany w ustawieniach; domyślnie trzymany tylko w pamięci sesji; opcja „zapamiętaj na tym urządzeniu” (localStorage) z ostrzeżeniem.
- Wysyłany wyłącznie do `api.anthropic.com` (nagłówek wymagany przez API dla wywołań z przeglądarki); nigdy w adresie URL, logach ani komunikatach błędów.
- Content Security Policy ogranicza połączenia do `api.anthropic.com`. Brak analityki i zewnętrznych skryptów.
- Instrukcja w aplikacji: zalecenie osobnego klucza z niskim limitem wydatków.
- Bez klucza wszystkie funkcje poza objaśnieniami LLM działają w pełni.

---

## 9. Jakość i testy

Testy są głównym mechanizmem kontroli jakości: autor weryfikuje działanie i wygląd, nie kod.

1. **Gramatyka:** testy tabelaryczne generowane z przykładów katalogu (poprawne i błędne, oba tryby zapisu), normalizacja, odmiana liczebników, mapa pozycji błędów.
2. **Semantyka:** każda reguła warunków wstępnych z katalogu ma test pozytywny i negatywny.
3. **Scenariusze:** sekwencje komend → oczekiwany stan końcowy. Obowiązkowo wszystkie scenariusze z `docs/COMMANDS.md` sekcja „Scenariusze akceptacyjne”. Po każdej komendzie sprawdzane niezmienniki z sekcji 5.4.
4. **Determinizm:** ten sam skrypt daje identyczny stan niezależnie od prędkości symulacji i liczby klatek.
5. **E2E (Playwright):** wpisanie komendy i obserwacja wyniku w UI; przełączanie trybów fokusu; ruch dowódcy; autouzupełnianie (`Tab`); historia (`↑`); błąd z podkreśleniem; szuflada katalogu; ustawienia; LLM z zamockowanym API (w tym zła propozycja odrzucona przez interpreter).
6. **Wydajność:** 60 kl./s przy 12 żołnierzach i włączonych dymkach na przeciętnym laptopie; interpreter odpowiada w < 20 ms.
7. **CI:** GitHub Actions uruchamia lint, testy, build i E2E; wdrożenie na Pages tylko gdy wszystko przechodzi.

---

## 10. Etapy realizacji

Każdy etap kończy się działającą, wdrożoną wersją, którą autor może sprawdzić w przeglądarce, oraz listą kontrolną weryfikacji ręcznej.

Zmiana zakresu (2026-10-20, decyzja autora): pierwotne etapy E5 Nauka, E6 LLM i E7 Szlif połączono w jeden etap końcowy **EF**. Elementy E5 i E7 spoza zakresu EF przeniesiono do `docs/BACKLOG.md` (sekcja „Poza zakresem EF”).

| Etap | Zawartość | Kryterium ukończenia (oprócz zielonych testów) |
|---|---|---|
| **E0 Szkielet** | Vite + React + TS, Vitest, Playwright, lint, CI, wdrożenie na GitHub Pages, pusty plac z siatką | strona otwiera się pod publicznym adresem Pages |
| **E1 Interpreter** | normalizacja, gramatyka całego katalogu MVP, tryby zapisu, kody błędów, katalog jako dane, prosty wiersz poleceń z informacją zwrotną (bez symulacji) | każda komenda katalogu rozpoznawana; błędy z podkreśleniem i punktem regulaminu |
| **E2 Stan i obraz** | model stanu, renderer, kamera, obiekty terenowe, dowódca na klawiaturze, tryby fokusu; postawy, zwroty, 3 sposoby zbiórki, ROZEJŚĆ SIĘ, WRÓĆ | scenariusze zbiórek i zwrotów przechodzą; widać to na placu |
| **E3 Szyki w miejscu** | odliczanie z dymkami i meldunkiem „Niepełny”, równanie, zmiany szyku w miejscu, odstępowanie i łączenie, przesunięcie, dziennik | scenariusze szyków w miejscu przechodzą |
| **E4 Ruch** | marsz, kroki, marsz w miejscu, bieg, zatrzymania, zmiany kierunku, „Za mną”, zachodzenie, zmiany szyku w marszu, „Stawaj”, „Czoło – STÓJ” | scenariusze marszowe przechodzą; ruch płynny |
| **EF Etap końcowy** | (połączone E5, E6 i E7 — decyzja autora z 2026-10-20; zakres zamknięty, reszta w `docs/BACKLOG.md`) **K1** LLM w całości (sekcja 8) z panelem ustawień (klucz API, auto-objaśnianie, tryb zapisu, liczebność drużyny) i Content Security Policy; **K2** ściąga z katalogu (F1), „Podstawowe ćwiczenia”, regulamin PDF w aplikacji z odnośnikami „pkt N”; **K3** nakładka pierwszego uruchomienia, poprawka „STÓJ podczas zmiany kierunku kolumny”, README dla grupy | testy z zamockowanym API; ręczny test z prawdziwym kluczem; każdy kamień milowy (K1, K2, K3) wdrożony osobno |

---

## 11. Interpretacje regulaminu do weryfikacji z prowadzącym

Miejsca, gdzie regulamin milczy lub jest niejednoznaczny, a specyfikacja przyjmuje rozwiązanie. Do potwierdzenia na zajęciach; każda zmiana trafia do `COMMANDS.md` i testów.

| # | Sytuacja | Przyjęte rozwiązanie |
|---|---|---|
| I-1 | Zwrot z rzędu (odległość 1,2 m) do szeregu | powstają luki; flaga `irregularSpacing`, korekta na SPOCZNIJ lub „Równaj” (pkt 69, 71) |
| I-2 | Zwrot z szeregu do rzędu daje odległość 0,6 m | po ruszeniu żołnierze rozwierają się do 1,2 m |
| I-3 | „kierunek w lewo/prawo – MARSZ” w szyku rozwiniętym | wykonywana indywidualnie wg pkt 24 (szyk staje się marszowym), z uwagą `W_DIRECTION_DEPLOYED` wskazującą „zachodź” (pkt 75) do zmiany frontu |
| I-4 | Odliczanie | w miejscu tylko w szyku rozwiniętym; w marszu tylko w rzędzie (pkt 72) |
| I-5 | Zmiana kierunku kolumny | „po śladzie kierunkowego” |
| I-6 | Miejsce prawoskrzydłowego na zbiórce | rozwinięty: po lewej stronie dowódcy w odstępie 0,6 m; marszowy: 3 kroki za dowódcą |
| I-7 | Przydział żołnierzy do szeregów dwuszeregu | pierwszy szereg: pierwsze ⌈N/2⌉ osób wg kolejności, od prawej; drugi: pozostali, od prawej |
| I-8 | „W szereg, w lewo – FRONT” | dwójki tylko się zwracają, jedynki dostawiają się po ich prawej stronie (szyk przesuwa się o odstęp); samotna jedynka z końca staje na lewo od ostatniej dwójki |
| I-9 | Zbiórka bez wezwania i bez BACZNOŚĆ | błąd `E_PRECOND_ATTENTION` (pkt 69); forma z adresatem w jednej linii pełni rolę wezwania |
| I-10 | Komenda do nieistniejącego pododdziału | nikt nie reaguje, uwaga `E_ADDRESSEE` |
| I-11 | Komenda w trakcie czynności przejściowej | `E_BUSY`, dozwolone WRÓĆ |
| I-12 | WRÓĆ | powrót do migawki sprzed ostatniej wykonanej komendy (szybka animacja), także po jej zakończeniu |
| I-13 | Zachodzenie | trwa aż do „Drużyna – STÓJ”, bez limitu kąta |
| I-14 | Postawa po ŁĄCZ | swobodna, przez analogię do ODSTĄP (pkt 73) |
| I-15 | „Za mną – MARSZ” w szyku rozwiniętym | niedozwolone (`E_PRECOND_FORMATION`); tylko ugrupowanie marszowe |
| I-16 | „STÓJ” bez adresata | regulamin podaje „Drużyna – STÓJ” (pkt 100); tryb łagodny wykonuje z uwagą, ścisły odrzuca |
| I-17 | Postawa po „Czoło – STÓJ” | wszyscy, łącznie z czołem, przyjmują postawę swobodną |
