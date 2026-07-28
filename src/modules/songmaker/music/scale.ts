// Escalas e alturas do Song Maker. Puro e testável: dá as linhas da grade de
// melodia (uma por altura) a partir da tônica, da escala e do número de oitavas.

export type ScaleId = "major" | "minor" | "pentatonic" | "chromatic";

export const SCALES: Record<ScaleId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_IDS: ScaleId[] = ["major", "minor", "pentatonic", "chromatic"];

// Uma cor por grau da escala (índice), como no Music Lab: a linha ganha a cor do
// seu grau e ela se repete a cada oitava.
export const DEGREE_COLORS = [
  "#ea3573",
  "#f4900c",
  "#f4c20d",
  "#59b036",
  "#0f9d58",
  "#00acc1",
  "#3b6fd8",
  "#7b52d8",
  "#b23fd8",
  "#d8399a",
  "#e0575b",
  "#8d6e63",
];

const SEMITONES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_HZ = 440;

export interface Pitch {
  midi: number;
  degreeIndex: number;
}

// Alturas ascendentes: `octaves` oitavas da escala a partir de rootMidi, mais a
// tônica do topo (como o Music Lab, que fecha a faixa na oitava de cima).
export function buildPitches(rootMidi: number, scaleId: ScaleId, octaves: number): Pitch[] {
  const scale = SCALES[scaleId];
  const pitches: Pitch[] = [];
  for (let octave = 0; octave < octaves; octave += 1) {
    scale.forEach((semitone, degreeIndex) => {
      pitches.push({ midi: rootMidi + octave * SEMITONES_PER_OCTAVE + semitone, degreeIndex });
    });
  }
  pitches.push({ midi: rootMidi + octaves * SEMITONES_PER_OCTAVE, degreeIndex: 0 });
  return pitches;
}

export function midiToFreq(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function colorForDegree(degreeIndex: number): string {
  return DEGREE_COLORS[degreeIndex % DEGREE_COLORS.length];
}
