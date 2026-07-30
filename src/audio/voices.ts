// Biblioteca COMPARTILHADA de vozes Web Audio: Song Maker e Teclado tocam daqui,
// para o mesmo som valer nos dois. Cada instrumento melódico é um oscilador com
// envelope (mais partial de oitava, detune ou vibrato opcionais, para timbres
// distintos); a percussão são batidas (osc com queda de altura ou ruído
// filtrado). Sem samples externos - a CSP do Pages não deixaria carregar mesmo.

export type MelodyInstrument =
  | "marimba"
  | "piano"
  | "strings"
  | "woodwind"
  | "synth"
  | "flute"
  | "music-box"
  | "bells"
  | "bass"
  | "organ"
  | "harp"
  | "brass"
  | "clarinet"
  | "vibraphone"
  | "accordion"
  | "guitar";

export type PercussionInstrument = "conga" | "electronic" | "blocks" | "kit";

export const MELODY_INSTRUMENTS: { id: MelodyInstrument; label: string }[] = [
  { id: "marimba", label: "Marimba" },
  { id: "piano", label: "Piano" },
  { id: "strings", label: "Strings" },
  { id: "woodwind", label: "Woodwind" },
  { id: "synth", label: "Synth" },
  { id: "flute", label: "Flute" },
  { id: "music-box", label: "Music box" },
  { id: "bells", label: "Bells" },
  { id: "bass", label: "Bass" },
  { id: "organ", label: "Organ" },
  { id: "harp", label: "Harp" },
  { id: "brass", label: "Brass" },
  { id: "clarinet", label: "Clarinet" },
  { id: "vibraphone", label: "Vibraphone" },
  { id: "accordion", label: "Accordion" },
  { id: "guitar", label: "Guitar" },
];

export const PERCUSSION_INSTRUMENTS: { id: PercussionInstrument; label: string }[] = [
  { id: "conga", label: "Conga" },
  { id: "electronic", label: "Electronic" },
  { id: "blocks", label: "Blocks" },
  { id: "kit", label: "Kit" },
];

const SEMITONES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_HZ = 440;

