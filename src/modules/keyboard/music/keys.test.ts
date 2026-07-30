import { describe, expect, it } from 'vitest';
import {
  MAX_KEY_COUNT,
  MIN_KEY_COUNT,
  buildKeyboard,
  clampKeyCount,
  clampStartMidi,
  fitKeyboard,
  isBlackMidi,
  keyColumns,
  midiName,
} from './keys';

describe('nomes e cor das teclas', () => {
  it('nomeia a altura MIDI em notação científica', () => {
    expect(midiName(60)).toBe('C4');
    expect(midiName(69)).toBe('A4');
    expect(midiName(61)).toBe('C#4');
  });

  it('marca como pretas só as cinco classes com sustenido', () => {
    expect(isBlackMidi(61)).toBe(true); // C#4
    expect(isBlackMidi(60)).toBe(false); // C4
    expect(isBlackMidi(65)).toBe(false); // F4
    expect(isBlackMidi(66)).toBe(true); // F#4
  });
});

describe('buildKeyboard', () => {
  it('devolve exatamente `count` teclas, graves à esquerda', () => {
    const keys = buildKeyboard(60, 13);
    expect(keys).toHaveLength(13);
    expect(keys[0].midi).toBe(60);
    expect(keys[12].midi).toBe(72);
  });

  it('não deixa a contagem passar dos limites', () => {
    expect(clampKeyCount(2)).toBe(MIN_KEY_COUNT);
    expect(clampKeyCount(200)).toBe(MAX_KEY_COUNT);
  });

  it('empurra o começo para dentro do alcance tocável', () => {
    expect(clampStartMidi(0, 25)).toBe(21); // A0, o mais grave
    expect(clampStartMidi(120, 25)).toBe(108 - 24); // último Dó8 encaixado
  });
});

describe('keyColumns', () => {
  it('divide a largura pelas teclas brancas e centra cada uma na sua faixa', () => {
    const columns = keyColumns(buildKeyboard(60, 12)); // C4..B4: 7 brancas
    const whites = columns.filter((column) => !column.isBlack);
    expect(whites).toHaveLength(7);
    expect(whites[0].leftPct).toBeCloseTo(0);
    expect(whites[0].widthPct).toBeCloseTo(100 / 7);
    expect(whites[0].centerPct).toBeCloseTo(100 / 7 / 2);
  });

  it('põe a tecla preta na fronteira entre duas brancas, mais estreita', () => {
    const columns = keyColumns(buildKeyboard(60, 12));
    const cSharp = columns.find((column) => column.midi === 61)!; // C#4
    expect(cSharp.isBlack).toBe(true);
    // Centro na fronteira C|D = 1 largura de branca.
    expect(cSharp.centerPct).toBeCloseTo(100 / 7);
    expect(cSharp.widthPct).toBeLessThan(100 / 7);
  });
});

describe('fitKeyboard', () => {
  it('começa numa tecla branca (Dó) abaixo da nota mais grave', () => {
    const { startMidi } = fitKeyboard(62, 74); // Ré4..Ré5
    expect(startMidi % 12).toBe(0); // é um Dó
    expect(startMidi).toBeLessThanOrEqual(62);
  });

  it('cobre a nota mais aguda da música', () => {
    const { startMidi, count } = fitKeyboard(62, 86);
    expect(startMidi + count - 1).toBeGreaterThanOrEqual(86);
  });
});
