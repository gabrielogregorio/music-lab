/**
 * Modelo puro do teclado: a lista de teclas (brancas e pretas) para uma faixa
 * ajustável, e o encaixe da faixa na tessitura de uma música. Sem React, sem
 * áudio - só dados testáveis. As alturas são MIDI; o desenho fica no componente.
 */

const SEMITONES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_HZ = 440;

// Classes de altura pretas no teclado: Dó#, Ré#, Fá#, Sol#, Lá#.
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const NOTE_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MIN_KEY_COUNT = 7;
export const MAX_KEY_COUNT = 49;
export const DEFAULT_START_MIDI = 48; // C3
export const DEFAULT_KEY_COUNT = 25; // duas oitavas + a tônica de cima
/** Alcance de MIDI que faz sentido no teclado (Lá0 grave até Dó8 agudo). */
export const LOWEST_START_MIDI = 21; // A0
export const HIGHEST_KEY_MIDI = 108; // C8

export interface PianoKey {
  midi: number;
  /** Nome científico com oitava, ex.: "C4", "F#5". */
  name: string;
  isBlack: boolean;
}

function pitchClass(midi: number): number {
  return ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
}

export function isBlackMidi(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(pitchClass(midi));
}

export function midiName(midi: number): string {
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
  return `${NOTE_LETTERS[pitchClass(midi)]}${octave}`;
}

export function midiToFreq(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function clampKeyCount(count: number): number {
  return Math.max(MIN_KEY_COUNT, Math.min(MAX_KEY_COUNT, Math.round(count)));
}

/** Ajusta o começo para que a faixa inteira caiba no alcance tocável. */
export function clampStartMidi(startMidi: number, count: number): number {
  const maxStart = HIGHEST_KEY_MIDI - (count - 1);
  return Math.max(LOWEST_START_MIDI, Math.min(maxStart, Math.round(startMidi)));
}

/** As `count` teclas a partir de `startMidi`, graves à esquerda. */
export function buildKeyboard(startMidi: number, count: number): PianoKey[] {
  const clampedCount = clampKeyCount(count);
  const start = clampStartMidi(startMidi, clampedCount);
  return Array.from({ length: clampedCount }, (_unused, index) => {
    const midi = start + index;
    return { midi, name: midiName(midi), isBlack: isBlackMidi(midi) };
  });
}

export interface KeyColumn {
  midi: number;
  /** Borda esquerda e largura em % da largura do teclado. */
  leftPct: number;
  widthPct: number;
  /** Centro horizontal em %, para alinhar a nota que cai sobre a tecla. */
  centerPct: number;
  isBlack: boolean;
}

/**
 * Geometria horizontal de cada tecla, em % da largura do teclado. As brancas
 * dividem a largura por igual; as pretas ficam na fronteira entre duas brancas,
 * mais estreitas - a mesma régua que o desenho do piano usa. É o que faz a nota
 * que cai bater exatamente na sua tecla.
 */
export function keyColumns(keys: PianoKey[]): KeyColumn[] {
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const whiteWidthPct = 100 / Math.max(1, whiteKeys.length);
  const blackWidthPct = whiteWidthPct * 0.62;
  return keys.map((key) => {
    if (!key.isBlack) {
      const whiteIndex = whiteKeys.findIndex((white) => white.midi === key.midi);
      const leftPct = whiteIndex * whiteWidthPct;
      return { midi: key.midi, leftPct, widthPct: whiteWidthPct, centerPct: leftPct + whiteWidthPct / 2, isBlack: false };
    }
    const whitesBefore = whiteKeys.filter((white) => white.midi < key.midi).length;
    const centerPct = whitesBefore * whiteWidthPct;
    return { midi: key.midi, leftPct: centerPct - blackWidthPct / 2, widthPct: blackWidthPct, centerPct, isBlack: true };
  });
}

function snapDownToC(midi: number): number {
  return midi - pitchClass(midi);
}

/**
 * Encaixe da faixa na tessitura da música: começa numa tecla branca (Dó) no
 * grave, com uma folga de cada lado, e cobre até a nota mais aguda. Assim o
 * teclado abre já mostrando a música inteira quando ela é escolhida.
 */
export function fitKeyboard(minMidi: number, maxMidi: number): { startMidi: number; count: number } {
  const PADDING_SEMITONES = 2;
  const start = snapDownToC(minMidi - PADDING_SEMITONES);
  const rawCount = maxMidi + PADDING_SEMITONES - start + 1;
  const count = clampKeyCount(rawCount);
  return { startMidi: clampStartMidi(start, count), count };
}
