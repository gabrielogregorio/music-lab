import { describe, expect, it } from 'vitest';
import { bestOctaveShift, countOutOfRange, tuneToSong } from './tuneToSong';
import { WHISTLE_TUNES, type WhistleTune } from './tunes';
import { whistleRange } from './fingerings';
import { parseNote } from './notes';
import { prepareSong } from './song';

const SIMPLE_TUNE: WhistleTune = {
  id: 'teste',
  title: 'Teste',
  collection: 'irish',
  tempo: 100,
  toleranceCents: 30,
  origin: 'fixture',
  abc: 'X:1\nT:Teste\nM:4/4\nL:1/8\nK:Dmaj\nD2 F2 A2 d2|',
};

function noteNames(tune: WhistleTune, whistleKey: string): string[] {
  return tuneToSong(tune, whistleKey).notes.map((note) => note.note);
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

describe('tuneToSong', () => {
  it('leva a escrita de concerto para a oitava real da whistle em Ré', () => {
    expect(noteNames(SIMPLE_TUNE, 'D')).toEqual(['D5', 'F#5', 'A5', 'D6']);
  });

  it('transpõe a mesma digitação para a whistle em Dó', () => {
    expect(noteNames(SIMPLE_TUNE, 'C')).toEqual(['C5', 'E5', 'G5', 'C6']);
  });

  it('converte a duração escrita em tempos', () => {
    expect(tuneToSong(SIMPLE_TUNE, 'D').notes.map((note) => note.beats)).toEqual([1, 1, 1, 1]);
  });

  it('herda o compasso do ABC', () => {
    expect(tuneToSong(SIMPLE_TUNE, 'D').timeSignature).toEqual([4, 4]);
  });

  it('marca a música com a afinação escolhida', () => {
    expect(tuneToSong(SIMPLE_TUNE, 'Bb').whistleKey).toBe('Bb');
  });
});

describe('repertório', () => {
  it.each(WHISTLE_TUNES.map((tune) => [tune.id, tune] as const))(
    '%s cabe inteira nos furos da whistle em Ré',
    (_id, tune) => {
      expect(countOutOfRange(tuneToSong(tune, 'D'), 'D')).toBe(0);
    },
  );

  it.each(WHISTLE_TUNES.map((tune) => [tune.id, tune] as const))(
    '%s cabe inteira nos furos da whistle em Dó',
    (_id, tune) => {
      expect(countOutOfRange(tuneToSong(tune, 'C'), 'C')).toBe(0);
    },
  );

  it.each(WHISTLE_TUNES.map((tune) => [tune.id, tune] as const))(
    '%s tem notas tocáveis suficientes para uma sessão de treino',
    (_id, tune) => {
      expect(prepareSong(tuneToSong(tune, 'D')).playableCount).toBeGreaterThanOrEqual(24);
    },
  );

  it('não repete id entre as músicas do repertório', () => {
    const ids = WHISTLE_TUNES.map((tune) => tune.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a whistle em Ré começa exatamente em D5', () => {
    expect(whistleRange('D').lowestMidi).toBe(parseNote('D5').midi);
  });
});
