/**
 * Leitor RÍTMICO de ABC: transforma o corpo de um tune na sequência linear de
 * eventos (notas e pausas) com duração, repetições já abertas.
 *
 * Por que não reusar o `abcParser`: aquele existe para casar 1-a-1 com os
 * noteheads que o abcjs desenha no Conversor - por isso descarta durações e
 * pula pausas. O Treino precisa exatamente do que ele joga fora. Os dois leem a
 * mesma língua (ABC), que é o formato comum dos dois modos: a mesma fonte
 * alimenta a partitura e a tablatura de 6 furos.
 */
import type { Letter } from "./pitch";
import { parseKey } from "./keys";

export interface AbcPitch {
  letter: Letter;
  /** Oitava científica: o `C` maiúsculo do ABC é C4 (dó central). */
  octave: number;
  /** Semitons de alteração já resolvidos (armadura + acidentes de compasso). */
  accidental: number;
}

export interface AbcEvent {
  /** null = pausa. */
  pitch: AbcPitch | null;
  /** Duração em tempos, com a semínima valendo 1. */
  beats: number;
}

export interface AbcTune {
  title: string;
  timeSignature: [number, number] | null;
  tempoBpm: number | null;
  events: AbcEvent[];
}

// A unidade `L:` vira tempos multiplicando por isto (semínima = 1 tempo).
const BEATS_PER_WHOLE = 4;
// Compasso "curto" (< 3/4) usa 1/16 como unidade padrão; o resto usa 1/8.
const SHORT_METER_THRESHOLD = 0.75;
const DEFAULT_UNIT_SHORT = 1 / 16;
const DEFAULT_UNIT_LONG = 1 / 8;
const DEFAULT_METER: [number, number] = [4, 4];
// Trava contra ABC malformado que faria a expansão de repetições girar sem fim.
const MAX_EVENTS = 4000;
// Quanto `>` transfere: `a>b` deixa a com 1,5x e b com 0,5x (e `>>` dobra a
// aposta: 1,75x e 0,25x).
const BROKEN_SHORT = 0.5;
// Quiálteras sem `:q`: quantas notas cabem no tempo de quantas.
const TUPLET_DEFAULT_IN_TIME_OF: Record<number, number> = {
  2: 3,
  3: 2,
  4: 3,
  5: 2,
  6: 2,
  7: 2,
  8: 3,
  9: 2,
};

const HEADER_RE = /^([A-Za-z]):\s?(.*)$/;
const INLINE_FIELD_RE = /^\[([A-Za-z]):([^\]]{0,120})\]/;
const METER_RE = /^(\d{1,3})\/(\d{1,3})$/;
const TEMPO_NUMBER_RE = /(\d{1,3})\s*$/;
const LETTER_RE = /[A-Ga-g]/;
const DIGIT_RE = /[0-9]/;
const BAR_GLYPH_RE = /[|:[\]]/;
const VOLTA_RE = /[0-9,\-]/;
const REST_RE = /[zxZX]/;
const ACC_DELTA: Record<string, number> = { "^": 1, _: -1, "=": 0 };
const STEP_OF_LETTER: Record<Letter, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Nota/pausa lida do corpo, ainda em unidades de `L:`. */
export interface NoteItem {
  kind: "event";
  pitch: AbcPitch | null;
  units: number;
  /** Ligadura de valor: soma com a próxima nota de mesma altura. */
  tied: boolean;
}

/** Barra de compasso, com o que ela significa para as repetições. */
export interface BarItem {
  kind: "bar";
  repeatStart: boolean;
  repeatEnd: boolean;
  /** Números do colchete de final alternativo (`|1`, `:|2`, `[1,3`). */
  volta: number[] | null;
}

export type Item = NoteItem | BarItem;

function splitHeaderAndBody(abc: string): { headers: Record<string, string>; body: string } {
  const headers: Record<string, string> = {};
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of abc.split(/\r?\n/)) {
    if (!inBody) {
      const match = line.match(HEADER_RE);
      if (match) {
        headers[match[1]] = match[2].trim();
        if (match[1] === "K") inBody = true;
        continue;
      }
      if (line.trim() === "") continue;
      inBody = true;
    }
    bodyLines.push(line);
  }

  return { headers, body: bodyLines.join("\n") };
}

/** `M:` para numerador/denominador. Aceita os apelidos `C` e `C|`. */
export function parseMeter(field: string): [number, number] | null {
  const text = field.trim();
  if (text === "C") return [4, 4];
  if (text === "C|") return [2, 2];
  const match = METER_RE.exec(text);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!numerator || !denominator) return null;
  return [numerator, denominator];
}

