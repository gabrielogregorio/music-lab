// Song Maker → WAV. Renderiza a música num OfflineAudioContext (mesmas vozes do
// playback ao vivo, sem tocar no alto-falante) e codifica o PCM em 16 bits num
// arquivo WAV - tudo nativo, sem dependência nem encoder externo. O
// `audioBufferToWav` é puro (bytes) e testável; o render depende do
// OfflineAudioContext, que só existe no navegador.
import {
  makeNoiseBuffer,
  playMelodyNote,
  playPercussionHit,
  type MelodyInstrument,
  type PercussionInstrument,
} from "../../../audio/voices";
import type { SongPlan } from "./plan";

const SAMPLE_RATE = 44100;
const MASTER_GAIN = 0.9;
const NOTE_TAIL = 0.95;
// Cauda extra depois do último passo, para o decay das vozes longas (sino) caber.
const RELEASE_TAIL_SEC = 2.5;
const BYTES_PER_SAMPLE = 2;
const PCM_FULL_SCALE = 0x7fff;

/** Um AudioBuffer só com o que o encoder precisa - também o que o teste falsifica. */
export interface RenderedBuffer {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

export function audioBufferToWav(buffer: RenderedBuffer): Uint8Array<ArrayBuffer> {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const dataBytes = frames * channels * BYTES_PER_SAMPLE;
  const totalBytes = 44 + dataBytes;
  const output = new DataView(new ArrayBuffer(totalBytes));

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      output.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  output.setUint32(4, totalBytes - 8, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  output.setUint32(16, 16, true); // tamanho do bloco fmt
  output.setUint16(20, 1, true); // PCM
  output.setUint16(22, channels, true);
  output.setUint32(24, buffer.sampleRate, true);
  output.setUint32(28, buffer.sampleRate * channels * BYTES_PER_SAMPLE, true); // byte rate
  output.setUint16(32, channels * BYTES_PER_SAMPLE, true); // block align
  output.setUint16(34, 8 * BYTES_PER_SAMPLE, true); // bits por amostra
  writeText(36, "data");
  output.setUint32(40, dataBytes, true);

  let offset = 44;
  const data = Array.from({ length: channels }, (_unused, channel) => buffer.getChannelData(channel));
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const clamped = Math.max(-1, Math.min(1, data[channel][frame]));
      output.setInt16(offset, Math.round(clamped * PCM_FULL_SCALE), true);
      offset += BYTES_PER_SAMPLE;
    }
  }
  return new Uint8Array(output.buffer);
}

export async function renderSongToWav(
  plan: SongPlan,
  melodyInstrument: MelodyInstrument,
  percussionInstrument: PercussionInstrument,
): Promise<Uint8Array<ArrayBuffer>> {
  const durationSec = plan.totalCols * plan.stepDuration + RELEASE_TAIL_SEC;
  const frames = Math.ceil(durationSec * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(1, frames, SAMPLE_RATE);
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  const noise = makeNoiseBuffer(ctx);

  const noteDuration = plan.stepDuration * NOTE_TAIL;
  for (let col = 0; col < plan.totalCols; col += 1) {
    const time = col * plan.stepDuration;
    plan.melodyByCol[col].forEach((midi) => {
      playMelodyNote(ctx, master, melodyInstrument, midi, time, noteDuration);
    });
    plan.percByCol[col].forEach((row) => {
      playPercussionHit(ctx, master, percussionInstrument, row, time, noise);
    });
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWav(rendered);
}
