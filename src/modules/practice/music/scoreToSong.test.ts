import { describe, expect, it } from 'vitest';
import { bestOctaveShift, countOutOfRange, scoreToSong } from './scoreToSong';
import { nameToPitch, type ScoreJSON } from './score';
import { parseNote } from './notes';

const SIMPLE_SCORE: ScoreJSON = {
  id: 'teste',
  title: 'Teste',
  collection: 'irish',
  timeSignature: [4, 4],
  pickupBeats: 1,
  key: { tonic: 'D', mode: 'major' },
  tempo: 100,
  toleranceCents: 30,
  source: { pitches: 'fixture', rhythm: 'fixture' },
  irregularMeasures: [],
  events: [
    { pitch: nameToPitch('D4'), beats: 1 },
    { pitch: nameToPitch('F#4'), beats: 1 },
    { pitch: null, beats: 0.5 },
    { pitch: nameToPitch('A4'), beats: 1 },
    { pitch: nameToPitch('D5'), beats: 1 },
  ],
};

function noteNames(score: ScoreJSON, whistleKey: string): string[] {
  return scoreToSong(score, whistleKey).notes.map((note) => note.note);
}

describe('bestOctaveShift', () => {
  it('não move nada quando a melodia já está na tessitura', () => {
    expect(bestOctaveShift([parseNote('D5').midi, parseNote('A5').midi], 'D')).toBe(0);
  });

  it('sobe uma oitava a melodia escrita uma oitava abaixo do instrumento', () => {
    expect(bestOctaveShift([parseNote('D4').midi, parseNote('A4').midi], 'D')).toBe(12);
  });

  it('desce a melodia escrita acima do topo do instrumento', () => {
    expect(bestOctaveShift([parseNote('D8').midi], 'D')).toBe(-12);
  });
});

describe('scoreToSong', () => {
  it('leva a escrita de concerto para a oitava real da whistle em Ré', () => {
    expect(noteNames(SIMPLE_SCORE, 'D')).toEqual(['D5', 'F#5', 'rest', 'A5', 'D6']);
  });

  it('transpõe a mesma digitação para a whistle em Dó preservando a grafia', () => {
    expect(noteNames(SIMPLE_SCORE, 'C')).toEqual(['C5', 'E5', 'rest', 'G5', 'C6']);
  });

  it('mantém a duração de cada evento, pausa inclusive', () => {
    expect(scoreToSong(SIMPLE_SCORE, 'D').notes.map((note) => note.beats)).toEqual([
      1, 1, 0.5, 1, 1,
    ]);
  });

  it('leva o compasso e a anacruse da partitura para a música', () => {
    const song = scoreToSong(SIMPLE_SCORE, 'D');
    expect(song.timeSignature).toEqual([4, 4]);
    expect(song.pickupBeats).toBe(1);
  });

  it('marca a música com a afinação escolhida', () => {
    expect(scoreToSong(SIMPLE_SCORE, 'Bb').whistleKey).toBe('Bb');
  });
});

describe('countOutOfRange', () => {
  it('conta só as notas fora dos furos, ignorando as pausas', () => {
    const song = scoreToSong(SIMPLE_SCORE, 'D');
    const withStrayNote = { ...song, notes: [...song.notes, { note: 'C3', beats: 1 }] };
    expect(countOutOfRange(withStrayNote, 'D')).toBe(1);
  });
});
