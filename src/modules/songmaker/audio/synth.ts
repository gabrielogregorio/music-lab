// Vozes Web Audio do Song Maker. Cada instrumento melódico é um oscilador com
// envelope; a percussão são batidas (osc com queda de altura ou ruído filtrado).
// Sem samples externos - CSP do Pages não deixaria carregar mesmo.
import { midiToFreq } from "../music/scale";

export type MelodyInstrument = "marimba" | "piano" | "strings" | "woodwind" | "synth" | "flute";
export type PercussionInstrument = "conga" | "electronic" | "blocks" | "kit";

export const MELODY_INSTRUMENTS: { id: MelodyInstrument; label: string }[] = [
  { id: "marimba", label: "Marimba" },
  { id: "piano", label: "Piano" },
  { id: "strings", label: "Strings" },
  { id: "woodwind", label: "Woodwind" },
  { id: "synth", label: "Synth" },
  { id: "flute", label: "Flute" },
];

export const PERCUSSION_INSTRUMENTS: { id: PercussionInstrument; label: string }[] = [
  { id: "conga", label: "Conga" },
  { id: "electronic", label: "Electronic" },
  { id: "blocks", label: "Blocks" },
  { id: "kit", label: "Kit" },
];

interface VoiceSpec {
  type: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  sustained: boolean;
  filterHz?: number;
}

const PEAK_GAIN = 0.22;
const NEAR_SILENCE = 0.0001;

const MELODY_VOICES: Record<MelodyInstrument, VoiceSpec> = {
  marimba: { type: "triangle", attack: 0.002, decay: 0.4, sustain: 0, sustained: false },
  piano: { type: "triangle", attack: 0.002, decay: 1.1, sustain: 0, sustained: false },
  strings: { type: "sawtooth", attack: 0.06, decay: 0.1, sustain: 0.5, sustained: true, filterHz: 2600 },
  woodwind: { type: "sine", attack: 0.03, decay: 0.08, sustain: 0.6, sustained: true },
  synth: { type: "square", attack: 0.005, decay: 0.08, sustain: 0.45, sustained: true, filterHz: 1800 },
  flute: { type: "sine", attack: 0.05, decay: 0.08, sustain: 0.7, sustained: true },
};

export function playMelodyNote(
  ctx: AudioContext,
  out: AudioNode,
  instrument: MelodyInstrument,
  midi: number,
  time: number,
  duration: number,
): void {
  const spec = MELODY_VOICES[instrument];
  const osc = ctx.createOscillator();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(midiToFreq(midi), time);

  const gain = ctx.createGain();
  osc.connect(gain);
  let tail: AudioNode = gain;
  if (spec.filterHz) {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(spec.filterHz, time);
    gain.connect(lowpass);
    tail = lowpass;
  }
  tail.connect(out);

  const envelope = gain.gain;
  envelope.setValueAtTime(0, time);
  envelope.linearRampToValueAtTime(PEAK_GAIN, time + spec.attack);

  if (spec.sustained) {
    const sustainLevel = PEAK_GAIN * spec.sustain;
    const holdUntil = time + Math.max(duration, spec.attack + spec.decay);
    envelope.linearRampToValueAtTime(sustainLevel, time + spec.attack + spec.decay);
    envelope.setValueAtTime(sustainLevel, holdUntil);
    envelope.linearRampToValueAtTime(0, holdUntil + 0.06);
    osc.start(time);
    osc.stop(holdUntil + 0.1);
  } else {
    envelope.exponentialRampToValueAtTime(NEAR_SILENCE, time + spec.decay);
    osc.start(time);
    osc.stop(time + spec.decay + 0.02);
  }
}

// Ruído branco curto reutilizado pela percussão (hi-hat, click).
export function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
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
  hi: number;
  lo: number;
  decay: number;
  type: OscillatorType;
  noise?: boolean;
}

// row 0 = som agudo, row 1 = som grave.
const PERCUSSION_SPECS: Record<PercussionInstrument, PercussionSpec> = {
  conga: { hi: 360, lo: 200, decay: 0.24, type: "sine" },
  electronic: { hi: 880, lo: 440, decay: 0.14, type: "square" },
  blocks: { hi: 1300, lo: 760, decay: 0.09, type: "triangle" },
  kit: { hi: 320, lo: 130, decay: 0.22, type: "sine", noise: true },
};

export function playPercussionHit(
  ctx: AudioContext,
  out: AudioNode,
  instrument: PercussionInstrument,
  row: number,
  time: number,
  noise: AudioBuffer,
): void {
  const spec = PERCUSSION_SPECS[instrument];
  const isHigh = row === 0;
  const startHz = isHigh ? spec.hi : spec.lo;

  // Kit agudo = hi-hat de ruído; o resto (e o kit grave) é membrana com queda.
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
