import { describe, expect, it } from 'vitest';
import { prepareSong } from '../../../songs/library';
import { buildTimeline } from './playback';
import { buildKeyboard, keyColumns, type KeyColumn } from './keys';
import { fallingTiles } from './falling';

const TIMELINE = buildTimeline(
  prepareSong({
    id: 't',
    title: 'T',
    instrument: 'tin-whistle',
    tempo: 60, // 1 tempo = 1 s
    notes: [
      { note: 'C4', beats: 1 }, // startSec 0
      { note: 'E4', beats: 1 }, // startSec 1
      { note: 'rest', beats: 1 }, // startSec 2 (não vira peça)
      { note: 'G4', beats: 1 }, // startSec 3
    ],
  }),
);

const COLUMNS: Map<number, KeyColumn> = new Map(keyColumns(buildKeyboard(60, 13)).map((column) => [column.midi, column]));
const WINDOW = 3;

describe('fallingTiles', () => {
  it('não cria peça para pausa nem para nota fora do teclado visível', () => {
    const tiles = fallingTiles(TIMELINE, COLUMNS, 0, WINDOW);
    // No instante 0: C4 (agora), E4 e a nota fora? Sol4 está a 3s = fora da janela.
    expect(tiles.map((tile) => tile.index)).toEqual([0, 1]);
  });

  it('marca como ativa só a nota que está batendo no teclado agora', () => {
    const tiles = fallingTiles(TIMELINE, COLUMNS, 1, WINDOW);
    const active = tiles.filter((tile) => tile.active).map((tile) => tile.index);
    expect(active).toEqual([1]); // E4 começa em 1s
  });

  it('quanto mais perto de bater, mais embaixo no trilho (topPct maior)', () => {
    const early = fallingTiles(TIMELINE, COLUMNS, 0, WINDOW).find((tile) => tile.index === 1)!;
    const late = fallingTiles(TIMELINE, COLUMNS, 0.8, WINDOW).find((tile) => tile.index === 1)!;
    expect(late.topPct).toBeGreaterThan(early.topPct);
  });

  it('alinha a peça na coluna horizontal da sua tecla', () => {
    const tile = fallingTiles(TIMELINE, COLUMNS, 0, WINDOW).find((t) => t.index === 0)!;
    const column = COLUMNS.get(60)!;
    expect(tile.leftPct).toBe(column.leftPct);
    expect(tile.widthPct).toBe(column.widthPct);
  });
});
