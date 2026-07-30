/**
 * Linha do tempo pura de uma música para o teclado tocar: cada nota vira um
 * evento com início e duração em segundos (derivados do andamento já preparado)
 * e a altura MIDI a soar - pausa é `midi: null`. O motor de áudio agenda por
 * cima disto; aqui não há áudio nem React.
 */
import type { PreparedSong } from '../../../songs/library';

export interface TimelineNote {
  index: number;
  startSec: number;
  durSec: number;
  /** MIDI a soar, ou null quando é pausa. */
  midi: number | null;
}

export interface Timeline {
  notes: TimelineNote[];
  totalSec: number;
}

export function buildTimeline(prepared: PreparedSong): Timeline {
  let cursor = 0;
  const notes: TimelineNote[] = prepared.notes.map((note) => {
    const startSec = cursor;
    cursor += note.durationSec;
    return {
      index: note.index,
      startSec,
      durSec: note.durationSec,
      midi: note.isRest ? null : note.parsed?.midi ?? null,
    };
  });
  return { notes, totalSec: cursor };
}

/** Índice da nota que soa no instante `sec`, ou -1 antes/depois da música. */
export function noteIndexAt(timeline: Timeline, sec: number): number {
  if (sec < 0 || sec >= timeline.totalSec) {
    return -1;
  }
  const found = timeline.notes.find((note) => sec >= note.startSec && sec < note.startSec + note.durSec);
  return found ? found.index : -1;
}
