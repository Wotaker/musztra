import { REGULATION } from '../core/regulation';
import { CommandLine } from './CommandLine';
import { CompassRose } from './CompassRose';
import { FeedbackPanel } from './FeedbackPanel';
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
      <div className="command-dock">
        <FeedbackPanel />
        <CommandLine />
      </div>
    </main>
  );
}
