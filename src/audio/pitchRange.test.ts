import { describe, it, expect } from "vitest";
import { PITCH_RANGE, MIN_PITCH_HZ, MAX_PITCH_HZ } from "./pitchRange";

describe("faixa de pitch compartilhada (afinador + treino)", () => {
  it("é larga: alcança um grave de ~55 Hz e um agudo de ~2 kHz", () => {
    expect(MIN_PITCH_HZ).toBeLessThanOrEqual(55);
    expect(MAX_PITCH_HZ).toBeGreaterThanOrEqual(2000);
  });

  it("cobre mais de três oitavas (grave bem abaixo do agudo)", () => {
    expect(MAX_PITCH_HZ / MIN_PITCH_HZ).toBeGreaterThan(8); // 3 oitavas = 8x
  });

  it("o objeto PITCH_RANGE espelha as constantes", () => {
    expect(PITCH_RANGE).toEqual({ minHz: MIN_PITCH_HZ, maxHz: MAX_PITCH_HZ });
  });
});
