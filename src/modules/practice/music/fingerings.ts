/**
 * Dedilhado para tin whistle diatônico de 6 furos, parametrizado por
 * afinação. Portado do "whistle-forge" do CLEO. O PADRÃO de dedilhado é
 * o mesmo em qualquer whistle - muda só a altura produzida.
 *
 * Arrays de furos: 6 furos do bocal (topo) para a base.
 *   1 = fechado, 0 = aberto, 0.5 = meia-abertura.
 */
import { parseNote } from './notes';

export type HoleState = 0 | 0.5 | 1;
export type Fingering = [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState];

export interface WhistleKey {
  id: string;
  /**
   * Nota mais grave REAL do instrumento, em notação científica: é ela que sai
   * com os seis furos fechados. Um whistle em Ré soprano começa em D5 (não em
   * D4) - a oitava importa aqui, porque é o que separa a 1ª da 2ª oitava e,
   * portanto, o dedilhado normal do sobressopro.
   */
  rootName: string;
  /** MIDI do 1º grau (todos os furos fechados), derivado de `rootName`. */
  rootMidi: number;
}

const WHISTLE_ROOTS: { id: string; rootName: string }[] = [
  { id: 'D', rootName: 'D5' },
  { id: 'C', rootName: 'C5' },
  { id: 'Bb', rootName: 'Bb4' },
  { id: 'A', rootName: 'A4' },
  { id: 'G', rootName: 'G4' },
  { id: 'F', rootName: 'F4' },
  { id: 'Eb', rootName: 'Eb5' },
];

export function buildWhistleKeys(): WhistleKey[] {
  return WHISTLE_ROOTS.map((root) => ({
    id: root.id,
    rootName: root.rootName,
    rootMidi: parseNote(root.rootName).midi,
  }));
}

export const WHISTLE_KEYS: WhistleKey[] = buildWhistleKeys();

export const DEFAULT_WHISTLE_KEY = 'D';

export function whistleKeyById(keyId: string): WhistleKey {
  return WHISTLE_KEYS.find((key) => key.id === keyId) ?? WHISTLE_KEYS[0];
}

interface PatternStep {
  semitones: number;
  holes: Fingering;
  overblow: boolean;
}

/** Padrão de dedilhado do whistle diatônico. ~2 oitavas. */
const PATTERN: PatternStep[] = [
  { semitones: 0, holes: [1, 1, 1, 1, 1, 1], overblow: false },
  { semitones: 2, holes: [1, 1, 1, 1, 1, 0], overblow: false },
  { semitones: 4, holes: [1, 1, 1, 1, 0, 0], overblow: false },
  { semitones: 5, holes: [1, 1, 1, 0, 0, 0], overblow: false },
  { semitones: 7, holes: [1, 1, 0, 0, 0, 0], overblow: false },
  { semitones: 9, holes: [1, 0, 0, 0, 0, 0], overblow: false },
  { semitones: 10, holes: [0, 1, 1, 0, 0, 0], overblow: false },
  { semitones: 11, holes: [0, 0, 0, 0, 0, 0], overblow: false },
  { semitones: 12, holes: [0, 1, 1, 1, 1, 1], overblow: true },
  { semitones: 14, holes: [1, 1, 1, 1, 1, 0], overblow: true },
  { semitones: 16, holes: [1, 1, 1, 1, 0, 0], overblow: true },
  { semitones: 17, holes: [1, 1, 1, 0, 0, 0], overblow: true },
  { semitones: 19, holes: [1, 1, 0, 0, 0, 0], overblow: true },
  { semitones: 21, holes: [1, 0, 0, 0, 0, 0], overblow: true },
  { semitones: 22, holes: [0, 1, 1, 0, 0, 0], overblow: true },
  { semitones: 23, holes: [0, 0, 0, 0, 0, 0], overblow: true },
  { semitones: 24, holes: [0, 1, 1, 1, 1, 1], overblow: true },
];

export interface WhistleFingering {
  holes: Fingering;
  overblow: boolean;
}

/** Maior intervalo (semitons acima da tônica) que a tabela de dedilhado cobre. */
export const WHISTLE_SPAN_SEMITONES = PATTERN[PATTERN.length - 1].semitones;

export interface WhistleRange {
  lowestMidi: number;
  highestMidi: number;
}

/** Tessitura real do instrumento: da tônica grave ao topo da tabela. */
export function whistleRange(keyId: string): WhistleRange {
  const key = whistleKeyById(keyId);
  return { lowestMidi: key.rootMidi, highestMidi: key.rootMidi + WHISTLE_SPAN_SEMITONES };
}

/**
 * Encontra o dedilhado mais próximo para um dado MIDI numa afinação.
 * Retorna null se a nota cair fora do range do whistle (com 1 semitom
 * de tolerância para enarmonias).
 */
export function fingeringForMidi(
  midi: number,
  keyId: string,
  octaveAgnostic = false,
): WhistleFingering | null {
  const key = whistleKeyById(keyId);
  let best: PatternStep | null = null;
  let bestDist = octaveAgnostic ? Infinity : 1.01;
  for (const step of PATTERN) {
    const stepMidi = key.rootMidi + step.semitones;
    // por classe de nota (ignora oitava) ou por altura exata
    const d = octaveAgnostic
      ? Math.abs((((stepMidi - midi) % 12) + 18) % 12 - 6)
      : Math.abs(stepMidi - midi);
    if (d < bestDist) {
      bestDist = d;
      best = step;
    }
  }
  if (octaveAgnostic && best && bestDist > 0.5) return null; // classe não existe no whistle
  return best ? { holes: best.holes, overblow: best.overblow } : null;
}

/**
 * O dedilhado a MOSTRAR para uma nota alvo.
 *
 * A altura exata vem primeiro, sempre: é dela que sai o sobressopro, e essa é
 * justamente a informação que o dedo precisa. "Ignorar oitava" afrouxa o
 * JULGAMENTO do microfone, não o que se ensina a tocar - se ela também
 * apagasse a oitava do desenho, o "+" sumiria da segunda oitava inteira.
 *
 * Só quando a nota não existe na tessitura (música escrita fora do
 * instrumento) o modo tolerante entra, mostrando o dedilhado da classe da nota
 * em vez de um ✕ inútil.
 */
export function fingeringToShow(
  midi: number,
  keyId: string,
  allowOctaveFallback: boolean,
): WhistleFingering | null {
  const exact = fingeringForMidi(midi, keyId);
  if (exact || !allowOctaveFallback) return exact;
  return fingeringForMidi(midi, keyId, true);
}
