// Guia/tutor de digitação: escolha o instrumento (tin whistle, pífaro, flauta
// doce), a afinação e o modo (escala ou cromático, com acidentes). Lê os dados
// puros de `instruments.ts` e desenha um cartão por nota; a tin whistle também
// mostra como segurar.
import { useState } from "react";
import { useTranslate } from "../../i18n/i18n";
import {
  DEFAULT_GUIDE_INSTRUMENT,
  GUIDE_INSTRUMENTS,
  buildGuideNotes,
  guideInstrumentById,
  type GuideInstrument,
  type GuideMode,
} from "./instruments";
import { HoleDiagram } from "./HoleDiagram";
import { HoldGuide } from "./HoldGuide";
import { TheoryReference } from "./TheoryReference";

const MODES: GuideMode[] = ["scale", "chromatic"];

export function Guide() {
  const translate = useTranslate();
  const [instrumentId, setInstrumentId] = useState(DEFAULT_GUIDE_INSTRUMENT);
  const [keyId, setKeyId] = useState(() => guideInstrumentById(DEFAULT_GUIDE_INSTRUMENT).defaultKey ?? "D");
  const [mode, setMode] = useState<GuideMode>("scale");

  const instrument = guideInstrumentById(instrumentId);
  const notes = buildGuideNotes(instrument, keyId, mode);

  const pickInstrument = (next: GuideInstrument) => {
    setInstrumentId(next.id);
    setKeyId(next.defaultKey ?? "D");
    setMode("scale");
  };

  return (
    <section className="guide">
      <div className="guide-head">
        <h1>{translate("guide.title")}</h1>
        <p className="sub">{translate("guide.sub")}</p>
      </div>

      <div className="guide-picker" role="group" aria-label={translate("guide.instrument")}>
        {GUIDE_INSTRUMENTS.map((option) => {
          const isActive = option.id === instrumentId;
          return (
            <button
              key={option.id}
              type="button"
              className={`guide-inst${isActive ? " active" : ""}`}
              onClick={() => pickInstrument(option)}
              aria-pressed={isActive}
            >
              {translate(option.nameKey)}
            </button>
          );
        })}
      </div>

      <div className="guide-controls">
        <div className="guide-keys" role="group" aria-label={translate("guide.key")}>
          {instrument.keys.map((key) => (
              <button
                key={key.id}
                type="button"
                className={`guide-key${key.id === keyId ? " active" : ""}`}
                onClick={() => setKeyId(key.id)}
                aria-pressed={key.id === keyId}
              >
                {key.label}
              </button>
            ))}
          </div>
          <div className="guide-modes" role="group" aria-label={translate("guide.scale")}>
            {MODES.map((option) => (
              <button
                key={option}
                type="button"
                className={`guide-mode${option === mode ? " active" : ""}`}
                onClick={() => setMode(option)}
                aria-pressed={option === mode}
              >
                {translate(`guide.mode.${option}`)}
              </button>
            ))}
          </div>
        </div>

      <p className="guide-inst-desc">{translate(instrument.descKey)}</p>

      <HoldGuide instrument={instrument} />

      <div className="guide-grid">
        {notes.map((note) => (
          <figure className="guide-card" key={note.name}>
            <HoleDiagram instrument={instrument} note={note} />
            <figcaption className="guide-note">
              <span className="guide-note-name">{note.name}</span>
              <span className="guide-note-solfege">{note.solfege}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <ul className="guide-legend">
        <li>
          <span className="guide-swatch closed" aria-hidden="true" /> {translate("legend.closed")}
        </li>
        <li>
          <span className="guide-swatch open" aria-hidden="true" /> {translate("legend.open")}
        </li>
        <li>
          <span className="guide-swatch half" aria-hidden="true" /> {translate("legend.half")}
        </li>
        <li>
          <span className="guide-swatch ring" aria-hidden="true" /> {translate("legend.octave")}
        </li>
      </ul>

      <TheoryReference />
    </section>
  );
}
