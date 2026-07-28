// Song Maker: grade sequenciadora (melodia + percussão) no espírito do Chrome
// Music Lab. A grade e o modelo são puros (music/); o áudio é um sistema externo
// encapsulado no SongEngine, dirigido pelos handlers (sem efeito reativo). O
// único efeito é o teardown do motor na desmontagem.
import { useMemo, useRef, useState } from "react";
import { useMountEffect } from "../../app/useMountEffect";
import { useTranslate } from "../../i18n/i18n";
import { buildPitches, colorForDegree } from "./music/scale";
import {
  DEFAULT_CONFIG,
  PERCUSSION_ROWS,
  cellKey,
  pruneCells,
  rowsInColumn,
  stepsPerBar,
  toggleCell,
  totalColumns,
  type SongConfig,
} from "./music/song";
import { SongEngine, type EngineSnapshot } from "./audio/engine";
import {
  MELODY_INSTRUMENTS,
  PERCUSSION_INSTRUMENTS,
  type MelodyInstrument,
  type PercussionInstrument,
} from "./audio/synth";
import { SettingsModal } from "./SettingsModal";

const STORAGE_KEY = "music-lab:songmaker";
const MIN_TEMPO = 40;
const MAX_TEMPO = 240;
const NO_COLUMN = -1;
const MAX_HISTORY = 60;

interface SavedSong {
  config: SongConfig;
  tempo: number;
  melody: string[];
  percussion: string[];
  melodyInstrument: MelodyInstrument;
  percussionInstrument: PercussionInstrument;
}

function loadSaved(): SavedSong | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSong) : null;
  } catch {
    return null;
  }
}

interface Snapshot {
  melody: Set<string>;
  percussion: Set<string>;
}

