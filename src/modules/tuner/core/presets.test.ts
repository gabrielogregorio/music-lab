import { describe, it, expect } from "vitest";
import { INSTRUMENTS, DEFAULT_INSTRUMENT, instrumentByKind, detectionRange } from "./presets";
import { PITCH_RANGE } from "../../../audio/pitchRange";

describe("detecção do afinador", () => {
  it("usa a MESMA faixa larga do Treino (sistema compartilhado)", () => {
    expect(detectionRange()).toEqual(PITCH_RANGE);
  });

  it("é agnóstica de instrumento e cobre grave e agudo (não estreita mais)", () => {
    // Antes a faixa era estreitada por instrumento e o que caía fora sumia.
    expect(detectionRange().minHz).toBeLessThan(60); // alcança ~55 Hz
    expect(detectionRange().maxHz).toBeGreaterThan(2000); // até ~2 kHz
  });
});

describe("presets: só a banda verde e a dica, nunca a detecção", () => {
  it("o padrão é o cromático - qualquer som, sem instrumento", () => {
    expect(DEFAULT_INSTRUMENT).toBe("chromatic");
    expect(INSTRUMENTS[0].kind).toBe("chromatic");
  });

  it("o cromático não avisa de aquecimento; todo sopro avisa e traz dica", () => {
    expect(instrumentByKind("chromatic").warmsUp).toBe(false);
    expect(instrumentByKind("chromatic").tipKey).toBeUndefined();
    for (const inst of INSTRUMENTS) {
      if (inst.kind === "chromatic") continue;
      expect(inst.warmsUp).toBe(true);
      expect(inst.tipKey).toBeTruthy();
    }
  });

  it("todo preset tem uma banda verde utilizável", () => {
    for (const inst of INSTRUMENTS) {
      expect(inst.toleranceCents).toBeGreaterThan(0);
    }
  });
});
