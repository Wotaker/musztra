import { Cheatsheet } from './Cheatsheet';
import { CommandLine } from './CommandLine';
import { CompassRose } from './CompassRose';
import { FeedbackPanel } from './FeedbackPanel';
import { Journal } from './Journal';
import { PlazaCanvas } from './PlazaCanvas';
import { SettingsPanel } from './SettingsPanel';
import { SoldierTooltip } from './SoldierTooltip';
import { StatusBar } from './StatusBar';
import { useViewStore } from './store';
import { useKeyboardControl } from './useKeyboardControl';
import { WelcomeOverlay } from './WelcomeOverlay';

export function App() {
  useKeyboardControl();
  const drawer = useViewStore((s) => s.cheatsheet !== null);
  return (
    <main className={drawer ? 'app app--drawer' : 'app'}>
      <PlazaCanvas />
      <StatusBar />
      <CompassRose />
      <Journal />
      <SoldierTooltip />
      <div className="command-dock">
        <FeedbackPanel />
        <CommandLine />
      </div>
      <Cheatsheet />
      <SettingsPanel />
      <WelcomeOverlay />
    </main>
  );
}
