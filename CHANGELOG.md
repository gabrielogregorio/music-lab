# Changelog

## 2.10.0 - Afinador cromático: ouve o som, não o instrumento

O afinador "não registrava" quando você tocava fora do estreito - inclusive tocando
desafinado, que é justo o que se quer ver. Causa: a faixa de busca do YIN era estreitada
por instrumento (whistle em Ré ⇒ piso ~554 Hz), como defesa contra erro de oitava, e o
que caísse fora virava silêncio. O Treino nunca teve esse problema porque sempre usou uma
faixa larga e agnóstica (~55-2100 Hz).

Agora o afinador **ouve o som, não o instrumento**:

- **Detecção cromática e agnóstica**: a faixa larga saiu para `src/audio/pitchRange.ts` e
  é **compartilhada com o Treino** - os dois ouvem o microfone com a mesma régua. Qualquer
  nota entra e aparece a nota mais próxima e o quanto está desviada.
- **Sem foco em Dó/Ré**: o seletor de afinação do whistle saiu do afinador (não estreitava
  mais nada). O padrão agora é **cromático**; o seletor de instrumento só ajusta a largura
  da banda verde e traz uma dica - nunca o que é ouvido.
- O preço aceito: a janela de análise sai do grave da faixa larga, então um pouco mais de
  latência - de propósito, para não perder nota.

## 2.9.1 - Seletor de idiomas visível no mobile

Dois problemas somados faziam o seletor de idiomas "sumir":

1. **Dependia só da flag emoji** - e as flags de Escócia/País de Gales (subdivisão) e as
   regionais não renderizam em muito Android/Windows, então os botões ficavam em branco.
   Agora cada botão mostra também o **código em texto** (PT, EN, ES...), sempre legível.
2. **Ficava espremido no canto direito** do cabeçalho e, com a janela estreita ou o zoom
   reduzido (viewport CSS maior que a janela), escorregava para fora da vista - sem
   depender de nenhum breakpoint. Agora o seletor vive **sempre na própria linha, largura
   total, ancorado à esquerda** e rolável na horizontal: não tem canto direito para
   cortar, em nenhuma largura ou zoom. Alvo de toque maior em tela estreita.

### A barra de abas do mobile agora fica mesmo embaixo

No celular a nav vira uma tab bar `position: fixed; bottom: 0` - mas ela aparecia colada
no **topo**, logo abaixo do cabeçalho. Causa: `.site-head` tinha `backdrop-filter: blur()`,
e filtro/`backdrop-filter` num ancestral cria bloco de contenção para descendentes
`fixed`, então o `bottom: 0` era o rodapé do HEADER, não o da viewport. No mobile
(`≤640px`) o `backdrop-filter` foi removido do cabeçalho e a barra volta a fixar no
rodapé da tela. (Verificado com captura headless a 390px.)

## 2.9.0 - Conversor: aceita "F#", vai à 3ª oitava e escolhe a vista

### "F#" agora funciona (era erro de símbolo)

ABC grafa sustenido com `^` ANTES da nota (`^F`), nunca `F#` - então colar um tune com
`F#` disparava "não entendi #" (e o `'` de oitava logo depois virava dano colateral,
lido solto). Agora `normalizeSharps` (em `music/transform.ts`) converte `F#` → `^F` no
TEXTO, antes do abcjs E do parser, para os dois lerem o mesmo sustenido. Símbolos de
acorde entre aspas (`"F#m"`), campos de tom (`K:F#`, `[K:F#]`) e cabeçalhos ficam
intactos - lá o `#` é legítimo. (Dica: em `K:Amaj` nem precisa do sustenido, a armadura
já deixa Fá/Dó/Sol sustenidos.)

### Vazamento para a 3ª oitava

A tabela de furos do whistle ia até 2 oitavas (`MAX_OFFSET` 24) e marcava com `✕` tudo
acima. Agora vai a **3 oitavas** (`MAX_OFFSET` 36): o topo extremo, que só sai em alguns
casos e com sopro forte, mas os dedos são os mesmos. O diagrama distingue as oitavas por
anéis acima da coluna: nenhum (1ª), um (2ª, sobressopro), **dois empilhados (3ª)**.

### Escolher a vista: partitura / tablatura / ambas

