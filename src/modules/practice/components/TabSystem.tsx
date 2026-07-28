/**
 * Uma "linha" da TABLATURA de 6 furos: a mesma linha da partitura, mas escrita
 * como o instrumento - uma coluna de furos por nota, na mesma posição
 * horizontal da nota correspondente (`placeSystem`).
 *
 * O que a apostila de papel não tem e aqui tem: TEMPO. Cada conjunto de dedos
 * ganha uma barra de duração embaixo, com largura proporcional à figura, e o
 * glifo da figura em cima - a coluna atual preenche essa barra conforme o
 * usuário sustenta a nota. É o mesmo relógio da partitura, lido pelos dedos.
 */
import { fingeringToShow, type HoleState } from '../music/fingerings';
import { holeFill, STATUS_COLOR } from '../status';
import { placeSystem, SYS_W, RIGHT_PAD } from '../music/layout';
import { noteAppearance, type SystemViewProps } from './StaffSystem';

export const TAB_SYS_H = 132;

const HOLE_COUNT = 6;
const FIRST_HOLE_Y = 30;
const HOLE_SPACING_Y = 13;
const HOLE_RADIUS = 4.6;
const HOLE_STROKE_WIDTH = 1.6;
const OCTAVE_MARK_Y = FIRST_HOLE_Y + HOLE_COUNT * HOLE_SPACING_Y + 4;
const GLYPH_Y = 16;
const DURATION_BAR_Y = OCTAVE_MARK_Y + 10;
const DURATION_BAR_HEIGHT = 4;
const DURATION_BAR_RADIUS = 2;
const DURATION_BAR_TRACK_OPACITY = 0.22;
const COLUMN_PADDING = 3;
const COLUMN_RADIUS = 6;
const CURRENT_COLUMN_OPACITY = 0.12;
const STAFF_LEFT = 12;
const BAR_TOP = GLYPH_Y + 6;
const BAR_BOTTOM = DURATION_BAR_Y + DURATION_BAR_HEIGHT;
const REST_Y = FIRST_HOLE_Y + HOLE_SPACING_Y * 2;

const ALL_OPEN: HoleState[] = [0, 0, 0, 0, 0, 0];

// Figuras rítmicas em tempos (semínima = 1), da mais longa para a mais curta.
// A primeira cujo limiar a nota alcança é a figura desenhada.
const RHYTHM_GLYPHS: { minBeats: number; glyph: string }[] = [
  { minBeats: 4, glyph: '\u{1D15D}' }, // 𝅝 semibreve
  { minBeats: 3, glyph: '\u{1D15E}.' }, // 𝅗𝅥. mínima pontuada
  { minBeats: 2, glyph: '\u{1D15E}' }, // 𝅗𝅥 mínima
  { minBeats: 1.5, glyph: '♩.' },
  { minBeats: 1, glyph: '♩' },
  { minBeats: 0.75, glyph: '♪.' },
  { minBeats: 0.5, glyph: '♪' },
  { minBeats: 0, glyph: '\u{1D161}' }, // 𝅘𝅥𝅯 semicolcheia
];

/** Figura rítmica de uma duração em tempos. */
export function rhythmGlyph(beats: number): string {
  const match = RHYTHM_GLYPHS.find((entry) => beats >= entry.minBeats);
  return match ? match.glyph : '♩';
}

interface TabSystemProps extends SystemViewProps {
  whistleKey: string;
  /**
   * Só serve de rede: quando a nota não existe na tessitura, cai no dedilhado
   * da classe dela em vez de marcar ✕. Nota que existe é sempre desenhada na
   * oitava real - é dela que vem o "+".
   */
  octaveAgnostic: boolean;
}

export function TabSystem({
  system,
  currentIndex,
  status,
  holdProgress,
  whistleKey,
  octaveAgnostic,
}: TabSystemProps) {
  const accent = STATUS_COLOR[status];
  const { notes, bars } = placeSystem(system);

  return (
    <svg
      viewBox={`0 0 ${SYS_W} ${TAB_SYS_H}`}
      width="100%"
      className="tab-system"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={STAFF_LEFT} x2={SYS_W - RIGHT_PAD} y1={BAR_TOP} y2={BAR_TOP} className="tab-rail" />

      {bars.map((barX, barIndex) => (
        <line key={`bar${barIndex}`} x1={barX} x2={barX} y1={BAR_TOP} y2={BAR_BOTTOM} className="staff-bar" />
      ))}

      {notes.map(({ laidNote, cx, width }) => {
        const noteIndex = laidNote.index;
        const note = laidNote.note;
        const isCurrent = noteIndex === currentIndex;
        const { color, opacity } = noteAppearance(noteIndex, currentIndex, accent);
        const barWidth = Math.max(6, width - COLUMN_PADDING * 2);

        if (note.isRest) {
          return (
            <text key={noteIndex} x={cx} y={REST_Y} textAnchor="middle" className="staff-rest">
              𝄽
            </text>
          );
        }

        const fingering = fingeringToShow(note.parsed!.midi, whistleKey, octaveAgnostic);
        const holes = fingering?.holes ?? ALL_OPEN;

        return (
          <g key={noteIndex} opacity={opacity}>
            {isCurrent && (
              <rect
                x={cx - barWidth / 2 - COLUMN_PADDING}
                y={BAR_TOP + 2}
                width={barWidth + COLUMN_PADDING * 2}
                height={BAR_BOTTOM - BAR_TOP - 2}
                rx={COLUMN_RADIUS}
                className="tab-current"
                fill={accent}
                fillOpacity={CURRENT_COLUMN_OPACITY}
              />
            )}

            <text x={cx} y={GLYPH_Y} textAnchor="middle" className="tab-rhythm" fill={color}>
              {rhythmGlyph(note.beats)}
            </text>

            {holes.map((holeState, holeIndex) => (
              <circle
                key={holeIndex}
                cx={cx}
                cy={FIRST_HOLE_Y + holeIndex * HOLE_SPACING_Y}
                r={HOLE_RADIUS}
                fill={holeFill(holeState, color)}
                stroke={color}
                strokeWidth={HOLE_STROKE_WIDTH}
              />
            ))}

            {/* "+" é a marca de sobressopro das apostilas de whistle: 2ª oitava. */}
            {fingering?.overblow && (
              <text x={cx} y={OCTAVE_MARK_Y} textAnchor="middle" className="tab-overblow" fill={color}>
                +
              </text>
            )}
            {!fingering && (
              <text x={cx} y={OCTAVE_MARK_Y} textAnchor="middle" className="tab-overblow" fill={color}>
                ✕
              </text>
            )}

            {/* barra de duração: o "tempo" daquele conjunto de dedos */}
            <rect
              x={cx - barWidth / 2}
              y={DURATION_BAR_Y}
              width={barWidth}
              height={DURATION_BAR_HEIGHT}
              rx={DURATION_BAR_RADIUS}
              className="tab-duration-track"
              fill={color}
              fillOpacity={DURATION_BAR_TRACK_OPACITY}
            />
            {isCurrent && (
              <rect
                x={cx - barWidth / 2}
                y={DURATION_BAR_Y}
                width={barWidth * Math.max(0, Math.min(1, holdProgress))}
                height={DURATION_BAR_HEIGHT}
                rx={DURATION_BAR_RADIUS}
                className="tab-duration-fill"
                fill={accent}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
