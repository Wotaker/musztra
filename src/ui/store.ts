import { create } from 'zustand';
import { DEFAULT_CAMERA, type Camera } from '../render/camera';

interface ViewState {
  camera: Camera;
  setCamera: (camera: Camera) => void;
}

/** Stan widoku placu. Renderer subskrybuje go poza cyklem Reacta. */
export const useViewStore = create<ViewState>()((set) => ({
  camera: DEFAULT_CAMERA,
  setCamera: (camera) => {
    set({ camera });
  },
}));
