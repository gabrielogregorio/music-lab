// Dados PUROS da referência de teoria do guia: a tabela de → para dos nomes de
// nota (solfejo ↔ letra ↔ notação ABC) e os padrões das escalas. Sem React nem
// i18n - só o material, que a UI e os testes consomem. Os nomes de nota (solfejo
// latino e letras A-G) são os mesmos em qualquer idioma; o que a UI traduz são só
// os rótulos e os textos ao redor.

export interface NoteName {
  /** Solfejo latino: Dó, Ré, Mi... */
  solfege: string;
  /** Letra (sistema anglo-saxão e da notação ABC): C, D, E... */
  letter: string;
  /** Notação ABC na oitava média (maiúscula). */
  abcMiddle: string;
  /** Notação ABC uma oitava acima (minúscula). */
  abcHigh: string;
  /** Semitons acima de Dó (C = 0). */
  semitoneFromC: number;
}

// As 7 notas naturais, começando em Dó (C) - a ordem que a contagem musical usa.
export const NATURAL_NOTES: NoteName[] = [
  { solfege: "Dó", letter: "C", abcMiddle: "C", abcHigh: "c", semitoneFromC: 0 },
  { solfege: "Ré", letter: "D", abcMiddle: "D", abcHigh: "d", semitoneFromC: 2 },
  { solfege: "Mi", letter: "E", abcMiddle: "E", abcHigh: "e", semitoneFromC: 4 },
  { solfege: "Fá", letter: "F", abcMiddle: "F", abcHigh: "f", semitoneFromC: 5 },
  { solfege: "Sol", letter: "G", abcMiddle: "G", abcHigh: "g", semitoneFromC: 7 },
  { solfege: "Lá", letter: "A", abcMiddle: "A", abcHigh: "a", semitoneFromC: 9 },
  { solfege: "Si", letter: "B", abcMiddle: "B", abcHigh: "b", semitoneFromC: 11 },
];

// As 12 notas da oitava (cromática), subindo de semitom em semitom, grafando os
// acidentes com sustenido (♯), como o modo cromático do guia mostra.
const SHARP = "♯";
export const CHROMATIC_NOTES: NoteName[] = [
  { solfege: "Dó", letter: "C", abcMiddle: "C", abcHigh: "c", semitoneFromC: 0 },
  { solfege: `Dó${SHARP}`, letter: `C${SHARP}`, abcMiddle: "^C", abcHigh: "^c", semitoneFromC: 1 },
  { solfege: "Ré", letter: "D", abcMiddle: "D", abcHigh: "d", semitoneFromC: 2 },
  { solfege: `Ré${SHARP}`, letter: `D${SHARP}`, abcMiddle: "^D", abcHigh: "^d", semitoneFromC: 3 },
  { solfege: "Mi", letter: "E", abcMiddle: "E", abcHigh: "e", semitoneFromC: 4 },
  { solfege: "Fá", letter: "F", abcMiddle: "F", abcHigh: "f", semitoneFromC: 5 },
  { solfege: `Fá${SHARP}`, letter: `F${SHARP}`, abcMiddle: "^F", abcHigh: "^f", semitoneFromC: 6 },
  { solfege: "Sol", letter: "G", abcMiddle: "G", abcHigh: "g", semitoneFromC: 7 },
  { solfege: `Sol${SHARP}`, letter: `G${SHARP}`, abcMiddle: "^G", abcHigh: "^g", semitoneFromC: 8 },
  { solfege: "Lá", letter: "A", abcMiddle: "A", abcHigh: "a", semitoneFromC: 9 },
  { solfege: `Lá${SHARP}`, letter: `A${SHARP}`, abcMiddle: "^A", abcHigh: "^a", semitoneFromC: 10 },
  { solfege: "Si", letter: "B", abcMiddle: "B", abcHigh: "b", semitoneFromC: 11 },
];

const WHOLE = 2; // tom = 2 semitons
const HALF = 1; // semitom = 1 semitom

// Padrões de intervalo (em semitons) das escalas, dentro de uma oitava.
export const SCALE_STEPS: Record<"major" | "minor" | "chromatic", number[]> = {
  major: [WHOLE, WHOLE, HALF, WHOLE, WHOLE, WHOLE, HALF],
  minor: [WHOLE, HALF, WHOLE, WHOLE, HALF, WHOLE, WHOLE],
  chromatic: [HALF, HALF, HALF, HALF, HALF, HALF, HALF, HALF, HALF, HALF, HALF, HALF],
};

// As notas (nomes) de uma escala a partir de uma tônica, seguindo o padrão de
// semitons - usada para mostrar, por exemplo, a escala de Dó maior por extenso.
export function scaleFromRoot(rootSemitone: number, steps: number[]): NoteName[] {
  const result: NoteName[] = [];
  let semitone = ((rootSemitone % 12) + 12) % 12;
  result.push(noteAtSemitone(semitone));
  steps.forEach((step) => {
    semitone = (semitone + step) % 12;
    result.push(noteAtSemitone(semitone));
  });
  return result;
}

function noteAtSemitone(semitone: number): NoteName {
  return CHROMATIC_NOTES.find((note) => note.semitoneFromC === semitone) ?? CHROMATIC_NOTES[0];
}
