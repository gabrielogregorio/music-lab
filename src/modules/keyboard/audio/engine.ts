/**
 * Motor de áudio do Teclado. Toca uma tecla solta (clique) e toca uma música
 * inteira agendando as notas no relógio de amostras via scheduler de lookahead
 * (Chris Wilson), com o cursor visual saindo do tempo decorrido no rAF. As
 * vozes são as mesmas do Song Maker (`playMelodyNote`) - nada de sample externo,
 * que a CSP do Pages barraria. É um sistema externo (AudioContext + rAF)
 * encapsulado numa classe; o componente o dirige por handlers, sem efeito.
 */
import { playMelodyNote, type MelodyInstrument } from '../../../audio/voices';
import { noteIndexAt, type Timeline } from '../music/playback';

const LOOKAHEAD_SEC = 0.1;
const START_DELAY_SEC = 0.08;
const MASTER_GAIN = 0.9;
const PRESS_DURATION_SEC = 0.6;
const NOTE_TAIL = 0.95;
const NO_INDEX = -1;

export class KeyboardEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rafId = 0;
  private running = false;
  private startTime = 0;
  private pointer = 0;
  private timeline: Timeline | null = null;
  private instrument: MelodyInstrument = 'piano';
  private onActive: ((index: number) => void) | null = null;
  private onEnd: (() => void) | null = null;
  private lastActive = NO_INDEX;

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Segundos decorridos desde o início da música (pode ser negativo durante o
   * pequeno atraso inicial), ou null quando não está tocando. É o relógio
   * contínuo que a chuva de notas lê para posicionar cada peça.
   */
  elapsed(): number | null {
    if (!this.running || !this.ctx) {
      return null;
    }
    return this.ctx.currentTime - this.startTime;
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    return this.ctx;
  }

  /** Toca uma nota agora - o retorno sonoro de apertar a tecla. */
  async press(instrument: MelodyInstrument, midi: number): Promise<void> {
    const ctx = await this.ensureContext();
    playMelodyNote(ctx, this.master!, instrument, midi, ctx.currentTime + 0.001, PRESS_DURATION_SEC);
  }

  async play(
    timeline: Timeline,
    instrument: MelodyInstrument,
    onActive: (index: number) => void,
    onEnd: () => void,
  ): Promise<void> {
    await this.ensureContext();
    this.stop();
    this.timeline = timeline;
    this.instrument = instrument;
    this.onActive = onActive;
    this.onEnd = onEnd;
    this.pointer = 0;
    this.lastActive = NO_INDEX;
    this.running = true;
    this.startTime = this.ctx!.currentTime + START_DELAY_SEC;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.lastActive !== NO_INDEX) {
      this.lastActive = NO_INDEX;
      this.onActive?.(NO_INDEX);
    }
  }

  dispose(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  private tick = (): void => {
    if (!this.running || !this.ctx || !this.master || !this.timeline) {
      return;
    }
    const elapsed = this.ctx.currentTime - this.startTime;
    const notes = this.timeline.notes;

    while (this.pointer < notes.length && notes[this.pointer].startSec < elapsed + LOOKAHEAD_SEC) {
      const note = notes[this.pointer];
      if (note.midi != null) {
        const at = this.startTime + note.startSec;
        playMelodyNote(this.ctx, this.master, this.instrument, note.midi, at, note.durSec * NOTE_TAIL);
      }
      this.pointer += 1;
    }

    const active = noteIndexAt(this.timeline, elapsed);
    if (active !== this.lastActive) {
      this.lastActive = active;
      this.onActive?.(active);
    }

    if (elapsed >= this.timeline.totalSec) {
      this.finish();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private finish(): void {
    this.running = false;
    this.rafId = 0;
    // O tick deste frame já pode ter reportado -1 ao cruzar o fim; só reporta de
    // novo se a última tecla ativa ainda não era "nenhuma" (evita -1 duplicado).
    if (this.lastActive !== NO_INDEX) {
      this.lastActive = NO_INDEX;
      this.onActive?.(NO_INDEX);
    }
    this.onEnd?.();
  }
}
