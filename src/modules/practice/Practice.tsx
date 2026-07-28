import { useCallback, useMemo, useState } from "react";
import { useMic } from "./hooks/useMic";
import { usePractice, DEFAULT_SETTINGS, type PracticeSettings } from "./hooks/usePractice";
import { useLibrary, useHistory, usePracticePrefs } from "./hooks/useStorage";
import { prepareSong, type SongJSON } from "./music/song";
import { WHISTLE_KEYS } from "./music/fingerings";
import { readingShiftFor, shiftSongOctave } from "./music/octave";
import { countOutOfRange } from "./music/tuneToSong";
import { findTune } from "./music/tunes";
import { SCORE_VIEWS, type ScoreView } from "./music/scoreView";
import { ptLabel } from "./music/notes";
import { STATUS_COLOR } from "./status";
import { Score } from "./components/Score";
import { PitchMeter } from "./components/PitchMeter";
import { WhistleDiagram } from "./components/WhistleDiagram";
import { SongEditor } from "./components/SongEditor";
import { HistoryPanel } from "./components/HistoryPanel";
import { useTranslate } from "../../i18n/i18n";

const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];
const PERCENT_SCALE = 100;
const TOLERANCE_MIN_CENTS = 5;
const TOLERANCE_MAX_CENTS = 60;
const DEFAULT_BPM = 100;
const BPM_MIN = 40;
const BPM_MAX = 208;
const HOLD_MIN_PCT = 20;
// Passa de 100% de propósito: dá para exigir segurar MAIS que a figura escrita,
// que é como se treina fôlego e estabilidade numa nota longa.
const HOLD_MAX_PCT = 200;

/** Filtra a lista pelo texto digitado (sem acento, sem caixa). */
function matchesSearch(song: SongJSON, search: string): boolean {
  if (!search) return true;
  const normalize = (text: string) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return normalize(song.title).includes(normalize(search));
}

