import { useCallback } from 'react';
import { invalidPartitionIds, isPerimeterClosed } from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import type { EditorContext, EditorController } from '../controller';
import { useFurniture } from '../furniture/useFurniture';
import { PartitionLayer } from '../layout/PartitionLayer';
import { ZoneLayer } from '../layout/ZoneLayer';
import { useOpenings } from '../openings/useOpenings';
import { PerimeterLayer } from '../PerimeterLayer';

const SELECT_HINT =
  'Elige un mueble en el panel y haz clic en el plano para colocarlo · arrastra los muebles para moverlos (se pegan a las paredes) · R = girar · Supr = borrar';

/** Amueblar mode: only furniture can be edited; walls, openings and zones are shown for reference. */
export function useFurnishController({ floor, scale, active }: EditorContext): EditorController {
  const select = useProjectStore((state) => state.select);
  const closed = isPerimeterClosed(floor.perimeter);
  const noTool = useCallback(() => {}, []);

  const furniture = useFurniture({ floor, scale, active: active && closed, selectable: active && closed });
  const openings = useOpenings({ floor, scale, placing: null, selectable: false, onExitTool: noTool });

  return {
    tools: [],
    showAngleSnap: false,
    layers: (
      <>
        <ZoneLayer
          zones={floor.zones}
          scale={scale}
          selectedId={null}
          interactive={false}
          onZonePointerDown={() => {}}
          onVertexPointerDown={() => {}}
        />
        {furniture.layer}
        <PerimeterLayer
          perimeter={floor.perimeter}
          scale={scale}
          selectedId={null}
          interactive={false}
          locked
          onWallPointerDown={() => {}}
          onLabelClick={() => {}}
        />
        <PartitionLayer
          partitions={floor.partitions}
          scale={scale}
          selectedId={null}
          invalidIds={new Set(invalidPartitionIds(floor))}
          interactive={false}
          onPartitionPointerDown={() => {}}
          onHandlePointerDown={() => {}}
        />
        {openings.layer}
      </>
    ),
    hint: !closed
      ? 'El perímetro no está cerrado: ciérralo en modo Estructura para amueblar.'
      : (furniture.hint ?? SELECT_HINT),
    cursor: furniture.isPlacing ? 'crosshair' : 'default',
    onPointerMove: (world, shiftKey) => {
      furniture.handlePointerMove(world, shiftKey);
    },
    onClick: (_world, onEmpty) => {
      if (furniture.handleClick()) return;
      if (onEmpty) select(null);
    },
    onSecondaryClick: () => {
      if (!furniture.cancelPlacing()) select(null);
    },
  };
}
