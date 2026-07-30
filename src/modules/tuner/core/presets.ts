/**
 * Presets do afinador.
 *
 * MUDANÇA de filosofia (a pedido do dono): o afinador foca no SOM, não no
 * instrumento. A DETECÇÃO é sempre cromática e larga - a mesma faixa
 * compartilhada com o Treino (`src/audio/pitchRange.ts`) - então qualquer nota
 * que você toque entra e aparece a nota mais próxima e o quanto está desviada.
 * Antes a faixa era estreitada por instrumento (defesa contra erro de oitava), e
 * era isso que fazia o afinador "não registrar" o que caía fora.
 *
 * O que o preset ainda define é só o CONFORTO: a banda verde (tolerância) e uma
 * dica. "Afinado" quer dizer coisas diferentes - um sopro varre dezenas de cents
 * só de pressão de ar - mas isso mexe na banda, nunca no que é ouvido.
 */
import { PITCH_RANGE, type PitchRange } from "../../../audio/pitchRange";

export type InstrumentKind = "chromatic" | "whistle" | "recorder" | "flute" | "ocarina";

export interface InstrumentDef {
  kind: InstrumentKind;
  icon: string;
  nameKey: string;
  /** Banda verde padrão. O usuário pode mexer. */
  toleranceCents: number;
  /** Sopro aquece e sobe - vale avisar antes de o músico "consertar" o
   *  instrumento pra agradar o afinador. */
  warmsUp: boolean;
  tipKey?: string;
}

// Cromático primeiro: é o padrão e o modo "qualquer som". Os demais só trocam a
// largura da banda verde e trazem uma dica - a detecção é a mesma para todos.
export const INSTRUMENTS: InstrumentDef[] = [
  {
    kind: "chromatic",
    icon: "🎹",
    nameKey: "tuner.inst.chromatic",
    toleranceCents: 10,
    warmsUp: false,
  },
  {
    kind: "whistle",
    icon: "🎵",
    nameKey: "tuner.inst.whistle",
    toleranceCents: 12,
    warmsUp: true,
    tipKey: "tuner.tip.whistle",
  },
  {
    kind: "recorder",
    icon: "🪈",
    nameKey: "tuner.inst.recorder",
    toleranceCents: 12,
    warmsUp: true,
    tipKey: "tuner.tip.recorder",
  },
  {
    kind: "flute",
    icon: "🎶",
    nameKey: "tuner.inst.flute",
    toleranceCents: 10,
    warmsUp: true,
    tipKey: "tuner.tip.flute",
  },
  {
    kind: "ocarina",
    icon: "🏺",
    nameKey: "tuner.inst.ocarina",
    toleranceCents: 12,
    warmsUp: true,
    tipKey: "tuner.tip.ocarina",
  },
];

export const DEFAULT_INSTRUMENT: InstrumentKind = "chromatic";

export function instrumentByKind(kind: InstrumentKind): InstrumentDef {
  return INSTRUMENTS.find((instrument) => instrument.kind === kind) ?? INSTRUMENTS[0];
}

export type SearchRange = PitchRange;

/**
 * A faixa de detecção. É a mesma para qualquer instrumento (e a mesma do Treino):
 * o afinador ouve o som, não o instrumento. Fica como função para o motor
 * continuar recebendo `{ minHz, maxHz }` como antes.
 */
export function detectionRange(): SearchRange {
  return PITCH_RANGE;
}
