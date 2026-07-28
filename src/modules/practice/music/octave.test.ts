import { describe, expect, it } from 'vitest';
import {
  octaveShiftForReading,
  readingShiftFor,
  shiftOctaveName,
  shiftSongOctave,
  READABLE_HIGH_MIDI,
} from './octave';
import { parseNote } from './notes';
import type { SongJSON } from './song';

function midis(...names: string[]): number[] {
  return names.map((name) => parseNote(name).midi);
}

describe('octaveShiftForReading', () => {
  it('desce uma oitava a melodia de whistle no agudo (2ª oitava)', () => {
    // Scarborough decodificado soa E5..E6 - acima da pauta.
    expect(octaveShiftForReading(midis('E5', 'B5', 'D6', 'E6'))).toBe(-1);
  });

  it('não mexe quem já está na faixa legível', () => {
    // Asa Branca: C4..G4, confortável na pauta.
    expect(octaveShiftForReading(midis('C4', 'E4', 'G4'))).toBe(0);
  });

  it('sobe uma melodia grave demais para a pauta', () => {
    expect(octaveShiftForReading(midis('C3', 'E3', 'G3'))).toBe(1);
  });

  it('desce a escala de aquecimento (D5..D6) para a pauta', () => {
    expect(octaveShiftForReading(midis('D5', 'A5', 'D6'))).toBe(-1);
  });

  it('no empate, prefere não mexer', () => {
    // uma única nota central cabe em 0 e em outros; 0 vence pelo menor |shift|.
    expect(octaveShiftForReading(midis('B4'))).toBe(0);
  });

  it('sem notas, não desloca', () => {
    expect(octaveShiftForReading([])).toBe(0);
  });
});

describe('shiftOctaveName', () => {
  it('baixa a oitava preservando a grafia', () => {
    expect(shiftOctaveName('F#5', -1)).toBe('F#4');
  });

  it('baixa nota bemol', () => {
    expect(shiftOctaveName('Bb4', -1)).toBe('Bb3');
  });

  it('deixa a pausa intacta', () => {
    expect(shiftOctaveName('rest', -1)).toBe('rest');
  });
});

describe('shiftSongOctave', () => {
  const SONG: SongJSON = {
    id: 's',
    title: 'S',
    instrument: 'tin-whistle',
    tempo: 100,
    notes: [
      { note: 'E6', beats: 1 },
      { note: 'rest', beats: 1 },
      { note: 'C#6', beats: 2, lyric: 'la' },
    ],
  };

  it('baixa cada nota e mantém pausa, duração e lírica', () => {
    const shifted = shiftSongOctave(SONG, -1);
    expect(shifted.notes.map((note) => note.note)).toEqual(['E5', 'rest', 'C#5']);
    expect(shifted.notes[2].beats).toBe(2);
    expect(shifted.notes[2].lyric).toBe('la');
  });

  it('retorna a mesma música quando o deslocamento é zero', () => {
    expect(shiftSongOctave(SONG, 0)).toBe(SONG);
  });

  it('a leitura traz a nota mais aguda para dentro da faixa', () => {
    const shifted = shiftSongOctave(SONG, readingShiftFor(SONG));
    const top = Math.max(
      ...shifted.notes.filter((note) => note.note !== 'rest').map((note) => parseNote(note.note).midi),
    );
    expect(top).toBeLessThanOrEqual(READABLE_HIGH_MIDI);
  });
});
