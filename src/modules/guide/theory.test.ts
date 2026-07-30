import { describe, expect, it } from "vitest";
import { NATURAL_NOTES, CHROMATIC_NOTES, SCALE_STEPS, scaleFromRoot } from "./theory";

describe("teoria: nomes de nota (de → para)", () => {
  it("tem as 7 naturais começando em Dó/C", () => {
    expect(NATURAL_NOTES).toHaveLength(7);
    expect(NATURAL_NOTES[0]).toMatchObject({ solfege: "Dó", letter: "C", semitoneFromC: 0 });
    expect(NATURAL_NOTES[6]).toMatchObject({ solfege: "Si", letter: "B", semitoneFromC: 11 });
  });

  it("casa solfejo e letra corretamente (Mi = E, Lá = A)", () => {
    expect(NATURAL_NOTES.find((note) => note.letter === "E")?.solfege).toBe("Mi");
    expect(NATURAL_NOTES.find((note) => note.solfege === "Lá")?.letter).toBe("A");
  });

  it("grafa a notação ABC: média em maiúscula, oitava acima em minúscula", () => {
    const noteC = NATURAL_NOTES[0];
    expect(noteC.abcMiddle).toBe("C");
    expect(noteC.abcHigh).toBe("c");
  });

  it("tem 12 notas cromáticas cobrindo cada semitom uma vez", () => {
    expect(CHROMATIC_NOTES).toHaveLength(12);
    const semitones = CHROMATIC_NOTES.map((note) => note.semitoneFromC);
    expect(new Set(semitones).size).toBe(12);
  });
});

describe("teoria: escalas", () => {
  it("a escala maior soma exatamente uma oitava (12 semitons)", () => {
    expect(SCALE_STEPS.major.reduce((total, step) => total + step, 0)).toBe(12);
    expect(SCALE_STEPS.minor.reduce((total, step) => total + step, 0)).toBe(12);
  });

  it("Dó maior por extenso é Dó Ré Mi Fá Sol Lá Si Dó", () => {
    const scale = scaleFromRoot(0, SCALE_STEPS.major);
    expect(scale.map((note) => note.solfege)).toEqual(["Dó", "Ré", "Mi", "Fá", "Sol", "Lá", "Si", "Dó"]);
  });

  it("o cromático tem 12 passos de meio tom", () => {
    expect(SCALE_STEPS.chromatic).toHaveLength(12);
    expect(SCALE_STEPS.chromatic.every((step) => step === 1)).toBe(true);
  });
});
