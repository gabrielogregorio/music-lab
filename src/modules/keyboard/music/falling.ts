/**
 * Posições das notas caindo (estilo Synthesia), puras e testáveis. Cada nota da
 * linha do tempo vira uma peça que desce; ela "bate" no teclado exatamente no seu
 * `startSec`. A geometria horizontal vem da coluna da tecla (`keyColumns`); a
 * vertical, do tempo que falta para bater, medido numa janela `fallWindowSec`.
 */
import type { Timeline } from './playback';
import type { KeyColumn } from './keys';

export interface FallingTile {
  index: number;
  leftPct: number;
  widthPct: number;
  /** Borda de cima da peça, em % da altura do trilho (0 = topo, 100 = teclado). */
  topPct: number;
  heightPct: number;
  isBlack: boolean;
  /** A nota está cruzando o teclado agora (já é hora de soar). */
  active: boolean;
}

export function fallingTiles(
  timeline: Timeline,
  columns: Map<number, KeyColumn>,
  elapsedSec: number,
  fallWindowSec: number,
): FallingTile[] {
  const tiles: FallingTile[] = [];
  timeline.notes.forEach((note) => {
    if (note.midi == null) {
      return;
    }
    const column = columns.get(note.midi);
    if (!column) {
      return;
    }
    const remaining = note.startSec - elapsedSec; // tempo até bater no teclado
    if (remaining >= fallWindowSec || remaining + note.durSec <= 0) {
      return; // ainda alto demais no futuro, ou já passou do teclado
    }
    const heightPct = (note.durSec / fallWindowSec) * 100;
    const bottomPct = (1 - remaining / fallWindowSec) * 100;
    tiles.push({
      index: note.index,
      leftPct: column.leftPct,
      widthPct: column.widthPct,
      topPct: bottomPct - heightPct,
      heightPct,
      isBlack: column.isBlack,
      active: remaining <= 0,
    });
  });
  return tiles;
}
