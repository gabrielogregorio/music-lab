import { describe, expect, it } from 'vitest';
import { prepareSong } from '../../../songs/library';
import { buildTimeline, noteIndexAt } from './playback';

const SONG = prepareSong({
  id: 't',
  title: 'Teste',
  instrument: 'tin-whistle',
  tempo: 60, // 1 tempo = 1 segundo, conta redonda
  notes: [
    { note: 'C4', beats: 1 },
    { note: 'rest', beats: 1 },
    { note: 'E4', beats: 2 },
  ],
});

describe('buildTimeline', () => {
  it('acumula início e duração em segundos a partir do andamento', () => {
    const { notes, totalSec } = buildTimeline(SONG);
    expect(notes.map((n) => n.startSec)).toEqual([0, 1, 2]);
    expect(totalSec).toBe(4);
  });

  it('marca a pausa como midi null e a nota com o midi soante', () => {
    const { notes } = buildTimeline(SONG);
    expect(notes[0].midi).toBe(60); // C4
    expect(notes[1].midi).toBeNull(); // pausa
    expect(notes[2].midi).toBe(64); // E4
  });
});

describe('noteIndexAt', () => {
  it('acha a nota que soa no instante dado', () => {
    const timeline = buildTimeline(SONG);
    expect(noteIndexAt(timeline, 0)).toBe(0);
    expect(noteIndexAt(timeline, 1.5)).toBe(1);
    expect(noteIndexAt(timeline, 3.9)).toBe(2);
  });

  it('devolve -1 antes do começo e no fim da música', () => {
    const timeline = buildTimeline(SONG);
    expect(noteIndexAt(timeline, -0.1)).toBe(-1);
    expect(noteIndexAt(timeline, 4)).toBe(-1);
  });
});
