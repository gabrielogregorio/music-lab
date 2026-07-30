/**
 * Uma "linha" (sistema) do pentagrama: clave, fórmula de compasso, barras e as
 * notas justificadas. A geometria horizontal vem de `placeSystem` - a mesma que
 * a tablatura usa, para o dedilhado cair sob a sua nota.
 *
 * As alturas são exibidas na oitava real (sem deslocamento), então melodias
 * graves aparecem embaixo, com linhas suplementares.
 */
import { accidentalGlyph, diatonicIndex } from '../music/notes';
import { STATUS_COLOR } from '../status';
import { tempoMark, beatUnitGlyph } from '../music/tempo';
import { placeSystem, SYS_W, RIGHT_PAD, type System } from '../music/layout';
import type { NoteStatus } from '../hooks/usePractice';

const LINE_GAP = 12; // distância entre linhas do pentagrama
const HALF = LINE_GAP / 2; // um passo diatônico (linha↔espaço)
const STAFF_TOP = 44; // y da linha de cima (Fá5)
const BOTTOM_LINE_Y = STAFF_TOP + LINE_GAP * 4; // linha de baixo (Mi4)
export const STAFF_SYS_H = 138; // altura lógica (folga p/ andamento, suplementares e lírica)
const STAFF_LEFT = 12;
const TIMESIG_X = 48;
const E4_DIATONIC = diatonicIndex({ letter: 'E', octave: 4, accidental: 'natural', name: 'E4', midi: 64 });
const HEAD_RX = 6;
const HEAD_RY = 4.6;
const STEM_LEN = LINE_GAP * 3.2;
const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];
const STAFF_LINE_INDICES = [0, 1, 2, 3, 4];
const HOLLOW_HEAD_MIN_BEATS = 2;
const STEMLESS_MIN_BEATS = 4;
const LEDGER_STEP_BELOW = -2;
const LEDGER_STEP_ABOVE = 10;
const TOP_LINE_STEP = 8;
const STEM_FLIP_STEP = 4;
// Figuras de ritmo (semínima = 1 tempo). Pontuadas valem 1,5x a base.
const DOTTED_VALUES = [0.75, 1.5, 3, 6];
const SIXTEENTH_MAX_BEATS = 0.25;
const EIGHTH_MAX_BEATS = 0.5;
const FLAG_GAP = 5.5; // distância entre bandeirolas empilhadas
const FLAG_REACH_X = 7;
const FLAG_REACH_Y = 12;
const DOT_RADIUS = 1.6;
const DOT_GAP_X = 4;

// Cores próprias do pentagrama (não são a paleta de status): nota já tocada,
// nota por vir e o "buraco" da cabeça vazada (mesma cor da folha).
const PLAYED_NOTE_COLOR = '#2f7d63';
const UPCOMING_NOTE_COLOR = '#6b8a99';
const HOLLOW_HEAD_FILL = '#010f17';
// Modo Leitura: sem cursor, a peça inteira é tinta cheia. Não é o cinza de "nota
// por vir" do Treino - aqui não há nota atual para diferenciar do resto.
const READING_NOTE_COLOR = '#010f17';
const PLAYED_OPACITY = 0.85;
const UPCOMING_OPACITY = 0.5;
const CURRENT_OPACITY = 1;
const CURRENT_RING_RADIUS = 11;
const RING_STROKE_WIDTH = 2.5;
const RING_TRACK_OPACITY = 0.28;

interface NoteAppearance {
  color: string;
  opacity: number;
}

/** Cor e opacidade de uma nota conforme já passou, é a atual, ou está por vir. */
export function noteAppearance(
  noteIndex: number,
  currentIndex: number,
  accent: string,
  reading = false,
): NoteAppearance {
  if (reading) return { color: READING_NOTE_COLOR, opacity: CURRENT_OPACITY };
  if (noteIndex < currentIndex) return { color: PLAYED_NOTE_COLOR, opacity: PLAYED_OPACITY };
  if (noteIndex === currentIndex) return { color: accent, opacity: CURRENT_OPACITY };
  return { color: UPCOMING_NOTE_COLOR, opacity: UPCOMING_OPACITY };
}

