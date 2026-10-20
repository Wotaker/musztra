# Musztra — Interpreter Języka Musztry

Przeglądarkowy symulator musztry. Jesteś dowódcą drużyny: wpisujesz komendy, a program sprawdza je z **Regulaminem musztry Sił Zbrojnych RP (Szt. Gen. 1427/94)**. Poprawną komendę drużyna wykonuje na placu widzianym z góry; błędną program odrzuca i tłumaczy, co jest nie tak — z numerem punktu regulaminu i propozycją poprawki.

Musztra bez broni, jedna drużyna (3–12 żołnierzy): postawy, zwroty, zbiórki, odliczanie, równanie, odstępowanie, zmiany szyku, marsz, bieg, zatrzymania, zmiany kierunku, „Za mną”, zachodzenie.

## Jak zacząć

1. Otwórz **https://wotaker.github.io/musztra/** (komputer, najlepiej Chrome, Edge lub Firefox; ekran od 1280×720).
2. Przy pierwszym uruchomieniu zobaczysz trzy wskazówki. Kliknij przykładową komendę i naciśnij **Enter** — drużyna zbierze się w dwuszeregu.
3. Nic nie trzeba instalować ani zakładać konta. Wszystko działa w przeglądarce.

Przydatne klawisze:

| Klawisz | Co robi |
|---|---|
| `Enter` | wysyła komendę |
| `↑` / `↓` | poprzednie komendy |
| `Esc` | przejście do sterowania dowódcą: `W` `A` `S` `D` (lub strzałki), `Shift` — bieg, `Q`/`E` — obrót |
| `Enter` lub `/` | powrót do wpisywania komend |
| `F1` | **ściąga**: wszystkie komendy z opisem i punktem regulaminu oraz podstawowe ćwiczenia |
| kółko myszy | przybliżenie placu |

## Pierwsze 5 komend

Wpisuj po kolei, czekając, aż drużyna skończy (pasek u góry przestanie pokazywać czynność):

1. `Pierwsza drużyna, w szeregu – ZBIÓRKA` — drużyna biegnie na zbiórkę i staje w szeregu obok dowódcy.
2. `SPOCZNIJ` — postawa swobodna.
3. `W prawo – ZWROT` — **błąd**: w szyku przed zwrotem trzeba podać „BACZNOŚĆ” (pkt 11). Program to wyjaśni i zaproponuje poprawkę.
4. `BACZNOŚĆ`, a potem `W prawo – ZWROT` — szereg staje się rzędem.
5. `Drużyna, kierunek na wprost – MARSZ`, po kilku krokach `Drużyna – STÓJ`.

Wielkość liter, myślnik i polskie znaki nie muszą być idealne — w **trybie łagodnym** (domyślnym) program sam poprawi zapis i pokaże formę kanoniczną. **Tryb ścisły** (w ustawieniach ⚙) wymaga zapisu dokładnie jak w regulaminie — dobry na powtórkę przed sprawdzianem.

Każde „pkt N” w aplikacji to odnośnik: otwiera regulamin (PDF) na stronie z tym punktem. Cały regulamin — przycisk **Regulamin** u góry.

## Objaśnienia AI (opcjonalne)

Program sam wyjaśnia każdy błąd. Jeśli chcesz dodatkowo objaśnień „jak od instruktora” — prostym językiem, z rozpoznaniem, o jaką komendę ci chodziło — możesz podać własny klucz API Anthropic. Wtedy przy błędzie lub uwadze pojawia się przycisk **Objaśnij**. Odpowiada model Claude Haiku; werdykt i tak zawsze wydaje program (każda propozycja modelu jest sprawdzana, zanim zobaczysz przycisk „Użyj”).

Bez klucza wszystko inne działa w pełni.

### Jak zdobyć klucz i ustawić limit wydatków

1. Wejdź na **https://console.anthropic.com/** (Claude Console) i załóż konto.
2. W **Billing** doładuj konto najmniejszą kwotą (objaśnienie kosztuje ułamek centa — kilka dolarów wystarczy na bardzo długo).
3. Utwórz osobny **workspace** tylko dla tej aplikacji (Settings → Workspaces) i ustaw mu niski **miesięczny limit wydatków**, np. 2 USD (w ustawieniach workspace'u, „Limits”). Dzięki temu nawet wyciek klucza nie będzie kosztował więcej niż ten limit.
4. W tym workspace utwórz klucz: **API Keys → Create Key**. Skopiuj go (zaczyna się od `sk-ant-`) — Console pokazuje go tylko raz.
5. W aplikacji kliknij **⚙** (ustawienia) i wklej klucz w pole „Klucz API Anthropic”. Opcjonalnie włącz „Objaśniaj automatycznie”.

### Bezpieczeństwo klucza

- Klucz jest wysyłany **wyłącznie** do `api.anthropic.com` (strona ma politykę bezpieczeństwa CSP, która blokuje połączenia gdziekolwiek indziej). Aplikacja nie ma serwera, analityki ani zewnętrznych skryptów — nikt poza Anthropic nie widzi twojego klucza.
- Domyślnie klucz jest pamiętany tylko **do zamknięcia karty**. Opcja „Zapamiętaj na tym urządzeniu” zapisuje go w przeglądarce na stałe — **nie zaznaczaj jej na komputerze współdzielonym** (np. w sali komputerowej).
- Używaj osobnego klucza z niskim limitem (patrz wyżej). Nie wpisuj klucza w wiersz komend ani nie wysyłaj go nikomu.
- Jeśli podejrzewasz, że klucz wyciekł: w Claude Console → API Keys usuń go (Delete) i utwórz nowy. W aplikacji przycisk „Usuń” w ustawieniach kasuje klucz z przeglądarki.

## Dla zainteresowanych

Kod: TypeScript + React + Vite, gramatyka komend w Ohm.js, testy Vitest i Playwright. Dokumentacja projektu: `docs/SPEC.md` (wymagania), `docs/COMMANDS.md` (katalog komend), `docs/DECISIONS.md` (decyzje), `docs/PROGRESS.md` (postęp i listy kontrolne).

```bash
npm ci
npm run dev     # serwer deweloperski: http://localhost:5173/musztra/
npm test        # testy jednostkowe i scenariuszowe
npm run e2e     # testy w przeglądarce
```

Źródło prawdy: `docs/regulamin-musztry-1994.pdf`. Symulator jest pomocą do nauki — w razie wątpliwości rozstrzyga regulamin i prowadzący zajęcia.
