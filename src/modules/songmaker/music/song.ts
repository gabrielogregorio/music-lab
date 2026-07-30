// Modelo puro da música do Song Maker: a configuração da grade e as células
// ativas (melodia e percussão). Sem React, sem áudio - só dados e transformações
// testáveis. As células viram chaves "col:row" para caber num Set.

import type { ScaleId } from "./scale";

export interface SongConfig {
  bars: number;
  beatsPerBar: number;
  subdivisions: number;
  scaleId: ScaleId;
  rootMidi: number;
  octaves: number;
}

export const DEFAULT_CONFIG: SongConfig = {
  bars: 4,
  beatsPerBar: 4,
  subdivisions: 2,
  scaleId: "major",
  rootMidi: 60, // C4 (Dó central)
  octaves: 2,
};

// 3 linhas de batida (agudo, grave e uma 3ª mais grave/acento). Eram 2; a 3ª foi
// somada mantendo o som das duas primeiras.
export const PERCUSSION_ROWS = 3;

export function totalColumns(config: SongConfig): number {
  return config.bars * config.beatsPerBar * config.subdivisions;
}

export function stepsPerBar(config: SongConfig): number {
  return config.beatsPerBar * config.subdivisions;
}

export function cellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

// Alterna uma célula; devolve um Set novo (imutável) para casar com o estado React.
export function toggleCell(cells: ReadonlySet<string>, col: number, row: number): Set<string> {
  const next = new Set(cells);
  const key = cellKey(col, row);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}

// Descarta células que caíram fora da grade quando a configuração encolhe (menos
// compassos, menos linhas), para não tocar nota fantasma nem vazar chave.
export function pruneCells(cells: ReadonlySet<string>, maxCol: number, maxRow: number): Set<string> {
  const next = new Set<string>();
  cells.forEach((key) => {
    const [col, row] = key.split(":").map(Number);
    if (col < maxCol && row < maxRow) {
      next.add(key);
    }
  });
  return next;
}

// Índices de linha ativos em uma coluna (para o motor de áudio).
export function rowsInColumn(cells: ReadonlySet<string>, col: number): number[] {
  const rows: number[] = [];
  cells.forEach((key) => {
    const [cellCol, cellRow] = key.split(":").map(Number);
    if (cellCol === col) {
      rows.push(cellRow);
    }
  });
  return rows;
}
