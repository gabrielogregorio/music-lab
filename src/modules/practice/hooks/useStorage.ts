/**
 * Persistência local do Treino: preferências e histórico de tentativas por
 * música (localStorage; app 100% client-side). A biblioteca de músicas mora no
 * ponto global `src/songs/library.ts`, compartilhada com os outros módulos.
 */
import { useCallback, useState } from 'react';
import { loadJson, saveJson } from '../../../songs/localStore';
import type { AttemptResult } from './usePractice';
import { DEFAULT_WHISTLE_KEY, WHISTLE_KEYS } from '../music/fingerings';
import { DEFAULT_SCORE_VIEW, isScoreView, type ScoreView } from '../music/scoreView';
import {
  DEFAULT_PRACTICE_MODE,
  isPracticeMode,
  type PracticeMode,
} from '../music/practiceMode';

const HISTORY_KEY = 'perfect-partituras.history';
const PREFS_KEY = 'perfect-partituras.prefs';
const MAX_ATTEMPTS_PER_SONG = 50;

export interface PracticePrefs {
  /** Afinação da whistle do usuário - define os dedilhados E a transposição. */
  whistleKey: string;
  view: ScoreView;
  /** Treinar com microfone, ou só ler a peça inteira e tocar por conta. */
  mode: PracticeMode;
  /** Baixa a música para a faixa legível da pauta (o whistle é agudo). */
  lowerOctave: boolean;
}

const DEFAULT_PREFS: PracticePrefs = {
  whistleKey: DEFAULT_WHISTLE_KEY,
  view: DEFAULT_SCORE_VIEW,
  mode: DEFAULT_PRACTICE_MODE,
  lowerOctave: true,
};

function readPrefs(): PracticePrefs {
  const stored = loadJson<Partial<PracticePrefs>>(PREFS_KEY, {});
  const hasKey = WHISTLE_KEYS.some((key) => key.id === stored.whistleKey);
  return {
    whistleKey: hasKey ? stored.whistleKey! : DEFAULT_PREFS.whistleKey,
    view: isScoreView(stored.view) ? stored.view : DEFAULT_PREFS.view,
    mode: isPracticeMode(stored.mode) ? stored.mode : DEFAULT_PREFS.mode,
    lowerOctave: typeof stored.lowerOctave === 'boolean' ? stored.lowerOctave : DEFAULT_PREFS.lowerOctave,
  };
}

/** Preferências do Treino. Grava no próprio setter - sem efeito reagindo ao estado. */
export function usePracticePrefs() {
  const [prefs, setPrefs] = useState<PracticePrefs>(readPrefs);

  const update = useCallback((patch: Partial<PracticePrefs>) => {
    setPrefs((previous) => {
      const next = { ...previous, ...patch };
      saveJson(PREFS_KEY, next);
      return next;
    });
  }, []);

  return { prefs, update };
}

export type HistoryMap = Record<string, AttemptResult[]>;

/** Histórico de tentativas, indexado por songId. */
export function useHistory() {
  const [history, setHistory] = useState<HistoryMap>(() => loadJson(HISTORY_KEY, {}));

  const commitHistory = useCallback((next: HistoryMap) => {
    saveJson(HISTORY_KEY, next);
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
