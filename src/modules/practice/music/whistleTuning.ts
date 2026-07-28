/**
 * Como uma melodia escrita em ABC vira a melodia que a SUA whistle toca.
 *
 * A regra do mundo real: um tune de sessão é escrito em altura de concerto, com
 * o Ré grave do whistle grafado como `D` (D4) - e quem toca num whistle em Ré
 * soa uma oitava acima. Quem toca a MESMA digitação num whistle em Dó soa um
 * tom abaixo disso. Ou seja: trocar de whistle não é escolher outra edição da
 * partitura, é transpor a peça inteira pelo intervalo entre as duas tônicas.
 *
 * É por isso que as músicas "cabem nos furinhos" em qualquer afinação: o
 * dedilhado é idêntico, muda só a altura que sai (e é essa altura que o
 * microfone precisa ouvir).
 *
 * A transposição carrega DOIS números - semitons e passos diatônicos - porque
 * só o par preserva a grafia: de Ré para Dó são 10 semitons E 6 graus, então
 * Fá♯ vira Mi (não Fá♭).
 */
import { diatonicIndex, noteNameAt, parseNote } from './notes';
import { whistleKeyById } from './fingerings';

/**
 * Altura de referência da escrita: nas partituras e nos ABC de sessão, a nota
 * mais grave do whistle em Ré é escrita como D4.
 */
export const WRITTEN_ROOT = 'D4';

export interface Transposition {
  semitones: number;
  diatonicSteps: number;
}

export const NO_TRANSPOSITION: Transposition = { semitones: 0, diatonicSteps: 0 };

/** Intervalo entre a escrita de referência e a tônica grave da whistle escolhida. */
export function transpositionToWhistle(keyId: string): Transposition {
  const written = parseNote(WRITTEN_ROOT);
  const sounding = parseNote(whistleKeyById(keyId).rootName);
  return {
    semitones: sounding.midi - written.midi,
    diatonicSteps: diatonicIndex(sounding) - diatonicIndex(written),
  };
}

/**
 * Transpõe um nome de nota preservando a grafia. Devolve null quando o
 * resultado exigiria um acidente impossível de grafar (nunca acontece com os
 * intervalos entre whistles, mas o chamador não precisa confiar nisso).
 */
export function transposeNoteName(name: string, transposition: Transposition): string | null {
  const note = parseNote(name);
  return noteNameAt(
    diatonicIndex(note) + transposition.diatonicSteps,
    note.midi + transposition.semitones,
  );
}
