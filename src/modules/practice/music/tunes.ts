/**
 * Repertório de tin whistle. Gerado por `tools/whistle-tab/` - NÃO editar à mão
 * (rode `python3 build_tunes.py`). A ALTURA de cada nota vem DECODIFICADA da
 * tablatura de 6 furos da apostila (furos cheios/vazados + o "+" de
 * sobressopro). A DURAÇÃO é o ritmo REAL da melodia (`rhythms.py`): airs
 * sustentados (Scarborough, Dawning, Auld Lang Syne) têm o ritmo escrito nota a
 * nota; danças/marchas/reels correm em colcheias com semínimas de cadência - o
 * ritmo autêntico delas. Só Inisheer segue em ABC de thesession.org.
 *
 * Escrita em altura de CONCERTO, com o Ré grave do whistle grafado como `D`
 * (D4); `whistleTuning.ts` transpõe para a afinação escolhida. `origin` diz de
 * qual apostila veio e traz o vídeo de referência quando o PDF tinha um.
 */

export interface WhistleTune {
  id: string;
  title: string;
  /** Agrupamento na biblioteca: sufixo da chave i18n `practice.collection.*`. */
  collection: 'irish' | 'ballads';
  abc: string;
  tempo: number;
  toleranceCents: number;
  /** Procedência da melodia, mostrada na ficha da música. */
  origin: string;
}

/** O tune do repertório com esse id, ou undefined se a música não vier daqui. */
export function findTune(id: string): WhistleTune | undefined {
  return WHISTLE_TUNES.find((tune) => tune.id === id);
}

