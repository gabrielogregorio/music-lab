/**
 * A leitura do Treino, nos três modos: só partitura, só tablatura de 6 furos,
 * ou as duas juntas.
 *
 * Integrado de propósito: é a MESMA sequência de notas, a mesma quebra de
 * linha e a mesma virada de página - a tablatura é outra grafia da mesma
 * música, não outro player. Quem lê pela pauta e quem lê pelos dedos acompanha
 * o mesmo cursor.
 */
import { useMemo } from 'react';
import type { PreparedNote } from '../music/song';
import type { NoteStatus } from '../hooks/usePractice';
import { buildSystems, measureBeatsOf } from '../music/layout';
import type { ScoreView } from '../music/scoreView';
import { ScoreBook } from './ScoreBook';
import { StaffSystem } from './StaffSystem';
import { TabSystem } from './TabSystem';

interface ScoreProps {
  notes: PreparedNote[];
  currentIndex: number;
  status: NoteStatus;
  direction: 'up' | 'down' | null;
  holdProgress: number;
  view: ScoreView;
  whistleKey: string;
  octaveAgnostic: boolean;
  tempo?: number;
  timeSignature?: [number, number];
}

export function Score({
  notes,
  currentIndex,
  status,
  direction,
  holdProgress,
  view,
  whistleKey,
  octaveAgnostic,
  tempo,
  timeSignature,
}: ScoreProps) {
  const measureBeats = measureBeatsOf(timeSignature);
  const { systems, sysOfNote, posOfNote } = useMemo(
    () => buildSystems(notes, measureBeats),
    [notes, measureBeats],
  );

  const showStaff = view === 'staff' || view === 'both';
  const showTab = view === 'tab' || view === 'both';
  const shared = { currentIndex, status, direction, holdProgress, tempo, timeSignature };

  return (
    <ScoreBook
      systems={systems}
      sysOfNote={sysOfNote}
      posOfNote={posOfNote}
      currentIndex={currentIndex}
      renderSystem={(system, index) => (
        <>
          {showStaff && <StaffSystem system={system} index={index} {...shared} />}
          {showTab && (
            <TabSystem
              system={system}
              index={index}
              whistleKey={whistleKey}
              octaveAgnostic={octaveAgnostic}
              {...shared}
            />
          )}
        </>
      )}
    />
  );
}
