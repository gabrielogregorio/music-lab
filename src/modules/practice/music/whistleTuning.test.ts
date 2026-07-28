import { describe, expect, it } from 'vitest';
import { transposeNoteName, transpositionToWhistle, WRITTEN_ROOT } from './whistleTuning';
import { whistleKeyById, whistleRange, WHISTLE_SPAN_SEMITONES } from './fingerings';
import { parseNote } from './notes';

describe('transpositionToWhistle', () => {
  it('sobe uma oitava exata para a whistle em Ré (a escrita é de concerto)', () => {
    expect(transpositionToWhistle('D')).toEqual({ semitones: 12, diatonicSteps: 7 });
  });

  it('sobe uma sétima menor para a whistle em Dó', () => {
    expect(transpositionToWhistle('C')).toEqual({ semitones: 10, diatonicSteps: 6 });
  });

  it('sobe uma quarta justa para a whistle em Sol', () => {
    expect(transpositionToWhistle('G')).toEqual({ semitones: 5, diatonicSteps: 3 });
  });

  it('cai no Ré quando a afinação não existe', () => {
    expect(transpositionToWhistle('nao-existe')).toEqual(transpositionToWhistle('D'));
  });
});

describe('transposeNoteName', () => {
  it('leva a tônica escrita à nota mais grave da whistle escolhida', () => {
    expect(transposeNoteName(WRITTEN_ROOT, transpositionToWhistle('C'))).toBe(
      whistleKeyById('C').rootName,
    );
  });

  it('preserva a grafia: Fá♯ vira Mi na whistle em Dó, não Fá♭', () => {
    expect(transposeNoteName('F#5', transpositionToWhistle('C'))).toBe('E6');
  });

  it('mantém a nota na oitava certa ao subir uma oitava', () => {
    expect(transposeNoteName('G4', transpositionToWhistle('D'))).toBe('G5');
  });

  it('leva o dó natural (7ª abaixada) ao lá bemol na whistle em Si♭', () => {
    expect(transposeNoteName('C5', transpositionToWhistle('Bb'))).toBe('Ab5');
  });

  it('não altera nada com transposição nula', () => {
    expect(transposeNoteName('A4', { semitones: 0, diatonicSteps: 0 })).toBe('A4');
  });
});

describe('whistleRange', () => {
  it('começa na tônica grave do instrumento', () => {
    expect(whistleRange('D').lowestMidi).toBe(parseNote('D5').midi);
  });

  it('termina no topo da tabela de dedilhado', () => {
    expect(whistleRange('D').highestMidi).toBe(parseNote('D5').midi + WHISTLE_SPAN_SEMITONES);
  });

  it('a whistle em Dó fica um tom abaixo da whistle em Ré', () => {
    expect(whistleRange('D').lowestMidi - whistleRange('C').lowestMidi).toBe(2);
  });
});
