// Plano puro da música para exportar: coluna a coluna, quais MIDIs de melodia e
// quais linhas de percussão soam. É a mesma leitura de grade que o motor de áudio
// faz ao vivo, só que materializada num array - assim MIDI e WAV (e os testes)
// consomem um dado, não o AudioContext.
import { rowsInColumn } from "../music/song";
import type { Pitch } from "../music/scale";

export interface SongPlan {
  /** Semínimas por minuto. */
  tempo: number;
  /** Passos por semínima. */
  subdivisions: number;
  totalCols: number;
  /** Duração de um passo, em segundos. */
  stepDuration: number;
  /** MIDIs da melodia ativos em cada coluna. */
  melodyByCol: number[][];
  /** Linhas de percussão ativas em cada coluna. */
  percByCol: number[][];
}

export function buildSongPlan(
  melody: ReadonlySet<string>,
  percussion: ReadonlySet<string>,
  pitches: Pitch[],
  subdivisions: number,
  totalCols: number,
  tempo: number,
): SongPlan {
  const melodyByCol: number[][] = [];
  const percByCol: number[][] = [];
  for (let col = 0; col < totalCols; col += 1) {
    melodyByCol.push(
      rowsInColumn(melody, col)
        .map((row) => pitches[row]?.midi)
        .filter((midi): midi is number => midi != null),
    );
    percByCol.push(rowsInColumn(percussion, col));
  }
  return {
    tempo,
    subdivisions,
    totalCols,
    stepDuration: 60 / tempo / subdivisions,
    melodyByCol,
    percByCol,
  };
}
