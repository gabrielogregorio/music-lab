/**
 * PARTITURA: o formato canônico do repertório do Treino.
 *
 * Substituiu o ABC como fonte das melodias. O ABC (e mais ainda a tablatura de
 * furos) guarda menos do que uma partitura precisa: a tab não tem duração
 * nenhuma, e o ABC amarra grafia, duração e oitava num texto que só um parser
 * desfaz. Aqui cada evento é um dado:
 *
 * - a ALTURA é `step` + `alter` + `octave` separados, então a grafia sobrevive à
 *   transposição (Fá♯ vira Mi, nunca Fá♭);
 * - a DURAÇÃO é um número em tempos de semínima - ponto, ligadura e figura
 *   viram aritmética, não símbolo;
 * - PAUSA é `pitch: null`, um evento de primeira classe (o ABC de trad
 *   irlandês escreve a melodia corrida e some com o respiro);
 * - COMPASSO, ANACRUSE e ARMADURA são campos, não convenção de escrita;
 * - a PROCEDÊNCIA anda junto (`source`), porque o ritmo dessas melodias é
 *   reconstruído de fonte externa e isso precisa estar na cara de quem lê.
 *
 * As alturas são as da tablatura de whistle em RÉ, grafadas em altura de
 * concerto com o Ré grave como `D4` (a mesma régua de `whistleTuning.ts`, que
 * transpõe daqui para a afinação escolhida).
 */
import { accidentalSuffix, parseNote } from './notes';

export type ScoreStep = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

/** Alteração em semitons: -1 = ♭, +1 = ♯. */
export type ScoreAlter = -2 | -1 | 0 | 1 | 2;

export interface ScorePitch {
  step: ScoreStep;
  /**
   * Alteração ABSOLUTA da altura, não o acidente desenhado: num tune em Ré
   * maior o Fá♯ é `alter: 1` mesmo sem sustenido na frente da nota - quem
   * decide o que aparece na pauta é a armadura em `key`.
   */
  alter: ScoreAlter;
  /** Oitava científica (C4 = dó central). */
  octave: number;
}

export interface ScoreEvent {
  /** `null` é pausa. */
  pitch: ScorePitch | null;
  /** Duração em tempos de semínima: 1 = semínima, 0.5 = colcheia, 0.25 = semicolcheia. */
  beats: number;
  /** Sílaba da letra sob a nota. */
  lyric?: string;
  /** Seção da forma que COMEÇA neste evento ("Verso", "Refrão"). */
  section?: string;
}

export type ScoreMode = 'major' | 'minor' | 'dorian' | 'mixolydian';

export interface ScoreKey {
  /** Tônica grafada: "D", "Bb", "F#". */
  tonic: string;
  mode: ScoreMode;
}

/**
 * De onde a partitura veio. Fica no dado porque nestas melodias altura e ritmo
 * têm fontes DIFERENTES: a altura sai da tablatura, a duração vem de uma versão
 * de referência - e o quanto uma explicou a outra (`rhythmMatch`) é a medida de
 * confiança do resultado.
 */
export interface ScoreSource {
  pitches: string;
  rhythm: string;
  referenceName?: string;
  referenceUrl?: string;
  /** Quanto da melodia a referência de ritmo explicou nota a nota (0..1). */
  rhythmMatch?: number;
}

export interface ScoreJSON {
  id: string;
  title: string;
  composer?: string;
  /** Agrupamento na biblioteca: sufixo da chave i18n `practice.collection.*`. */
  collection: 'irish' | 'ballads';
  /** [numerador, denominador]. */
  timeSignature: [number, number];
  /** Anacruse (levare) em tempos de semínima; 0 quando a peça começa no tempo forte. */
  pickupBeats: number;
  key: ScoreKey;
  /** Andamento sugerido, em semínimas por minuto. */
  tempo: number;
  /** Tolerância de afinação sugerida, em cents. */
  toleranceCents: number;
  source: ScoreSource;
  /**
   * Compassos que não fecham a conta de tempos, pelo índice em
   * `scoreMeasures` (0 é a anacruse quando existe). Defeito herdado da fonte -
   * fica declarado para não passar batido nem quebrar o lint do repertório.
   */
  irregularMeasures: number[];
  /** Ressalvas da conversão (leitura da imagem, compasso que não fecha...). */
  warnings?: string[];
  events: ScoreEvent[];
}

