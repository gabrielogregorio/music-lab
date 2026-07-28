/**
 * O repertório do Treino: as partituras que acompanham o app.
 *
 * GERADO por `tools/partituras-import/import_scores.py` - não editar à mão.
 * As alturas vêm decodificadas das tablaturas de 6 furos da apostila; as
 * durações vêm de uma versão de referência citada em cada `source` (a tab de
 * furos não carrega duração nenhuma). Ver `score.ts` para o formato.
 */
import type { ScoreJSON } from './score';
import { INISHEER } from './scores/inisheer';
import { BRIAN_BORU } from './scores/brian-boru';
import { SALLY_GARDENS } from './scores/sally-gardens';
import { ILL_TELL_ME_MA } from './scores/ill-tell-me-ma';
import { JOHNNY_HARDLY_KNEW } from './scores/johnny-hardly-knew';
import { RAGGLE_TAGGLE } from './scores/raggle-taggle';
import { RATTLIN_BOG } from './scores/rattlin-bog';
import { DAWNING } from './scores/dawning';
import { BRITCHES } from './scores/britches';
import { DRUNKEN_SAILOR } from './scores/drunken-sailor';
import { MOLLY_MALONE } from './scores/molly-malone';
import { COUNTY_DOWN } from './scores/county-down';
import { SCARBOROUGH } from './scores/scarborough';
import { GREENSLEEVES } from './scores/greensleeves';
import { AULD_LANG_SYNE } from './scores/auld-lang-syne';
import { DANZA_DEL_OSO } from './scores/danza-del-oso';
import { SKYE_BOAT_SONG } from './scores/skye-boat-song';
import { SCOTLAND_THE_BRAVE } from './scores/scotland-the-brave';
import { THIS_OLD_MAN } from './scores/this-old-man';

export const REPERTOIRE: ScoreJSON[] = [
  INISHEER,
  BRIAN_BORU,
  SALLY_GARDENS,
  ILL_TELL_ME_MA,
  JOHNNY_HARDLY_KNEW,
  RAGGLE_TAGGLE,
  RATTLIN_BOG,
  DAWNING,
  BRITCHES,
  DRUNKEN_SAILOR,
  MOLLY_MALONE,
  COUNTY_DOWN,
  SCARBOROUGH,
  GREENSLEEVES,
  AULD_LANG_SYNE,
  DANZA_DEL_OSO,
  SKYE_BOAT_SONG,
  SCOTLAND_THE_BRAVE,
  THIS_OLD_MAN,
];

/** A partitura do repertório com esse id, ou undefined se a música não vier daqui. */
export function findScore(id: string): ScoreJSON | undefined {
  return REPERTOIRE.find((score) => score.id === id);
}