/** Unidade de duração (`L:`). Sem campo, deriva do compasso, como manda o ABC. */
export function parseUnitLength(field: string | undefined, meter: [number, number] | null): number {
  const match = field ? METER_RE.exec(field.trim()) : null;
  if (match && Number(match[1]) && Number(match[2])) return Number(match[1]) / Number(match[2]);
  const meterValue = meter ? meter[0] / meter[1] : 1;
  return meterValue < SHORT_METER_THRESHOLD ? DEFAULT_UNIT_SHORT : DEFAULT_UNIT_LONG;
}

/** `Q:` para BPM. Aceita "120", "1/4=120" e "C=120" - só o número final importa. */
export function parseTempo(field: string | undefined): number | null {
  if (!field) return null;
  const match = TEMPO_NUMBER_RE.exec(field.trim());
  if (!match) return null;
  const bpm = Number(match[1]);
  return bpm > 0 ? bpm : null;
}

/** Percorre o corpo do tune e devolve notas, pausas e barras na ordem escrita. */
function readItems(body: string, keyAccidentals: Record<Letter, number>): Item[] {
  const items: Item[] = [];
  let barAccidentals: Partial<Record<Letter, number>> = {};
  let cursor = 0;
  const length = body.length;

  // Quiáltera em curso: quantas notas ainda escalar e por qual fator.
  let tupletRemaining = 0;
  let tupletFactor = 1;
  // Ritmo pontuado (`>`/`<`) pendente, esperando a próxima nota.
  let pendingBrokenFactor = 0;

  // Ligadura de valor atravessa barra de compasso (`D6-|D2`), então as barras
  // são puladas na busca pela nota anterior.
  const lastNote = (): NoteItem | null => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item.kind === "event") return item;
    }
    return null;
  };

  const readDuration = (): number => {
    let numerator = "";
    while (cursor < length && DIGIT_RE.test(body[cursor])) {
      numerator += body[cursor];
      cursor += 1;
    }
    let denominator = 1;
    if (body[cursor] === "/") {
      let slashes = 0;
      while (body[cursor] === "/") {
        slashes += 1;
        cursor += 1;
      }
      let written = "";
      while (cursor < length && DIGIT_RE.test(body[cursor])) {
        written += body[cursor];
        cursor += 1;
      }
      denominator = written ? Number(written) : Math.pow(2, slashes);
    }
    const multiplier = numerator ? Number(numerator) : 1;
    return denominator > 0 ? multiplier / denominator : multiplier;
  };

  const applyPendingModifiers = (item: NoteItem): void => {
    if (tupletRemaining > 0) {
      item.units *= tupletFactor;
      tupletRemaining -= 1;
    }
    if (pendingBrokenFactor !== 0) {
      item.units *= pendingBrokenFactor;
      pendingBrokenFactor = 0;
    }
  };

  /** Lê a altura de uma nota (sem duração). Devolve null se não houver letra. */
  const readPitch = (): AbcPitch | null => {
    let accidental = 0;
    let hasExplicit = false;
    while (cursor < length && (body[cursor] === "^" || body[cursor] === "_" || body[cursor] === "=")) {
      accidental += ACC_DELTA[body[cursor]];
      hasExplicit = true;
      cursor += 1;
    }
    const char = body[cursor];
    if (!char || !LETTER_RE.test(char)) {
      cursor += 1;
      return null;
    }
    const isUpper = char === char.toUpperCase();
    const letter = char.toUpperCase() as Letter;
    cursor += 1;

    let octave = isUpper ? 4 : 5;
    while (cursor < length && (body[cursor] === "'" || body[cursor] === ",")) {
      octave += body[cursor] === "'" ? 1 : -1;
      cursor += 1;
    }

    let effective: number;
    if (hasExplicit) {
      effective = accidental;
      barAccidentals[letter] = accidental;
    } else if (letter in barAccidentals) {
      effective = barAccidentals[letter]!;
    } else {
      effective = keyAccidentals[letter];
    }
    return { letter, octave, accidental: effective };
  };

  const readNote = (): void => {
    const pitch = readPitch();
    if (!pitch) return;
    const item: NoteItem = { kind: "event", pitch, units: readDuration(), tied: false };
    applyPendingModifiers(item);
    items.push(item);
  };

  /** Acorde `[CEG]`: o abcjs desenha um bloco só, então guardamos a nota do topo. */
  const readChord = (): void => {
    cursor += 1;
    const pitches: AbcPitch[] = [];
    let innerUnits = 1;
    let first = true;
    while (cursor < length && body[cursor] !== "]") {
      if (body[cursor] === "^" || body[cursor] === "_" || body[cursor] === "=" || LETTER_RE.test(body[cursor])) {
        const pitch = readPitch();
        const units = readDuration();
        if (pitch) {
          pitches.push(pitch);
          if (first) {
            innerUnits = units;
            first = false;
          }
        }
      } else {
        cursor += 1;
      }
    }
    cursor += 1;
    const outerUnits = readDuration();
    if (!pitches.length) return;
    let top = pitches[0];
    for (const pitch of pitches) {
      if (pitchHeight(pitch) > pitchHeight(top)) top = pitch;
    }
    const item: NoteItem = {
      kind: "event",
      pitch: top,
      units: outerUnits === 1 ? innerUnits : outerUnits * innerUnits,
      tied: false,
    };
    applyPendingModifiers(item);
    items.push(item);
  };

  const readRest = (): void => {
    cursor += 1;
    const item: NoteItem = { kind: "event", pitch: null, units: readDuration(), tied: false };
    applyPendingModifiers(item);
    items.push(item);
  };

  const readBar = (): void => {
    let token = "";
    while (cursor < length && BAR_GLYPH_RE.test(body[cursor])) {
      token += body[cursor];
      cursor += 1;
    }
    let voltaText = "";
    while (cursor < length && VOLTA_RE.test(body[cursor])) {
      voltaText += body[cursor];
      cursor += 1;
    }
    barAccidentals = {};
    items.push({
      kind: "bar",
      repeatStart: token.endsWith(":") || token.includes("|:"),
      repeatEnd: token.startsWith(":") || token.includes(":|"),
      volta: parseVolta(voltaText),
    });
  };

  const readTuplet = (): void => {
    cursor += 1;
    let notesInTuplet = "";
    while (cursor < length && DIGIT_RE.test(body[cursor])) {
      notesInTuplet += body[cursor];
      cursor += 1;
    }
    if (!notesInTuplet) return; // era só um parêntese de ligadura
    const count = Number(notesInTuplet);
    let inTimeOf = TUPLET_DEFAULT_IN_TIME_OF[count] ?? 2;
    let span = count;
    if (body[cursor] === ":") {
      cursor += 1;
      let written = "";
      while (cursor < length && DIGIT_RE.test(body[cursor])) {
        written += body[cursor];
        cursor += 1;
      }
      if (written) inTimeOf = Number(written);
      if (body[cursor] === ":") {
        cursor += 1;
        let spanText = "";
        while (cursor < length && DIGIT_RE.test(body[cursor])) {
          spanText += body[cursor];
          cursor += 1;
        }
        if (spanText) span = Number(spanText);
      }
    }
    tupletRemaining = span;
    tupletFactor = inTimeOf / count;
  };

  const skipBalanced = (open: string, close: string): void => {
    let depth = 0;
    while (cursor < length) {
      if (body[cursor] === open) depth += 1;
      else if (body[cursor] === close) {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          return;
        }
      }
      cursor += 1;
    }
  };

  const skipUntil = (close: string): void => {
    cursor += 1;
    while (cursor < length && body[cursor] !== close && body[cursor] !== "\n") cursor += 1;
    cursor += 1;
  };

  while (cursor < length) {
    const char = body[cursor];

    if (char === "\n" || char === " " || char === "\t") {
      cursor += 1;
      continue;
    }
    if (char === "%") {
      while (cursor < length && body[cursor] !== "\n") cursor += 1;
      continue;
    }
    // Apojaturas não entram na sequência de prática (nem no desenho do abcjs).
    if (char === "{") {
      skipBalanced("{", "}");
      continue;
    }
    // Cifra ou anotação entre aspas.
    if (char === '"') {
      skipUntil('"');
      continue;
    }
    // Decoração longa (!trill!, +staccato+).
    if (char === "!" || char === "+") {
      skipUntil(char);
      continue;
    }
    if (char === "[") {
      const inline = body.slice(cursor).match(INLINE_FIELD_RE);
      if (inline) {
        if (inline[1] === "K") Object.assign(keyAccidentals, parseKey(inline[2]).accidentals);
        cursor += inline[0].length;
        continue;
      }
      const next = body[cursor + 1];
      if (next === "|" || DIGIT_RE.test(next ?? "")) {
        readBar();
        continue;
      }
      readChord();
      continue;
    }
    if (char === "|" || char === ":") {
      readBar();
      continue;
    }
    if (char === "(") {
      readTuplet();
      continue;
    }
    if (char === ">" || char === "<") {
      let count = 0;
      while (cursor < length && body[cursor] === char) {
        count += 1;
        cursor += 1;
      }
      const longFactor = 2 - Math.pow(BROKEN_SHORT, count);
      const shortFactor = Math.pow(BROKEN_SHORT, count);
      const previous = lastNote();
      if (previous) previous.units *= char === ">" ? longFactor : shortFactor;
      pendingBrokenFactor = char === ">" ? shortFactor : longFactor;
      continue;
    }
    if (char === "-") {
      const previous = lastNote();
      if (previous) previous.tied = true;
      cursor += 1;
      continue;
    }
    if (char === ")" || char === "~" || char === "." || char === "y" || char === "*" || char === "$") {
      cursor += 1;
      continue;
    }
    if (REST_RE.test(char)) {
      readRest();
      continue;
    }
    if (char === "^" || char === "_" || char === "=" || LETTER_RE.test(char)) {
      readNote();
      continue;
    }
    cursor += 1;
  }

  return items;
}

