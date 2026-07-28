// Transporte do Song Maker: scheduler de lookahead (Chris Wilson) agendando os
// passos no relógio de amostras, com uma fila drenada no rAF para o cursor visual
// bater com o som. É um sistema externo (AudioContext + rAF) encapsulado numa
// classe; o componente a controla por handlers, sem efeito reativo.
import {
  playMelodyNote,
  playPercussionHit,
  makeNoiseBuffer,
  type MelodyInstrument,
  type PercussionInstrument,
} from "./synth";

export interface EngineSnapshot {
  totalCols: number;
  stepDuration: number;
  melodyInstrument: MelodyInstrument;
  percussionInstrument: PercussionInstrument;
  /** MIDIs ativos da melodia na coluna. */
  melodyMidis(col: number): number[];
  /** Linhas de percussão ativas (0 agudo, 1 grave) na coluna. */
  percussionRows(col: number): number[];
}

const LOOKAHEAD_SEC = 0.12;
const START_DELAY_SEC = 0.06;
const NO_COLUMN = -1;

export class SongEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private rafId = 0;
  private running = false;
  private nextStepTime = 0;
  private step = 0;
  private queue: { step: number; time: number }[] = [];
  private getSnapshot: (() => EngineSnapshot) | null = null;
  private onStep: ((col: number) => void) | null = null;

  get isRunning(): boolean {
    return this.running;
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.noise = makeNoiseBuffer(this.ctx);
    }
    await this.ctx.resume();
    return this.ctx;
  }

  // Toca uma nota agora, para o retorno sonoro ao clicar numa célula parada.
  async previewMelody(instrument: MelodyInstrument, midi: number): Promise<void> {
    const ctx = await this.ensureContext();
    playMelodyNote(ctx, this.master!, instrument, midi, ctx.currentTime + 0.001, 0.3);
  }

  async previewPercussion(instrument: PercussionInstrument, row: number): Promise<void> {
    const ctx = await this.ensureContext();
    playPercussionHit(ctx, this.master!, instrument, row, ctx.currentTime + 0.001, this.noise!);
  }

  async start(getSnapshot: () => EngineSnapshot, onStep: (col: number) => void): Promise<void> {
    this.getSnapshot = getSnapshot;
    this.onStep = onStep;
    const ctx = await this.ensureContext();
    this.running = true;
    this.step = 0;
    this.queue = [];
    this.nextStepTime = ctx.currentTime + START_DELAY_SEC;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.queue = [];
    this.onStep?.(NO_COLUMN);
  }

  dispose(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noise = null;
  }

  private tick = (): void => {
    if (!this.running || !this.ctx || !this.getSnapshot) {
      return;
    }
    const snapshot = this.getSnapshot();
    const now = this.ctx.currentTime;

    while (this.nextStepTime < now + LOOKAHEAD_SEC) {
      this.scheduleStep(snapshot, this.step, this.nextStepTime);
      this.queue.push({ step: this.step, time: this.nextStepTime });
      this.nextStepTime += snapshot.stepDuration;
      this.step = (this.step + 1) % Math.max(1, snapshot.totalCols);
    }

    while (this.queue.length > 0 && this.queue[0].time <= now) {
      const drained = this.queue.shift();
      if (drained) {
        this.onStep?.(drained.step);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private scheduleStep(snapshot: EngineSnapshot, col: number, time: number): void {
    if (!this.ctx || !this.master || !this.noise) {
      return;
    }
    const noteDuration = snapshot.stepDuration * 0.95;
    snapshot.melodyMidis(col).forEach((midi) => {
      playMelodyNote(this.ctx!, this.master!, snapshot.melodyInstrument, midi, time, noteDuration);
    });
    snapshot.percussionRows(col).forEach((row) => {
      playPercussionHit(this.ctx!, this.master!, snapshot.percussionInstrument, row, time, this.noise!);
    });
  }
}
