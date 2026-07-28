/**
 * Como o Treino mostra a música: pela pauta, pelos furos, ou pelos dois.
 *
 * Vive num módulo próprio (e não no componente) porque é uma PREFERÊNCIA - a
 * persistência em localStorage e a UI precisam do mesmo tipo sem que o hook
 * dependa do componente.
 */
export type ScoreView = 'staff' | 'tab' | 'both';

export const SCORE_VIEWS: ScoreView[] = ['staff', 'tab', 'both'];

export const DEFAULT_SCORE_VIEW: ScoreView = 'both';

export function isScoreView(value: unknown): value is ScoreView {
  return typeof value === 'string' && (SCORE_VIEWS as string[]).includes(value);
}