function midiToFreq(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

interface VoiceSpec {
  type: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  sustained: boolean;
  filterHz?: number;
  /** Ganho de um oscilador uma oitava acima (brilho de sino/caixinha), 0..1. */
  partialGain?: number;
  /** Segundo oscilador desafinado em cents (coro/palheta). */
  detuneCents?: number;
  /** Vibrato: LFO na altura (taxa em Hz e profundidade em cents). */
  vibratoHz?: number;
  vibratoCents?: number;
}

const PEAK_GAIN = 0.22;
const NEAR_SILENCE = 0.0001;
const RELEASE_SEC = 0.06;

// As 6 primeiras vozes vêm do Song Maker original e ficam INTOCADAS (o Teclado e
// as músicas salvas dependem do som exato). As 10 seguintes são novas.
const MELODY_VOICES: Record<MelodyInstrument, VoiceSpec> = {
  marimba: { type: "triangle", attack: 0.002, decay: 0.4, sustain: 0, sustained: false },
  piano: { type: "triangle", attack: 0.002, decay: 1.1, sustain: 0, sustained: false },
  strings: { type: "sawtooth", attack: 0.06, decay: 0.1, sustain: 0.5, sustained: true, filterHz: 2600 },
  woodwind: { type: "sine", attack: 0.03, decay: 0.08, sustain: 0.6, sustained: true },
  synth: { type: "square", attack: 0.005, decay: 0.08, sustain: 0.45, sustained: true, filterHz: 1800 },
  flute: { type: "sine", attack: 0.05, decay: 0.08, sustain: 0.7, sustained: true },
  "music-box": { type: "triangle", attack: 0.002, decay: 0.7, sustain: 0, sustained: false, partialGain: 0.4 },
  bells: { type: "sine", attack: 0.002, decay: 2.2, sustain: 0, sustained: false, partialGain: 0.5 },
  bass: { type: "sine", attack: 0.004, decay: 0.5, sustain: 0, sustained: false, filterHz: 600 },
  organ: { type: "square", attack: 0.01, decay: 0.05, sustain: 0.8, sustained: true, partialGain: 0.3 },
  harp: { type: "sawtooth", attack: 0.002, decay: 0.7, sustain: 0, sustained: false, filterHz: 3200 },
  brass: { type: "sawtooth", attack: 0.04, decay: 0.12, sustain: 0.6, sustained: true, filterHz: 2000, detuneCents: 8 },
  clarinet: { type: "square", attack: 0.03, decay: 0.1, sustain: 0.65, sustained: true, filterHz: 1400 },
  vibraphone: { type: "sine", attack: 0.002, decay: 1.4, sustain: 0, sustained: false, partialGain: 0.25, vibratoHz: 5, vibratoCents: 12 },
  accordion: { type: "sawtooth", attack: 0.05, decay: 0.08, sustain: 0.7, sustained: true, detuneCents: 12 },
  guitar: { type: "triangle", attack: 0.002, decay: 0.6, sustain: 0, sustained: false, partialGain: 0.35, filterHz: 3000 },
};

// Cria um oscilador de tom já ligado ao ganho compartilhado, com vibrato opcional.
function spawnTone(
  ctx: BaseAudioContext,
  target: AudioNode,
  spec: VoiceSpec,
  freq: number,
  detuneCents: number,
  time: number,
  stopAt: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(freq, time);
  if (detuneCents !== 0) {
    osc.detune.setValueAtTime(detuneCents, time);
  }
  if (spec.vibratoHz && spec.vibratoCents) {
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(spec.vibratoHz, time);
    const depth = ctx.createGain();
    depth.gain.value = freq * (2 ** (spec.vibratoCents / 1200) - 1);
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(stopAt);
  }
  osc.connect(target);
  osc.start(time);
  osc.stop(stopAt);
  return osc;
}

export function playMelodyNote(
  ctx: BaseAudioContext,
  out: AudioNode,
  instrument: MelodyInstrument,
  midi: number,
  time: number,
  duration: number,
): void {
  const spec = MELODY_VOICES[instrument];
  const freq = midiToFreq(midi);

  const gain = ctx.createGain();
  let tail: AudioNode = gain;
  if (spec.filterHz) {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(spec.filterHz, time);
    gain.connect(lowpass);
    tail = lowpass;
  }
  tail.connect(out);

  // Quando é que o envelope termina - todos os osciladores param aí.
  const stopAt = spec.sustained
    ? time + Math.max(duration, spec.attack + spec.decay) + RELEASE_SEC + 0.1
    : time + spec.decay + 0.02;

  spawnTone(ctx, gain, spec, freq, 0, time, stopAt);
  if (spec.detuneCents) {
    spawnTone(ctx, gain, spec, freq, spec.detuneCents, time, stopAt);
  }
  if (spec.partialGain) {
    const partialLevel = ctx.createGain();
    partialLevel.gain.value = spec.partialGain;
    partialLevel.connect(gain);
    spawnTone(ctx, partialLevel, spec, freq * 2, 0, time, stopAt);
  }

  const envelope = gain.gain;
  envelope.setValueAtTime(0, time);
  envelope.linearRampToValueAtTime(PEAK_GAIN, time + spec.attack);
  if (spec.sustained) {
    const sustainLevel = PEAK_GAIN * spec.sustain;
    const holdUntil = time + Math.max(duration, spec.attack + spec.decay);
    envelope.linearRampToValueAtTime(sustainLevel, time + spec.attack + spec.decay);
    envelope.setValueAtTime(sustainLevel, holdUntil);
    envelope.linearRampToValueAtTime(0, holdUntil + RELEASE_SEC);
  } else {
    envelope.exponentialRampToValueAtTime(NEAR_SILENCE, time + spec.decay);
  }
}

// Ruído branco curto reutilizado pela percussão (hi-hat, click).
export function makeNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Ruído determinístico (LCG) - não usa Math.random, que é proibido no repo.
  let seed = 1;
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    data[index] = (seed / 2147483648) - 1;
  }
  return buffer;
}

interface PercussionSpec {
  /** Frequência por linha: [0] agudo, [1] grave, [2] a 3ª linha (mais grave/acento). */
  rowHz: [number, number, number];
  decay: number;
  type: OscillatorType;
  noise?: boolean;
}

// As frequências de row 0 (agudo) e row 1 (grave) ficam INTOCADAS; a row 2 é nova.
const PERCUSSION_SPECS: Record<PercussionInstrument, PercussionSpec> = {
  conga: { rowHz: [360, 200, 150], decay: 0.24, type: "sine" },
  electronic: { rowHz: [880, 440, 220], decay: 0.14, type: "square" },
  blocks: { rowHz: [1300, 760, 520], decay: 0.09, type: "triangle" },
  kit: { rowHz: [320, 130, 90], decay: 0.22, type: "sine", noise: true },
};

export function playPercussionHit(
  ctx: BaseAudioContext,
  out: AudioNode,
  instrument: PercussionInstrument,
  row: number,
  time: number,
  noise: AudioBuffer,
): void {
  const spec = PERCUSSION_SPECS[instrument];
  const isHigh = row === 0;
  const startHz = spec.rowHz[row] ?? spec.rowHz[spec.rowHz.length - 1];

  // Kit agudo = hi-hat de ruído; o resto (e as linhas graves do kit) é membrana com queda.
  if (spec.noise && isHigh) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(7000, time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(PEAK_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(NEAR_SILENCE, time + 0.05);
    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(out);
    source.start(time);
    source.stop(time + 0.06);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(startHz, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(startHz * 0.5, 40), time + spec.decay);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(PEAK_GAIN, time);
  gain.gain.exponentialRampToValueAtTime(NEAR_SILENCE, time + spec.decay);
  osc.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + spec.decay + 0.02);
}
