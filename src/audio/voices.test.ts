// Testa a biblioteca de vozes DE VERDADE: cada instrumento agenda pelo menos um
// oscilador sem estourar, a lista de instrumentos casa com as specs, e a
// percussão responde às três linhas. Falsifica só o AudioContext (jsdom não tem).
import { describe, expect, it } from "vitest";
import {
  MELODY_INSTRUMENTS,
  PERCUSSION_INSTRUMENTS,
  makeNoiseBuffer,
  playMelodyNote,
  playPercussionHit,
} from "./voices";

class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeCtx {
  sampleRate = 44100;
  destination = {};
  oscillatorsStarted = 0;
  createGain() {
    return { gain: new FakeParam(), connect() {} };
  }
  createOscillator() {
    const self = this;
    return {
      type: "sine" as OscillatorType,
      frequency: new FakeParam(),
      detune: new FakeParam(),
      connect() {},
      start() {
        self.oscillatorsStarted += 1;
      },
      stop() {},
    };
  }
  createBiquadFilter() {
    return { type: "lowpass" as BiquadFilterType, frequency: new FakeParam(), connect() {} };
  }
  createBufferSource() {
    const self = this;
    return {
      buffer: null,
      connect() {},
      start() {
        self.oscillatorsStarted += 1;
      },
      stop() {},
    };
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer;
  }
}

const OUT = { }; // nó de saída falso; os connect() são no-op

describe("biblioteca de vozes compartilhada", () => {
  it("expõe 16 instrumentos melódicos, todos com spec e id único", () => {
    expect(MELODY_INSTRUMENTS).toHaveLength(16);
    const ids = MELODY_INSTRUMENTS.map((instrument) => instrument.id);
    expect(new Set(ids).size).toBe(16);
  });

  it.each(MELODY_INSTRUMENTS.map((instrument) => [instrument.id] as const))(
    "%s agenda ao menos um oscilador ao tocar uma nota",
    (id) => {
      const ctx = new FakeCtx();
      playMelodyNote(ctx as unknown as BaseAudioContext, OUT as AudioNode, id, 60, 0, 0.5);
      expect(ctx.oscillatorsStarted).toBeGreaterThanOrEqual(1);
    },
  );

  it("piano continua sendo um único oscilador (voz original intocada)", () => {
    const ctx = new FakeCtx();
    playMelodyNote(ctx as unknown as BaseAudioContext, OUT as AudioNode, "piano", 60, 0, 0.5);
    expect(ctx.oscillatorsStarted).toBe(1);
  });

  it("vozes com partial de oitava disparam mais de um oscilador", () => {
    const ctx = new FakeCtx();
    playMelodyNote(ctx as unknown as BaseAudioContext, OUT as AudioNode, "bells", 72, 0, 0.5);
    expect(ctx.oscillatorsStarted).toBeGreaterThan(1);
  });

  it.each(PERCUSSION_INSTRUMENTS.map((instrument) => [instrument.id] as const))(
    "%s toca as três linhas de batida",
    (id) => {
      const ctx = new FakeCtx();
      const noise = makeNoiseBuffer(ctx as unknown as BaseAudioContext);
      [0, 1, 2].forEach((row) => {
        playPercussionHit(ctx as unknown as BaseAudioContext, OUT as AudioNode, id, row, 0, noise);
      });
      expect(ctx.oscillatorsStarted).toBeGreaterThanOrEqual(3);
    },
  );
});
