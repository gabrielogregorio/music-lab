# Leitor de partitura gravada (imagem → alturas)

Ferramenta de apoio para transcrever as partituras do usuário (PDF/JPG/PNG/WebP
fora do repositório) para o modelo de `score.ts`. Só depende de **PIL + numpy**.

Ela **não** gera partitura sozinha. Ela resolve a parte em que o olho erra - se
a nota está na linha ou no espaço - e deixa para o olho a parte em que o olho é
bom: ritmo, compasso, anacruse, repetição.

## Divisão de trabalho

| o quê | quem lê | por quê |
| --- | --- | --- |
| ALTURA de cada nota | `detect.py` | linha x espaço é 1 pixel de diferença; contar posição é trabalho de régua |
| DURAÇÃO, compasso, anacruse, repetição | o olho, na imagem | haste, bandeirola, barra de ligação e ponto de aumento são desenho, e desenho o olho pega rápido |

## Uso

```bash
cd tools/sheet-ocr
python3 prep.py "/caminho/Old MacDonald.webp" old-macdonald    # webp enxuto, para olhar
python3 prep_hi.py "/caminho/Old MacDonald.webp" old-macdonald # PNG fiel, para o detector
python3 detect.py hi/old-macdonald.png                         # alturas, pauta a pauta
python3 detect.py hi/atirei-o-pau-1.png 2 0                    # piano: só as pautas pares (clave de sol)
python3 crop.py img/old-macdonald.webp 0.06 0.18 img/s1.webp   # amplia uma faixa, para conferir o ritmo
```

`prep.py` existe por causa do custo de leitura visual: converte para WebP
cinza de ~1500 px, que é o suficiente para ler ritmo e custa uma fração do
original. `prep_hi.py` faz o contrário - PNG a 300 dpi (ou ampliado até 2400 px),
porque **ampliar é de graça** quando quem lê é o detector, e é o que dá espessura
à linha do pentagrama.

## Como o detector acha a nota

1. **Otsu** para binarizar, com um limiar mais frouxo só para as LINHAS do
   pentagrama - linha de 1 px sai cinza no anti-aliasing e sumiria no limiar da
   cabeça de nota.
2. **Linhas do pentagrama**: linhas com um traço horizontal contínuo que cobre
   ≥25% da folha; agrupadas de 5 em 5 pelo vão típico, então um traço solto
   (sublinhado de título, grade de acorde) fica sozinho e é descartado.
3. **Apaga as linhas** onde elas são finas, preservando o que tem tinta acima ou
   abaixo (a nota em cima da linha sobrevive).
4. **Filtro de traço**: fica só com o traço horizontal do tamanho de uma cabeça.
   É o que separa a cabeça da HASTE (traço de 2-3 px) e da BARRA de ligação
   (traço longo demais) - sem isso um grupo de colcheias vira um componente só.
5. **Componentes conexos** por união-busca sobre os *runs* de cada linha (não
   pixel a pixel: uma página a 300 dpi levaria minutos).
6. **Posição vertical** → grau da escala, contando meio espaço por grau a partir
   da linha de baixo (Mi4 na clave de sol).

## Limites conhecidos (leia antes de confiar)

- **Cabeça vazada (mínima, semibreve) ainda escapa** em parte das folhas. Ela é
  um anel, e o anel se parte quando a linha do pentagrama passa no meio.
  `close_ring_rows` e `merge_ring_arcs` recuperam boa parte, não todas. Nota
  longa some com mais frequência que nota curta - **confira as mínimas no olho**.
- **Clave, fórmula de compasso e diagrama de acorde** às vezes viram cabeça
  falsa, quase sempre no COMEÇO da pauta. Fácil de reconhecer: é o primeiro
  item da lista e não encaixa na melodia.
- **Foto de papel** (folha torta, sombra, fundo) não funciona: a linha do
  pentagrama deixa de ser um traço reto. Nesses casos, leitura visual direto.
- **Acidente ocasional** (♯/♭ na frente da nota) não é lido - só a armadura, que
  você informa. Confira a nota alterada no olho.
- **Grade de piano**: as pautas saem intercaladas (sol, fá, sol, fá...). Passe
  `2 0` para ficar só com a clave de sol.
