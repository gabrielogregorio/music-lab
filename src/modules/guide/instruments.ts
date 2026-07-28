// Dados do guia de digitação: para cada instrumento, o desenho dos furos e a
// digitação de cada nota. Puro e testável - o componente só desenha o que sai
// daqui. Um furo: 1 fechado, 0 aberto, 0.5 meia-abertura. A ordem do array de
// furos casa com a ordem do array `holes` do layout.
import { midiToName, midiToSolfege } from "../../music/pitch";
import { fingeringForOffset, MAX_OFFSET } from "../../whistle/fingerings";

export type HoleState = 0 | 0.5 | 1;

export type GuideMode = "scale" | "chromatic";

export interface GuideKey {
  id: string;
  label: string;
  /** MIDI da tônica (todos os furos fechados). */
  rootMidi: number;
}

export interface HolePos {
  x: number;
  y: number;
  r: number;
}

// Quantos dedos por mão e se há polegar (furo de trás), para o desenho de "como
// segurar". A mão esquerda fica em cima, a direita embaixo.
export interface HoldSpec {
  left: number;
  right: number;
  thumb?: boolean;
}

export interface GuideNote {
  /** Notação científica, ex.: "D5". */
  name: string;
  /** Solfejo (Dó, Ré...), para quem lê por sílaba. */
  solfege: string;
  holes: HoleState[];
  /** Precisa de meia-abertura/cross-fingering (acidente ou dedilhado torto). */
  awkward?: boolean;
  /** Segunda oitava por sobressopro (anel acima do diagrama). */
  overblow?: boolean;
}

export interface GuideInstrument {
  id: string;
  nameKey: string;
  descKey: string;
  /** Dimensões do diagrama SVG de uma nota, em px. */
  width: number;
  height: number;
  /** Posição de cada furo; o índice casa com `GuideNote.holes`. */
  holes: HolePos[];
  /** Como as notas são geradas: por afinação/modo. */
  kind: "sixhole" | "recorder";
  /** Afinações disponíveis. */
  keys: GuideKey[];
  defaultKey: string;
  /** Diagrama de como segurar (dedos por mão). */
  hold: HoldSpec;
}

// Afinações mais comuns de whistle/pífaro (mesmo dedilhado, altura diferente).
export const SIX_HOLE_KEYS: GuideKey[] = [
  { id: "D", label: "D", rootMidi: 74 },
  { id: "C", label: "C", rootMidi: 72 },
  { id: "Bb", label: "B♭", rootMidi: 70 },
  { id: "A", label: "A", rootMidi: 69 },
  { id: "G", label: "G", rootMidi: 67 },
  { id: "F", label: "F", rootMidi: 65 },
  { id: "Eb", label: "E♭", rootMidi: 75 },
];

// A mesma digitação da flauta doce serve soprano (dó) e contralto (fá): muda só a
// altura que sai. São as duas afinações padrão.
export const RECORDER_KEYS: GuideKey[] = [
  { id: "C", label: "C", rootMidi: 72 },
  { id: "F", label: "F", rootMidi: 65 },
];

// ---------- Sopro simples de 6 furos (whistle, pífaro) ----------
// Os dois são flautas de sistema simples: levantar um dedo de cada vez dá a
// escala maior da tônica. O PADRÃO de furos é o mesmo; muda a nota que sai.

// Começa em y=24 para deixar folga no topo ao anel de oitava (sobressopro), que
// antes era cortado pela borda do SVG e parecia duas bolinhas coladas.
const SIX_HOLE_LAYOUT: HolePos[] = [
  { x: 22, y: 24, r: 7 },
  { x: 22, y: 44, r: 7 },
  { x: 22, y: 64, r: 7 },
  { x: 22, y: 84, r: 7 },
  { x: 22, y: 104, r: 7 },
  { x: 22, y: 124, r: 7 },
];
const SIX_HOLE_WIDTH = 44;
const SIX_HOLE_HEIGHT = 140;

interface ScaleStep {
  semitones: number;
  holes: HoleState[];
}

