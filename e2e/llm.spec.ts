import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { errorBody, explanationBody, FAKE_API_KEY, type MockExplanation } from './support/anthropicMock';

// Etap EF, K1: ustawienia, objaśnienia LLM z zamockowanym API, CSP (SPEC 3.4, 3.8, 8, 9.5).
// Testy nigdy nie łączą się z prawdziwym API — każde żądanie do api.anthropic.com jest przechwytywane.

const API = 'https://api.anthropic.com/v1/messages';

async function send(page: Page, text: string) {
  const input = page.getByTestId('command-input');
  await input.fill(text);
  await input.press('Enter');
}

async function idle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
  await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-activity', 'idle', { timeout: 20_000 });
}

/** Szereg w postawie swobodnej: „W prawo – ZWROT” da błąd E_PRECOND_POSTURE (pkt 11). */
async function atEaseRank(page: Page) {
  await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await idle(page);
  await send(page, 'SPOCZNIJ');
  await idle(page);
}

async function setKey(page: Page, key = FAKE_API_KEY) {
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-api-key').fill(key);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings-dialog')).toHaveCount(0);
}

/** Atrapa API: odpowiedź strumieniowa; zwraca listę przechwyconych żądań. */
async function mockApi(page: Page, reply: (route: Route, request: Request) => Promise<void>) {
  const requests: Request[] = [];
  await page.route(API, async (route, request) => {
    requests.push(request);
    await reply(route, request);
  });
  return requests;
}

function stream(explanation: MockExplanation) {
  return (route: Route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: explanationBody(explanation, { chunks: 6 }) });
}

const POSTURE_ANSWER: MockExplanation = {
  explanation: 'Drużyna stoi w postawie swobodnej, a zwrot w miejscu wymaga postawy zasadniczej (pkt 11). Podaj najpierw „BACZNOŚĆ”.',
  suggestion: 'BACZNOŚĆ',
  regulationPoints: [11, 22],
};

