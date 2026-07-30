// Song Maker → Standard MIDI File (formato 0, uma trilha). Bytes puros, sem
// dependência: header MThd + trilha MTrk com meta de andamento e pares
// note-on/note-off. A melodia vai no canal 1; a percussão no canal 10 (drums do
// General MIDI), com cada linha mapeada para uma peça de bateria.
import type { SongPlan } from "./plan";

const TICKS_PER_QUARTER = 480;
const MELODY_CHANNEL = 0;
const DRUM_CHANNEL = 9; // canal 10 (1-based) = percussão no General MIDI
const MELODY_VELOCITY = 96;
const DRUM_VELOCITY = 110;
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;

// Linha de percussão → nota de bateria do General MIDI (agudo→grave).
const DRUM_NOTES = [42, 38, 36]; // hi-hat fechado, caixa, bumbo

interface MidiEvent {
  tick: number;
  status: number;
  note: number;
  velocity: number;
  /** note-off ordena antes de note-on no mesmo tick. */
  order: number;
}

// Variable-length quantity: inteiro em grupos de 7 bits, MSB marca continuação.
export function variableLengthQuantity(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = Math.floor(value / 128);
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  return bytes;
}

function collectEvents(plan: SongPlan): MidiEvent[] {
  const ticksPerStep = Math.round(TICKS_PER_QUARTER / plan.subdivisions);
  const events: MidiEvent[] = [];
  const push = (tick: number, status: number, note: number, velocity: number, order: number) => {
    events.push({ tick, status, note, velocity, order });
  };
  for (let col = 0; col < plan.totalCols; col += 1) {
    const onTick = col * ticksPerStep;
    const offTick = (col + 1) * ticksPerStep;
    plan.melodyByCol[col].forEach((midi) => {
      push(onTick, NOTE_ON | MELODY_CHANNEL, midi, MELODY_VELOCITY, 1);
      push(offTick, NOTE_OFF | MELODY_CHANNEL, midi, 0, 0);
    });
    plan.percByCol[col].forEach((row) => {
      const note = DRUM_NOTES[row] ?? DRUM_NOTES[DRUM_NOTES.length - 1];
      push(onTick, NOTE_ON | DRUM_CHANNEL, note, DRUM_VELOCITY, 1);
      push(offTick, NOTE_OFF | DRUM_CHANNEL, note, 0, 0);
    });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  return events;
}

function tempoMetaBytes(tempo: number): number[] {
  const microsecondsPerQuarter = Math.round(60_000_000 / tempo);
  return [
    0x00,
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
}

function trackBytes(plan: SongPlan): number[] {
  const bytes: number[] = [...tempoMetaBytes(plan.tempo)];
  let previousTick = 0;
  collectEvents(plan).forEach((event) => {
    const delta = event.tick - previousTick;
    previousTick = event.tick;
    bytes.push(...variableLengthQuantity(delta), event.status, event.note, event.velocity);
  });
  bytes.push(0x00, 0xff, 0x2f, 0x00); // end of track
  return bytes;
}

function chunk(id: string, body: number[]): number[] {
  const length = body.length;
  return [
    ...[...id].map((char) => char.charCodeAt(0)),
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
    ...body,
  ];
}

export function songToMidiBytes(plan: SongPlan): Uint8Array<ArrayBuffer> {
  const header = [
    0x00, 0x00, // formato 0
    0x00, 0x01, // uma trilha
    (TICKS_PER_QUARTER >> 8) & 0xff,
    TICKS_PER_QUARTER & 0xff,
  ];
  return new Uint8Array([...chunk("MThd", header), ...chunk("MTrk", trackBytes(plan))]);
}
