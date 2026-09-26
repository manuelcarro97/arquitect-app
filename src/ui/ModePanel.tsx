import type { EditorMode } from '../store/projectStore';
import { FurnishPanel, FurnitureDetails } from './furniture/FurniturePanels';
import { LayoutPanel } from './layout/LayoutPanel';
import { FinishesPanel } from './materials/FinishesPanel';
import { OpeningDetails } from './openings/OpeningDetails';
import { SegmentTable } from './structure/SegmentTable';

export const MODE_PANEL_NAMES: Record<EditorMode, string> = {
  structure: 'Perímetro',
  layout: 'Distribución',
  furnish: 'Amueblar',
  finishes: 'Acabados',
};

/** Side panel content of each mode (lists, tables, catalogs), plus the details of the selected item. */
export function ModePanel({ mode }: { mode: EditorMode }) {
  return (
    <>
      <OpeningDetails />
      <FurnitureDetails />
      {mode === 'structure' && <SegmentTable />}
      {mode === 'layout' && <LayoutPanel />}
      {mode === 'furnish' && <FurnishPanel />}
      {mode === 'finishes' && <FinishesPanel />}
    </>
  );
}
