import { create } from 'zustand';
import { DEFAULT_CAMERA, type Camera } from '../render/camera';

/** Tryb fokusu klawiatury (SPEC 3.2): pisanie komend albo sterowanie dowódcą. */
export type FocusMode = 'command' | 'move';

/** Prędkości symulacji (SPEC 3.8). */
export const SPEEDS = [0.5, 1, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];

/** Okno modalne nad placem: ustawienia albo wskazówki pierwszego uruchomienia (SPEC 3.8, 3.10). */
export type Dialog = 'settings' | 'welcome';

export type CheatsheetTab = 'commands' | 'exercises';

export interface Hover {
  readonly soldierId: number;
  /** Położenie kursora na ekranie (px). */
  readonly x: number;
  readonly y: number;
}

interface ViewState {
  camera: Camera;
  focusMode: FocusMode;
  speed: Speed;
  /** Przełącznik „pokaż role” (SPEC 3.9): kierunkowy i skrzydłowi. */
  showRoles: boolean;
  hover: Hover | null;
  dialog: Dialog | null;
  /** Szuflada „Ściąga” (F1): komendy z katalogu i podstawowe ćwiczenia. */
  cheatsheet: CheatsheetTab | null;
  setCamera: (camera: Camera) => void;
  setFocusMode: (mode: FocusMode) => void;
  setSpeed: (speed: Speed) => void;
  toggleRoles: () => void;
  setHover: (hover: Hover | null) => void;
  setDialog: (dialog: Dialog | null) => void;
  setCheatsheet: (tab: CheatsheetTab | null) => void;
}

/** Stan widoku placu. Renderer i pętla symulacji czytają go poza cyklem Reacta. */
export const useViewStore = create<ViewState>()((set) => ({
  camera: DEFAULT_CAMERA,
  focusMode: 'command',
  speed: 1,
  showRoles: false,
  hover: null,
  dialog: null,
  cheatsheet: null,
  setCamera: (camera) => {
    set({ camera });
  },
  setFocusMode: (focusMode) => {
    set({ focusMode });
  },
  setSpeed: (speed) => {
    set({ speed });
  },
  toggleRoles: () => {
    set((s) => ({ showRoles: !s.showRoles }));
  },
  setHover: (hover) => {
    set({ hover });
  },
  setDialog: (dialog) => {
    set({ dialog });
  },
  setCheatsheet: (cheatsheet) => {
    set({ cheatsheet });
  },
}));
