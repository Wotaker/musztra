import { useSimStore } from './simStore';
import { useViewStore } from './store';

/** Podgląd żołnierza po najechaniu (SPEC 3.9): nazwisko, numer w składzie i liczba z ostatniego odliczania. */
export function SoldierTooltip() {
  const hover = useViewStore((s) => s.hover);
  const info = useSimStore((s) => {
    if (!hover) return null;
    const soldier = s.session.sim.soldiers.find((x) => x.id === hover.soldierId);
    return soldier ? `${soldier.surname.nominative}|${String(soldier.id)}|${String(soldier.countNumber ?? '')}` : null;
  });
  if (!hover || !info) return null;
  const [surname, id, count] = info.split('|');
  return (
    <div className="soldier-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }} data-testid="soldier-tooltip" role="tooltip">
      <strong>szer. {surname}</strong>
      <span>nr {id} w składzie</span>
      {count ? <span>odliczenie: {count}</span> : null}
    </div>
  );
}
