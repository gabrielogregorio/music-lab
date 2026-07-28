// Configurações da música (como o "Settings" do Music Lab): comprimento, métrica,
// subdivisão, escala, nota/oitava inicial e faixa. Puro de UI - devolve a config
// nova pelo onChange; quem paga o preço de podar as células é o SongMaker.
import type { ScaleId } from "./music/scale";
import { SCALE_IDS } from "./music/scale";
import type { SongConfig } from "./music/song";
import { useTranslate } from "../../i18n/i18n";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const START_OCTAVES = [3, 4, 5];
const SCALE_LABELS: Record<ScaleId, string> = {
  major: "Major",
  minor: "Minor",
  pentatonic: "Pentatonic",
  chromatic: "Chromatic",
};

const LIMITS = {
  bars: { min: 1, max: 8 },
  beatsPerBar: { min: 2, max: 8 },
  subdivisions: { min: 1, max: 4 },
  octaves: { min: 1, max: 3 },
};

const SEMITONES_PER_OCTAVE = 12;

interface SettingsModalProps {
  config: SongConfig;
  onChange: (config: SongConfig) => void;
  onClose: () => void;
}

export function SettingsModal({ config, onChange, onClose }: SettingsModalProps) {
  const translate = useTranslate();

  const rootNote = ((config.rootMidi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  const rootOctave = Math.floor(config.rootMidi / SEMITONES_PER_OCTAVE) - 1;

  const setRoot = (note: number, octave: number) => {
    onChange({ ...config, rootMidi: (octave + 1) * SEMITONES_PER_OCTAVE + note });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={translate("songmaker.settings")}>
      <div className="modal sm-settings">
        <button type="button" className="sm-close" onClick={onClose} aria-label={translate("editor.cancel")}>
          ✕
        </button>

        <div className="sm-settings-grid">
          <Stepper
            label={translate("songmaker.length")}
            value={config.bars}
            unit={translate("songmaker.bars")}
            min={LIMITS.bars.min}
            max={LIMITS.bars.max}
            onChange={(bars) => onChange({ ...config, bars })}
          />
          <Stepper
            label={translate("songmaker.beatsPerBar")}
            value={config.beatsPerBar}
            min={LIMITS.beatsPerBar.min}
            max={LIMITS.beatsPerBar.max}
            onChange={(beatsPerBar) => onChange({ ...config, beatsPerBar })}
          />
          <Stepper
            label={translate("songmaker.splitInto")}
            value={config.subdivisions}
            min={LIMITS.subdivisions.min}
            max={LIMITS.subdivisions.max}
            onChange={(subdivisions) => onChange({ ...config, subdivisions })}
          />

          <label className="sm-field">
            <span>{translate("songmaker.scale")}</span>
            <select
              value={config.scaleId}
              onChange={(event) => onChange({ ...config, scaleId: event.target.value as ScaleId })}
            >
              {SCALE_IDS.map((scaleId) => (
                <option key={scaleId} value={scaleId}>
                  {SCALE_LABELS[scaleId]}
                </option>
              ))}
            </select>
          </label>

          <label className="sm-field">
            <span>{translate("songmaker.startOn")}</span>
            <span className="sm-start">
              <select value={rootNote} onChange={(event) => setRoot(Number(event.target.value), rootOctave)}>
                {NOTE_NAMES.map((noteName, index) => (
                  <option key={noteName} value={index}>
                    {noteName}
                  </option>
                ))}
              </select>
              <select value={rootOctave} onChange={(event) => setRoot(rootNote, Number(event.target.value))}>
                {START_OCTAVES.map((octave) => (
                  <option key={octave} value={octave}>
                    {octave}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <Stepper
            label={translate("songmaker.range")}
            value={config.octaves}
            unit={translate("songmaker.octaves")}
            min={LIMITS.octaves.min}
            max={LIMITS.octaves.max}
            onChange={(octaves) => onChange({ ...config, octaves })}
          />
        </div>

        <div className="sm-settings-done">
          <button type="button" className="btn-primary sm-done" onClick={onClose} aria-label={translate("editor.save")}>
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, unit, min, max, onChange }: StepperProps) {
  return (
    <div className="sm-field sm-stepper-row">
      <span>{label}</span>
      <span className="sm-stepper">
        <strong>
          {value}
          {unit ? ` ${unit}` : ""}
        </strong>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} −`}>
          −
        </button>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} +`}>
          +
        </button>
      </span>
    </div>
  );
}