// Uma oitava da escala maior num sopro de 6 furos (graus naturais, universais).
const SIX_HOLE_SCALE: ScaleStep[] = [
  { semitones: 0, holes: [1, 1, 1, 1, 1, 1] },
  { semitones: 2, holes: [1, 1, 1, 1, 1, 0] },
  { semitones: 4, holes: [1, 1, 1, 1, 0, 0] },
  { semitones: 5, holes: [1, 1, 1, 0, 0, 0] },
  { semitones: 7, holes: [1, 1, 0, 0, 0, 0] },
  { semitones: 9, holes: [1, 0, 0, 0, 0, 0] },
  { semitones: 11, holes: [0, 0, 0, 0, 0, 0] },
];

const SEMITONES_PER_OCTAVE = 12;

// Duas oitavas: a de baixo com sopro normal, a de cima com o mesmo dedilhado e
// sobressopro (blow harder). Uma nota final na tônica fecha a segunda oitava.
export function buildSixHoleNotes(rootMidi: number): GuideNote[] {
  const lower: GuideNote[] = SIX_HOLE_SCALE.map((step) => noteAt(rootMidi, step.semitones, step.holes, false));
  const upper: GuideNote[] = SIX_HOLE_SCALE.map((step) =>
    noteAt(rootMidi, step.semitones + SEMITONES_PER_OCTAVE, step.holes, true),
  );
  const topTonic = noteAt(rootMidi, 2 * SEMITONES_PER_OCTAVE, SIX_HOLE_SCALE[0].holes, true);
  return [...lower, ...upper, topTonic];
}

function noteAt(rootMidi: number, semitones: number, holes: HoleState[], overblow: boolean): GuideNote {
  const midi = rootMidi + semitones;
  return {
    name: midiToName(midi),
    solfege: midiToSolfege(midi),
    holes,
    overblow: overblow || undefined,
  };
}

// Duas oitavas CROMÁTICAS, com os acidentes (meia-abertura / cross-fingering)
// marcados como "torto". Reaproveita a mesma tabela cromática do Conversor.
export function buildSixHoleChromatic(rootMidi: number): GuideNote[] {
  const notes: GuideNote[] = [];
  for (let offset = 0; offset <= MAX_OFFSET; offset += 1) {
    const fingering = fingeringForOffset(offset);
    if (!fingering) {
      continue;
    }
    const midi = rootMidi + offset;
    notes.push({
      name: midiToName(midi),
      solfege: midiToSolfege(midi),
      holes: fingering.holes,
      awkward: fingering.awkward || undefined,
      overblow: offset >= SEMITONES_PER_OCTAVE || undefined,
    });
  }
  return notes;
}

// ---------- Flauta doce soprano barroca (dó) ----------
// 8 posições: polegar (nas costas) + 7 furos frontais. Escala natural de Dó
// maior - as digitações padrão do sistema barroco (inglês), das que não geram
// dúvida. O Fá é o dedilhado forquilha clássico (marcado como "torto").

const RECORDER_LAYOUT: HolePos[] = [
  { x: 8, y: 18, r: 5 }, // polegar (costas)
  { x: 26, y: 8, r: 7 },
  { x: 26, y: 28, r: 7 },
  { x: 26, y: 48, r: 7 },
  { x: 26, y: 68, r: 7 },
  { x: 26, y: 88, r: 7 },
  { x: 26, y: 108, r: 7 },
  { x: 26, y: 128, r: 7 },
];
const RECORDER_WIDTH = 44;
const RECORDER_HEIGHT = 150;

