/**
 * A chuva de notas (estilo Synthesia): as peças descem e batem no teclado logo
 * abaixo, no tempo da música. Lê o relógio contínuo do motor a cada frame num
 * loop de rAF próprio - sistema externo, então é o caso legítimo de efeito de
 * montagem - e só ELE re-renderiza por frame, não o teclado inteiro. Quando a
 * música não está tocando, o relógio é null e o trilho fica vazio.
 */
import { useMemo, useRef, useState } from 'react';
import { useMountEffect } from '../../../app/useMountEffect';
import { keyColumns, type PianoKey } from '../music/keys';
import { fallingTiles, type FallingTile } from '../music/falling';
import type { Timeline } from '../music/playback';

const FALL_WINDOW_SEC = 3.5;

interface FallingNotesProps {
  keys: PianoKey[];
  timeline: Timeline | null;
  /** Segundos decorridos da música, ou null quando parada. */
  getElapsed: () => number | null;
}

export function FallingNotes({ keys, timeline, getElapsed }: FallingNotesProps) {
  const columns = useMemo(() => new Map(keyColumns(keys).map((column) => [column.midi, column])), [keys]);
  const [tiles, setTiles] = useState<FallingTile[]>([]);

  // Refs para o loop enxergar os dados mais recentes sem reiniciar o rAF.
  const dataRef = useRef({ columns, timeline, getElapsed });
  dataRef.current = { columns, timeline, getElapsed };
  const wasRunningRef = useRef(false);
  const rafRef = useRef(0);

  useMountEffect(() => {
    const loop = () => {
      const current = dataRef.current;
      const elapsed = current.getElapsed();
      if (elapsed == null || !current.timeline) {
        if (wasRunningRef.current) {
          wasRunningRef.current = false;
          setTiles([]);
        }
      } else {
        wasRunningRef.current = true;
        setTiles(fallingTiles(current.timeline, current.columns, elapsed, FALL_WINDOW_SEC));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  });

  return (
    <div className="kb-falling" aria-hidden="true">
      <div className="kb-falling-lane">
        {tiles.map((tile) => (
          <div
            key={tile.index}
            className={`kb-tile ${tile.isBlack ? 'black' : ''} ${tile.active ? 'active' : ''}`}
            style={{
              left: `${tile.leftPct}%`,
              width: `${tile.widthPct}%`,
              top: `${tile.topPct}%`,
              height: `${tile.heightPct}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
