// Desenha os furos de UMA nota: cheio = fechado, vazado = aberto, meio = meia-
// abertura. Anel acima = segunda oitava (sobressopro); "*" = dedilhado torto.
// A cor vem do CSS (`currentColor` via .guide-diagram), seguindo os tokens.
import type { GuideInstrument, GuideNote, HolePos, HoleState } from "./instruments";

const OVERBLOW_RING_RISE = 13;
const OVERBLOW_RING_RADIUS = 5;
const HOLE_STROKE = 1.6;

interface HoleDiagramProps {
  instrument: GuideInstrument;
  note: GuideNote;
}

export function HoleDiagram({ instrument, note }: HoleDiagramProps) {
  return (
    <svg
      className="guide-diagram"
      width={instrument.width}
      height={instrument.height}
      viewBox={`0 0 ${instrument.width} ${instrument.height}`}
      role="img"
      aria-label={note.name}
    >
      {instrument.holes.map((holePos, holeIndex) => (
        <Hole key={holeIndex} pos={holePos} state={note.holes[holeIndex] ?? 0} />
      ))}
      {note.overblow && (
        <circle
          cx={instrument.width / 2}
          cy={instrument.holes[0].y - OVERBLOW_RING_RISE}
          r={OVERBLOW_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={HOLE_STROKE}
        />
      )}
      {note.awkward && (
        <text x={instrument.width - 6} y={12} textAnchor="middle" className="guide-awkward">
          *
        </text>
      )}
    </svg>
  );
}

function Hole({ pos, state }: { pos: HolePos; state: HoleState }) {
  const ring = (
    <circle cx={pos.x} cy={pos.y} r={pos.r} fill="none" stroke="currentColor" strokeWidth={HOLE_STROKE} />
  );
  if (state === 1) {
    return (
      <>
        {ring}
        <circle cx={pos.x} cy={pos.y} r={pos.r} fill="currentColor" />
      </>
    );
  }
  if (state === 0.5) {
    return (
      <>
        {ring}
        <path d={`M ${pos.x} ${pos.y - pos.r} A ${pos.r} ${pos.r} 0 0 0 ${pos.x} ${pos.y + pos.r} Z`} fill="currentColor" />
      </>
    );
  }
  return ring;
}
