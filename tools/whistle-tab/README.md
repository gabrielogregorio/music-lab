# Leitor de tablatura de tin whistle → `tunes.ts`

> **APOSENTADO como fonte do repertório.** O Treino não lê mais ABC: o
> repertório agora são partituras (`src/modules/practice/music/scores/`), com
> ritmo vindo de fonte externa citada, geradas por
> `tools/partituras-import/`. O `build_tunes.py` daqui escrevia um `tunes.ts`
> que não existe mais - o ritmo dele era reconstruído por heurística
> (`rhythms.py`), e é justamente isso que a troca corrigiu. O DECODIFICADOR DE
> FUROS (`tabdecode.py`, `fingermap.py`) segue valendo como leitor de tab.

Pipeline que transforma as **tablaturas de 6 furos** da apostila do curso no
repertório do Treino (`src/modules/practice/music/tunes.ts`). Só depende de
`pillow` e `numpy` (+ `pdftoppm`, do poppler).

**A ALTURA sai dos furos** (a tablatura é a fonte da verdade); nenhuma nota é
digitada à mão. **A DURAÇÃO é o ritmo real da melodia** (`rhythms.py`), porque a
tablatura de furos não grafa tempo.

## Como rodar

Roda na máquina onde a apostila está (os PDFs **não** moram no repositório):

```bash
cd tools/whistle-tab
python3 generate.py --notes     # confere os dedilhados decodificados (altura)
python3 generate.py scarborough # mostra o ABC gerado de um tune
python3 generate.py             # mostra o ABC de todos
python3 build_tunes.py          # reescreve src/modules/practice/music/tunes.ts
```

Os PDFs são renderizados sob demanda para `_renders/` (cache local, ignorado no
git). Apague `_renders/` para forçar re-render.

## Arquivos

| Arquivo | Papel |
|---|---|
| `sources.py` | **Fonte única**: qual PDF e metadados (título, coleção, BPM, compasso, vídeo) de cada tune. Único lugar com caminhos de arquivo e as regras de fonte. |
| `tabdecode.py` | Renderiza o PDF, acha os círculos por componentes conexos (run-length), agrupa em linhas/colunas, lê cada furo (cheio=`x`/vazado=`o`) e o `+` de sobressopro. |
| `fingermap.py` | Digitação (`xxxxxo`…) → semitons acima da tônica grave, pela carta real do whistle em Ré (inclui as ventilações da 2ª oitava). `+` soma uma oitava. |
| `rhythms.py` | Duração de cada nota (o ritmo real): airs sustentados à mão em `AIR_RHYTHMS`; danças em colcheias com cadência. Casa a contagem com o decode (erra alto se divergir). |
| `emit_abc.py` | (nota soante, duração em colcheias) → ABC de concerto (12 semitons abaixo, sob `K:D`, como `tunes.ts` espera). |
| `generate.py` | Junta tudo: renderiza, decodifica, aplica o ritmo e emite o ABC de cada tune. |
| `build_tunes.py` | Emite o `tunes.ts` inteiro a partir de `sources.py` + `generate.py`. |

## Fontes confiáveis (regra do usuário)

- **Só tablaturas** - nunca partitura gravada, nunca `superpartituras.com.br`.
- Em `~/Downloads`: apenas PDFs com **link de YouTube** no corpo (material bom;
  sem link = lixo). Arquivos "Semana N (1) (1).pdf" valem.
- `~/Downloads/treino tin whistle/items/` vale por inteiro.
- **Nunca** o nível zero `~/Downloads/treino tin whistle/` (só o subdir `items`).

Ver também a memória `whistle-sheet-sources`.

## Ritmo

A tablatura de furos **não grafa duração** - o espaçamento das colunas é quase
uniforme (foi o que fez a 1ª versão sair "tudo 1 tempo"). Então o ritmo vem da
melodia real, em `rhythms.py`:

- **Airs sustentados** (Scarborough, Dawning, Auld Lang Syne): a duração de cada
  nota é escrita à mão em `AIR_RHYTHMS`, a partir da melodia. A lista tem de
  casar exatamente com a contagem decodificada (`rhythm_for` lança erro se não).
- **Danças/marchas/reels**: fluxo de colcheias (o ritmo autêntico) com semínima
  na nota que fecha cada frase (fronteira que a tablatura marca com espaço maior)
  e mínima no fim.

Para um air novo com ritmo próprio, escreva a lista em `AIR_RHYTHMS`. Para uma
dança, não precisa - o padrão já serve.

## O que a partitura mostra do ritmo

O `beats` de cada nota (derivado do ABC) vira figura no `StaffSystem`:
bandeirola na colcheia, cabeça vazada na mínima, ponto no pontuado. **É o mesmo
`beats`** que define quanto se segura a nota no microfone (duração × sustentação)
e a largura da coluna na tablatura - ver não diverge de tocar.

## Faltando (sem tablatura confiável)

Britches Full of Stitches, Skye Boat Song, Egan's/Kerry Polka - sem PDF de
tablatura dentro das regras. Se o usuário indicar a fonte, é só acrescentar em
`sources.py` (e um `AIR_RHYTHMS` se for air).
