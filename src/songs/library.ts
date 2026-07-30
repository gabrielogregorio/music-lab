/**
 * Ponto global das músicas. É a fonte agnóstica que qualquer módulo consome -
 * o Treino (com microfone) e o Teclado tocam da MESMA biblioteca, e a música
 * que o usuário salva aparece nos dois.
 *
 * Ela compõe três origens numa lista de seções:
 * - os exercícios que acompanham o app (`DEFAULT_SONGS`),
 * - o repertório de whistle (partituras geradas, transpostas para a afinação
 *   pedida via `scoreToSong`),
 * - as músicas do usuário (localStorage).
 *
 * O repertório e o modelo de música moram em `modules/practice/music` porque
 * são o núcleo gerado do projeto (ver CLAUDE.md); aqui a gente só monta a
 * biblioteca por cima e a expõe como fonte compartilhada.
 */
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_SONGS } from '../modules/practice/music/defaultSongs';
import { REPERTOIRE } from '../modules/practice/music/repertoire';
import { SCORE_COLLECTIONS } from '../modules/practice/music/score';
import { scoreToSong } from '../modules/practice/music/scoreToSong';
import { DEFAULT_WHISTLE_KEY } from '../modules/practice/music/fingerings';
import type { SongJSON } from '../modules/practice/music/song';
import { loadJson, saveJson } from './localStore';

export type { SongJSON, SongNoteJSON, PreparedNote, PreparedSong } from '../modules/practice/music/song';
export { prepareSong, validateSongJSON } from '../modules/practice/music/song';

const SONGS_KEY = 'perfect-partituras.songs';

export interface LibrarySection {
  /** Sufixo da chave i18n `practice.collection.*`. */
  key: string;
  songs: SongJSON[];
}

export function useSongLibrary(whistleKey: string = DEFAULT_WHISTLE_KEY) {
  const [userSongs, setUserSongs] = useState<SongJSON[]>(() => loadJson(SONGS_KEY, []));

  const repertoireSongs = useMemo(
    () => REPERTOIRE.map((score) => ({ score, song: scoreToSong(score, whistleKey) })),
    [whistleKey],
  );

  // Persiste no próprio evento que muda a biblioteca: calcula o próximo estado
  // uma vez, salva e seta - sem efeito reagindo a `userSongs`.
  const commitSongs = useCallback((next: SongJSON[]) => {
    saveJson(SONGS_KEY, next);
    setUserSongs(next);
  }, []);

  const upsertSong = useCallback(
    (song: SongJSON) => {
      const existingIndex = userSongs.findIndex((existing) => existing.id === song.id);
      const next =
        existingIndex >= 0
          ? userSongs.map((existing, index) => (index === existingIndex ? song : existing))
          : [...userSongs, song];
      commitSongs(next);
    },
    [userSongs, commitSongs],
  );

  const removeSong = useCallback(
    (id: string) => {
      commitSongs(userSongs.filter((song) => song.id !== id));
    },
    [userSongs, commitSongs],
  );

  // Música do usuário com o mesmo id sobrescreve a que vem com o app.
  const isOverridden = (id: string) => userSongs.some((userSong) => userSong.id === id);

  // As seções do repertório saem de SCORE_COLLECTIONS, não de uma lista à parte:
  // coleção nova no dado aparece sozinha na biblioteca, sem passar por aqui.
  const repertoireSections: LibrarySection[] = SCORE_COLLECTIONS.map((collection) => ({
    key: collection,
    songs: repertoireSongs
      .filter((entry) => entry.score.collection === collection && !isOverridden(entry.song.id))
      .map((entry) => entry.song),
  }));

  const sections: LibrarySection[] = [
    { key: 'basics', songs: DEFAULT_SONGS.filter((song) => !isOverridden(song.id)) },
    ...repertoireSections,
    { key: 'mine', songs: userSongs },
  ].filter((section) => section.songs.length > 0);

  const allSongs: SongJSON[] = sections.flatMap((section) => section.songs);

  const isUserSong = useCallback(
    (id: string) => userSongs.some((song) => song.id === id),
    [userSongs],
  );

  return { allSongs, sections, userSongs, upsertSong, removeSong, isUserSong };
}
