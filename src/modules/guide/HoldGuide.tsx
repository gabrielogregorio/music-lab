// Como segurar: desenha o instrumento com os dedos sobre os furos. Mão esquerda
// (verde) em cima, mão direita (latão) embaixo, cada dedo numerado; o polegar de
// trás (flauta doce) entra tracejado atrás. Parametrizado pelo `hold` do
// instrumento, então serve whistle, pífaro e flauta doce.
import { useTranslate } from "../../i18n/i18n";
import type { GuideInstrument } from "./instruments";

const HOLE_CX = 110;
const PAD_R = 12;
const TOP_Y = 66;
const SPACING = 34;
const HAND_GAP = 26;
const LEFT_EDGE = 34;
const RIGHT_EDGE = 186;
const VIEW_WIDTH = 220;

function handYs(count: number, start: number): number[] {
  return Array.from({ length: count }, (_unused, index) => start + index * SPACING);
}

export function HoldGuide({ instrument }: { instrument: GuideInstrument }) {
  const translate = useTranslate();
  const { left, right, thumb } = instrument.hold;

  const leftYs = handYs(left, TOP_Y);
  const rightStart = leftYs[leftYs.length - 1] + SPACING + HAND_GAP;
  const rightYs = handYs(right, rightStart);
  const bottom = rightYs[rightYs.length - 1];
  const viewHeight = bottom + 44;
  const tubeTop = 16;

  return (
    <figure className="hold-guide">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        className="hold-svg"
        role="img"
        aria-label={translate("guide.hold.title")}
      >
        <rect className="hold-mouth" x={82} y={4} width={56} height={18} rx={9} />
        <rect className="hold-tube" x={96} y={tubeTop} width={28} height={bottom + 8 - tubeTop} rx={14} />

        {thumb && (
          <circle className="hold-thumb" cx={88} cy={leftYs[0]} r={9} />
        )}

        <text className="hold-hand" x={LEFT_EDGE} y={leftYs[0] - 24}>
          {translate("guide.hold.left")}
        </text>
        <text className="hold-hand end" x={RIGHT_EDGE} y={rightYs[0] - 24}>
          {translate("guide.hold.right")}
        </text>

        {leftYs.map((cy, index) => (
          <Finger key={`l${cy}`} cy={cy} side="left" number={index + 1} />
        ))}
        {rightYs.map((cy, index) => (
          <Finger key={`r${cy}`} cy={cy} side="right" number={index + 1} />
        ))}
      </svg>
      <figcaption className="hold-note">{translate("guide.hold.note")}</figcaption>
    </figure>
  );
}

function Finger({ cy, side, number }: { cy: number; side: "left" | "right"; number: number }) {
  const tail =
    side === "left"
      ? { x: LEFT_EDGE, width: HOLE_CX - LEFT_EDGE }
      : { x: HOLE_CX, width: RIGHT_EDGE - HOLE_CX };
  return (
    <g>
      <rect className={`hold-tail ${side}`} x={tail.x} y={cy - 9} width={tail.width} height={18} rx={9} />
      <circle className={`hold-pad ${side}`} cx={HOLE_CX} cy={cy} r={PAD_R} />
      <text className="hold-finger" x={HOLE_CX} y={cy + 5}>
        {number}
      </text>
    </g>
  );
}
