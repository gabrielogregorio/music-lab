// Teclado: toca no piano da tela a MESMA biblioteca do Treino (o ponto global
// em src/songs). Dá para clicar as teclas, ajustar quantas aparecem, escolher o
// som e tocar a música escolhida com as teclas acendendo no tempo. O motor de
// áudio (AudioContext + rAF) é um sistema externo numa classe; só o teardown na
// desmontagem é efeito. O reset de andamento/faixa ao trocar de música é o
// padrão "storing previous value", sem efeito.
import { useMemo, useState } from "react";
import { useMountEffect } from "../../app/useMountEffect";
import { useTranslate } from "../../i18n/i18n";
import { useSongLibrary, prepareSong, type PreparedSong } from "../../songs/library";
import { loadJson, saveJson } from "../../songs/localStore";
import {
  DEFAULT_KEY_COUNT,
  DEFAULT_START_MIDI,
  MAX_KEY_COUNT,
  MIN_KEY_COUNT,
  buildKeyboard,
  clampKeyCount,
  clampStartMidi,
  fitKeyboard,
} from "./music/keys";
import { buildTimeline } from "./music/playback";
import { KeyboardEngine } from "./audio/engine";
import { MELODY_INSTRUMENTS, type MelodyInstrument } from "../../audio/voices";
import { Piano } from "./components/Piano";
import { FallingNotes } from "./components/FallingNotes";

const KB_PREFS_KEY = "music-lab:keyboard";
const OCTAVE = 12;
const NO_INDEX = -1;

interface KbPrefs {
  instrument: MelodyInstrument;
  keyCount: number;
  startMidi: number;
  /** Mostra as notas caindo sobre o teclado (estilo Synthesia). */
  falling: boolean;
}

function loadPrefs(): KbPrefs {
  const stored = loadJson<Partial<KbPrefs>>(KB_PREFS_KEY, {});
  const instrument = MELODY_INSTRUMENTS.some((option) => option.id === stored.instrument)
    ? stored.instrument!
    : "piano";
  const keyCount = clampKeyCount(stored.keyCount ?? DEFAULT_KEY_COUNT);
  const startMidi = clampStartMidi(stored.startMidi ?? DEFAULT_START_MIDI, keyCount);
  return { instrument, keyCount, startMidi, falling: stored.falling === true };
}

/** Faixa de MIDI que a música ocupa (ignora pausas); cai no dó central se vazia. */
function songMidiRange(prepared: PreparedSong): { min: number; max: number } {
  const midis = prepared.notes
    .map((note) => note.parsed?.midi)
    .filter((midi): midi is number => midi != null);
  if (midis.length === 0) {
    return { min: 60, max: 72 };
  }
  return { min: Math.min(...midis), max: Math.max(...midis) };
}

export function Keyboard() {
  const translate = useTranslate();
  const { allSongs, sections } = useSongLibrary();

  const [selectedId, setSelectedId] = useState<string>(() => allSongs[0]?.id ?? "");
  const [prefs, setPrefs] = useState<KbPrefs>(loadPrefs);
  const [bpm, setBpm] = useState<number>(() => allSongs[0]?.tempo ?? 120);
  const [trackedId, setTrackedId] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(NO_INDEX);

  const [engine] = useState(() => new KeyboardEngine());
  useMountEffect(() => () => engine.dispose());

  const songJson = allSongs.find((song) => song.id === selectedId) ?? allSongs[0] ?? null;
  const prepared = useMemo(
    () => (songJson ? prepareSong({ ...songJson, tempo: bpm }) : null),
    [songJson, bpm],
  );
  const timeline = useMemo(() => (prepared ? buildTimeline(prepared) : null), [prepared]);

  // Trocou de música: volta o andamento sugerido e encaixa o teclado na
  // tessitura dela. Roda uma vez por troca (guardado por trackedId).
  if (songJson && prepared && songJson.id !== trackedId) {
    setTrackedId(songJson.id);
    setBpm(songJson.tempo);
    const range = songMidiRange(prepared);
    const fit = fitKeyboard(range.min, range.max);
    setPrefs((previous) => ({ ...previous, keyCount: fit.count, startMidi: fit.startMidi }));
  }

  const keys = useMemo(() => buildKeyboard(prefs.startMidi, prefs.keyCount), [prefs.startMidi, prefs.keyCount]);
  const activeMidi =
    playing && activeIndex >= 0 && prepared ? prepared.notes[activeIndex]?.parsed?.midi ?? null : null;

  function stopPlayback() {
    engine.stop();
    setPlaying(false);
    setActiveIndex(NO_INDEX);
  }

  const commitPrefs = (patch: Partial<KbPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveJson(KB_PREFS_KEY, next);
  };

  const press = (midi: number) => {
    engine.press(prefs.instrument, midi);
  };

  const togglePlay = () => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (timeline) {
      engine.play(timeline, prefs.instrument, setActiveIndex, () => {
        setPlaying(false);
        setActiveIndex(NO_INDEX);
      });
      setPlaying(true);
    }
  };

  const selectSong = (id: string) => {
    stopPlayback();
    setSelectedId(id);
  };

  const changeKeyCount = (count: number) => {
    const keyCount = clampKeyCount(count);
    commitPrefs({ keyCount, startMidi: clampStartMidi(prefs.startMidi, keyCount) });
  };

  const shiftOctave = (direction: number) => {
    commitPrefs({ startMidi: clampStartMidi(prefs.startMidi + direction * OCTAVE, prefs.keyCount) });
  };

  return (
    <section className="keyboard">
      <div className="kb-top">
        <h1>{translate("keyboard.title")}</h1>
      </div>

      <div className="kb-controls">
        <label className="kb-pick">
          <span>{translate("keyboard.song")}</span>
          <select value={selectedId} onChange={(event) => selectSong(event.target.value)}>
            {sections.map((section) => (
              <optgroup key={section.key} label={translate(`practice.collection.${section.key}`)}>
                {section.songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="kb-pick">
          <span>{translate("keyboard.sound")}</span>
          <select
            value={prefs.instrument}
            onChange={(event) => commitPrefs({ instrument: event.target.value as MelodyInstrument })}
          >
            {MELODY_INSTRUMENTS.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kb-tempo">
          <span>
            {translate("keyboard.tempo")} <strong>{bpm}</strong>
          </span>
          <input type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
        </label>

        <button type="button" className="btn btn-primary kb-play" onClick={togglePlay}>
          {playing ? `■ ${translate("keyboard.stop")}` : `▶ ${translate("keyboard.play")}`}
        </button>
      </div>

      <div className="kb-keys-row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => shiftOctave(-1)}
          aria-label={translate("keyboard.octaveDown")}
        >
          ◀
        </button>
        <label className="kb-count">
          <span>
            {translate("keyboard.keys")} <strong>{prefs.keyCount}</strong>
          </span>
          <input
            type="range"
            min={MIN_KEY_COUNT}
            max={MAX_KEY_COUNT}
            value={prefs.keyCount}
            onChange={(event) => changeKeyCount(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => shiftOctave(1)}
          aria-label={translate("keyboard.octaveUp")}
        >
          ▶
        </button>
        <label className="kb-toggle">
          <input
            type="checkbox"
            checked={prefs.falling}
            onChange={(event) => commitPrefs({ falling: event.target.checked })}
          />
          <span>{translate("keyboard.falling")}</span>
        </label>
      </div>

      {prefs.falling && <FallingNotes keys={keys} timeline={timeline} getElapsed={() => engine.elapsed()} />}
      <Piano keys={keys} activeMidi={activeMidi} onPress={press} />
    </section>
  );
}