export function Practice() {
  const translate = useTranslate();
  const { prefs, update: updatePrefs } = usePracticePrefs();
  const { allSongs, sections, upsertSong, removeSong, isUserSong } = useLibrary(prefs.whistleKey);
  const { history, addAttempt, clearSong } = useHistory();

  const [selectedId, setSelectedId] = useState<string>(() => allSongs[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SongJSON | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [settings, setSettings] = useState<PracticeSettings>(DEFAULT_SETTINGS);

  const songJson = allSongs.find((song) => song.id === selectedId) ?? allSongs[0];

  // Andamento: parte do sugerido da música, mas o usuário pode passar disso. É um
  // ajuste de estado ao trocar de música (padrão "storing previous value"), não
  // um efeito. O BPM entra na duração de cada nota (logo, no tempo que se segura).
  const [bpm, setBpm] = useState<number>(() => songJson?.tempo ?? DEFAULT_BPM);
  const [bpmForSong, setBpmForSong] = useState<string>();
  if (songJson && songJson.id !== bpmForSong) {
    setBpmForSong(songJson.id);
    setBpm(songJson.tempo);
  }

  // Oitava de leitura: baixa a música para a pauta ficar legível. É um ajuste de
  // DISPLAY (a música original segue valendo para o aviso de tessitura); o
  // dedilhado resolve por classe da nota, então segue certo mesmo fora da oitava.
  const displaySong = useMemo(() => {
    if (!songJson) return songJson;
    const read = prefs.lowerOctave ? shiftSongOctave(songJson, readingShiftFor(songJson)) : songJson;
    return { ...read, tempo: bpm };
  }, [songJson, prefs.lowerOctave, bpm]);

  const prepared = useMemo(() => {
    if (!displaySong) return null;
    try {
      return prepareSong(displaySong);
    } catch {
      return null;
    }
  }, [displaySong]);

  const tune = songJson ? findTune(songJson.id) : undefined;
  const outOfRange = songJson ? countOutOfRange(songJson, prefs.whistleKey) : 0;
  // O dedilhado resolve por classe (ignora a oitava) quando a leitura baixou a
  // música OU o usuário pediu para aceitar qualquer oitava.
  const fingeringAgnostic = settings.ignoreOctave || prefs.lowerOctave;

  // Ao trocar de música, adota a tolerância padrão dela - mas sem useEffect: é um
  // ajuste de estado quando um id muda, então roda na própria renderização (padrão
  // oficial do React), e não num efeito que dispara um segundo render defasado.
  const [toleranceAppliedFor, setToleranceAppliedFor] = useState<string>();
  if (songJson && songJson.id !== toleranceAppliedFor) {
    setToleranceAppliedFor(songJson.id);
    const songTolerance = songJson.toleranceCents;
    if (songTolerance != null) {
      setSettings((prev) => ({ ...prev, toleranceCents: songTolerance }));
    }
  }

  const mic = useMic();
  const onComplete = useCallback(
    (result: Parameters<typeof addAttempt>[0]) => addAttempt(result),
    [addAttempt],
  );
  const practice = usePractice(prepared, mic.onFrame, settings, onComplete);

  const handleStart = useCallback(async () => {
    if (!mic.active) await mic.start();
    practice.start();
  }, [mic, practice]);

  const currentNote =
    practice.currentIndex >= 0 ? prepared?.notes[practice.currentIndex] ?? null : null;
  const targetLabel = currentNote?.parsed ? ptLabel(currentNote.parsed) : "-";
  const targetMidi = currentNote?.parsed?.midi ?? null;
  const feedbackColor = STATUS_COLOR[practice.feedback.status];

  const songHistory = history[selectedId] ?? [];
  const playedCount =
    practice.currentIndex >= 0
      ? prepared?.notes.slice(0, practice.currentIndex).filter((note) => !note.isRest).length ?? 0
      : 0;

  const visibleSections = sections
    .map((section) => ({ ...section, songs: section.songs.filter((song) => matchesSearch(song, search)) }))
    .filter((section) => section.songs.length > 0);

  return (
    <div className="practice">
      <aside className="sidebar">
        <div className="brand-mini">
          <h1>{translate("practice.title")}</h1>
          <span className="dim">{translate("practice.sub")}</span>
        </div>

        <label className="setting whistle-picker">
          <span>{translate("practice.whistle")}</span>
          <select
            value={prefs.whistleKey}
            onChange={(event) => updatePrefs({ whistleKey: event.target.value })}
          >
            {WHISTLE_KEYS.map((key) => (
              <option key={key.id} value={key.id}>
                {translate(`practice.whistleKey.${key.id}`)}
              </option>
            ))}
          </select>
        </label>
        <p className="dim whistle-hint">{translate("practice.whistleHint")}</p>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            setEditing(null);
            setShowEditor(true);
          }}
        >
          {translate("practice.newSong")}
        </button>

        <input
          type="search"
          className="song-search"
          value={search}
          placeholder={translate("practice.search")}
          aria-label={translate("practice.search")}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="song-sections">
          {visibleSections.length === 0 ? (
            <p className="dim">{translate("practice.searchEmpty")}</p>
          ) : (
            visibleSections.map((section) => (
              <section key={section.key} className="song-section">
                <h2 className="song-section-title">{translate(`practice.collection.${section.key}`)}</h2>
                <ul className="song-list">
                  {section.songs.map((song) => (
                    <li
                      key={song.id}
                      className={`song-item ${song.id === selectedId ? "active" : ""}`}
                      onClick={() => setSelectedId(song.id)}
                    >
                      <div className="song-item-main">
                        <span className="song-title">{song.title}</span>
                        <span className="dim song-meta">
                          {translate("practice.songMeta", {
                            tempo: song.tempo,
                            notes: song.notes.length,
                            mine: isUserSong(song.id) ? 1 : 0,
                          })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </aside>

      <main className="practice-main">
        {!songJson ? (
          <div className="empty-state">{translate("practice.empty")}</div>
        ) : (
          <>
            <header className="main-head">
              <div>
                <h2>{songJson.title}</h2>
                <span className="dim">
                  {translate("practice.songHead", {
                    tempo: bpm,
                    sig: (songJson.timeSignature ?? DEFAULT_TIME_SIGNATURE).join("/"),
                    key: prefs.whistleKey,
                  })}
                </span>
                {tune && <span className="dim song-origin">{tune.origin}</span>}
              </div>
              <div className="head-actions">
                {isUserSong(songJson.id) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setEditing(songJson);
                        setShowEditor(true);
                      }}
                    >
                      {translate("practice.edit")}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => removeSong(songJson.id)}>
                      {translate("practice.delete")}
                    </button>
                  </>
                )}
                {practice.running ? (
                  <button type="button" className="btn btn-stop" onClick={practice.stop}>
                    ■ {translate("practice.stop")}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={handleStart}>
                    {mic.active ? "▶" : "🎤"} {translate("practice.play")}
                  </button>
                )}
              </div>
            </header>

            <div className="view-switch" role="group" aria-label={translate("practice.view")}>
              {SCORE_VIEWS.map((view: ScoreView) => (
                <button
                  key={view}
                  type="button"
                  className={`btn btn-sm ${prefs.view === view ? "active" : ""}`}
                  aria-pressed={prefs.view === view}
                  onClick={() => updatePrefs({ view })}
                >
                  {translate(`practice.view.${view}`)}
                </button>
              ))}
              <button
                type="button"
                className={`btn btn-sm ${prefs.lowerOctave ? "active" : ""}`}
                aria-pressed={prefs.lowerOctave}
                title={translate("practice.lowerOctaveHint")}
                onClick={() => updatePrefs({ lowerOctave: !prefs.lowerOctave })}
              >
                {translate("practice.lowerOctave")}
              </button>
            </div>

            {mic.error && <div className="banner-error">{translate("practice.micError", { err: mic.error })}</div>}

            {outOfRange > 0 && (
              <div className="banner-warn">
                {translate("practice.outOfRangeSong", { n: outOfRange, key: prefs.whistleKey })}
              </div>
            )}

            {prepared && (
              <Score
                notes={prepared.notes}
                currentIndex={practice.currentIndex}
                status={practice.feedback.status}
                direction={practice.feedback.direction}
                holdProgress={practice.feedback.holdProgress}
                view={prefs.view}
                whistleKey={prefs.whistleKey}
                octaveAgnostic={fingeringAgnostic}
                tempo={bpm}
                timeSignature={songJson.timeSignature}
              />
            )}

            <section className="practice-row">
              <WhistleDiagram
                midi={targetMidi}
                whistleKey={prefs.whistleKey}
                color={feedbackColor}
                octaveAgnostic={fingeringAgnostic}
              />
              <div className="practice-center">
                <PitchMeter feedback={practice.feedback} targetLabel={targetLabel} />
                {practice.running && practice.feedback.needsArticulation && (
                  <div className="articulate-hint">{translate("practice.articulate")}</div>
                )}
                {practice.running && prepared && (
                  <div className="progress-line dim">
                    {translate("practice.noteProgress", { i: playedCount + 1, total: prepared.playableCount })}
                  </div>
                )}
                {practice.finished && <div className="finished-banner">{translate("practice.finished")}</div>}
              </div>
            </section>

            <section className="settings-row">
              <label className="setting">
                <span>
                  {translate("practice.tempo")} <strong>{bpm} BPM</strong>
                  {bpm !== songJson.tempo && (
                    <button type="button" className="link-reset" onClick={() => setBpm(songJson.tempo)}>
                      {translate("practice.tempoReset", { suggested: songJson.tempo })}
                    </button>
                  )}
                </span>
                <input
                  type="range"
                  min={BPM_MIN}
                  max={BPM_MAX}
                  value={bpm}
                  onChange={(event) => setBpm(Number(event.target.value))}
                />
              </label>
              <label className="setting">
                <span>
                  {translate("practice.tolerance")} <strong>{settings.toleranceCents}¢</strong>
                  <span className="dim"> {translate("practice.tolerancePerfect")}</span>
                </span>
                <input
                  type="range"
                  min={TOLERANCE_MIN_CENTS}
                  max={TOLERANCE_MAX_CENTS}
                  value={settings.toleranceCents}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, toleranceCents: Number(event.target.value) }))
                  }
                />
              </label>
              <label className="setting">
                <span>
                  {translate("practice.hold")} <strong>{Math.round(settings.holdScale * PERCENT_SCALE)}%</strong>
                  <span className="dim"> {translate("practice.holdOf")}</span>
                </span>
                <input
                  type="range"
                  min={HOLD_MIN_PCT}
                  max={HOLD_MAX_PCT}
                  value={Math.round(settings.holdScale * PERCENT_SCALE)}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, holdScale: Number(event.target.value) / PERCENT_SCALE }))
                  }
                />
              </label>
              <label className="setting setting-check">
                <input
                  type="checkbox"
                  checked={settings.ignoreOctave}
                  onChange={(event) => setSettings((prev) => ({ ...prev, ignoreOctave: event.target.checked }))}
                />
                <span>
                  {translate("practice.ignoreOctave")}
                  <span className="dim"> {translate("practice.ignoreOctaveHint")}</span>
                </span>
              </label>
              <label className="setting setting-check">
                <input
                  type="checkbox"
                  checked={settings.requireTongue}
                  onChange={(event) => setSettings((prev) => ({ ...prev, requireTongue: event.target.checked }))}
                />
                <span>
                  {translate("practice.requireTongue")}
                  <span className="dim"> {translate("practice.requireTongueHint")}</span>
                </span>
              </label>
            </section>
          </>
        )}
      </main>

      <aside className="history-panel">
        <h3>{translate("practice.history")}</h3>
        <HistoryPanel attempts={songHistory} onClear={() => clearSong(selectedId)} />
      </aside>

      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <SongEditor
              initial={editing ?? undefined}
              onCancel={() => setShowEditor(false)}
              onSave={(song) => {
                upsertSong(song);
                setSelectedId(song.id);
                setShowEditor(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
