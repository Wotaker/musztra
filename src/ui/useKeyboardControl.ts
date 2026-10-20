import { useEffect } from 'react';
import { useSimStore } from './simStore';
import { useViewStore } from './store';

/** Klawisze ruchu dowódcy (SPEC 3.2): WASD lub strzałki, w 8 kierunkach. */
const DIRECTIONS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Sterowanie dowódcą w trybie Ruch: kierunek z wciśniętych klawiszy, Shift — bieg, Q/E — obrót o 45°,
 * Enter lub „/” — powrót do trybu Komenda. Esc w wierszu poleceń przełącza na tryb Ruch.
 */
export function useKeyboardControl(): void {
  useEffect(() => {
    const pressed = new Set<string>();
    let shift = false;

    const apply = () => {
      let x = 0;
      let y = 0;
      for (const code of pressed) {
        const d = DIRECTIONS[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      useSimStore.getState().setCommanderInput({ x: Math.sign(x), y: Math.sign(y), run: shift });
    };

    const release = () => {
      pressed.clear();
      shift = false;
      apply();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const view = useViewStore.getState();
      if (view.focusMode !== 'move') return;
      // Pisanie w polach paneli (ustawienia, wyszukiwarka ściągi) nie steruje dowódcą.
      if (view.dialog !== null || isEditable(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Enter' || event.key === '/') {
        event.preventDefault();
        release();
        view.setFocusMode('command');
        return;
      }
      shift = event.shiftKey;
      if (event.code in DIRECTIONS) {
        event.preventDefault();
        pressed.add(event.code);
        apply();
      } else if (event.code === 'KeyQ' || event.code === 'KeyE') {
        event.preventDefault();
        if (!event.repeat) useSimStore.getState().rotateCommander(event.code === 'KeyQ' ? -1 : 1);
      } else if (event.key === 'Shift') {
        apply();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      shift = event.shiftKey;
      pressed.delete(event.code);
      if (useViewStore.getState().focusMode === 'move') apply();
    };

    const unsubscribe = useViewStore.subscribe((state, prev) => {
      if (state.focusMode !== prev.focusMode && state.focusMode === 'command') release();
      if (state.dialog !== null && prev.dialog === null) release();
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
    };
  }, []);
}
