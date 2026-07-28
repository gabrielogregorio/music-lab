import { describe, expect, it } from 'vitest';
import {
  findIrregularMeasures,
  measureBeats,
  nameToPitch,
  pitchToName,
  scoreMeasures,
  scoreOrigin,
  splitByBeats,
  type ScoreEvent,
  type ScoreJSON,
} from './score';

function scoreWith(events: ScoreEvent[], overrides: Partial<ScoreJSON> = {}): ScoreJSON {
  return {
    id: 'teste',
    title: 'Teste',
    collection: 'irish',
    timeSignature: [4, 4],
    pickupBeats: 0,
    key: { tonic: 'D', mode: 'major' },
    tempo: 100,
    toleranceCents: 30,
    source: { pitches: 'fixture', rhythm: 'fixture' },
    irregularMeasures: [],
    events,
    ...overrides,
  };
}

function quarters(count: number): ScoreEvent[] {
  return Array.from({ length: count }, () => ({
    pitch: { step: 'D' as const, alter: 0 as const, octave: 4 },
    beats: 1,
  }));
}

describe('pitchToName', () => {
  it('grafa o acidente no formato que parseNote lê de volta', () => {
    expect(pitchToName({ step: 'F', alter: 1, octave: 5 })).toBe('F#5');
    expect(pitchToName({ step: 'B', alter: -1, octave: 4 })).toBe('Bb4');
    expect(pitchToName({ step: 'C', alter: 0, octave: 4 })).toBe('C4');
  });

  it('recusa alteração que nenhuma armadura produz', () => {
    expect(() => pitchToName({ step: 'C', alter: 3 as never, octave: 4 })).toThrow();
  });
});

describe('nameToPitch', () => {
  it('desfaz pitchToName sem perder a grafia', () => {
    expect(nameToPitch('F#5')).toEqual({ step: 'F', alter: 1, octave: 5 });
    expect(nameToPitch('Bb4')).toEqual({ step: 'B', alter: -1, octave: 4 });
  });
});

describe('measureBeats', () => {
  it('converte a fórmula em tempos de semínima', () => {
    expect(measureBeats([2, 4])).toBe(2);
    expect(measureBeats([6, 8])).toBe(3);
    expect(measureBeats([2, 2])).toBe(4);
  });

  it('assume 4/4 com valor zerado', () => {
    expect(measureBeats([0, 4])).toBe(4);
  });
});

describe('splitByBeats', () => {
  it('fecha o compasso ao completar os tempos', () => {
    const groups = splitByBeats([1, 1, 1, 1, 1, 1], (beats) => beats, 2);
    expect(groups).toEqual([
      [1, 1],
      [1, 1],
      [1, 1],
    ]);
  });

  it('dá ao levare a capacidade da anacruse, e só a ele', () => {
    const groups = splitByBeats([1, 1, 1, 1, 1], (beats) => beats, 2, 1);
    expect(groups).toEqual([[1], [1, 1], [1, 1]]);
  });

  it('não parte uma nota que sozinha estoura o compasso', () => {
    expect(splitByBeats([4, 1], (beats) => beats, 2)).toEqual([[4], [1]]);
  });

  it('não gera compasso vazio a partir de lista vazia', () => {
    expect(splitByBeats([], (beats: number) => beats, 4)).toEqual([]);
  });
});

describe('scoreMeasures', () => {
  it('conta a anacruse como o compasso 0', () => {
    const score = scoreWith(quarters(5), { timeSignature: [2, 4], pickupBeats: 1 });
    expect(scoreMeasures(score).map((measure) => measure.length)).toEqual([1, 2, 2]);
  });
});

describe('findIrregularMeasures', () => {
  it('não acusa nada quando todo compasso fecha', () => {
    expect(findIrregularMeasures(scoreWith(quarters(8)))).toEqual([]);
  });

  it('ignora o último compasso incompleto (a frase acaba antes da barra)', () => {
    expect(findIrregularMeasures(scoreWith(quarters(6)))).toEqual([]);
  });

  it('aponta o compasso que fecha curto porque a nota seguinte não cabia', () => {
    // 4 semínimas fecham o 1º; o 2º junta 3 e para em 3 tempos - a mínima não cabe.
    const events = [...quarters(7), { pitch: null, beats: 2 }, ...quarters(4)];
    expect(findIrregularMeasures(scoreWith(events))).toEqual([1]);
  });

  it('cobra da anacruse o tamanho declarado, não o compasso inteiro', () => {
    // Sem a anacruse, a semibreve não caberia no levare e o compasso 0 fecharia em 1.
    const events = [...quarters(1), { pitch: null, beats: 4 }, ...quarters(4)];
    expect(findIrregularMeasures(scoreWith(events, { pickupBeats: 1 }))).toEqual([]);
    expect(findIrregularMeasures(scoreWith(events))).toEqual([0]);
  });
});

describe('scoreOrigin', () => {
  it('junta a procedência da altura e a do ritmo numa linha', () => {
    const score = scoreWith(quarters(4), {
      source: { pitches: 'tablatura', rhythm: 'thesession' },
    });
    expect(scoreOrigin(score)).toBe('tablatura · thesession');
  });
});
