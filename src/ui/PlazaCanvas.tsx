import { useEffect, useRef } from 'react';
import { PlazaController } from './plazaController';
import { useViewStore } from './store';

export function PlazaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new PlazaController(canvas);
    return () => {
      controller.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="plaza-canvas"
      data-testid="plaza-canvas"
      aria-label="Plac apelowy"
      tabIndex={-1}
      onPointerDown={() => {
        // Klik w plac przełącza na sterowanie dowódcą (SPEC 3.2).
        useViewStore.getState().setFocusMode('move');
      }}
    />
  );
}
