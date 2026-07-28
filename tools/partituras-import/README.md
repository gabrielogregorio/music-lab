# Importador de partituras → repertório do Treino

Traz as partituras canônicas do projeto **"tabs in C tin whistle"** (fora deste
repositório) para o modelo de `src/modules/practice/music/score.ts`, escrevendo
`src/modules/practice/music/scores/*.ts` e o `repertoire.ts`.

Lá as tablaturas de 6 furos da apostila foram lidas por imagem (a ALTURA) e o
ritmo veio de uma versão de referência citada nota a nota (a DURAÇÃO, que a tab
não tem). Aqui a gente **não recalcula nada** - só traduz o formato.

## Como rodar

```bash
python3 tools/partituras-import/import_scores.py
python3 tools/partituras-import/import_scores.py --fonte /caminho/para/partituras
npm test        # o lint do repertório mora em repertoire.test.ts
```

Sem dependência nenhuma além da biblioteca padrão do Python.

## O que a tradução faz

| campo lá | campo aqui | observação |
| --- | --- | --- |
| `notas[].escrita` | `events[].pitch` | **uma oitava abaixo**: a régua daqui é `WRITTEN_ROOT = D4` |
| `notas[].soando` | - | não entra: quem escolhe a afinação é o usuário, e `scoreToSong` transpõe |
| `notas[].duracao` | `events[].beats` | em tempos de semínima, igual |
| `notas[].pausa` | `pitch: null` | pausa é evento de primeira classe |
| `compasso` / `anacruse` | `timeSignature` / `pickupBeats` | |
| `tom.tab` | `key` | a tonalidade da ESCRITA (whistle em Ré), não a que soa |
| `bpm.valor` | `tempo` | |
| `fonte` + `referencia` + `ritmo.casamento` | `source` | procedência anda junto do dado |
| `avisos` | `warnings` | os avisos por nota (QA do editor de lá) ficam de fora |

O `id` e o `toleranceCents` de cada música moram no `CATALOG` do script, não na
fonte. O `id` é o **id antigo** quando a música já existia no app: o histórico de
tentativas do usuário é guardado por id, e renomear apagaria a prática dele.

## Tune que já nasce em ABC (`abc_tunes.py`)

Quando a fonte é um ABC do thesession, **altura e ritmo vêm do mesmo lugar** - não
há tab para decodificar nem duração a transferir, então a melodia não passa pelo
pipeline das tablaturas. É o caso do **Inisheer**: ele já estava resolvido assim
no app e não tinha por que ser trocado pela leitura da tab; só mudou de formato.

O ABC fica verbatim em `abc_tunes.py` (com `|: :|` e casas `|1 |2`), e o parser
de lá o abre em sequência linear. É um parser de BUILD, limitado de propósito ao
subconjunto que esses tunes usam - o leitor completo de ABC é
`src/music/abcEvents.ts`.

## Música sem fonte de ritmo

`this-old-man` está na fonte com **toda nota em 1 tempo** (não se achou
referência). Ela entra assim mesmo, mas isso **não fica disfarçado**: o
`source.rhythm` e o `warnings` dizem `SEM FONTE DE RITMO` com todas as letras, e
essa linha aparece na ficha da música. O BPM dela é chute de andamento no
`CATALOG`, não dado da fonte.

`the-godfather` fica fora do repertório (`SKIPPED`) - tema protegido, a pedido do
dono do repo.

## Compasso que não fecha

Duas peças herdam compasso irregular da fonte (Johnny I Hardly Knew Ya e Danza
del Oso). Isso não é escondido: o script calcula e grava em `irregularMeasures`,
e `repertoire.test.ts` exige que o declarado bata com o medido - se alguém
regerar e aparecer um compasso torto novo, o teste quebra.
