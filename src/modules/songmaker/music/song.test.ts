import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  totalColumns,
  stepsPerBar,
  toggleCell,
  pruneCells,
  rowsInColumn,
  cellKey,
} from "./song";

describe("song model", () => {
  it("derives the column count from bars, beats and subdivisions", () => {
    expect(totalColumns({ ...DEFAULT_CONFIG, bars: 4, beatsPerBar: 4, subdivisions: 2 })).toBe(32);
    expect(stepsPerBar({ ...DEFAULT_CONFIG, beatsPerBar: 4, subdivisions: 2 })).toBe(8);
  });

  it("toggles a cell on and back off, returning a fresh set each time", () => {
    const empty = new Set<string>();
    const on = toggleCell(empty, 3, 5);
    expect(on.has(cellKey(3, 5))).toBe(true);
    expect(empty.has(cellKey(3, 5))).toBe(false); // original untouched
    const off = toggleCell(on, 3, 5);
    expect(off.has(cellKey(3, 5))).toBe(false);
  });

  it("prunes cells that fall outside a shrunken grid", () => {
    const cells = new Set([cellKey(0, 0), cellKey(9, 1), cellKey(2, 40)]);
    const pruned = pruneCells(cells, 8, 15);
    expect(pruned.has(cellKey(0, 0))).toBe(true);
    expect(pruned.has(cellKey(9, 1))).toBe(false); // column out of range
    expect(pruned.has(cellKey(2, 40))).toBe(false); // row out of range
  });

  it("lists the active rows in a column for the audio engine", () => {
    const cells = new Set([cellKey(4, 2), cellKey(4, 7), cellKey(5, 1)]);
    expect(rowsInColumn(cells, 4).sort((a, b) => a - b)).toEqual([2, 7]);
    expect(rowsInColumn(cells, 9)).toEqual([]);
  });
});
