import { useState } from 'react';
import { useCommandStore } from './commandStore';
import { Dialog } from './Dialog';
import { useExplainStore } from './explainStore';
import { ModeSwitch } from './ModeSwitch';
import { SQUAD_SIZE } from './persist';
import { hasApiKey, useSettingsStore } from './settingsStore';

const SIZES = Array.from({ length: SQUAD_SIZE.max - SQUAD_SIZE.min + 1 }, (_, i) => SQUAD_SIZE.min + i);

function ApiKeySection() {
  const apiKey = useSettingsStore((s) => s.apiKey);
  const remember = useSettingsStore((s) => s.rememberKey);
  const autoExplain = useSettingsStore((s) => s.autoExplain);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setRememberKey = useSettingsStore((s) => s.setRememberKey);
  const setAutoExplain = useSettingsStore((s) => s.setAutoExplain);
  const [visible, setVisible] = useState(false);
  const present = hasApiKey({ apiKey });

  return (
    <section className="settings__section" aria-labelledby="settings-llm">
      <h3 id="settings-llm" className="settings__heading">
        Objaśnienia AI <span className="settings__optional">(opcjonalne)</span>
      </h3>
      <p className="settings__text">
        Przy błędzie lub uwadze przycisk <strong>Objaśnij</strong>: model Claude tłumaczy werdykt interpretera i proponuje
        komendę (sprawdzoną przez interpreter). Bez klucza aplikacja działa w pełni.
      </p>
      <label className="settings__label" htmlFor="settings-api-key">
        Klucz API Anthropic
      </label>
      <div className="settings__key">
        <input
          id="settings-api-key"
          className="settings__input"
          data-testid="settings-api-key"
          data-autofocus
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-…"
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
          }}
        />
        <button
          type="button"
          className="settings__button"
          aria-pressed={visible}
          onClick={() => {
            setVisible(!visible);
          }}
        >
          {visible ? 'Ukryj' : 'Pokaż'}
        </button>
        <button
          type="button"
          className="settings__button"
          data-testid="settings-api-key-clear"
          disabled={!present}
          onClick={() => {
            setApiKey('');
          }}
        >
          Usuń
        </button>
      </div>
      <p className="settings__hint" data-testid="settings-key-status">
        {present
          ? remember
            ? 'Klucz zapisany na tym urządzeniu (pamięć przeglądarki).'
            : 'Klucz tylko w pamięci tej karty — zniknie po jej zamknięciu.'
          : 'Brak klucza — objaśnienia AI wyłączone, wszystko inne działa.'}{' '}
        Klucz jest wysyłany wyłącznie do api.anthropic.com.
      </p>
      <label className="settings__check">
        <input
          type="checkbox"
          data-testid="settings-remember-key"
          checked={remember}
          onChange={(event) => {
            setRememberKey(event.target.checked);
          }}
        />
        Zapamiętaj klucz na tym urządzeniu
      </label>
      {remember && (
        <p className="settings__warning" role="alert" data-testid="settings-remember-warning">
          ⚠ Klucz zostanie zapisany w pamięci przeglądarki na tym komputerze i będzie dostępny dla każdego, kto z niego korzysta.
          Nie zaznaczaj tej opcji na komputerze współdzielonym.
        </p>
      )}
      <p className="settings__tip">
        Zalecenie: utwórz w{' '}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
          Claude Console
        </a>{' '}
        osobny klucz tylko do tej aplikacji i ustaw niski miesięczny limit wydatków (Settings → Limits). Objaśnienie kosztuje
        ułamek centa.
      </p>
      <label className="settings__check">
        <input
          type="checkbox"
          data-testid="settings-auto-explain"
          checked={autoExplain}
          onChange={(event) => {
            setAutoExplain(event.target.checked);
          }}
        />
        Objaśniaj automatycznie każdy błąd i uwagę (bez klikania „Objaśnij”)
      </label>
    </section>
  );
}

function SquadSizeSection() {
  const squadSize = useSettingsStore((s) => s.squadSize);
  const setSquadSize = useSettingsStore((s) => s.setSquadSize);
  return (
    <section className="settings__section" aria-labelledby="settings-squad">
      <h3 id="settings-squad" className="settings__heading">
        Liczebność drużyny
      </h3>
      <div className="settings__row">
        <select
          id="settings-squad-size"
          className="settings__select"
          data-testid="settings-squad-size"
          aria-labelledby="settings-squad"
          value={squadSize}
          onChange={(event) => {
            setSquadSize(Number(event.target.value));
            useExplainStore.getState().reset();
            useCommandStore.setState({ result: null, outcome: null, explainRequest: null });
          }}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size} żołnierzy
            </option>
          ))}
        </select>
        <p className="settings__hint">Zmiana ustawia drużynę od nowa — rozproszoną po placu.</p>
      </div>
    </section>
  );
}

/** Panel ustawień (SPEC 3.8; zakres etapu EF: klucz API, auto-objaśnianie, tryb zapisu, liczebność). */
export function SettingsPanel() {
  return (
    <Dialog id="settings" title="Ustawienia" className="settings">
      <ApiKeySection />
      <section className="settings__section" aria-labelledby="settings-mode">
        <h3 id="settings-mode" className="settings__heading">
          Tryb zapisu komend
        </h3>
        <ModeSwitch />
        <p className="settings__hint">
          Łagodny: wielkość liter, myślnik, polskie znaki i cyfry są poprawiane z informacją. Ścisły: wymagana forma kanoniczna
          — jak na egzaminie.
        </p>
      </section>
      <SquadSizeSection />
    </Dialog>
  );
}
