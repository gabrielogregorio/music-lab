/**
 * Persistência local: preferências, biblioteca de músicas do usuário e
 * histórico de tentativas por música. Tudo em localStorage (app 100%
 * client-side).
 */
import { useCallback, useMemo, useState } from 'react';
import type { SongJSON } from '../music/song';
import type { AttemptResult } from './usePractice';
import { DEFAULT_SONGS } from '../music/defaultSongs';
import { WHISTLE_TUNES } from '../music/tunes';
import { tuneToSong } from '../music/tuneToSong';
import { DEFAULT_WHISTLE_KEY, WHISTLE_KEYS } from '../music/fingerings';
import { DEFAULT_SCORE_VIEW, isScoreView, type ScoreView } from '../music/scoreView';

const SONGS_KEY = 'perfect-partituras.songs';
const HISTORY_KEY = 'perfect-partituras.history';
const PREFS_KEY = 'perfect-partituras.prefs';
const MAX_ATTEMPTS_PER_SONG = 50;

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/privacidade - ignora */
  }
}

export interface PracticePrefs {
  /** Afinação da whistle do usuário - define os dedilhados E a transposição. */
  whistleKey: string;
  view: ScoreView;
  /** Baixa a música para a faixa legível da pauta (o whistle é agudo). */
  lowerOctave: boolean;
}

const DEFAULT_PREFS: PracticePrefs = {
  whistleKey: DEFAULT_WHISTLE_KEY,
  view: DEFAULT_SCORE_VIEW,
  lowerOctave: true,
};

function readPrefs(): PracticePrefs {
  const stored = load<Partial<PracticePrefs>>(PREFS_KEY, {});
  const hasKey = WHISTLE_KEYS.some((key) => key.id === stored.whistleKey);
  return {
    whistleKey: hasKey ? stored.whistleKey! : DEFAULT_PREFS.whistleKey,
    view: isScoreView(stored.view) ? stored.view : DEFAULT_PREFS.view,
    lowerOctave: typeof stored.lowerOctave === 'boolean' ? stored.lowerOctave : DEFAULT_PREFS.lowerOctave,
  };
}

/** Preferências do Treino. Grava no próprio setter - sem efeito reagindo ao estado. */
export function usePracticePrefs() {
  const [prefs, setPrefs] = useState<PracticePrefs>(readPrefs);

  const update = useCallback((patch: Partial<PracticePrefs>) => {
    setPrefs((previous) => {
      const next = { ...previous, ...patch };
      save(PREFS_KEY, next);
      return next;
    });
  }, []);

  return { prefs, update };
}

export interface LibrarySection {
  /** Sufixo da chave i18n `practice.collection.*`. */
  key: string;
  songs: SongJSON[];
}

/**
 * Biblioteca: exercícios que acompanham o app, o repertório de whistle (que
 * nasce do ABC, já transposto para a afinação escolhida) e as músicas do
 * usuário. É por isso que a lista muda de altura quando você troca de whistle -
 * a mesma digitação, outra altura.
 */
export function useLibrary(whistleKey: string) {
  const [userSongs, setUserSongs] = useState<SongJSON[]>(() => load(SONGS_KEY, []));

  const tuneSongs = useMemo(
    () => WHISTLE_TUNES.map((tune) => ({ tune, song: tuneToSong(tune, whistleKey) })),
    [whistleKey],
  );

  // Persiste no próprio evento que muda a biblioteca (Rule 3 da skill): calcula o
  // próximo estado uma vez, salva e seta - sem efeito reagindo a `userSongs`.
  const commitSongs = useCallback((next: SongJSON[]) => {
    save(SONGS_KEY, next);
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

  const sections: LibrarySection[] = [
    { key: 'basics', songs: DEFAULT_SONGS.filter((song) => !isOverridden(song.id)) },
    {
      key: 'irish',
      songs: tuneSongs
        .filter((entry) => entry.tune.collection === 'irish' && !isOverridden(entry.song.id))
        .map((entry) => entry.song),
    },
    {
      key: 'ballads',
      songs: tuneSongs
        .filter((entry) => entry.tune.collection === 'ballads' && !isOverridden(entry.song.id))
        .map((entry) => entry.song),
    },
    { key: 'mine', songs: userSongs },
  ].filter((section) => section.songs.length > 0);

  const allSongs: SongJSON[] = sections.flatMap((section) => section.songs);

  const isUserSong = useCallback(
    (id: string) => userSongs.some((song) => song.id === id),
    [userSongs],
  );

  return { allSongs, sections, userSongs, upsertSong, removeSong, isUserSong };
}

export type HistoryMap = Record<string, AttemptResult[]>;

/** Histórico de tentativas, indexado por songId. */
export function useHistory() {
  const [history, setHistory] = useState<HistoryMap>(() => load(HISTORY_KEY, {}));

  const commitHistory = useCallback((next: HistoryMap) => {
    save(HISTORY_KEY, next);
    setHistory(next);
  }, []);

  const addAttempt = useCallback(
    (result: AttemptResult) => {
      const list = history[result.songId] ?? [];
      const nextList = [result, ...list].slice(0, MAX_ATTEMPTS_PER_SONG);
      commitHistory({ ...history, [result.songId]: nextList });
    },
    [history, commitHistory],
  );

  const clearSong = useCallback(
    (songId: string) => {
      const next = { ...history };
      delete next[songId];
      commitHistory(next);
    },
    [history, commitHistory],
  );

  return { history, addAttempt, clearSong };
}
