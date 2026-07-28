# -*- coding: utf-8 -*-
"""
Ritmo REAL por nota, pesquisado da melodia - não do espaçamento do PDF.

A ALTURA vem sempre da tablatura decodificada; aqui só se decide QUANTO cada
coluna dura, em colcheias (L:1/8): 1=colcheia, 1.5=colcheia pontuada,
2=semínima, 3=semínima pontuada, 4=mínima, 6=mínima pontuada, 8=semibreve.

Dois caminhos:
- `AIR_RHYTHMS`: airs em que a melodia tem ritmo próprio e reconhecível
  (Scarborough, Dawning, Auld Lang Syne) - a duração de cada nota é escrita à
  mão a partir da melodia, casando exatamente com a contagem decodificada.
- Demais tunes: a duração parte do espaçamento relativo da tablatura (curto vs
  longo), MAS com o "valor mais usado" ajustado ao estilo por `BASE_EIGHTHS`
  (semínima nos airs lentos, colcheia nas danças). Assim uma valsa não sai toda
  em colcheias e um reel não sai todo em semínimas.
"""
import numpy as np

# Valor predominante (em colcheias) da peça: a base do "tempo mais usado".
# As danças, marchas e reels correm em colcheias (base 1) - é o ritmo autêntico
# delas - com semínimas nas cadências (dos espaços da tablatura). Só os airs
# sustentados abaixo (Scarborough, Dawning, Auld Lang Syne) têm ritmo escrito
# nota a nota, porque neles a duração muda de verdade a cada nota.
BASE_EIGHTHS = {}
DEFAULT_BASE = 1
ALLOWED = np.array([0.5, 1, 1.5, 2, 3, 4, 6])

AIR_RHYTHMS = {
    # Scarborough Fair (3/4): semínimas, mínimas de cadência, colcheias nas
    # figuras rápidas. 35 notas.
    "scarborough": [
        2, 2, 2, 2, 1, 1, 2, 4,
        2, 2, 2, 2, 2, 1, 1, 4,
        2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 1, 1,
        2, 2, 2, 2, 2, 2, 6,
    ],
    # The Dawning of the Day (3/4 valsa): semínima base, colcheias nos arpejos,
    # mínimas pontuadas nas cadências. 48 notas.
    "dawning": [
        2, 2, 2, 1, 1,
        2, 2, 2, 1, 1,
        2, 1, 1, 2, 2, 2,
        4, 2,
        1, 1, 1, 1, 2, 2, 2, 2,
        2, 2, 2, 6,
        2, 2, 2,
        1, 1, 1, 1, 2, 2, 2, 2,
        2, 2, 2, 6,
        2, 2, 6,
    ],
    # Auld Lang Syne (4/4) com a "snap" escocesa (semínima pontuada + colcheia).
    # 59 notas.
    "auld-lang-syne": [
        2,
        3, 1, 2, 2,
        3, 1, 2, 2,
        1, 1, 1, 1, 2, 2,
        4, 2,
        3, 1, 2, 2, 2, 2, 2, 2, 4,
        2, 2, 2, 2,
        4, 2,
        3, 1,
        2, 2,
        2, 2, 2, 2,
        4, 2,
        2, 2,
        4, 2,
        3, 1, 2, 2,
        2, 2, 2, 2, 4,
        2, 2, 2, 6,
    ],
}


def gap_based(cols):
    """Durações pelo espaçamento relativo (base = menor gap = 1 colcheia)."""
    from collections import defaultdict
    bands = defaultdict(list)
    for c in cols:
        bands[c["band"]].append(c)
    all_gaps = []
    for cs in bands.values():
        all_gaps += [g for g in np.diff([c["cx"] for c in cs]) if g > 0]
    base = float(np.percentile(all_gaps, 20)) if all_gaps else 1.0

    band_ids = sorted(bands)
    durs = []
    for bi, b in enumerate(band_ids):
        cs = bands[b]
        gaps = list(np.diff([c["cx"] for c in cs]))
        is_last_band = bi == len(band_ids) - 1
        for i in range(len(cs)):
            if i < len(gaps):
                durs.append(float(ALLOWED[np.argmin(np.abs(ALLOWED - gaps[i] / base))]))
            else:
                durs.append(4.0 if is_last_band else 2.0)
    return durs


def rhythm_for(tag, cols):
    """Lista de durações (colcheias) para as colunas decodificadas de `tag`."""
    if tag in AIR_RHYTHMS:
        durs = [float(d) for d in AIR_RHYTHMS[tag]]
        if len(durs) != len(cols):
            raise ValueError(f"{tag}: {len(durs)} durações para {len(cols)} notas")
        return durs
    base = BASE_EIGHTHS.get(tag, DEFAULT_BASE)
    return [d * base for d in gap_based(cols)]