O Conversor ganhou o mesmo seletor do Treino: **partitura** (só a pauta), **tablatura**
(só a coluna de furos, reusando `renderTabSvg`) ou **ambas** (os diagramas alinhados sob
cada nota, o padrão de antes). Substitui o antigo checkbox "dedilhado alinhado".

## 2.8.0 - Referência de teoria no guia e Leitura em tinta cheia

### Digitações: material de teoria (de → para dos nomes)

O guia (`#/guide`) ganhou uma seção de **referência** abaixo da carta de digitação:
uma tabela de → para casando **solfejo ↔ letra (A-G) ↔ notação ABC** (oitava média e
aguda, mais os semitons a partir de Dó), a escala de Dó maior por extenso, e resumos
curtos de **o que é uma escala**, **o que é cromático**, **como ler a partitura** e
**como ler a notação ABC irlandesa** (com um exemplo). Os dados são puros e testados
(`guide/theory.ts`); os textos moram no i18n em pt e en, com fallback en nos outros 9
idiomas (traduzir teoria musical à máquina para galês/gaélico etc. arriscaria a
correção - fica pendente de tradução humana).

### Treino: modo Leitura em tinta cheia

No modo **Leitura** a partitura (e a tablatura) saíam em cinza-claro, como se fosse a
nota "por vir" do Treino - mas em Leitura não há cursor, é a peça inteira para tocar por
conta. Agora a Leitura desenha tudo em tinta cheia (preto, opacidade 1); o cinza de
status só existe no Treino, onde diferencia nota tocada / atual / por vir
(`noteAppearance(..., reading)`).

## 2.7.0 - Vozes compartilhadas, Song Maker maior e export de MIDI/WAV

### Biblioteca de vozes compartilhada

As vozes Web Audio saíram de dentro do Song Maker (`songmaker/audio/synth.ts`) para
`src/audio/voices.ts`, um **ponto compartilhado** que o Song Maker e o Teclado tocam
juntos. De 6 subiu para **16 vozes melódicas** (marimba, piano, strings, woodwind,
synth, flute - intocadas - mais music box, bells, bass, organ, harp, brass, clarinet,
vibraphone, accordion, guitar, com partial de oitava, detune ou vibrato conforme o
timbre), todas ainda sintetizadas, sem sample (a CSP do Pages não deixaria carregar).

### Song Maker: mais grade

A melodia ganhou **2 linhas** no topo (`EXTRA_TOP_ROWS`, continuando a escala acima da
tônica de fechamento) e a percussão foi de 2 para **3 linhas** (`PERCUSSION_ROWS`) -
uma 3ª batida mais grave. O que já existia ficou intocado: os índices de linha antigos
seguem apontando para a mesma altura/som, então músicas salvas continuam casando.

### Export em MIDI e WAV

O menu de baixar agora oferece, além do JSON: **MIDI** (`.mid`, Standard MIDI File
formato 0 - melodia no canal 1, percussão no canal 10 de bateria) e **áudio WAV**
(`.wav`, renderizado num `OfflineAudioContext` com as mesmas vozes e codificado em PCM
16 bits). Tudo nativo, sem dependência nova. MP3 ficou de fora de propósito: exigiria
embarcar um encoder (lamejs), e WAV já entrega o áudio lossless sem esse peso. O plano
da música (`export/plan.ts`) e os bytes de MIDI/encoder de WAV são puros e testados; só
o render em si depende do navegador.

## 2.6.1 - In Taberna Quando Sumus no repertório

Mais uma peça no repertório do Treino (agora 20). A **altura** foi decodificada por
imagem da tablatura de 6 furos "09 - In Taberna quandu sumus.pdf" com
`tools/whistle-tab/tabdecode.py` + `fingermap.py` (reproduzível, nenhuma nota digitada
à mão), escrita à régua de `D4`. O **ritmo NÃO foi inventado**: não há versão de
referência citada para esta tablatura, então ela entra com `SEM FONTE DE RITMO` (toda
nota em 1 tempo), declarado no `source` e no `warnings` e visível na ficha - o mesmo
caminho honesto de This Old Man. Fica pendente de uma fonte de ritmo para levantar as
durações.

## 2.6.0 - Teclado, e as músicas viraram ponto global

### As músicas saíram de dentro do Treino

