import { useEffect, useRef, useState } from 'react';
import {
  closureGap,
  isPerimeterClosed,
  perimeterPolygon,
  polygonArea,
  squareCmToSquareM,
  type PerimeterSegment,
} from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { NumberCell, parseNumber } from '../components/NumberCell';
import { formatCm, formatM2 } from '../format';

const DIRECTIONS = [
  { angle: 0, label: '→', title: 'Derecha (0°)' },
  { angle: 90, label: '↓', title: 'Abajo (90°)' },
  { angle: 180, label: '←', title: 'Izquierda (180°)' },
  { angle: 270, label: '↑', title: 'Arriba (270°)' },
];

function SegmentRow({ segment, index }: { segment: PerimeterSegment; index: number }) {
  const selection = useProjectStore((state) => state.selection);
  const lengthEditRequest = useProjectStore((state) => state.lengthEditRequest);
  const select = useProjectStore((state) => state.select);
  const requestLengthEdit = useProjectStore((state) => state.requestLengthEdit);
  const updateSegment = useProjectStore((state) => state.updatePerimeterSegment);
  const removeSegment = useProjectStore((state) => state.removePerimeterSegment);
  const selected = selection?.kind === 'segment' && selection.id === segment.id;
  const focusLength = lengthEditRequest === segment.id;

  useEffect(() => {
    if (focusLength) requestLengthEdit(null);
  }, [focusLength, requestLengthEdit]);

  return (
    <tr
      className={selected ? 'is-selected' : ''}
      onFocus={() => select({ kind: 'segment', id: segment.id })}
      onClick={() => select({ kind: 'segment', id: segment.id })}
    >
      <td className="segment-table__index">{index + 1}</td>
      <td>
        <NumberCell
          key={`${segment.id}-${segment.length}`}
          value={segment.length}
          autoFocus={focusLength}
          ariaLabel={`Longitud del tramo ${index + 1}`}
          onCommit={(length) => updateSegment(segment.id, { length })}
        />
      </td>
      <td>
        <NumberCell
          key={`${segment.id}-${segment.angle}`}
          value={segment.angle}
          autoFocus={false}
          ariaLabel={`Ángulo del tramo ${index + 1}`}
          onCommit={(angle) => updateSegment(segment.id, { angle })}
        />
      </td>
      <td>
        <button
          className="icon-button"
          title="Borrar tramo"
          onClick={(event) => {
            event.stopPropagation();
            removeSegment(segment.id);
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function AddSegmentForm({ disabled }: { disabled: boolean }) {
  const appendSegment = useProjectStore((state) => state.appendPerimeterSegment);
  const [length, setLength] = useState('');
  const [angle, setAngle] = useState('0');
  const lengthRef = useRef<HTMLInputElement>(null);

  const add = (angleValue: number) => {
    if (appendSegment({ length: parseNumber(length), angle: angleValue })) {
      setLength('');
      lengthRef.current?.focus();
    }
  };

  return (
    <div className="add-segment">
      <div className="add-segment__inputs">
        <label>
          Longitud (cm)
          <input
            ref={lengthRef}
            className="number-input"
            inputMode="decimal"
            value={length}
            disabled={disabled}
            onChange={(event) => setLength(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && add(parseNumber(angle))}
          />
        </label>
        <label>
          Ángulo (°)
          <input
            className="number-input"
            inputMode="decimal"
            value={angle}
            disabled={disabled}
            onChange={(event) => setAngle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && add(parseNumber(angle))}
          />
        </label>
      </div>
      <div className="add-segment__directions">
        {DIRECTIONS.map((dir) => (
          <button key={dir.angle} title={dir.title} disabled={disabled} onClick={() => add(dir.angle)}>
            {dir.label}
          </button>
        ))}
        <button disabled={disabled} onClick={() => add(parseNumber(angle))}>
          Añadir
        </button>
      </div>
    </div>
  );
}

export function SegmentTable() {
  const perimeter = useActiveFloor().perimeter;
  const closePerimeter = useProjectStore((state) => state.closePerimeter);
  const selectedSegmentId = useProjectStore((state) => (state.selection?.kind === 'segment' ? state.selection.id : null));
  const openElevation = useProjectStore((state) => state.openElevation);
  const closed = isPerimeterClosed(perimeter);
  const gap = closureGap(perimeter);
  const polygon = perimeterPolygon(perimeter);
  const area = polygon ? squareCmToSquareM(polygonArea(polygon)) : null;

  return (
    <section className="panel">
      <h2 className="panel__title">Perímetro</h2>

      {selectedSegmentId && perimeter.segments.some((s) => s.id === selectedSegmentId) && (
        <button onClick={() => openElevation(selectedSegmentId)} title="Ver la pared seleccionada de frente para colocar puertas y ventanas">
          Ver alzado de la pared seleccionada
        </button>
      )}

      <div className={`status ${closed ? 'status--ok' : 'status--warn'}`}>
        {closed && area !== null ? (
          <>
            <strong>Cerrado</strong> · superficie {formatM2(area)}
          </>
        ) : perimeter.segments.length === 0 ? (
          'Sin tramos todavía. Dibuja en el plano o añade medidas aquí.'
        ) : (
          <>
            <strong>Abierto</strong> · no cierra por {formatCm(Math.round(gap * 10) / 10)}
          </>
        )}
      </div>

      {perimeter.segments.length > 0 && (
        <table className="segment-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Longitud (cm)</th>
              <th>Ángulo (°)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {perimeter.segments.map((segment, index) => (
              <SegmentRow key={segment.id} segment={segment} index={index} />
            ))}
          </tbody>
        </table>
      )}

      {!closed && (
        <>
          <AddSegmentForm disabled={closed} />
          <button
            className="primary-button"
            disabled={perimeter.segments.length < 2}
            onClick={closePerimeter}
            title="Añade el tramo que une la última esquina con la primera"
          >
            Cerrar perímetro
          </button>
        </>
      )}

      <p className="panel__help">
        Ángulos: 0° derecha, 90° abajo, 180° izquierda, 270° arriba. Al cambiar una medida, las esquinas
        siguientes se desplazan; si deja de cerrar verás el descuadre.
      </p>
    </section>
  );
}
