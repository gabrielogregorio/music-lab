import { describe, it, expect } from "vitest";
import { buildTab, whistleById } from "./whistles";
import type { ParsedNote } from "../music/abcParser";

const D_WHISTLE = whistleById("D"); // tônica D4 = midi 62

function note(midi: number): ParsedNote {
  return { midi, letter: "D", accidental: 0, raw: "" };
}

describe("buildTab: oitavas do whistle (incluindo a 3ª)", () => {
  it("classifica a tônica como 1ª oitava", () => {
    const [column] = buildTab([note(62)], D_WHISTLE).columns;
    expect(column.playable && column.octave).toBe(1);
  });

  it("classifica uma oitava acima como sobressopro (2ª)", () => {
    const [column] = buildTab([note(62 + 12)], D_WHISTLE).columns;
    expect(column.playable && column.octave).toBe(2);
  });

  it("agora alcança a 3ª oitava (antes ficava fora do alcance com ✕)", () => {
    const [column] = buildTab([note(62 + 24)], D_WHISTLE).columns;
    expect(column.playable).toBe(true);
    expect(column.playable && column.octave).toBe(3);
  });

  it("na fronteira: um semitom acima do topo de 3 oitavas fica fora do alcance", () => {
    const [column] = buildTab([note(62 + 37)], D_WHISTLE).columns;
    expect(column.playable).toBe(false);
  });

  it("abaixo da tônica continua fora do alcance", () => {
    const [column] = buildTab([note(61)], D_WHISTLE).columns; // C#4, abaixo do D4
    expect(column.playable).toBe(false);
  });
});
