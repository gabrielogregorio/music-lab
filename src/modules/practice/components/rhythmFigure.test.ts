import { describe, expect, it } from 'vitest';
import { rhythmFigure, noteAppearance } from './StaffSystem';

describe('noteAppearance', () => {
  const ACCENT = '#123456';

  it('no Treino, a nota por vir fica acinzentada e translúcida', () => {
    const upcoming = noteAppearance(5, 2, ACCENT);
    expect(upcoming.opacity).toBeLessThan(1);
    expect(upcoming.color).not.toBe('#010f17');
  });

  it('no modo Leitura, toda nota é tinta cheia (preta, opacidade 1), sem cinza', () => {
    // Mesma nota "por vir" do caso acima, agora em leitura: nada de cinza.
    const reading = noteAppearance(5, 2, ACCENT, true);
    expect(reading.opacity).toBe(1);
    expect(reading.color).toBe('#010f17');
  });
});

describe('rhythmFigure', () => {
  it('colcheia: cabeça cheia, haste, uma bandeirola', () => {
    expect(rhythmFigure(0.5)).toEqual({ hollow: false, hasStem: true, flags: 1, dotted: false });
  });

  it('semicolcheia: duas bandeirolas', () => {
    expect(rhythmFigure(0.25).flags).toBe(2);
  });

  it('semínima (1 tempo): cabeça cheia, haste, sem bandeirola', () => {
    expect(rhythmFigure(1)).toEqual({ hollow: false, hasStem: true, flags: 0, dotted: false });
  });

  it('semínima pontuada: cheia, sem bandeirola, com ponto', () => {
    expect(rhythmFigure(1.5)).toEqual({ hollow: false, hasStem: true, flags: 0, dotted: true });
  });

  it('mínima (2 tempos): cabeça vazada com haste', () => {
    expect(rhythmFigure(2)).toEqual({ hollow: true, hasStem: true, flags: 0, dotted: false });
  });

  it('mínima pontuada (3 tempos): vazada, com ponto', () => {
    expect(rhythmFigure(3)).toEqual({ hollow: true, hasStem: true, flags: 0, dotted: true });
  });

  it('semibreve (4 tempos): vazada, sem haste', () => {
    expect(rhythmFigure(4)).toEqual({ hollow: true, hasStem: false, flags: 0, dotted: false });
  });

  it('colcheia pontuada: cheia, uma bandeirola, com ponto', () => {
    expect(rhythmFigure(0.75)).toEqual({ hollow: false, hasStem: true, flags: 1, dotted: true });
  });
});
