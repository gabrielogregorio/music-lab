import { describe, expect, it } from 'vitest';
import { REPERTOIRE, findScore } from './repertoire';
import { findIrregularMeasures, measureBeats, pitchToName } from './score';
import { countOutOfRange, scoreToSong } from './scoreToSong';
import { whistleRange } from './fingerings';
import { parseNote } from './notes';
import { prepareSong } from './song';

/** Notas tocáveis mínimas para a peça valer uma sessão de treino. */
const MIN_PLAYABLE_NOTES = 24;

const EACH_SCORE = REPERTOIRE.map((score) => [score.id, score] as const);

describe('repertório', () => {
  it.each(EACH_SCORE)('%s cabe inteira nos furos da whistle em Ré', (_id, score) => {
    expect(countOutOfRange(scoreToSong(score, 'D'), 'D')).toBe(0);
  });

  it.each(EACH_SCORE)('%s cabe inteira nos furos da whistle em Dó', (_id, score) => {
    expect(countOutOfRange(scoreToSong(score, 'C'), 'C')).toBe(0);
  });

  it.each(EACH_SCORE)('%s tem notas tocáveis suficientes para treinar', (_id, score) => {
    expect(prepareSong(scoreToSong(score, 'D')).playableCount).toBeGreaterThanOrEqual(
      MIN_PLAYABLE_NOTES,
    );
  });

  it.each(EACH_SCORE)('%s declara exatamente os compassos que não fecham', (_id, score) => {
    expect(findIrregularMeasures(score)).toEqual(score.irregularMeasures);
  });

  it.each(EACH_SCORE)('%s tem anacruse menor que um compasso', (_id, score) => {
    expect(score.pickupBeats).toBeLessThan(measureBeats(score.timeSignature));
  });

  it.each(EACH_SCORE)('%s não tem evento de duração zero ou negativa', (_id, score) => {
    const shortest = Math.min(...score.events.map((event) => event.beats));
    expect(shortest).toBeGreaterThan(0);
  });

  it.each(EACH_SCORE)('%s grafa toda altura num nome de nota válido', (_id, score) => {
    const names = score.events
      .filter((event) => event.pitch)
      .map((event) => pitchToName(event.pitch!));
    expect(names.every((name) => parseNote(name).midi > 0)).toBe(true);
  });

  it.each(EACH_SCORE)('%s cita de onde veio a altura e de onde veio o ritmo', (_id, score) => {
    expect(score.source.pitches.length).toBeGreaterThan(0);
    expect(score.source.rhythm.length).toBeGreaterThan(0);
  });

  it('não repete id entre as músicas do repertório', () => {
    const ids = REPERTOIRE.map((score) => score.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('acha a partitura pelo id da música', () => {
    expect(findScore('scarborough')?.title).toBe('Scarborough Fair');
  });

  it('não acha partitura para música que não é do repertório', () => {
    expect(findScore('twinkle-twinkle')).toBeUndefined();
  });

  it('a whistle em Ré começa exatamente em D5', () => {
    expect(whistleRange('D').lowestMidi).toBe(parseNote('D5').midi);
  });
});