export function SongMaker() {
  const translate = useTranslate();
  const [saved] = useState(loadSaved);

  const [config, setConfig] = useState<SongConfig>(saved?.config ?? DEFAULT_CONFIG);
  const [tempo, setTempo] = useState(saved?.tempo ?? 120);
  const [melody, setMelody] = useState<Set<string>>(new Set(saved?.melody ?? []));
  const [percussion, setPercussion] = useState<Set<string>>(new Set(saved?.percussion ?? []));
  const [melodyInstrument, setMelodyInstrument] = useState<MelodyInstrument>(saved?.melodyInstrument ?? "marimba");
  const [percussionInstrument, setPercussionInstrument] = useState<PercussionInstrument>(
    saved?.percussionInstrument ?? "conga",
  );
  const [playing, setPlaying] = useState(false);
  const [activeCol, setActiveCol] = useState(NO_COLUMN);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const pitches = useMemo(() => buildPitches(config.rootMidi, config.scaleId, config.octaves), [config]);
  const cols = totalColumns(config);
  const barSteps = stepsPerBar(config);

  const [engine] = useState(() => new SongEngine());
  useMountEffect(() => () => engine.dispose());

  // Refs para o motor ler o estado ao vivo (editar tocando muda o som na hora).
  const live = useRef({ melody, percussion, tempo, config, melodyInstrument, percussionInstrument, cols, pitches });
  live.current = { melody, percussion, tempo, config, melodyInstrument, percussionInstrument, cols, pitches };

  const buildSnapshot = (): EngineSnapshot => {
    const current = live.current;
    return {
      totalCols: current.cols,
      stepDuration: 60 / current.tempo / current.config.subdivisions,
      melodyInstrument: current.melodyInstrument,
      percussionInstrument: current.percussionInstrument,
      melodyMidis: (col) =>
        rowsInColumn(current.melody, col)
          .map((row) => current.pitches[row]?.midi)
          .filter((midi): midi is number => midi != null),
      percussionRows: (col) => rowsInColumn(current.percussion, col),
    };
  };

  const togglePlay = async () => {
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      await engine.start(buildSnapshot, setActiveCol);
      setPlaying(true);
    }
  };

  const rememberForUndo = () => {
    setHistory((past) => [...past, { melody, percussion }].slice(-MAX_HISTORY));
  };

  const toggleMelody = (col: number, row: number) => {
    rememberForUndo();
    const willAdd = !melody.has(cellKey(col, row));
    setMelody((current) => toggleCell(current, col, row));
    if (willAdd) {
      const midi = pitches[row]?.midi;
      if (midi != null) {
        engine.previewMelody(melodyInstrument, midi);
      }
    }
  };

  const togglePercussion = (col: number, prow: number) => {
    rememberForUndo();
    const willAdd = !percussion.has(cellKey(col, prow));
    setPercussion((current) => toggleCell(current, col, prow));
    if (willAdd) {
      engine.previewPercussion(percussionInstrument, prow);
    }
  };

  const undo = () => {
    if (history.length === 0) {
      return;
    }
    const previous = history[history.length - 1];
    setMelody(new Set(previous.melody));
    setPercussion(new Set(previous.percussion));
    setHistory(history.slice(0, -1));
  };

  const restart = () => {
    rememberForUndo();
    setMelody(new Set());
    setPercussion(new Set());
    engine.stop();
    setPlaying(false);
    setActiveCol(NO_COLUMN);
  };

  const applyConfig = (nextConfig: SongConfig) => {
    const nextCols = totalColumns(nextConfig);
    const nextRows = buildPitches(nextConfig.rootMidi, nextConfig.scaleId, nextConfig.octaves).length;
    setConfig(nextConfig);
    setMelody((current) => pruneCells(current, nextCols, nextRows));
    setPercussion((current) => pruneCells(current, nextCols, PERCUSSION_ROWS));
  };

  const currentSong = (): SavedSong => ({
    config,
    tempo,
    melody: [...melody],
    percussion: [...percussion],
    melodyInstrument,
    percussionInstrument,
  });

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSong()));
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(currentSong(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "song-maker.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const gridColumns = `repeat(${cols}, minmax(0, 1fr))`;

  return (
    <section className="songmaker">
      <div className="sm-top">
        <h1>{translate("songmaker.title")}</h1>
        <div className="sm-top-actions">
          <button type="button" className="btn-sm" onClick={restart}>
            ↺ {translate("songmaker.restart")}
          </button>
          <button type="button" className="btn-sm" onClick={undo} disabled={history.length === 0}>
            ⤺ {translate("songmaker.undo")}
          </button>
          <button type="button" className="btn-sm" onClick={() => setSettingsOpen(true)}>
            ⚙ {translate("songmaker.settings")}
          </button>
        </div>
      </div>

      <div className="sm-board">
        <div className="sm-melody" style={{ gridTemplateColumns: gridColumns }}>
          {pitches
            .map((pitch, row) => ({ pitch, row }))
            .reverse()
            .flatMap(({ pitch, row }) =>
              Array.from({ length: cols }, (_unused, col) => {
                const isOn = melody.has(cellKey(col, row));
                return (
                  <button
                    type="button"
                    key={cellKey(col, row)}
                    className={cellClass("sm-cell", col, barSteps, config.subdivisions)}
                    style={isOn ? { background: colorForDegree(pitch.degreeIndex) } : undefined}
                    onClick={() => toggleMelody(col, row)}
                    aria-label={`${pitch.midi} ${col}`}
                    aria-pressed={isOn}
                  />
                );
              }),
            )}
        </div>

        <div className="sm-perc" style={{ gridTemplateColumns: gridColumns }}>
          {Array.from({ length: PERCUSSION_ROWS }, (_unused, prow) =>
            Array.from({ length: cols }, (_unusedCol, col) => {
              const isOn = percussion.has(cellKey(col, prow));
              return (
                <button
                  type="button"
                  key={cellKey(col, prow)}
                  className={cellClass(`sm-perc-cell${isOn ? " on" : ""}`, col, barSteps, config.subdivisions)}
                  onClick={() => togglePercussion(col, prow)}
                  aria-pressed={isOn}
                  aria-label={`perc ${prow} ${col}`}
                >
                  <span className="sm-dot" aria-hidden="true" />
                </button>
              );
            }),
          )}
        </div>

        {playing && activeCol >= 0 && (
          <div
            className="sm-playhead"
            aria-hidden="true"
            style={{ left: `${(activeCol / cols) * 100}%`, width: `${100 / cols}%` }}
          />
        )}
      </div>

      <div className="sm-toolbar">
        <button type="button" className="sm-play" onClick={togglePlay} aria-label={translate(playing ? "metro.stop" : "metro.start")}>
          {playing ? "⏸" : "▶"}
        </button>

        <label className="sm-pick">
          <span>{translate("songmaker.melody")}</span>
          <select value={melodyInstrument} onChange={(event) => setMelodyInstrument(event.target.value as MelodyInstrument)}>
            {MELODY_INSTRUMENTS.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sm-pick">
          <span>{translate("songmaker.percussion")}</span>
          <select
            value={percussionInstrument}
            onChange={(event) => setPercussionInstrument(event.target.value as PercussionInstrument)}
          >
            {PERCUSSION_INSTRUMENTS.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sm-tempo">
          <span>{translate("songmaker.tempo")}</span>
          <input
            type="range"
            min={MIN_TEMPO}
            max={MAX_TEMPO}
            value={tempo}
            onChange={(event) => setTempo(Number(event.target.value))}
          />
          <strong>{tempo}</strong>
        </label>

        <div className="sm-toolbar-actions">
          <button type="button" className="btn-sm" onClick={save} aria-label={translate("editor.save")}>
            ✓ {translate("editor.save")}
          </button>
          <button type="button" className="btn-sm" onClick={download} aria-label={translate("songmaker.download")}>
            ↓ {translate("songmaker.download")}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal config={config} onChange={applyConfig} onClose={() => setSettingsOpen(false)} />
      )}
    </section>
  );
}

// Marca a coluna: início de compasso (linha grossa) ou de tempo (linha fina),
// além de sombrear compassos alternados - a régua visual da timeline.
function cellClass(base: string, col: number, barSteps: number, subdivisions: number): string {
  const parts = [base];
  if (col % barSteps === 0) {
    parts.push("bar");
  } else if (col % subdivisions === 0) {
    parts.push("beat");
  }
  if (Math.floor(col / barSteps) % 2 === 1) {
    parts.push("alt");
  }
  return parts.join(" ");
}