export const WHISTLE_TUNES: WhistleTune[] = [
  {
    id: 'inisheer',
    title: 'Inisheer',
    collection: 'irish',
    tempo: 92,
    toleranceCents: 35,
    origin: 'Tommy Walsh · thesession.org/tunes/211 (setting 20740)',
    abc: `X:1
T:Inisheer
C:Tommy Walsh
R:waltz
M:3/4
L:1/8
K:Gmaj
D2|:B3A Bd|B3A Bd|E3B AB|D3B AG|
B3A Bd|B3A Bd|G3B AB|1 G4D2:|2 G6||
|:e3f ed|B3A Bd|ef ed Bd|e3fgf|
e3f ed|B3A Bd|D3B AB|G6:|`,
  },
  {
    id: 'brian-boru',
    title: 'Brian Boru\'s March',
    collection: 'irish',
    tempo: 100,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 4) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/zw7ai0rJ7NA',
    abc: `X:1
T:Brian Boru's March
M:4/4
L:1/8
K:Dmaj
B A G F E E2 B|A G F E E2 A G|F E D D2 A G F|E D D2 B A G F|
E E2 B A G F E|E2 E G A B A G|F E E2 E G A B2|A B2 A B2 A2|
D F G A2 G A2|G A G2 E G A B2|A B2 A B2 A2|E G A B A G F E|
E4|`,
  },
  {
    id: 'sally-gardens',
    title: 'Down by the Sally Gardens',
    collection: 'irish',
    tempo: 92,
    toleranceCents: 35,
    origin: 'Tablatura da apostila do curso (Semana 6) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/-EELeFS2FM4',
    abc: `X:1
T:Down by the Sally Gardens
M:4/4
L:1/8
K:Dmaj
D E2 F2 E D E2|F A2 B2 A2 d|A2 B A F E2 D2|D2 D E2 F2 E|
D E2 F A2 B2|A2 d A2 B A F|E2 D2 D2 A d2|c A B d c2 B A2|
F A2 B A F2 A|B d e d4|`,
  },
  {
    id: 'ill-tell-me-ma',
    title: 'I\'ll Tell Me Ma',
    collection: 'irish',
    tempo: 120,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 2) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/gp0MvWzNNfY',
    abc: `X:1
T:I'll Tell Me Ma
M:4/4
L:1/8
K:Dmaj
D G B2 B =c B B2|B B A A2 B A G|G2 D G B2 B =c|B B2 B B A A B|
A G G2 d d d2|B2 =c =c =c2 A2|B B B2 G A F E|D2 d d d2 B2|
=c =c =c2 B2 G G|A F2 G G G4|`,
  },
  {
    id: 'johnny-hardly-knew',
    title: 'Johnny I Hardly Knew Ya',
    collection: 'irish',
    tempo: 104,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 3) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/bN7LAOiJ77c',
    abc: `X:1
T:Johnny I Hardly Knew Ya
M:4/4
L:1/8
K:Dmaj
D E2 E E2 F G|F G2 E D E D2|D E2 E E2 F G|F G2 A B G B2|
A B2 B B A G A2|A A G F G2 G G|F E F2 F F2 G|A B A G A G F G|
F E F E D2 E E|E D E E4|`,
  },
  {
    id: 'raggle-taggle',
    title: 'Raggle Taggle Gypsy',
    collection: 'irish',
    tempo: 104,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 4) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/TG6jLquGhIw',
    abc: `X:1
T:Raggle Taggle Gypsy
M:4/4
L:1/8
K:Dmaj
B A G F E2 B A|G F E2 e e f e|d B A B2 B c d|d e2 B c d c B|
A B2 E F G F G|A B d B A G F E4|`,
  },
  {
    id: 'rattlin-bog',
    title: 'The Rattlin\' Bog',
    collection: 'irish',
    tempo: 126,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 2) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/G4RsIjhr9XY',
    abc: `X:1
T:The Rattlin' Bog
M:4/4
L:1/8
K:Dmaj
B B2 A G2 E E2|D2 G G2 A2 B|A A2 B B2 A G2|E E2 D2 d d B2|
A G G2 B2 G A|G2 B G A G2 B2|d3 B A A2 B2|G A G2 B G A G2|
B2 d d2 B2 A|G G4|`,
  },
  {
    id: 'dawning',
    title: 'The Dawning of the Day',
    collection: 'irish',
    tempo: 88,
    toleranceCents: 35,
    origin: 'Tablatura da apostila do curso · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/G4RsIjhr9XY',
    abc: `X:1
T:The Dawning of the Day
M:3/4
L:1/8
K:Dmaj
D2 E2 F2|F F E2 F2|A2 A B A2|F D F2 E2|
D2 D4|D2 A B A B|d2 F2 E2|D2 F2 G2|
A2 F6|d2 F2 E2|A B A B d2|F2 E2 D2|
F2 G2 A2|F6|d2 F2 E6|`,
  },
  {
    id: 'scarborough',
    title: 'Scarborough Fair',
    collection: 'ballads',
    tempo: 76,
    toleranceCents: 35,
    origin: 'Tablatura da apostila do curso · dedilhado decodificado do PDF; ritmo da melodia real',
    abc: `X:1
T:Scarborough Fair
M:3/4
L:1/8
K:Dmaj
E2 E2 B2|B2 F G F2|E4 B2|d2 e2 d2|
B2 c A B4|e2 e2 e2|d2 B2 B2|A G F2 E2|
D E B2 A2|G2 F2 E2|D2 E6|`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    collection: 'ballads',
    tempo: 96,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso · dedilhado decodificado do PDF; ritmo da melodia real',
    abc: `X:1
T:Greensleeves
M:6/8
L:1/8
K:Dmaj
B d e f g f|e c A2 B c|d B B A B c|A F2 B d e|
f g f e c A2|B c d c B A|A A B B2 a|a g f e c A2|
B c d B B A|B c A F2 a|a g f e c A2|B c d c B A|
A A B B4|`,
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    collection: 'ballads',
    tempo: 80,
    toleranceCents: 35,
    origin: 'Tablatura da apostila do curso · dedilhado decodificado do PDF; ritmo da melodia real',
    abc: `X:1
T:Auld Lang Syne
M:4/4
L:1/8
K:Dmaj
D2 G3 G G2|B2 A3 G A2|B2 A G G B d2|e2 e4 d2|
B3 B G2 A2|G2 A2 B2 A2|G4 E2 E2|D2 G2 e4|
d2 B3 B G2|A2 G2 A2 e2|d2 B4 B2|d2 e2 e4|
d2 B3 B G2|A2 G2 A2 B2|A2 G4 E2|E2 D2 E6|`,
  },
  {
    id: 'danza-del-oso',
    title: 'Danza del Oso',
    collection: 'ballads',
    tempo: 108,
    toleranceCents: 30,
    origin: 'Tablatura da apostila do curso (Semana 7) · dedilhado decodificado do PDF; ritmo da melodia real · referência: youtu.be/GYqKG4qT2pM',
    abc: `X:1
T:Danza del Oso
M:4/4
L:1/8
K:Dmaj
B E E2 B A B E|E2 G A B A B A|G A2 G A B A B|A G F G2 G F E|
D E2 G F E D E2|E F G E F G F D|D2 E F G E F G2|A2 G A B A B A|
G F G2 G F E D|E2 G F E D E4|`,
  },
];
