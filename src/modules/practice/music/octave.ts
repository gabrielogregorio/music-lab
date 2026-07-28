/**
 * "Oitava de leitura": baixa a música para caber na pauta, sem ledger lines
 * demais. O whistle é um instrumento agudo - a 2ª oitava mora acima do
 * pentagrama de sol, cheia de linhas suplementares. Ler assim é penoso, então
 * por padrão o Treino desce a melodia para a faixa confortável da clave de sol
 * (o Dó agudo vira o Dó embaixo da pauta).
 *
 * O deslocamento é sempre em OITAVAS inteiras (o padrão de dedilhado se repete a
 * cada oitava), e é escolhido pela própria música: quem já está grave (as
 * transcrições do usuário) não se mexe; quem está no agudo desce.
 */
import { parseNote } from './notes';
import type { SongJSON, SongNoteJSON } from './song';

// Janela confortável da clave de sol, ~1 linha suplementar de folga de cada lado.
export const READABLE_LOW_MIDI = 60; // C4 (Dó central, 1 linha abaixo da pauta)
export const READABLE_HIGH_MIDI = 81; // A5 (Lá, 1 linha acima da pauta)
const SEMITONES_PER_OCTAVE = 12;
const SEARCH_OCTAVES = [-2, -1, 0, 1, 2];

function isRestNote(note: string | undefined): boolean {
  return !note || note.toLowerCase() === 'rest';
}

/**
 * Quantas oitavas descer/subir para o MÁXIMO de notas cair na faixa legível.
 * Empate: o menor deslocamento (mexe o mínimo); depois o mais grave (a intenção
 * é baixar). Devolve 0 quando não há nota.
 */
export function octaveShiftForReading(midis: number[]): number {
  if (midis.length === 0) return 0;
  const scored = SEARCH_OCTAVES.map((octaves) => {
    const shift = octaves * SEMITONES_PER_OCTAVE;
    const inside = midis.filter(
      (midi) => midi + shift >= READABLE_LOW_MIDI && midi + shift <= READABLE_HIGH_MIDI,
    ).length;
    return { octaves, inside };
  });
  scored.sort(
    (a, b) => b.inside - a.inside || Math.abs(a.octaves) - Math.abs(b.octaves) || a.octaves - b.octaves,
  );
  return scored[0].octaves;
}

/** Desloca a oitava no NOME científico ("F#5" -> "F#4"); pausa fica intacta. */
export function shiftOctaveName(name: string, deltaOctaves: number): string {
  const match = /^(.*?)(-?\d+)$/.exec(name);
  if (!match) return name;
  return `${match[1]}${parseInt(match[2], 10) + deltaOctaves}`;
}

/** Nova música com todas as notas deslocadas por `deltaOctaves` (pausas intactas). */
export function shiftSongOctave(song: SongJSON, deltaOctaves: number): SongJSON {
  if (deltaOctaves === 0) return song;
  const notes: SongNoteJSON[] = song.notes.map((note) =>
    isRestNote(note.note) ? note : { ...note, note: shiftOctaveName(note.note, deltaOctaves) },
  );
  return { ...song, notes };
}

/** O deslocamento de leitura de uma música (0 se já está na faixa legível). */
export function readingShiftFor(song: SongJSON): number {
  const midis = song.notes
    .filter((note) => !isRestNote(note.note))
    .map((note) => parseNote(note.note).midi);
  return octaveShiftForReading(midis);
}