A biblioteca de músicas morava dentro do Treino (`useLibrary`, em `useStorage.ts`).
Agora ela é um **ponto global agnóstico** em `src/songs/`: `useSongLibrary` compõe os
exercícios, o repertório de whistle (partituras transpostas) e as músicas do usuário
numa lista de seções, e `localStore.ts` guarda o `loadJson`/`saveJson`. O Treino
consome dela como antes; qualquer módulo novo também. Música que o usuário salva
aparece nos dois. O modelo `SongJSON` e o repertório continuam em `practice/music`
(núcleo gerado) - a library monta a biblioteca por cima.

### Teclado (piano na tela)

Novo módulo em `#/keyboard`: um piano que toca a MESMA biblioteca do Treino.

- **Quantidade de teclas ajustável** (`music/keys.ts`, puro): slider de 7 a 49 teclas
  + botões de oitava. Ao escolher a música, o teclado se encaixa na tessitura dela.
- **Som escolhível**: reusa as 6 vozes melódicas do Song Maker (`playMelodyNote`), sem
  duplicar síntese.
- **Notas caindo** (estilo Synthesia, `music/falling.ts` + `FallingNotes`): modo
  autoplay - as peças descem e batem na tecla no tempo da música, com o teclado
  acendendo. É visualização; o julgamento por microfone segue sendo do Treino. É um
  toggle, gravado em `music-lab:keyboard` junto com som, nº de teclas e faixa.

O motor de áudio (`audio/engine.ts`) é um scheduler de lookahead que agenda as notas
no relógio de amostras e reporta a tecla ativa no rAF - testado de verdade com um
AudioContext falso (não mockado), o que já pegou um "-1" duplicado no fim da música.

## 2.5.0 - Modo Leitura e o microfone que não desligava

### Dois modos: Treino e Leitura

O Treino sempre foi uma coisa só - microfone ligado, a música avançando quando
você acerta a nota. Faltava o outro uso: **tocar por conta**, lendo a peça de
ponta a ponta. Agora são duas abas ao lado do botão de tocar.

Na **Leitura** a peça abre INTEIRA. A folha do Treino vira a página seguindo a
nota atual; sem cursor, paginar só esconderia música - então o modo leitura
desliga a paginação em vez de herdá-la. Somem o dedilhado, o ponteiro de
afinação e os ajustes de julgamento (tolerância, sustentação, ignorar oitava,
articulação), que só fazem sentido com microfone. **Ficam** o andamento e a
escolha de partitura / tablatura / as duas - é leitura, e ler é o ponto.

O modo é preferência, então fica gravado entre sessões junto com a whistle e a
oitava de leitura.

### Correção: o microfone continuava aberto

O navegador seguia acusando captura depois de parar. Eram dois furos:

1. **`practice.stop()` não parava o `useMic`.** Parar a prática e parar a
   captura eram coisas separadas, e só a primeira acontecia - no botão Parar e
   também no fim da música.
2. **O loop ressuscitava a captura.** O fim da música dispara de DENTRO do frame
   de áudio; o `stop()` cancelava o frame agendado, mas o loop em curso seguia
   até o fim e agendava o próximo, deixando o microfone lendo de um
   `AudioContext` já fechado. Agora `stop()` levanta uma trava que o loop confere
   antes de escrever estado e antes de agendar - e ela é conferida por teste nos
   dois pontos.

## 2.4.0 - Repertório em partitura (o ABC saiu do Treino)

O repertório do Treino deixou de ser ABC e virou **partitura**: um modelo em que
cada coisa é um dado, e não um símbolo que um parser desfaz. E as melodias vindas
da tablatura foram reimportadas de uma fonte que resolveu o que faltava: o ritmo.

### Por que o ABC não dava conta

