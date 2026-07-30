// Testa a exportação onde ela é pura: o plano da grade, os bytes do MIDI e o
// encoder de WAV. O render em si (OfflineAudioContext) é do navegador e não roda
// no jsdom - mas o encoder que ele alimenta é testado direto.
import { describe, expect, it } from "vitest";
import { buildSongPlan } from "./plan";
import { songToMidiBytes, variableLengthQuantity } from "./midi";
import { audioBufferToWav, type RenderedBuffer } from "./wav";
import { cellKey } from "../music/song";
import type { Pitch } from "../music/scale";

const PITCHES: Pitch[] = [
  { midi: 60, degreeIndex: 0 },
  { midi: 62, degreeIndex: 1 },
  { midi: 64, degreeIndex: 2 },
];

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

describe("plano da música", () => {
  it("lista os MIDIs de melodia e as linhas de percussão por coluna", () => {
    const melody = new Set([cellKey(0, 0), cellKey(1, 2)]);
    const percussion = new Set([cellKey(0, 1)]);
    const plan = buildSongPlan(melody, percussion, PITCHES, 2, 2, 120);
    expect(plan.melodyByCol[0]).toEqual([60]);
    expect(plan.melodyByCol[1]).toEqual([64]);
    expect(plan.percByCol[0]).toEqual([1]);
    expect(plan.stepDuration).toBeCloseTo(60 / 120 / 2);
  });
});

describe("variableLengthQuantity", () => {
  it("mantém valores pequenos em um byte", () => {
    expect(variableLengthQuantity(0)).toEqual([0x00]);
    expect(variableLengthQuantity(127)).toEqual([0x7f]);
  });

  it("quebra 128 em dois bytes com o MSB de continuação", () => {
    expect(variableLengthQuantity(128)).toEqual([0x81, 0x00]);
    expect(variableLengthQuantity(480)).toEqual([0x83, 0x60]);
  });
});

describe("songToMidiBytes", () => {
  const melody = new Set([cellKey(0, 0)]);
  const percussion = new Set([cellKey(0, 1)]);
  const plan = buildSongPlan(melody, percussion, PITCHES, 2, 1, 120);
  const bytes = songToMidiBytes(plan);

  it("começa com um header MThd de formato 0 e uma trilha", () => {
    expect(ascii(bytes, 0, 4)).toBe("MThd");
    expect(bytes[7]).toBe(6); // tamanho do corpo do header
    expect((bytes[8] << 8) | bytes[9]).toBe(0); // formato 0
    expect((bytes[10] << 8) | bytes[11]).toBe(1); // uma trilha
    expect((bytes[12] << 8) | bytes[13]).toBe(480); // ticks por semínima
  });

  it("traz uma trilha MTrk com a melodia no canal 1 e a percussão no canal 10", () => {
    const trackStart = 14; // MThd = 4 (id) + 4 (tamanho) + 6 (corpo)
    expect(ascii(bytes, trackStart, 4)).toBe("MTrk");
    // Note-on da melodia (0x90) e da percussão (0x99) aparecem na trilha.
    expect([...bytes]).toContain(0x90);
    expect([...bytes]).toContain(0x99);
    // A nota 60 (Dó central) da melodia está lá.
    expect([...bytes]).toContain(60);
  });

  it("codifica o andamento como microssegundos por semínima", () => {
    // 120 bpm = 500000 us/semínima = 0x07A120, logo após o delta 0 e o meta FF 51 03.
    const metaIndex = [...bytes].findIndex(
      (byte, index) => byte === 0xff && bytes[index + 1] === 0x51 && bytes[index + 2] === 0x03,
    );
    expect(metaIndex).toBeGreaterThan(0);
    const value = (bytes[metaIndex + 3] << 16) | (bytes[metaIndex + 4] << 8) | bytes[metaIndex + 5];
    expect(value).toBe(500000);
  });
});

describe("audioBufferToWav", () => {
  const buffer: RenderedBuffer = {
    numberOfChannels: 1,
    sampleRate: 44100,
    length: 4,
    getChannelData: () => new Float32Array([0, 1, -1, 0.5]),
  };
  const wav = audioBufferToWav(buffer);

  it("escreve um cabeçalho RIFF/WAVE de PCM 16 bits", () => {
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    const view = new DataView(wav.buffer);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // canais
    expect(view.getUint32(24, true)).toBe(44100); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits por amostra
  });

  it("tem 44 bytes de cabeçalho mais 2 por amostra e satura o clipping", () => {
    expect(wav.length).toBe(44 + 4 * 2);
    const view = new DataView(wav.buffer);
    expect(view.getInt16(44, true)).toBe(0); // amostra 0
    expect(view.getInt16(46, true)).toBe(0x7fff); // 1.0 satura no máximo
    expect(view.getInt16(48, true)).toBe(-0x7fff); // -1.0 no mínimo
  });
});