/**
 * Somas de tempo em ponto flutuante nunca batem exatamente (0.25 × 3 + 2.25...);
 * a folga é grande o bastante para o erro acumulado e pequena o bastante para
 * não engolir uma fusa.
 */
const BEAT_EPSILON = 1e-6;

/** Nome científico da altura ("F#5"), o formato que `parseNote` lê. */
export function pitchToName(pitch: ScorePitch): string {
  const suffix = accidentalSuffix(pitch.alter);
  if (suffix === undefined) {
    throw new Error(`Alteração impossível de grafar: ${pitch.alter}`);
  }
  return `${pitch.step}${suffix}${pitch.octave}`;
}

const ALTER_OF_ACCIDENTAL: Record<string, ScoreAlter> = {
  natural: 0,
  sharp: 1,
  flat: -1,
  doubleSharp: 2,
  doubleFlat: -2,
};

/** Inverso de `pitchToName`: lê "F#5" de volta para o modelo. */
export function nameToPitch(name: string): ScorePitch {
  const parsed = parseNote(name);
  return {
    step: parsed.letter as ScoreStep,
    alter: ALTER_OF_ACCIDENTAL[parsed.accidental],
    octave: parsed.octave,
  };
}

/**
 * Quebra uma sequência em compassos: fecha o compasso antes de estourar a
 * capacidade. A ANACRUSE é o primeiro grupo e tem capacidade própria - sem
 * isso a peça inteira nasce com as barras deslocadas pelo tamanho do levare.
 *
 * Genérica de propósito: é a MESMA regra que a partitura usa para se conferir e
 * que o layout usa para desenhar as barras (`buildSystems`).
 */
export function splitByBeats<T>(
  items: T[],
  beatsOf: (item: T) => number,
  measureBeats: number,
  pickupBeats = 0,
): T[][] {
  const measures: T[][] = [];
  let current: T[] = [];
  let currentBeats = 0;
  let capacity = pickupBeats > 0 ? pickupBeats : measureBeats;

  items.forEach((item) => {
    const isFull = current.length > 0 && currentBeats + beatsOf(item) > capacity + BEAT_EPSILON;
    if (isFull) {
      measures.push(current);
      current = [];
      currentBeats = 0;
      capacity = measureBeats;
    }
    current.push(item);
    currentBeats += beatsOf(item);
  });
  if (current.length > 0) {
    measures.push(current);
  }
  return measures;
}

/** Tempos por compasso a partir da fórmula (semínima = 1). 2/4 → 2, 6/8 → 3. */
export function measureBeats(timeSignature: [number, number]): number {
  const [numerator, denominator] = timeSignature;
  if (!numerator || !denominator) return 4;
  return (numerator * 4) / denominator;
}

/** Os eventos agrupados em compassos, com a anacruse como compasso 0. */
export function scoreMeasures(score: ScoreJSON): ScoreEvent[][] {
  return splitByBeats(
    score.events,
    (event) => event.beats,
    measureBeats(score.timeSignature),
    score.pickupBeats,
  );
}

/**
 * Os compassos que não fecham a conta. O ÚLTIMO nunca conta: melodia de tab
 * termina a frase antes de fechar o compasso o tempo todo, e isso é a peça
 * acabando, não erro de leitura.
 */
export function findIrregularMeasures(score: ScoreJSON): number[] {
  const full = measureBeats(score.timeSignature);
  const measures = scoreMeasures(score);
  const irregular: number[] = [];
  measures.slice(0, -1).forEach((events, index) => {
    const expected = index === 0 && score.pickupBeats > 0 ? score.pickupBeats : full;
    const sum = events.reduce((total, event) => total + event.beats, 0);
    if (Math.abs(sum - expected) > BEAT_EPSILON) {
      irregular.push(index);
    }
  });
  return irregular;
}

/** Uma linha de procedência para a ficha da música. */
export function scoreOrigin(score: ScoreJSON): string {
  return `${score.source.pitches} · ${score.source.rhythm}`;
}
