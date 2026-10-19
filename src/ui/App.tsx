import { CommandLine } from './CommandLine';
import { CompassRose } from './CompassRose';
import { FeedbackPanel } from './FeedbackPanel';
import { PlazaCanvas } from './PlazaCanvas';
import { SoldierTooltip } from './SoldierTooltip';
import { StatusBar } from './StatusBar';
import { useKeyboardControl } from './useKeyboardControl';

export function App() {
  useKeyboardControl();
  return (
    <main className="app">
      <PlazaCanvas />
      <StatusBar />
      <CompassRose />
      <SoldierTooltip />
      <div className="command-dock">
        <FeedbackPanel />
        <CommandLine />
      </div>
    </main>
  );
}