test.beforeEach(async ({ page }) => {
  // Żadne żądanie nie może trafić do prawdziwego API.
  await page.route('https://api.anthropic.com/**', (route) => route.abort());
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test.describe('ustawienia', () => {
  test('panel zawiera klucz API, auto-objaśnianie, tryb zapisu i liczebność drużyny', async ({ page }) => {
    await page.getByTestId('open-settings').click();
    const dialog = page.getByTestId('settings-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('settings-api-key')).toBeFocused();
    await expect(page.getByTestId('settings-api-key')).toHaveAttribute('type', 'password');
    await expect(page.getByTestId('settings-auto-explain')).not.toBeChecked();
    await expect(page.getByTestId('mode-lenient')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('settings-squad-size')).toHaveValue('9');
    await expect(dialog).toContainText('niski miesięczny limit wydatków');
    await expect(page.getByTestId('settings-key-status')).toContainText('Brak klucza');
    await page.getByTestId('settings-close').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('command-input')).toBeFocused();
  });

  test('klucz domyślnie tylko w pamięci karty; „zapamiętaj” z ostrzeżeniem zapisuje go na urządzeniu', async ({ page, context }) => {
    await setKey(page);
    expect(await page.evaluate(() => localStorage.getItem('musztra.apiKey'))).toBeNull();
    await page.reload();
    await page.getByTestId('open-settings').click();
    await expect(page.getByTestId('settings-api-key')).toHaveValue(FAKE_API_KEY);
    await expect(page.getByTestId('settings-key-status')).toContainText('tylko w pamięci tej karty');

    // Nowa karta nie widzi klucza z pamięci sesji.
    const other = await context.newPage();
    await other.goto('./');
    await other.getByTestId('open-settings').click();
    await expect(other.getByTestId('settings-api-key')).toHaveValue('');
    await other.close();

    await page.getByTestId('settings-remember-key').check();
    await expect(page.getByTestId('settings-remember-warning')).toBeVisible();
    await expect(page.getByTestId('settings-key-status')).toContainText('zapisany na tym urządzeniu');
    const second = await context.newPage();
    await second.goto('./');
    await second.getByTestId('open-settings').click();
    await expect(second.getByTestId('settings-api-key')).toHaveValue(FAKE_API_KEY);
    await second.close();

    await page.getByTestId('settings-api-key-clear').click();
    expect(await page.evaluate(() => [localStorage.getItem('musztra.apiKey'), sessionStorage.getItem('musztra.apiKey')])).toEqual([
      null,
      null,
    ]);
  });

  test('liczebność drużyny 3–12: zmiana ustawia drużynę od nowa i jest zapamiętana', async ({ page }) => {
    await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-soldiers', '9');
    await page.getByTestId('open-settings').click();
    const select = page.getByTestId('settings-squad-size');
    await expect(select.locator('option')).toHaveCount(10);
    await select.selectOption('12');
    await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-soldiers', '12');
    await page.keyboard.press('Escape');
    await send(page, 'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA');
    await idle(page);
    await expect(page.getByTestId('status-text')).toContainText('dwuszereg');
    await page.reload();
    await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-soldiers', '12');
    await expect(page.getByTestId('status-text')).toContainText('rozproszona');
  });

  test('pisanie w polu klucza w trybie Ruch nie porusza dowódcą', async ({ page }) => {
    await page.getByTestId('command-input').press('Escape');
    await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'move');
    const before = await page.getByTestId('plaza-canvas').getAttribute('data-commander');
    await page.getByTestId('open-settings').click();
    await page.getByTestId('settings-api-key').pressSequentially('wasd');
    await expect(page.getByTestId('settings-api-key')).toHaveValue('wasd');
    await page.waitForTimeout(300);
    expect(await page.getByTestId('plaza-canvas').getAttribute('data-commander')).toBe(before);
  });
});

test.describe('objaśnienia LLM', () => {
  test('bez klucza: „Objaśnij” otwiera ustawienia, aplikacja nie łączy się z API', async ({ page }) => {
    const requests = await mockApi(page, stream(POSTURE_ANSWER));
    await atEaseRank(page);
    await send(page, 'W prawo – ZWROT');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'error');
    await expect(page.getByTestId('explain')).toContainText('wymaga klucza API');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('settings-dialog')).toBeVisible();
    expect(requests).toHaveLength(0);
  });

  test('objaśnienie błędu strumieniem; propozycja przyjęta przez interpreter daje „Użyj”', async ({ page }) => {
    const requests = await mockApi(page, stream(POSTURE_ANSWER));
    await setKey(page);
    await atEaseRank(page);
    await send(page, 'W prawo – ZWROT');
    await expect(page.getByTestId('explain')).toHaveText(/Objaśnij/);
    await page.getByTestId('explain').click();

    await expect(page.getByTestId('llm-explanation')).toHaveAttribute('data-status', 'done');
    await expect(page.getByTestId('llm-explanation-text')).toHaveText(POSTURE_ANSWER.explanation);
    await expect(page.getByTestId('llm-points')).toContainText('pkt 11, 22');
    // Punkty regulaminu w objaśnieniu to odnośniki do PDF (K2).
    await expect(page.getByTestId('llm-points').getByTestId('point-link').first()).toHaveAttribute('href', /\.pdf#page=4$/);
    await expect(page.getByTestId('llm-explanation-text').getByTestId('point-link').first()).toHaveAttribute('data-page', '4');
    await expect(page.getByTestId('command-input')).toBeFocused();

    expect(requests).toHaveLength(1);
    const request = requests[0];
    if (!request) throw new Error('brak żądania');
    expect(request.url()).toBe(API);
    expect(request.url()).not.toContain(FAKE_API_KEY);
    const headers = request.headers();
    expect(headers['x-api-key']).toBe(FAKE_API_KEY);
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = request.postDataJSON() as { model: string; stream: boolean; messages: { content: string }[] };
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.stream).toBe(true);
    expect(body.messages[0]?.content).toContain('E_PRECOND_POSTURE');

    await page.getByTestId('llm-use-suggestion').click();
    await expect(page.getByTestId('command-input')).toHaveValue('BACZNOŚĆ');
    await page.getByTestId('command-input').press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
  });

  test('zła propozycja LLM jest odrzucana przez interpreter — zostaje samo objaśnienie', async ({ page }) => {
    await mockApi(
      page,
      stream({
        explanation: 'Zwrot w prawo wykonuje się na komendę „W prawo – ZWROT” (pkt 22).',
        // W postawie swobodnej ta komenda jest niewykonalna (pkt 11) — interpreter musi ją odrzucić.
        suggestion: 'W prawo – ZWROT',
        regulationPoints: [22],
      }),
    );
    await setKey(page);
    await atEaseRank(page);
    await send(page, 'W prawo – ZWROT');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('llm-explanation')).toHaveAttribute('data-status', 'done');
    await expect(page.getByTestId('llm-explanation-text')).toContainText('W prawo – ZWROT');
    await expect(page.getByTestId('llm-suggestion-rejected')).toBeVisible();
    await expect(page.getByTestId('llm-use-suggestion')).toHaveCount(0);
  });

  test('wymyślona komenda zaproponowana przez LLM też jest odrzucana', async ({ page }) => {
    await mockApi(page, stream({ explanation: 'Spróbuj obrotu.', suggestion: 'Drużyna, w prawo – OBRÓT', regulationPoints: [] }));
    await setKey(page);
    await atEaseRank(page);
    await send(page, 'W prawo – ZWROT');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('llm-suggestion-rejected')).toBeVisible();
    await expect(page.getByTestId('llm-use-suggestion')).toHaveCount(0);
  });

  test('zły klucz: zrozumiały komunikat po polsku, bez klucza w treści', async ({ page }) => {
    await mockApi(page, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: errorBody('authentication_error', 'invalid x-api-key') }),
    );
    await setKey(page);
    await send(page, 'W prawo – MARSZ');
    await page.getByTestId('explain').click();
    const error = page.getByTestId('llm-error');
    await expect(error).toContainText('Klucz API jest nieprawidłowy');
    await expect(error).not.toContainText(FAKE_API_KEY);
    await expect(error).not.toContainText('authentication_error');
    await expect(page.getByTestId('explain')).toHaveText(/Objaśnij ponownie/);
  });

  test('brak sieci: komunikat o połączeniu, aplikacja działa dalej', async ({ page }) => {
    await mockApi(page, (route) => route.abort('internetdisconnected'));
    await setKey(page);
    await send(page, 'W prawo – MARSZ');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('llm-error')).toContainText('Brak połączenia z api.anthropic.com');
    await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
  });

  test('przekroczony czas (15 s): komunikat po polsku', async ({ page }) => {
    test.setTimeout(60_000);
    // Atrapa nie odpowiada wcale — klient przerywa po 15 s.
    await mockApi(page, () => new Promise<void>(() => undefined));
    await setKey(page);
    await send(page, 'W prawo – MARSZ');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('llm-explanation')).toHaveAttribute('data-status', 'streaming');
    await expect(page.getByTestId('llm-error')).toContainText('15 s', { timeout: 25_000 });
  });

  test('rozpoznawanie intencji przy E_SYNTAX_UNKNOWN', async ({ page }) => {
    const requests = await mockApi(
      page,
      stream({
        explanation: 'Prawdopodobnie chodziło o zbiórkę w szeregu (pkt 69).',
        suggestion: 'Pierwsza drużyna, w szeregu – ZBIÓRKA',
        regulationPoints: [69],
      }),
    );
    await setKey(page);
    await send(page, 'chłopaki ustawcie się w linii');
    await expect(page.getByTestId('feedback')).toContainText('E_SYNTAX_UNKNOWN');
    await page.getByTestId('explain').click();
    await expect(page.getByTestId('llm-use-suggestion')).toHaveText('Użyj: Pierwsza drużyna, w szeregu – ZBIÓRKA');
    const body = requests[0]?.postDataJSON() as { messages: { content: string }[] };
    expect(body.messages[0]?.content).toContain('Rozpoznaj intencję');
  });

  test('auto-objaśnianie: błędy i uwagi objaśniane bez klikania', async ({ page }) => {
    const requests = await mockApi(page, stream(POSTURE_ANSWER));
    await page.getByTestId('open-settings').click();
    await page.getByTestId('settings-api-key').fill(FAKE_API_KEY);
    await page.getByTestId('settings-auto-explain').check();
    await page.keyboard.press('Escape');

    await send(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
    await idle(page);
    expect(requests).toHaveLength(0);
    await send(page, 'Drużyna, kierunek na wprost – MARSZ');
    await send(page, 'STÓJ');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'warning');
    await expect(page.getByTestId('llm-explanation')).toHaveAttribute('data-status', 'done');
    await expect(page.getByTestId('explain')).toHaveCount(0);
    await expect.poll(() => requests.length).toBe(1);
    const body = requests[0]?.postDataJSON() as { messages: { content: string }[] };
    expect(body.messages[0]?.content).toContain('W_MISSING_ADDRESSEE');
  });
});

test.describe('Content Security Policy', () => {
  test('strona ma CSP: połączenia tylko do api.anthropic.com, bez naruszeń przy zwykłym użyciu', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    await page.reload();
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain('connect-src https://api.anthropic.com');
    expect(csp).toContain("script-src 'self'");

    await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
    await idle(page);
    await page.getByTestId('open-settings').click();
    await page.keyboard.press('Escape');

    const blocked = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/');
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
    expect(violations.filter((v) => !v.includes('example.com'))).toEqual([]);
  });
});