O ABC parecia a língua franca certa, mas o repertório não vinha de ABC: vinha de
**tablatura de furos**, que não grafa duração NENHUMA. As durações do `tunes.ts`
eram reconstrução por heurística (`rhythms.py`: "dança corre em colcheia, air tem
ritmo à mão"). O resultado passava no teste e soava errado:

- **compasso errado** em 7 das 11 vindas da tab (Brian Boru e Johnny em 4/4, sendo 6/8;
  I'll Tell Me Ma, Raggle Taggle, Rattlin' Bog e Danza del Oso em 4/4, sendo 2/4;
  Dawning em 3/4, sendo 4/4);
- **anacruse inexistente** - todas começavam no tempo forte, então a melodia
  inteira caía deslocada em relação à barra;
- **figura pontuada achatada** - o *snap* que é a assinatura de Scotland the
  Brave e o balanço de Greensleeves sumiam.

### O formato (`practice/music/score.ts`)

Altura em `step` + `alter` + `octave` separados (a grafia sobrevive à
transposição: Fá♯ vira Mi, nunca Fá♭), duração em tempos de semínima, pausa como
`pitch: null` (evento de primeira classe - o ABC de trad irlandês escreve a
melodia corrida e some com o respiro), e `timeSignature`, `pickupBeats` e `key`
como campos. Mais a **procedência junto do dado** (`source`): destas melodias, a
altura e o ritmo têm fontes diferentes, e o quanto uma explicou a outra
(`rhythmMatch`) é a medida de confiança do resultado.

Dá para converter daqui para qualquer notação; o contrário perde informação.

### As 19 melodias, com ritmo de fonte citada

Importadas por `tools/partituras-import/` das partituras canônicas do projeto
"tabs in C tin whistle", onde a altura foi decodificada da tablatura por imagem e
a duração foi transferida de uma versão de referência (thesession, Wikipédia)
alinhada nota a nota. As 11 que estavam erradas foram refeitas; entraram 7 novas:
**Britches Full of Stitches**, **Drunken Sailor**, **Molly Malone**, **Star of
the County Down**, **The Skye Boat Song**, **Scotland the Brave** e **This Old
Man**.

**Inisheer não mudou de melodia** - só de formato. Ela já vinha do ABC do
thesession (altura e ritmo da mesma fonte), então não havia o que corrigir; o ABC
segue verbatim em `tools/partituras-import/abc_tunes.py` e é aberto em partitura
no build. É o caminho para trazer qualquer tune de sessão.

**This Old Man entra sem ritmo**, com toda nota em 1 tempo - e isso fica escrito
na cara: `source.rhythm` e `warnings` dizem `SEM FONTE DE RITMO`, e a linha
aparece na ficha da música. Não se acha referência livre para ela; o dia que
achar, é só regerar. **The Godfather** ficou fora do repertório (tema protegido).

Os ids antigos foram preservados - o histórico de tentativas é guardado por id, e
renomear apagaria a prática de quem já treinou.

### Anacruse no layout

`pickupBeats` atravessa `scoreToSong` → `SongJSON` → `buildSystems`: o primeiro
compasso agora é parcial. Partitura e layout usam a MESMA regra de quebra
(`splitByBeats`, em `score.ts`), então o compasso contado e o compasso desenhado
não podem divergir.

Compasso que não fecha (herança da fonte, em Johnny I Hardly Knew Ya e Danza del
Oso) fica **declarado** em `irregularMeasures`, e `repertoire.test.ts` exige que
o declarado bata com o medido - regerar e ganhar um compasso torto novo quebra o
teste em vez de passar batido.

## 2.3.0 - Treino com tablatura e repertório de whistle

O Treino ganha o modo que faltava para quem aprende pelo instrumento, e uma
biblioteca de verdade. Nada do modo partitura foi perdido - a tablatura é um
segundo par de óculos sobre a mesma música.

### ABC como língua franca

O repertório não é JSON de notas escrito à mão: é **ABC**, o mesmo formato que o
Conversor já lê. `src/music/abcEvents.ts` é um leitor RÍTMICO de ABC - notas,
pausas, durações, ritmo pontuado (`>`/`<`), quiálteras, ligaduras de valor,
acordes, e repetições/casas (`|: :|`, `|1 :|2`) já abertas em sequência linear.

Ele existe ao lado do `abcParser` em vez de substituí-lo porque os dois têm
contratos diferentes: o `abcParser` precisa casar 1-a-1 com os noteheads que o
abcjs desenha (por isso descarta duração e pula pausa); o Treino precisa
exatamente do que ele joga fora. Mesma língua, dois leitores - e é essa língua
comum que vai permitir fundir os dois módulos depois.

### Escolher a whistle transpõe a música

A regra do mundo real: a mesma digitação em outra afinação soa em outra altura. O
seletor de whistle (Ré, Dó, Si♭, Lá, Sol, Fá, Mi♭) transpõe o repertório inteiro
pelo intervalo entre as tônicas - **a digitação não muda, a altura sim**, e é a
altura real que o microfone julga. Por isso toda música do repertório "cabe nos
furinhos" de qualquer whistle.

A transposição carrega dois números, semitons **e** graus diatônicos
(`whistleTuning.ts`), porque só o par preserva a grafia: de Ré para Dó são 10
semitons e 6 graus, então Fá♯ vira Mi - nunca Fá♭.

### Correção: a whistle começava uma oitava abaixo

`WHISTLE_KEYS` dava `rootMidi: 62` (D4) para a whistle em Ré. Uma soprano em Ré
começa em **D5**. Com a raiz errada, a segunda oitava inteira era classificada
como primeira e o `+` de sobressopro nunca aparecia onde devia. As tônicas agora
saem de nomes científicos (`D5`, `C5`, `B♭4`…) e `whistleRange()` publica a
tessitura real. As melodias em altura de concerto sobem sozinhas para a oitava do
instrumento (`bestOctaveShift`), movendo o tune inteiro - nunca nota a nota.

### A tablatura tem tempo

A apostila de papel dá os dedos e nada mais - o aluno adivinha o ritmo. Aqui cada
conjunto de dedos carrega a própria duração: figura rítmica em cima, barra de
duração embaixo com largura proporcional à figura, e a coluna atual preenchendo
essa barra conforme você sustenta. O `+` de sobressopro segue a convenção das
apostilas. Esse mesmo `beats` também vira **figura na partitura** (bandeirola,
cabeça vazada, ponto) e o **tempo que você segura** a nota no microfone - um
número só para ver, tocar e ler.

"Ignorar oitava" deixou de apagar a oitava do desenho: ela afrouxa o **julgamento**
do microfone, não o que se ensina a tocar (`fingeringToShow`). Só entra como rede
quando a nota não existe na tessitura, mostrando um dedilhado útil em vez de um ✕.

### Integrado, não paralelo

Partitura e tablatura são a mesma sequência, a mesma quebra de linha e a mesma
virada de página. A geometria horizontal saiu do componente para `placeSystem`
(`music/layout.ts`), então o dedilhado cai exatamente sob a sua nota; o
`ScoreBook` cuida da paginação para os dois. Três modos: **Partitura**,
**Tablatura**, **Partitura + tablatura** (o padrão), gravados em `localStorage`
junto da whistle escolhida.

### Repertório decodificado das tablaturas (12 melodias)

Biblioteca agrupada (Aquecimento · Irlandesas e celtas · Baladas e tradicionais ·
Suas músicas) com busca. Cada música mostra a **procedência** na ficha.

**As ALTURAS não são mais escritas à mão - são LIDAS das tablaturas da apostila
do curso.** `tools/whistle-tab/` renderiza cada PDF, acha os círculos por
componentes conexos, lê furo a furo (cheio/vazado) e o `+` de sobressopro, e
mapeia a digitação para a nota pela carta real do whistle em Ré.

O **ritmo** é o da melodia real (`rhythms.py`), não o espaçamento cru do PDF (que
saía quase todo igual): os airs sustentados - **Scarborough, Dawning of the Day,
Auld Lang Syne** - têm a duração de cada nota escrita a partir da melodia
(semínimas, mínimas de cadência, colcheias nas figuras rápidas, a "snap" escocesa
do Auld Lang Syne); as danças, marchas e reels correm em colcheias com semínimas
de cadência, que é o ritmo autêntico delas.

Decodificadas das tablaturas (só PDFs com vídeo de referência no nível
`~/Downloads` + tudo em `items/`; nunca partitura gravada nem superpartituras):
Brian Boru's March, Down by the Sally Gardens, I'll Tell Me Ma, Johnny I Hardly
Knew Ya, Raggle Taggle Gypsy, The Rattlin' Bog, The Dawning of the Day,
Scarborough Fair, Greensleeves, Auld Lang Syne, Danza del Oso. Só **Inisheer**
segue em ABC de thesession.org.

Isto corrige a primeira leva, que tinha sido **arranjada à mão** e saíra com notas
e ritmo errados (o Scarborough era outra melodia). Agora a altura é fiel à
tablatura e a duração varia de verdade, não é mais tudo uma figura só.

### Miudezas

- **Figuras de ritmo na pauta** (`StaffSystem`): a partitura agora desenha a
  duração de cada nota - bandeirola na colcheia, cabeça vazada na mínima, ponto
  no pontuado - a partir do `beats` que a nota já carregava. O mesmo `beats` é o
  tempo que se segura no microfone (duração × sustentação), então o que se vê é o
  que se toca.
- **Andamento ajustável**: um controle de BPM parte do sugerido de cada música e
  vai de 40 a 208; ele entra na duração de cada nota (e no tempo de sustentação).
- **Oitava de leitura** (`8↓`, ligada por padrão): o whistle é agudo e a 2ª
  oitava cai acima da pauta, cheia de linhas suplementares. O flag baixa a
  música em oitavas inteiras para a faixa legível da clave de sol - o Dó agudo
  vira o Dó embaixo da pauta. É escolhido pela própria música (`octave.ts`):
  quem já está grave (as transcrições do usuário) não se mexe. O dedilhado é o
  mesmo (o padrão de furos se repete por oitava), então continua certo.
- A sustentação vai até **200%** da figura: dá para exigir segurar mais que o
  escrito, que é como se treina fôlego numa nota longa.
- Aviso quando alguma nota da música cai fora dos furos da whistle escolhida.
- Busca por nome na biblioteca.
- 11 idiomas cobertos, como sempre.
- `tools/whistle-tab/` fica no repo: o pipeline de leitura de tablatura é
  reprodutível para acrescentar tunes novos.

## 2.2.0 - Afinador

Quarta ferramenta do laboratório, em `#/tuner`. Nasceu aqui (as outras duas foram
absorvidas de apps irmãos), a partir da pesquisa acumulada na wiki sobre
afinadores web - DSP, captura, produto e acessibilidade.

### A tese

Afinador de mercado trata oscilação como erro: a agulha treme, o músico obedece.
Só que um sopro **varre dezenas de cents por ciclo de vibrato**, e o que o ouvido
julga é a **média**, não o instante. Testar o valor instantâneo reprova quem está
certo - e pior, ensina o músico a corrigir o sopro para agradar a tela.

Aqui o veredito olha o **centro**, e o gesto vira medida: um vibrato de ±40 ¢
centrado no alvo aparece como **afinado**, com "centro −3 ¢ · ±39 ¢ a 6,0 Hz" ao
lado. `VibratoTracker` exige **regularidade** para chamar de vibrato - oscilação
sem período é falta de controle, e as duas coisas não podem receber o mesmo elogio.

### DSP

- **YIN** (`core/yin.ts`): difference function → CMNDF → primeiro mínimo abaixo do
  limiar (não o global, que cai em subharmônico) → interpolação parabólica. Sai
  abaixo de um cent num tom puro. Nada de FFT/HPS: whistle e flauta são quase
  senoidais e não têm harmônico forte para um método espectral casar.
- **A janela sai da nota mais grave: 3 períodos** (`analysisWindow`), a régua do
  Praat. Escolher o instrumento é escolher a latência: ~7 ms num whistle em Ré,
  ~62 ms no cromático. A UI **mostra** a janela e a resposta - nenhum afinador de
  mercado publica tempo de resposta, só precisão em cents.
- **Faixa de busca por preset**: é a defesa mais barata contra erro de oitava, e
  alcança de propósito o whistle frio (que toca até 30 ¢ bemol) para poder mostrar
  o erro em vez de perder a nota.
- **Estabilização** (`core/stability.ts`): tudo em cents/MIDI, nunca em Hz (vibrato
  é senoidal na escala log, e a média aritmética em cents já é a geométrica em Hz).
  Mediana mata salto de oitava; média exponencial de ~140 ms imita a integração do
  próprio ouvido; histerese impede a nota de piscar na fronteira; e o veredito tem
  deadband assimétrico + dwell + latch, porque display contínuo e evento de
  confirmação são coisas diferentes.

### Arquitetura

- **Worklet burro / worker esperto**: o AudioWorklet só acumula e posta a janela; o
  YIN roda num Worker. O YIN não cabe nos ~2,7 ms do bloco de áudio, e um frame
  atrasado é melhor que um glitch. Buffers vão e voltam por transferência, de um
  pool pré-alocado - nada é alocado no caminho quente.
- **Sem SharedArrayBuffer**: exigiria COOP/COEP e o GitHub Pages não deixa mandar
  header. O worklet vai como Blob, sem depender de como o bundler resolve URL sob o
  `base` do Pages.
- **O pitch não passa pelo React**: chega a 80 Hz, entra num ref e o canvas lê no
  rAF. Só o texto sobe para o state, a 10 Hz.

### UI e honestidade

- **Fita de história em cents**, em canvas de duas camadas: vibrato vira onda,
  deriva de sopro vira rampa, desafinação vira linha deslocada. O traço desbota com
  a clareza do detector - no ataque ele sabe que está inseguro, e mostrar isso com
  peso cheio pareceria erro do músico.
- **A oitava fica na tela** ("D5", não "D"). O cromático calcula e joga fora, e é
  dessa informação descartada que sai o erro de afinar na oitava errada.
- **Nada de cor sozinha** (WCAG 1.4.1 - o eixo vermelho-verde falha em ~1 em 12
  homens): o veredito é posição + forma (✓ ▲ ▼) + texto. Uma `aria-live="polite"`
  só em evento discreto (mudou de nota, afinou) - falar a cada leitura viraria ruído
  e poluiria o próprio sinal do microfone.
- **"Sem sinal" em vez de um número errado com confiança**; aviso quando o navegador
  se recusa a desligar AGC/supressão de ruído; e o app diz na cara que **±1 cent por
  microfone é falso rigor** - o ouvido resolve ~5–6 ¢ e a captação erra ao menos isso.
- Presets (whistle nas 12 afinações, flauta doce, transversal, ocarina, cromático),
  lá calibrável 415–466 Hz, tolerância ajustável, e nome da nota em letras **ou**
  solfejo - o que resolve, no afinador, a limitação que o Treino ainda tem.

### Testes

- 181 testes (eram 131). Os 50 novos cobrem o core: precisão sub-cent, resistência a
  erro de oitava, fundamental ausente, silêncio e ruído; dwell/latch/histerese;
  vibrato (mede taxa/extensão/centro, e **recusa** oscilação irregular, deriva lenta
  e trêmulo rápido); e a matemática de cents e calibração.
- Verificado ponta a ponta no Chromium com WAV sintético como microfone falso
  (`--use-file-for-fake-audio-capture`): D5 puro → "D5 ±0 ¢, afinado"; D5 com
  vibrato de ±40 ¢ centrado → **afinado**, "centro −3 ¢ · ±39 ¢ a 6,0 Hz"; o mesmo
  vibrato 25 ¢ bemol → reprovado **pelo centro**; whistle frio → "−30 ¢".

---

## 2.1.0 - Conversor mais calmo, tema travado no claro

### Conversor: alongar notas e remover ligados

- Novo **Alongar notas**: soma tempos à duração de cada nota/pausa (+1, +2, +4, +5
  ou −1) para transformar um tune agitado em algo mais calmo. A régua: com `L:1/8`
  uma colcheia (meio tempo) em +1 vira uma semínima (um tempo).
- Novo **Remover ligados (ligaduras)**: tira slurs `( )` e ties `-`, preservando
  marcadores de quiáltera (`(3`).
- Ambos vivem em `src/music/transform.ts` (`adjustDurations`, `removeSlurs`), como
  transforms de **texto** do ABC aplicados antes do abcjs *e* do parser - assim a
  partitura e a digitação nunca saem de sincronia. Frações, acordes, cabeçalhos,
  campos em linha, decorações e grace notes tratados. 15 testes novos
  (`test/transform.test.ts`); a suíte foi de 116 → **131**.

### Conversor: aviso de fora de alcance

- O `buildTab` já calculava as notas fora da tessitura, mas o `Converter` descartava
  esse resultado e o usuário só via um ✕ mudo. Agora há uma mensagem (`msg.outOfRange`,
  nos 5 idiomas) nomeando as notas e sugerindo transpor ou trocar a afinação.
- Revisão do transpose no mesmo caso ("si de baixo não se move ao subir 1–2 semitons"):
  **não é bug**. Detalhes em `CLAUDE.md` → "Transpose: o 'bug' que não é bug".

### Tema travado no claro

- O app agora é **sempre claro**. `src/app/theme.ts` deixou de exportar `useTheme` e
  passou a expor `lockLightTheme()`, chamado no `main.tsx` antes do primeiro paint.
- Removido o botão de alternar tema do `TopBar` (sobraram só os idiomas) e a chave
  `music-lab:theme` do `localStorage`. Os tokens `:root[data-theme="dark"]` continuam
  no `global.css`, apenas nunca são ativados.

### Design

- `.nav-tab` agora reseta `border-radius: 0`: sem isso ela herdava o raio de 9px da
  regra global de `button` e o sublinhado verde da aba ativa curvava nas pontas.
  Agora a borda inferior é uma linha reta.

---

## 2.0.0 - Music Lab

Reorganização grande: o **Whistle ABC** (conversor ABC → digitação de tin whistle)
virou **Music Lab**, um laboratório com três ferramentas, e absorveu dois apps
irmãos. Tudo continua rodando 100% no navegador, sem backend.

### Renomeação

- Projeto renomeado de **Whistle ABC / ABC Notation Converter** para **Music Lab**.
- `package.json` → `name: "music-lab"`, `version: 2.0.0`.
- Vite `base: "/music-lab/"` → `"/music-lab/"` (o deploy aponta para o
  novo caminho; o repositório é renomeado no GitHub pelo dono).
- Título, favicon, `README.md` e `CLAUDE.md` atualizados.

### Migração de stack: vanilla TS → React 19

- O app era Vite + TypeScript **vanilla**. Foi migrado para **React 19 + TypeScript**
  para unificar os três apps sob o mesmo paradigma (o Treino já era React).
- `index.html` agora monta `#root` via `src/main.tsx`; a UI virou componentes React.
- `tsconfig` ganhou `jsx: react-jsx`; `vite.config` ganhou `@vitejs/plugin-react` e
  `environment: jsdom` no Vitest.
- Dependências adicionadas: `react`, `react-dom`, `@vitejs/plugin-react`,
  `@types/react`, `@types/react-dom`, `jsdom`.

### Novos módulos (cada um com URL própria)

Roteamento por **hash** (`#/…`), que funciona no GitHub Pages estático sem reescrita
de servidor:

- `#/` - **Launcher**: a home é um input inteligente. Cola ABC → abre o Conversor
  com o tune; escreve um tempo ("120 bpm") → abre o Metrônomo; senão filtra as
  ferramentas por palavra-chave. Heurísticas puras e testadas em `src/app/detect.ts`
  (`looksLikeAbc`, `detectTempo`, `scoreMatch`).
- `#/converter` - **Conversor ABC**: a UI original reescrita em React, reusando os
  cores testados (`src/music`, `src/whistle`, `src/ui/alignedTab`, `src/ui/export`).
- `#/metronome` - **Metrônomo**, absorvido do app *MusicStudio*. O `core/` puro
  (scheduler, clicks, tapTempo, pendulum, prefs, metronome, timerWorker) foi copiado
  intacto e a UI reescrita em React com loop rAF para o pêndulo/luzes.
- `#/practice` - **Treino** de afinação por microfone, absorvido do app
  *Perfect Partituras*. Cores (pitch NSDF, notes, song, fingerings), hooks e
  componentes copiados; a UI adaptada ao shell e traduzida.

### Internacionalização

- Sistema i18n reescrito como contexto React (`I18nProvider`, `useT`, `useI18n`),
  mantendo os 5 idiomas (pt/en/es/zh/ja) com fallback en.
- As traduções já existentes do conversor foram preservadas verbatim; **todas** as
  strings novas (shell, launcher, metrônomo, treino) foram traduzidas nos 5 idiomas.
- Storage: `whistle-abc:*` → `music-lab:lang` / `music-lab:theme`.

### Design

- Novo tema **tin whistle Feadóg**: verde (`--accent`) + latão (`--brass`), com
  tokens para claro e escuro em `src/styles/global.css`.
- Marca SVG (`WhistleMark`): um whistle com tubo verde e furos de latão.
- **Mobile-first**: no celular a navegação vira uma *tab bar* fixa embaixo. A pauta,
  a tablatura e o pentagrama ficam sempre num "papel" branco nos dois temas.

### Testes

- 116 testes passando (Vitest), incluindo a nova suíte `test/detect.test.ts` para a
  lógica do launcher. As fixtures Drowsy Maggie continuam sendo a referência de
  integração do conversor.

### Correções de bala perdida

- O diretório local do projeto tinha um caractere de nova linha no fim do nome
  (`music-lab\n`), que quebrava `cd`. Renomeado para o nome limpo.

---

## 1.x - Whistle ABC

Conversor de notação ABC em partitura com a digitação de tin whistle alinhada sob
cada nota, em Ré/Dó e outras afinações, com export SVG/PNG/PDF. Vanilla TS + Vite,
abcjs, jsPDF. 5 idiomas e tema claro/escuro.
