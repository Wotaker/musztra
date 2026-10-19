import type { WritingMode } from '../core/catalog';
import { useCommandStore } from './commandStore';

const OPTIONS: readonly { mode: WritingMode; label: string; hint: string }[] = [
  {
    mode: 'lenient',
    label: 'Łagodny',
    hint: 'Tryb łagodny: dowolna wielkość liter, myślnik lub jego brak, bez polskich znaków, cyfry — z podpowiedzią formy kanonicznej.',
  },
  {
    mode: 'strict',
    label: 'Ścisły',
    hint: 'Tryb ścisły: wymagana forma kanoniczna — wielka litera na początku, zapowiedź małymi, HASŁO wielkimi, myślnik ze spacjami, przecinki, polskie znaki, liczebniki słownie.',
  },
];

/** Przełącznik trybu zapisu (SPEC 3.8). Pełne ustawienia dochodzą w etapie E5. */
export function ModeSwitch() {
  const mode = useCommandStore((s) => s.mode);
  const setMode = useCommandStore((s) => s.setMode);
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Tryb zapisu">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          className="mode-switch__option"
          data-testid={`mode-${option.mode}`}
          title={option.hint}
          onMouseDown={(event) => {
            // Fokus zostaje w wierszu poleceń.
            event.preventDefault();
          }}
          onClick={() => {
            setMode(option.mode);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