/** y do centro da cabeça da nota a partir do índice diatônico (oitava real). */
function noteY(diatonic: number): number {
  return BOTTOM_LINE_Y - (diatonic - E4_DIATONIC) * HALF;
}

interface RhythmFigure {
  hollow: boolean;
  hasStem: boolean;
  /** Bandeirolas: colcheia = 1, semicolcheia = 2, semínima+ = 0. */
  flags: number;
  dotted: boolean;
}

/** Figura de ritmo (cabeça, haste, bandeirola, ponto) a partir da duração em tempos. */
export function rhythmFigure(beats: number): RhythmFigure {
  const dotted = DOTTED_VALUES.some((value) => Math.abs(value - beats) < 1e-6);
  const base = dotted ? beats / 1.5 : beats;
  let flags = 0;
  if (base <= SIXTEENTH_MAX_BEATS + 1e-6) flags = 2;
  else if (base <= EIGHTH_MAX_BEATS + 1e-6) flags = 1;
  return {
    hollow: base >= HOLLOW_HEAD_MIN_BEATS - 1e-6,
    hasStem: base < STEMLESS_MIN_BEATS - 1e-6,
    flags,
    dotted,
  };
}

/** Caminho SVG de uma bandeirola no topo da haste (empilha `index` para baixo). */
function flagPath(stemX: number, tipY: number, stemUp: boolean, index: number): string {
  const direction = stemUp ? 1 : -1; // haste p/ cima: bandeirola desce
  const startY = tipY + direction * index * FLAG_GAP;
  const controlX = stemX + FLAG_REACH_X + 2;
  const controlY = startY + direction * (FLAG_REACH_Y / 2);
  const endX = stemX + FLAG_REACH_X;
  const endY = startY + direction * FLAG_REACH_Y;
  return `M ${stemX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

export interface SystemViewProps {
  system: System;
  /** Índice global do sistema (0 = 1ª linha). */
  index: number;
  currentIndex: number;
  status: NoteStatus;
  direction: 'up' | 'down' | null;
  holdProgress: number;
  tempo?: number;
  timeSignature?: [number, number];
  /** Modo Leitura: tinta cheia na peça inteira, sem cursor nem cinza de status. */
  reading?: boolean;
}

export function StaffSystem({
  system,
  index,
  currentIndex,
  status,
  direction,
  holdProgress,
  tempo,
  timeSignature,
  reading = false,
}: SystemViewProps) {
  const accent = STATUS_COLOR[status];
  const { notes, bars } = placeSystem(system);

  return (
    <svg
      viewBox={`0 0 ${SYS_W} ${STAFF_SYS_H}`}
      width="100%"
      className="staff-system"
      preserveAspectRatio="xMidYMid meet"
    >
      {STAFF_LINE_INDICES.map((lineIndex) => (
        <line
          key={lineIndex}
          x1={STAFF_LEFT}
          x2={SYS_W - RIGHT_PAD}
          y1={STAFF_TOP + lineIndex * LINE_GAP}
          y2={STAFF_TOP + lineIndex * LINE_GAP}
          className="staff-line"
        />
      ))}

      <text x={STAFF_LEFT} y={BOTTOM_LINE_Y + 4} className="staff-clef">
        𝄞
      </text>

      {/* marcação de andamento - só na 1ª linha */}
      {index === 0 && tempo != null && (
        <text x={STAFF_LEFT} y={STAFF_TOP - 22} className="staff-tempo">
          {tempoMark(tempo)} {beatUnitGlyph((timeSignature ?? DEFAULT_TIME_SIGNATURE)[1])} = {Math.round(tempo)}
        </text>
      )}

      {/* fórmula de compasso - em toda linha, para a leitura nunca perder o compasso */}
      {timeSignature && (
        <>
          <text x={TIMESIG_X} y={STAFF_TOP + LINE_GAP + 4} className="staff-timesig" textAnchor="middle">
            {timeSignature[0]}
          </text>
          <text x={TIMESIG_X} y={STAFF_TOP + LINE_GAP * 3 + 4} className="staff-timesig" textAnchor="middle">
            {timeSignature[1]}
          </text>
        </>
      )}

      {bars.map((barX, barIndex) => (
        <line key={`bar${barIndex}`} x1={barX} x2={barX} y1={STAFF_TOP} y2={BOTTOM_LINE_Y} className="staff-bar" />
      ))}

      {notes.map(({ laidNote, cx }) => {
        const noteIndex = laidNote.index;
        const note = laidNote.note;
        const isCurrent = noteIndex === currentIndex;

        if (note.isRest) {
          return (
            <text key={noteIndex} x={cx - 5} y={STAFF_TOP + LINE_GAP * 2 + 5} className="staff-rest">
              𝄽
            </text>
          );
        }
        const parsed = note.parsed!;
        const diatonic = diatonicIndex(parsed);
        const cy = noteY(diatonic);
        const step = diatonic - E4_DIATONIC;

        const { color, opacity } = noteAppearance(noteIndex, currentIndex, accent, reading);

        const ledgers: number[] = [];
        if (step < 0) {
          for (let ledgerStep = LEDGER_STEP_BELOW; ledgerStep >= step; ledgerStep -= 2) ledgers.push(ledgerStep);
        }
        if (step > TOP_LINE_STEP) {
          for (let ledgerStep = LEDGER_STEP_ABOVE; ledgerStep <= step; ledgerStep += 2) ledgers.push(ledgerStep);
        }

        const figure = rhythmFigure(note.beats);
        const stemUp = step < STEM_FLIP_STEP;
        const stemX = stemUp ? cx + HEAD_RX - 0.4 : cx - HEAD_RX + 0.4;
        const stemY2 = stemUp ? cy - STEM_LEN : cy + STEM_LEN;
        const isHollow = figure.hollow;
        // Ponto de aumento: à direita da cabeça, no espaço (sobe meio passo se a
        // nota está sobre uma linha).
        const isOnLine = ((step % 2) + 2) % 2 === 0;
        const dotY = isOnLine ? cy - HALF : cy;

        return (
          <g key={noteIndex} opacity={opacity}>
            {ledgers.map((ledgerStep) => {
              const ledgerY = BOTTOM_LINE_Y - ledgerStep * HALF;
              return (
                <line
                  key={ledgerStep}
                  x1={cx - HEAD_RX - 4}
                  x2={cx + HEAD_RX + 4}
                  y1={ledgerY}
                  y2={ledgerY}
                  className="staff-line"
                />
              );
            })}

            {parsed.accidental !== 'natural' && (
              <text x={cx - HEAD_RX - 13} y={cy + 5} fill={color} className="staff-accidental">
                {accidentalGlyph(parsed.accidental)}
              </text>
            )}

            {figure.hasStem && (
              <line x1={stemX} x2={stemX} y1={cy} y2={stemY2} stroke={color} strokeWidth={1.4} />
            )}

            {Array.from({ length: figure.flags }).map((_flag, flagIndex) => (
              <path
                key={flagIndex}
                d={flagPath(stemX, stemY2, stemUp, flagIndex)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}

            <ellipse
              cx={cx}
              cy={cy}
              rx={HEAD_RX}
              ry={HEAD_RY}
              transform={`rotate(-12 ${cx} ${cy})`}
              fill={isHollow ? HOLLOW_HEAD_FILL : color}
              stroke={color}
              strokeWidth={isHollow ? 1.8 : 1}
            />

            {figure.dotted && <circle cx={cx + HEAD_RX + DOT_GAP_X} cy={dotY} r={DOT_RADIUS} fill={color} />}

            {note.lyric && (
              <text x={cx} y={BOTTOM_LINE_Y + 30} className="staff-lyric" textAnchor="middle">
                {note.lyric}
              </text>
            )}

            {isCurrent && (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={CURRENT_RING_RADIUS}
                  fill="none"
                  stroke={accent}
                  strokeOpacity={RING_TRACK_OPACITY}
                  strokeWidth={RING_STROKE_WIDTH}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={CURRENT_RING_RADIUS}
                  fill="none"
                  stroke={accent}
                  strokeWidth={RING_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * CURRENT_RING_RADIUS}
                  strokeDashoffset={2 * Math.PI * CURRENT_RING_RADIUS * (1 - holdProgress)}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
                {direction && (
                  <text x={cx} y={STAFF_TOP - 6} textAnchor="middle" className="staff-arrow" fill={accent}>
                    {direction === 'up' ? '▲' : '▼'}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
