/**
 * ABC → música do Treino, já na afinação da whistle escolhida.
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
import { readAbcTune, type AbcPitch } from '../../../music/abcEvents';
import { parseNote } from './notes';
import { whistleRange } from './fingerings';
import { transposeNoteName, transpositionToWhistle, type Transposition } from './whistleTuning';
import type { SongJSON, SongNoteJSON } from './song';
import type { WhistleTune } from './tunes';

const SEMITONES_PER_OCTAVE = 12;
const STEPS_PER_OCTAVE = 7;
/** Quantas oitavas o encaixe tenta, para cada lado. */
const OCTAVE_SEARCH_RANGE = 2;
const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

const ACCIDENTAL_SUFFIX: Record<number, string> = {
  [-2]: 'bb',
  [-1]: 'b',
  [0]: '',
  [1]: '#',
  [2]: '##',
};

/** Nome científico de uma altura lida do ABC ("F#5", "Bb4"). */
export function abcPitchToName(pitch: AbcPitch): string | null {
  const suffix = ACCIDENTAL_SUFFIX[pitch.accidental];
  return suffix === undefined ? null : `${pitch.letter}${suffix}${pitch.octave}`;
}

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

/** Lê o ABC do tune e monta a música do Treino para uma afinação de whistle. */
export function tuneToSong(tune: WhistleTune, whistleKey: string): SongJSON {
  const parsed = readAbcTune(tune.abc);
  const whistleShift = transpositionToWhistle(whistleKey);

  const written = parsed.events.map((event) => ({
    name: event.pitch ? abcPitchToName(event.pitch) : null,
    beats: event.beats,
  }));

  const soundingMidis = written
    .filter((event) => event.name)
    .map((event) => parseNote(event.name!).midi + whistleShift.semitones);
  const octaves = bestOctaveShift(soundingMidis, whistleKey) / SEMITONES_PER_OCTAVE;

  // A whistle e o encaixe de oitava são uma transposição só - aplicada de uma
  // vez, a grafia sai certa sem passo intermediário.
  const total: Transposition = {
    semitones: whistleShift.semitones + octaves * SEMITONES_PER_OCTAVE,
    diatonicSteps: whistleShift.diatonicSteps + octaves * STEPS_PER_OCTAVE,
  };

  const notes: SongNoteJSON[] = written.map((event) => {
    const sounding = event.name ? transposeNoteName(event.name, total) : null;
    return { note: sounding ?? 'rest', beats: event.beats };
  });

  return {
    id: tune.id,
    title: tune.title,
    instrument: 'tin-whistle',
    whistleKey,
    tempo: tune.tempo,
    timeSignature: parsed.timeSignature ?? DEFAULT_TIME_SIGNATURE,
    toleranceCents: tune.toleranceCents,
    notes,
  };
}

/** Converte o repertório inteiro para a whistle escolhida. */
export function tunesToSongs(tunes: WhistleTune[], whistleKey: string): SongJSON[] {
  return tunes.map((tune) => tuneToSong(tune, whistleKey));
}
