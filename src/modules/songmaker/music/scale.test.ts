import { describe, it, expect } from "vitest";
import { buildPitches, midiToFreq, SCALES, colorForDegree, DEGREE_COLORS, EXTRA_TOP_ROWS } from "./scale";

describe("scale", () => {
  it("spans N octaves of the scale, the closing tonic and the extra top rows", () => {
    const pitches = buildPitches(60, "major", 2);
    expect(pitches).toHaveLength(SCALES.major.length * 2 + 1 + EXTRA_TOP_ROWS);
    expect(pitches[0].midi).toBe(60);
    // Os índices de baixo ficam intocados: a tônica de fechamento segue em 60+24.
    expect(pitches[SCALES.major.length * 2].midi).toBe(60 + 24);
  });

  it("adds exactly the extra rows continuing the scale above the closing tonic", () => {
    const pitches = buildPitches(60, "major", 2);
    // Após a tônica de topo (60+24), seguem os graus 1 e 2 da escala: +2 e +4 st.
    expect(pitches[pitches.length - 2].midi).toBe(60 + 24 + SCALES.major[1]);
    expect(pitches[pitches.length - 1].midi).toBe(60 + 24 + SCALES.major[2]);
  });

  it("keeps the pitches strictly ascending", () => {
    const pitches = buildPitches(60, "pentatonic", 2);
    for (let index = 1; index < pitches.length; index += 1) {
      expect(pitches[index].midi).toBeGreaterThan(pitches[index - 1].midi);
    }
  });

  it("repeats the degree colour every octave", () => {
    const pitches = buildPitches(60, "major", 2);
    // The tonic of the second octave reuses the tonic colour.
    expect(colorForDegree(pitches[0].degreeIndex)).toBe(colorForDegree(pitches[7].degreeIndex));
    expect(colorForDegree(0)).toBe(DEGREE_COLORS[0]);
  });

  it("puts A4 at 440 Hz and the octave at double", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
    expect(midiToFreq(81)).toBeCloseTo(880, 5);
  });
});
