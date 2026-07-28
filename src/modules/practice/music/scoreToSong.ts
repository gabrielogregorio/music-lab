/**
 * PARTITURA → música do Treino, já na afinação da whistle escolhida.
 *
 * Duas coisas acontecem aqui e as duas existem para a melodia "caber nos
 * furinhos":
 *
 * 1. TRANSPOSIÇÃO pela whistle (ver `whistleTuning.ts`): a mesma digitação em
 *    outra afinação soa em outra altura, e é a altura real que o microfone
 *    julga.
 * 2. ENCAIXE DE OITAVA: se ainda assim sobrar nota fora da tessitura, a melodia
 *    inteira desce ou sobe em blocos de oitava até o maior número de notas cair
 *    dentro. Move o tune todo, nunca nota a nota - deslocar uma nota isolada
 *    quebraria o desenho da melodia.
 */
import { parseNote } from './notes';
import { pitchToName, type ScoreJSON } from './score';
import { whistleRange } from './fingerings';
import { transposeNoteName, transpositionToWhistle, type Transposition } from './whistleTuning';
import type { SongJSON, SongNoteJSON } from './song';

const SEMITONES_PER_OCTAVE = 12;
const STEPS_PER_OCTAVE = 7;
/** Quantas oitavas o encaixe tenta, para cada lado. */
const OCTAVE_SEARCH_RANGE = 2;

/**
 * Quantas oitavas deslocar a melodia para o maior número de notas cair dentro
 * da tessitura. Empate fica com o deslocamento menor (a melodia se move o mínimo).
 */
export function bestOctaveShift(midis: number[], keyId: string): number {
  const { lowestMidi, highestMidi } = whistleRange(keyId);
  let bestShift = 0;
  let bestInside = -1;
  for (let octave = -OCTAVE_SEARCH_RANGE; octave <= OCTAVE_SEARCH_RANGE; octave += 1) {
    const shift = octave * SEMITONES_PER_OCTAVE;
    const inside = midis.filter(
      (midi) => midi + shift >= lowestMidi && midi + shift <= highestMidi,
    ).length;
    const isBetter = inside > bestInside;
    const isCloserTie = inside === bestInside && Math.abs(shift) < Math.abs(bestShift);
    if (isBetter || isCloserTie) {
      bestInside = inside;
      bestShift = shift;
    }
  }
  return bestShift;
}

/** Quantas notas da música ficam fora da tessitura da whistle escolhida. */
export function countOutOfRange(song: SongJSON, keyId: string): number {
  const { lowestMidi, highestMidi } = whistleRange(keyId);
  return song.notes.filter((note) => {
    if (!note.note || note.note.toLowerCase() === 'rest') return false;
    const { midi } = parseNote(note.note);
    return midi < lowestMidi || midi > highestMidi;
  }).length;
}

/** Lê a partitura e monta a música do Treino para uma afinação de whistle. */
export function scoreToSong(score: ScoreJSON, whistleKey: string): SongJSON {
  const whistleShift = transpositionToWhistle(whistleKey);
  const written = score.events.map((event) => (event.pitch ? pitchToName(event.pitch) : null));

  const soundingMidis = written
    .filter((name): name is string => name !== null)
    .map((name) => parseNote(name).midi + whistleShift.semitones);
  const octaves = bestOctaveShift(soundingMidis, whistleKey) / SEMITONES_PER_OCTAVE;

  // A whistle e o encaixe de oitava são uma transposição só - aplicada de uma
  // vez, a grafia sai certa sem passo intermediário.
  const total: Transposition = {
    semitones: whistleShift.semitones + octaves * SEMITONES_PER_OCTAVE,
    diatonicSteps: whistleShift.diatonicSteps + octaves * STEPS_PER_OCTAVE,
  };

  const notes: SongNoteJSON[] = score.events.map((event, index) => {
    const name = written[index];
    const sounding = name ? transposeNoteName(name, total) : null;
    return { note: sounding ?? 'rest', beats: event.beats, lyric: event.lyric };
  });

  return {
    id: score.id,
    title: score.title,
    instrument: 'tin-whistle',
    whistleKey,
    tempo: score.tempo,
    timeSignature: score.timeSignature,
    pickupBeats: score.pickupBeats,
    toleranceCents: score.toleranceCents,
    notes,
  };
}

/** Converte o repertório inteiro para a whistle escolhida. */
export function scoresToSongs(scores: ScoreJSON[], whistleKey: string): SongJSON[] {
  return scores.map((score) => scoreToSong(score, whistleKey));
}
