import { describe, it, expect } from "vitest";
import {
  GUIDE_INSTRUMENTS,
  buildSixHoleNotes,
  buildRecorderNotes,
  buildGuideNotes,
  guideInstrumentById,
  type GuideMode,
} from "./instruments";

const MODES: GuideMode[] = ["scale", "chromatic"];

describe("guide instruments", () => {
  it("aligns every note's hole array with the layout, across keys and modes", () => {
    // The diagram draws one circle per layout hole; a mismatch would drop or
    // orphan a finger. Holds for every key and mode of every instrument.
    for (const instrument of GUIDE_INSTRUMENTS) {
      const keys = instrument.keys ?? [{ id: "fixed", label: "", rootMidi: 0 }];
      for (const key of keys) {
        for (const mode of MODES) {
          const notes = buildGuideNotes(instrument, key.id, mode);
          expect(notes.length).toBeGreaterThan(0);
          for (const note of notes) {
            expect(note.holes).toHaveLength(instrument.holes.length);
          }
        }
      }
    }
  });

  it("opens the D whistle scale on low D, all holes closed", () => {
    const notes = buildGuideNotes(guideInstrumentById("whistle"), "D", "scale");
    expect(notes[0].name).toBe("D5");
    expect(notes[0].holes).toEqual([1, 1, 1, 1, 1, 1]);
    expect(notes[0].overblow).toBeUndefined();
  });

  it("transposes to the chosen key keeping the same fingering shape", () => {
    const inC = buildGuideNotes(guideInstrumentById("whistle"), "C", "scale");
    expect(inC[0].name).toBe("C5");
    // Same all-closed tonic shape, only the pitch moved.
    expect(inC[0].holes).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("chromatic mode adds the accidentals with awkward fingerings", () => {
    const whistle = guideInstrumentById("whistle");
    const chromatic = buildGuideNotes(whistle, "D", "chromatic");
    expect(chromatic.map((note) => note.name).slice(0, 3)).toEqual(["D5", "D#5", "E5"]);
    expect(chromatic.find((note) => note.name === "D#5")?.awkward).toBe(true);
    expect(chromatic.length).toBeGreaterThan(buildGuideNotes(whistle, "D", "scale").length);
  });

  it("builds two octaves for a six-hole flute, the upper one over-blown", () => {
    const notes = buildSixHoleNotes(74); // D5
    expect(notes).toHaveLength(15); // 7 + 7 + the closing tonic
    expect(notes.slice(0, 7).every((note) => !note.overblow)).toBe(true);
    expect(notes.slice(7).every((note) => note.overblow === true)).toBe(true);
    expect(notes[7].name).toBe("D6");
    expect(notes[7].holes).toEqual(notes[0].holes);
  });

  it("gives the baroque recorder its verified chart with the fork F and register octave", () => {
    const notes = buildRecorderNotes(72, "chromatic"); // C5, full set
    expect(notes.map((note) => note.name)).toEqual([
      "C5",
      "C#5",
      "D5",
      "D#5",
      "E5",
      "F5",
      "G5",
      "A5",
      "B5",
      "C6",
      "D6",
    ]);
    const f5 = notes.find((note) => note.name === "F5");
    expect(f5?.awkward).toBe(true);
    expect(f5?.holes).toEqual([1, 1, 1, 1, 1, 0, 1, 1]);
    const c6 = notes.find((note) => note.name === "C6");
    expect(c6?.holes).toEqual([0.5, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("gives the recorder a natural scale that gains accidentals in chromatic mode", () => {
    const recorder = guideInstrumentById("recorder");
    const scale = buildGuideNotes(recorder, "C", "scale");
    const chromatic = buildGuideNotes(recorder, "C", "chromatic");
    expect(scale.some((note) => note.name === "C#5")).toBe(false);
    expect(chromatic.some((note) => note.name === "C#5")).toBe(true);
    expect(chromatic.length).toBeGreaterThan(scale.length);
  });

  it("transposes the recorder to F (alto) with the same fingering shape", () => {
    const inF = buildGuideNotes(guideInstrumentById("recorder"), "F", "scale");
    expect(inF[0].name).toBe("F4");
    expect(inF[0].holes).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("falls back to the first instrument for an unknown id", () => {
    expect(guideInstrumentById("does-not-exist")).toBe(GUIDE_INSTRUMENTS[0]);
  });
});
