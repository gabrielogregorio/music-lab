import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMic } from './useMic';

/** Frames pendentes: o loop de áudio só anda quando este teste manda. */
let pendingFrames: FrameRequestCallback[] = [];

function runFrame() {
  const frames = pendingFrames;
  pendingFrames = [];
  frames.forEach((frame) => frame(0));
}

const trackStop = vi.fn();
const contextClose = vi.fn();
let readCount = 0;

class FakeAudioContext {
  sampleRate = 48000;

  createMediaStreamSource() {
    return { connect: () => {} };
  }

  createAnalyser() {
    return {
      fftSize: 0,
      getFloatTimeDomainData: (buffer: Float32Array) => {
        readCount += 1;
        buffer.fill(0);
      },
    };
  }

  close() {
    contextClose();
    return Promise.resolve();
  }
}

beforeEach(() => {
  pendingFrames = [];
  readCount = 0;
  trackStop.mockClear();
  contextClose.mockClear();
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
    pendingFrames.push(frame);
    return pendingFrames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: trackStop }] }) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMic', () => {
  it('para as tracks do microfone ao parar - é o que apaga o aviso de captura', async () => {
    const { result } = renderHook(() => useMic());
    await act(async () => {
      await result.current.start();
    });
    expect(trackStop).not.toHaveBeenCalled();

    act(() => result.current.stop());
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(contextClose).toHaveBeenCalledTimes(1);
  });

  it('parar de dentro de um frame encerra o loop em vez de agendar o próximo', async () => {
    const { result } = renderHook(() => useMic());
    await act(async () => {
      await result.current.start();
    });

    // O motor de prática para a captura quando a música acaba - e isso acontece
    // DENTRO do frame de áudio.
    act(() => {
      result.current.onFrame(() => result.current.stop());
    });
    act(() => runFrame());

    // O frame não pode terminar de escrever DEPOIS do stop: se escrever, a tela
    // volta a dizer "captando" com o microfone já solto.
    expect(result.current.state.active).toBe(false);

    const readsBefore = readCount;
    act(() => runFrame());
    expect(readCount).toBe(readsBefore);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it('frame já agendado não lê áudio depois do stop', async () => {
    const { result } = renderHook(() => useMic());
    await act(async () => {
      await result.current.start();
    });
    // `start` já deixou o próximo frame agendado. Se o cancelamento não pegar (o
    // frame já entrou na fila do navegador), quem tem de barrar é o próprio loop.
    act(() => result.current.stop());
    const readsBefore = readCount;
    act(() => runFrame());
    expect(readCount).toBe(readsBefore);
  });

  it('parar duas vezes não solta as tracks duas vezes', async () => {
    const { result } = renderHook(() => useMic());
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.stop());
    act(() => result.current.stop());
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it('depois de parar, dá para captar de novo', async () => {
    const { result } = renderHook(() => useMic());
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.stop());
    await act(async () => {
      await result.current.start();
    });
    const readsBefore = readCount;
    act(() => runFrame());
    expect(readCount).toBeGreaterThan(readsBefore);
  });
});
