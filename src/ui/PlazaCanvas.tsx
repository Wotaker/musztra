import { useEffect, useRef } from 'react';
import { PlazaRenderer } from '../render/PlazaRenderer';
import { useViewStore } from './store';

export function PlazaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new PlazaRenderer(canvas);
    renderer.setCamera(useViewStore.getState().camera);
    const unsubscribe = useViewStore.subscribe((state) => {
      renderer.setCamera(state.camera);
    });
    return () => {
      unsubscribe();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="plaza-canvas" data-testid="plaza-canvas" aria-label="Plac apelowy" />;
}
