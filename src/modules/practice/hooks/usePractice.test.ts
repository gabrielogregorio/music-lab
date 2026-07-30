import { describe, it, expect } from "vitest";
import { statusForCents, noteAccuracy, requiredHoldSec, DEFAULT_SETTINGS } from "./usePractice";

const TOLERANCE = 30;

describe("requiredHoldSec (tempo de sustentação)", () => {
  const HOLD_SCALE = 0.7;
  const { minHoldMs } = DEFAULT_SETTINGS;

  it("é uma fração da duração da nota quando a nota é longa o bastante", () => {
    // Semínima a 100 BPM = 0.6 s; 70% = 0.42 s (acima do piso).
    expect(requiredHoldSec(0.6, HOLD_SCALE, minHoldMs)).toBeCloseTo(0.42);
  });

  it("ENCOLHE quando o andamento acelera (nota mais curta pede menos hold)", () => {
    // Mesma semínima a 100 vs 180 BPM: 0.6 s -> 0.333 s.
    const slow = requiredHoldSec(0.6, HOLD_SCALE, minHoldMs);
    const fast = requiredHoldSec(0.333, HOLD_SCALE, minHoldMs);
    expect(fast).toBeLessThan(slow);
  });

  it("não cai abaixo do piso absoluto, mas o piso é baixo (não estoura o andamento)", () => {
    // Nota muito curta: cai no piso, e o piso é pequeno o bastante para não passar
    // da própria duração da nota num andamento normal.
    expect(requiredHoldSec(0.05, HOLD_SCALE, minHoldMs)).toBeCloseTo(minHoldMs / 1000);
    expect(minHoldMs).toBeLessThanOrEqual(200);
  });
});

describe("statusForCents", () => {
  it("is good exactly at the tolerance boundary", () => {
    expect(statusForCents(TOLERANCE, TOLERANCE)).toBe("good");
  });

  it("is close just past the tolerance and up to 2.5x it", () => {
    expect(statusForCents(TOLERANCE + 1, TOLERANCE)).toBe("close");
    expect(statusForCents(TOLERANCE * 2.5, TOLERANCE)).toBe("close");
  });

  it("is wrong past 2.5x the tolerance", () => {
    expect(statusForCents(TOLERANCE * 2.5 + 1, TOLERANCE)).toBe("wrong");
  });
});

describe("noteAccuracy", () => {
  it("is a perfect 1 with no deviation", () => {
    expect(noteAccuracy(0, TOLERANCE)).toBe(1);
  });

  it("is 0 at the tolerance edge", () => {
    expect(noteAccuracy(TOLERANCE, TOLERANCE)).toBe(0);
  });

  it("is linear in between", () => {
    expect(noteAccuracy(TOLERANCE / 2, TOLERANCE)).toBeCloseTo(0.5);
  });

  it("clamps to 0 for deviation beyond the tolerance", () => {
    expect(noteAccuracy(TOLERANCE * 2, TOLERANCE)).toBe(0);
  });
});
