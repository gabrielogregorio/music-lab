/**
 * Testa o KeyboardEngine DE VERDADE - o código de agendamento, de qual tecla
 * está ativa e do fim da música. Não mocka o motor: falsifica só o AudioContext
 * (que o jsdom não tem) e o requestAnimationFrame, e avança o relógio na mão.
 * Assim o loop real (lookahead, drenar cursor, finish, elapsed) roda e é medido.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareSong } from '../../../songs/library';
import { buildTimeline } from '../music/playback';
import { KeyboardEngine } from './engine';

class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

// Última instância criada pelo motor, para o teste ler currentTime e contar notas.
let lastCtx: FakeAudioContext;

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  oscillatorsStarted = 0;
  constructor() {
    lastCtx = this;
  }
  createGain() {
    return { gain: new FakeParam(), connect() {} };
  }
  createOscillator() {
    const self = this;
    return {
      type: 'sine',
      frequency: new FakeParam(),
      connect() {},
      start() {
        self.oscillatorsStarted += 1;
      },
      stop() {},
    };
  }
  createBiquadFilter() {
    return { type: 'lowpass', frequency: new FakeParam(), connect() {} };
  }
  async resume() {}
  async close() {}
}

let frameQueue: FrameRequestCallback[] = [];
function flushFrame() {
  const pending = frameQueue;
  frameQueue = [];
  pending.forEach((callback) => callback(0));
}

const originals = {
  AudioContext: (globalThis as { AudioContext?: unknown }).AudioContext,
  raf: globalThis.requestAnimationFrame,
  caf: globalThis.cancelAnimationFrame,
};

beforeEach(() => {
  frameQueue = [];
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    frameQueue.push(callback);
    return frameQueue.length;
  };
  globalThis.cancelAnimationFrame = () => {};
});

afterEach(() => {
  (globalThis as { AudioContext?: unknown }).AudioContext = originals.AudioContext;
  globalThis.requestAnimationFrame = originals.raf;
  globalThis.cancelAnimationFrame = originals.caf;
});

const TIMELINE = buildTimeline(
  prepareSong({
    id: 't',
    title: 'T',
    instrument: 'tin-whistle',
    tempo: 60, // 1 tempo = 1 s
    notes: [
      { note: 'C4', beats: 1 }, // startSec 0, soa em [0,1)
      { note: 'E4', beats: 1 }, // startSec 1, soa em [1,2)
    ],
  }),
);

describe('KeyboardEngine (motor real, AudioContext falso)', () => {
  it('elapsed é null antes de tocar e vira tempo decorrido durante', async () => {
    const engine = new KeyboardEngine();
    expect(engine.elapsed()).toBeNull();
    await engine.play(TIMELINE, 'piano', vi.fn(), vi.fn());
    lastCtx.currentTime = 0.5;
    expect(engine.elapsed()).toBeCloseTo(0.5 - 0.08); // menos o atraso inicial de início
  });

  it('reporta a tecla ativa na ordem e fecha no fim da música', async () => {
    const onActive = vi.fn();
    const onEnd = vi.fn();
    const engine = new KeyboardEngine();
    await engine.play(TIMELINE, 'piano', onActive, onEnd);

    lastCtx.currentTime = 0.1; // dentro da 1ª nota
    flushFrame();
    lastCtx.currentTime = 1.1; // dentro da 2ª nota
    flushFrame();
    lastCtx.currentTime = 2.2; // passou do fim (totalSec 2)
    flushFrame();

    expect(onActive.mock.calls.map((call) => call[0])).toEqual([0, 1, -1]);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(engine.isRunning).toBe(false);
  });

  it('agenda cada nota uma única vez, sem repetir no lookahead', async () => {
    const engine = new KeyboardEngine();
    await engine.play(TIMELINE, 'piano', vi.fn(), vi.fn());
    lastCtx.currentTime = 0.1;
    flushFrame();
    lastCtx.currentTime = 1.1;
    flushFrame();
    lastCtx.currentTime = 2.2;
    flushFrame();
    // Duas notas na música = dois osciladores disparados, nem mais nem menos.
    expect(lastCtx.oscillatorsStarted).toBe(2);
  });

  it('parar no meio interrompe o loop e não agenda mais frames', async () => {
    const onEnd = vi.fn();
    const engine = new KeyboardEngine();
    await engine.play(TIMELINE, 'piano', vi.fn(), onEnd);
    lastCtx.currentTime = 0.1;
    flushFrame();
    engine.stop();
    expect(engine.isRunning).toBe(false);
    const before = lastCtx.oscillatorsStarted;
    lastCtx.currentTime = 1.1;
    flushFrame(); // nada deve rodar: o loop parou
    expect(lastCtx.oscillatorsStarted).toBe(before);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('apertar uma tecla dispara uma nota agora', async () => {
    const engine = new KeyboardEngine();
    await engine.press('piano', 60);
    expect(lastCtx.oscillatorsStarted).toBe(1);
  });
});
