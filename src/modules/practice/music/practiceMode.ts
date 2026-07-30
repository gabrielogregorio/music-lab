/**
 * Os dois jeitos de usar o Treino.
 *
 * - `practice`: o modo com microfone - a música avança nota a nota quando você
 *   acerta a afinação, e a tela mostra dedilhado, ponteiro e sustentação.
 * - `read`: a peça INTEIRA na tela, sem microfone e sem julgamento nenhum. É
 *   para tocar por conta, lendo de ponta a ponta; a paginação que segue o
 *   cursor não faz sentido aqui, porque não há cursor.
 *
 * Mora ao lado de `scoreView` (e não no componente) porque é PREFERÊNCIA: o
 * localStorage e a UI precisam do mesmo tipo.
 */
export type PracticeMode = 'practice' | 'read';

export const PRACTICE_MODES: PracticeMode[] = ['practice', 'read'];

export const DEFAULT_PRACTICE_MODE: PracticeMode = 'practice';

export function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && (PRACTICE_MODES as string[]).includes(value);
}