// [polegar, 1, 2, 3, 4, 5, 6, 7]. Digitação barroca (inglesa) conferida com a
// American Recorder Society; a 2ª oitava é a pinça do polegar (meio furo das
// costas), não sobressopro. Os cromáticos aqui são os consolidados: C#5 (meia-
// cobertura do furo 7) e Ré#/Mib5 (forquilha do furo 6). F#/G#/Sib variam por
// modelo e ficaram de fora para não chutar.
interface RecorderStep {
  semitones: number;
  holes: HoleState[];
  awkward?: boolean;
  /** Acidente (fora da escala natural): só aparece no modo cromático. */
  accidental?: boolean;
}
const RECORDER_BAROQUE: RecorderStep[] = [
  { semitones: 0, holes: [1, 1, 1, 1, 1, 1, 1, 1] }, //  C5 (todos fechados)
  { semitones: 1, holes: [1, 1, 1, 1, 1, 1, 1, 0.5], awkward: true, accidental: true }, // C#5
  { semitones: 2, holes: [1, 1, 1, 1, 1, 1, 1, 0] }, //  D5
  { semitones: 3, holes: [1, 1, 1, 1, 1, 1, 0, 1], awkward: true, accidental: true }, // D#/Mib5
  { semitones: 4, holes: [1, 1, 1, 1, 1, 1, 0, 0] }, //  E5
  { semitones: 5, holes: [1, 1, 1, 1, 1, 0, 1, 1], awkward: true }, //  F5 (forquilha, natural)
  { semitones: 7, holes: [1, 1, 1, 1, 0, 0, 0, 0] }, //  G5
  { semitones: 9, holes: [1, 1, 1, 0, 0, 0, 0, 0] }, //  A5
  { semitones: 11, holes: [1, 1, 0, 0, 0, 0, 0, 0] }, //  B5
  { semitones: 12, holes: [0.5, 0, 0, 0, 0, 0, 0, 0] }, //  C6 (pinça do polegar)
  { semitones: 14, holes: [0.5, 0, 1, 1, 1, 1, 1, 1] }, //  D6 (pinça + furo 1 aberto)
];

// Escala natural (dó maior) ou cromática, transposta pela afinação. Os acidentes
// disponíveis (C#, Ré#) só entram no modo cromático.
export function buildRecorderNotes(rootMidi: number, mode: GuideMode = "scale"): GuideNote[] {
  return RECORDER_BAROQUE.filter((step) => mode === "chromatic" || !step.accidental).map((step) => {
    const midi = rootMidi + step.semitones;
    return {
      name: midiToName(midi),
      solfege: midiToSolfege(midi),
      holes: step.holes,
      awkward: step.awkward,
    };
  });
}

// ---------- Catálogo ----------
export const GUIDE_INSTRUMENTS: GuideInstrument[] = [
  {
    id: "whistle",
    nameKey: "guide.inst.whistle",
    descKey: "guide.inst.whistle.desc",
    width: SIX_HOLE_WIDTH,
    height: SIX_HOLE_HEIGHT,
    holes: SIX_HOLE_LAYOUT,
    kind: "sixhole",
    keys: SIX_HOLE_KEYS,
    defaultKey: "D",
    hold: { left: 3, right: 3 },
  },
  {
    id: "fife",
    nameKey: "guide.inst.fife",
    descKey: "guide.inst.fife.desc",
    width: SIX_HOLE_WIDTH,
    height: SIX_HOLE_HEIGHT,
    holes: SIX_HOLE_LAYOUT,
    kind: "sixhole",
    keys: SIX_HOLE_KEYS,
    defaultKey: "C",
    hold: { left: 3, right: 3 },
  },
  {
    id: "recorder",
    nameKey: "guide.inst.recorder",
    descKey: "guide.inst.recorder.desc",
    width: RECORDER_WIDTH,
    height: RECORDER_HEIGHT,
    holes: RECORDER_LAYOUT,
    kind: "recorder",
    keys: RECORDER_KEYS,
    defaultKey: "C",
    hold: { left: 3, right: 4, thumb: true },
  },
];

export const DEFAULT_GUIDE_INSTRUMENT = "whistle";

export function guideInstrumentById(id: string): GuideInstrument {
  return GUIDE_INSTRUMENTS.find((instrument) => instrument.id === id) ?? GUIDE_INSTRUMENTS[0];
}

export function keyById(instrument: GuideInstrument, keyId: string): GuideKey {
  return instrument.keys.find((key) => key.id === keyId) ?? instrument.keys[0];
}

// A lista de notas a desenhar, dado o instrumento, a afinação e o modo.
export function buildGuideNotes(instrument: GuideInstrument, keyId: string, mode: GuideMode): GuideNote[] {
  const rootMidi = keyById(instrument, keyId).rootMidi;
  if (instrument.kind === "recorder") {
    return buildRecorderNotes(rootMidi, mode);
  }
  return mode === "chromatic" ? buildSixHoleChromatic(rootMidi) : buildSixHoleNotes(rootMidi);
}
