import { REGULATION } from '../core/regulation';
import { CompassRose } from './CompassRose';
import { PlazaCanvas } from './PlazaCanvas';

export function App() {
  return (
    <main className="app">
      <PlazaCanvas />
      <header className="title-chip">
        <h1>Interpreter Języka Musztry</h1>
        <p>
          {REGULATION.shortTitle} · {REGULATION.signature}
        </p>
      </header>
      <CompassRose />
    </main>
  );
}
