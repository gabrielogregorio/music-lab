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
import { buildSystems, measureBeatsOf, type System } from '../music/layout';
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
  pickupBeats?: number;
  /**
   * Mostra a peça inteira de uma vez, sem paginação. A folha do Treino vira a
   * página seguindo a nota atual - no modo leitura não existe nota atual, então
   * paginar só esconderia música.
   */
  expanded?: boolean;
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
  pickupBeats = 0,
  expanded = false,
}: ScoreProps) {
  const measureBeats = measureBeatsOf(timeSignature);
  const { systems, sysOfNote, posOfNote } = useMemo(
    () => buildSystems(notes, measureBeats, pickupBeats),
    [notes, measureBeats, pickupBeats],
  );

  const showStaff = view === 'staff' || view === 'both';
  const showTab = view === 'tab' || view === 'both';
  const shared = { currentIndex, status, direction, holdProgress, tempo, timeSignature };

  const renderSystem = (system: System, index: number) => (
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
  );

  if (expanded) {
    return (
      <div className="staff-frame">
        <div className="staff-page">
          {/* Lista posicional derivada da música: o índice do sistema é a única
              identidade que ele tem, e é estável enquanto a música é a mesma. */}
          {systems.map((system, index) => (
            <div key={index} className="score-line">
              {renderSystem(system, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScoreBook
      systems={systems}
      sysOfNote={sysOfNote}
      posOfNote={posOfNote}
      currentIndex={currentIndex}
      renderSystem={renderSystem}
    />
  );
}
