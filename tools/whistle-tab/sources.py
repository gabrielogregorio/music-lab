# -*- coding: utf-8 -*-
"""
Fonte única do repertório: de qual PDF de tablatura veio cada tune e seus
metadados. É o único lugar com caminhos de arquivo.

Regras das fontes (do usuário): SÓ tablaturas - nunca partitura gravada, nunca
superpartituras.com.br. No nível `~/Downloads`, apenas PDFs com link de YouTube
no corpo; e tudo em `~/Downloads/treino tin whistle/items`. Nunca o nível zero
`~/Downloads/treino tin whistle` (só o subdir `items`).

Inisheer não tem tablatura aqui: fica em ABC de thesession.org.
"""
import os

DOWNLOADS = os.path.expanduser("~/Downloads")
ITEMS = os.path.join(DOWNLOADS, "treino tin whistle", "items")

# id, título, coleção, BPM sugerido, tolerância (cents), compasso, PDF, vídeo, semana
TUNES = [
    ("brian-boru", "Brian Boru's March", "irish", 100, 30, (4, 4),
     f"{DOWNLOADS}/Semana 4 -Brian Boru's March.pdf", "zw7ai0rJ7NA", "Semana 4"),
    ("sally-gardens", "Down by the Sally Gardens", "irish", 92, 35, (4, 4),
     f"{DOWNLOADS}/Semana 6 - Down By The Sally Gardens.pdf", "-EELeFS2FM4", "Semana 6"),
    ("ill-tell-me-ma", "I'll Tell Me Ma", "irish", 120, 30, (4, 4),
     f"{DOWNLOADS}/Semana 2 - I'll Tel Me Ma.pdf", "gp0MvWzNNfY", "Semana 2"),
    ("johnny-hardly-knew", "Johnny I Hardly Knew Ya", "irish", 104, 30, (4, 4),
     f"{DOWNLOADS}/Semana 3 - Johnny I Hardly Knew Ya.pdf", "bN7LAOiJ77c", "Semana 3"),
    ("raggle-taggle", "Raggle Taggle Gypsy", "irish", 104, 30, (4, 4),
     f"{DOWNLOADS}/Semana 4 - Raggle Taggle Gypsy.pdf", "TG6jLquGhIw", "Semana 4"),
    ("rattlin-bog", "The Rattlin' Bog", "irish", 126, 30, (4, 4),
     f"{ITEMS}/Semana 2 - Rattling Bog.pdf", "G4RsIjhr9XY", "Semana 2"),
    ("dawning", "The Dawning of the Day", "irish", 88, 35, (3, 4),
     f"{ITEMS}/Dawning of the Day.pdf", "G4RsIjhr9XY", None),
    ("scarborough", "Scarborough Fair", "ballads", 76, 35, (3, 4),
     f"{ITEMS}/06 - Scarborough Fair.pdf", None, None),
    ("greensleeves", "Greensleeves", "ballads", 96, 30, (6, 8),
     f"{ITEMS}/07 - Greensleeves.pdf", None, None),
    ("auld-lang-syne", "Auld Lang Syne", "ballads", 80, 35, (4, 4),
     f"{ITEMS}/09 - Auld Lang Syne.pdf", None, None),
    ("danza-del-oso", "Danza del Oso", "ballads", 108, 30, (4, 4),
     f"{DOWNLOADS}/Semana 7 - Danza del Oso.pdf", "GYqKG4qT2pM", "Semana 7"),
]

# Único tune fora da tablatura: ABC de thesession.org.
INISHEER = {
    "id": "inisheer",
    "title": "Inisheer",
    "collection": "irish",
    "tempo": 92,
    "toleranceCents": 35,
    "origin": "Tommy Walsh · thesession.org/tunes/211 (setting 20740)",
    "abc": (
        "X:1\nT:Inisheer\nC:Tommy Walsh\nR:waltz\nM:3/4\nL:1/8\nK:Gmaj\n"
        "D2|:B3A Bd|B3A Bd|E3B AB|D3B AG|\n"
        "B3A Bd|B3A Bd|G3B AB|1 G4D2:|2 G6||\n"
        "|:e3f ed|B3A Bd|ef ed Bd|e3fgf|\n"
        "e3f ed|B3A Bd|D3B AB|G6:|"
    ),
}


def meta(tune):
    """Dict nomeado para uma linha de TUNES."""
    tag, title, collection, tempo, tol, meter, pdf, youtube, semana = tune
    return {
        "id": tag, "title": title, "collection": collection, "tempo": tempo,
        "toleranceCents": tol, "meter": meter, "pdf": pdf, "youtube": youtube, "semana": semana,
    }


def origin(tune):
    """Texto de procedência mostrado na ficha da música."""
    info = meta(tune)
    parts = ["Tablatura da apostila do curso"]
    if info["semana"]:
        parts[0] += f" ({info['semana']})"
    parts.append("dedilhado decodificado do PDF; ritmo da melodia real")
    text = " · ".join(parts)
    if info["youtube"]:
        text += f" · referência: youtu.be/{info['youtube']}"
    return text