function parseVolta(text: string): number[] | null {
  if (!text) return null;
  const numbers = text
    .split(",")
    .flatMap((part) => {
      const range = part.split("-").map((piece) => Number(piece));
      if (range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
        const list: number[] = [];
        for (let value = range[0]; value <= range[1]; value += 1) list.push(value);
        return list;
      }
      return [Number(part)];
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  return numbers.length ? numbers : null;
}

/** Altura relativa só para escolher o topo de um acorde (não é MIDI real). */
function pitchHeight(pitch: AbcPitch): number {
  return pitch.octave * 12 + STEP_OF_LETTER[pitch.letter] * 2 + pitch.accidental;
}

/**
 * Abre as repetições: `|: :|` toca duas vezes e `|1 ... :|2 ...` escolhe o
 * final certo em cada passada. É o que transforma 8 compassos escritos na
 * sequência inteira que o Treino percorre.
 */
export function expandRepeats(items: Item[]): NoteItem[] {
  const output: NoteItem[] = [];
  let cursor = 0;
  let sectionStart = 0;
  let pass = 1;

  while (cursor < items.length && output.length < MAX_EVENTS) {
    const item = items[cursor];
    if (item.kind === "event") {
      output.push({ ...item });
      cursor += 1;
      continue;
    }
    // A ordem importa: `:|2` é uma barra só que FECHA a repetição (olhando para
    // trás) e ABRE o segundo final (olhando para frente). Fechar primeiro.
    if (item.repeatEnd && pass === 1) {
      pass = 2;
      cursor = sectionStart;
      continue;
    }
    if (item.repeatEnd) {
      pass = 1;
      sectionStart = cursor + 1;
    }
    if (item.repeatStart) {
      sectionStart = cursor + 1;
      pass = 1;
    }
    if (item.volta && !item.volta.includes(pass)) {
      let ahead = cursor + 1;
      while (ahead < items.length) {
        const candidate = items[ahead];
        if (candidate.kind === "bar" && candidate.volta?.includes(pass)) break;
        ahead += 1;
      }
      cursor = ahead + 1;
      continue;
    }
    cursor += 1;
  }

  return output;
}

/** Junta notas ligadas (`-`) numa só, somando as durações. */
function mergeTies(notes: NoteItem[]): NoteItem[] {
  const merged: NoteItem[] = [];
  for (const note of notes) {
    const previous = merged[merged.length - 1];
    if (previous?.tied && samePitch(previous.pitch, note.pitch)) {
      previous.units += note.units;
      previous.tied = note.tied;
      continue;
    }
    merged.push({ ...note });
  }
  return merged;
}

function samePitch(a: AbcPitch | null, b: AbcPitch | null): boolean {
  if (!a || !b) return false;
  return a.letter === b.letter && a.octave === b.octave && a.accidental === b.accidental;
}

/** Lê um tune ABC completo e devolve a sequência tocável, já com durações. */
export function readAbcTune(abc: string): AbcTune {
  const { headers, body } = splitHeaderAndBody(abc);
  const key = parseKey(headers.K ?? "");
  const timeSignature = parseMeter(headers.M ?? "");
  const unitLength = parseUnitLength(headers.L, timeSignature);
  const notes = mergeTies(expandRepeats(readItems(body, { ...key.accidentals })));

  return {
    title: headers.T ?? "",
    timeSignature: timeSignature ?? DEFAULT_METER,
    tempoBpm: parseTempo(headers.Q),
    events: notes.map((note) => ({
      pitch: note.pitch,
      beats: note.units * unitLength * BEATS_PER_WHOLE,
    })),
  };
}
