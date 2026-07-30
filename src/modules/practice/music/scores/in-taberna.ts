/**
 * In Taberna Quando Sumus - partitura do repertório do Treino.
 *
 * ALTURA decodificada da tablatura de 6 furos "09 - In Taberna quandu sumus.pdf"
 * (whistle em Ré) por imagem, com `tools/whistle-tab/tabdecode.py` +
 * `fingermap.py` - reproduzível, nenhuma nota digitada à mão. As alturas saem em
 * D5 grave e entram aqui uma oitava abaixo (WRITTEN_ROOT = D4), como o resto do
 * repertório em partitura.
 *
 * RITMO: SEM FONTE. A tablatura de furos não grafa duração e não há versão de
 * referência citada para esta peça - então nenhuma duração foi inventada (toda
 * nota em 1 tempo), e isso fica declarado no `source` e no `warnings`, visível na
 * ficha da música, como em This Old Man. Assim que houver uma referência de
 * ritmo, é só levantar as durações.
 */
import type { ScoreJSON } from '../score';

export const IN_TABERNA: ScoreJSON = {
  id: 'in-taberna',
  title: 'In Taberna Quando Sumus',
  collection: 'folk',
  pitchReference: 'whistle',
  timeSignature: [4, 4],
  pickupBeats: 0,
  key: { tonic: 'D', mode: 'major' },
  tempo: 110,
  toleranceCents: 30,
  source: {
    pitches:
      'Tablatura de 6 furos "09 - In Taberna quandu sumus.pdf" (whistle em Ré), decodificada por imagem',
    rhythm: 'SEM FONTE DE RITMO: toda nota em 1 tempo, a duração ainda precisa ser levantada',
  },
  irregularMeasures: [],
  warnings: [
    'SEM FONTE DE RITMO: toda nota em 1 tempo, a duração ainda precisa ser levantada',
  ],
  events: [
    // Frase A
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    // Frase A (repetição)
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'E', alter: 0, octave: 4 }, beats: 1 },
    // Frase B
    { pitch: { step: 'B', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'B', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'B', alter: 0, octave: 4 }, beats: 1 },
    // Frase B'
    { pitch: { step: 'B', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'G', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'F', alter: 1, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'A', alter: 0, octave: 4 }, beats: 1 },
    { pitch: { step: 'B', alter: 0, octave: 4 }, beats: 1 },
  ],
};
