import { describe, it, expect } from "vitest";
import { fingeringForMidi, fingeringToShow, WHISTLE_KEYS } from "./fingerings";

const D_WHISTLE = WHISTLE_KEYS[0];

describe("fingeringForMidi", () => {
  it("gives the all-closed tonic for the whistle root", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi, "D")).toEqual({
      holes: [1, 1, 1, 1, 1, 1],
      overblow: false,
    });
  });

  it("resolves the second degree two semitones up", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi + 2, "D")?.holes).toEqual([1, 1, 1, 1, 1, 0]);
  });

  it("marks the upper octave as overblown", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi + 12, "D")?.overblow).toBe(true);
  });

  it("returns null for a pitch outside the whistle range", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi - 12, "D")).toBeNull();
  });

  it("snaps a note within one semitone to the nearest fingering (enharmonic tolerance)", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi + 1, "D")?.holes).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("falls back to the first whistle key when the id is unknown", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi, "does-not-exist")).toEqual(
      fingeringForMidi(D_WHISTLE.rootMidi, "D"),
    );
  });

  it("matches by pitch-class when octaveAgnostic, ignoring the octave", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi + 12, "D", true)?.holes).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("returns null when octaveAgnostic and the pitch-class is not on the whistle", () => {
    expect(fingeringForMidi(D_WHISTLE.rootMidi + 1, "D", true)).toBeNull();
  });
});

describe("fingeringToShow", () => {
  const D_WHISTLE_ROOT = WHISTLE_KEYS[0].rootMidi;
  const OCTAVE = 12;

  it("marca sobressopro na 2ª oitava mesmo com a tolerância de oitava ligada", () => {
    expect(fingeringToShow(D_WHISTLE_ROOT + OCTAVE, "D", true)?.overblow).toBe(true);
  });

  it("mantém a 1ª oitava sem sobressopro", () => {
    expect(fingeringToShow(D_WHISTLE_ROOT, "D", true)?.overblow).toBe(false);
  });

  it("cai na classe da nota quando a altura não existe no instrumento", () => {
    expect(fingeringToShow(D_WHISTLE_ROOT - OCTAVE, "D", true)?.holes).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("sem a rede ligada, nota fora da tessitura não tem dedilhado", () => {
    expect(fingeringToShow(D_WHISTLE_ROOT - OCTAVE, "D", false)).toBeNull();
  });
});
