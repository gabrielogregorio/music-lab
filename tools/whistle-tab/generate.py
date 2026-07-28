# -*- coding: utf-8 -*-
"""
Decodifica cada tablatura e monta o ABC do tune: ALTURA pelos furos
(`tabdecode` + `fingermap`), DURAÇÃO pelo ritmo real da melodia (`rhythms`).

Renderiza os PDFs sob demanda para `_renders/` (cache local, ignorado no git),
então roda na máquina onde a apostila está - os PDFs não moram no repositório.

Uso:
    python3 generate.py            # imprime o ABC de todos os tunes
    python3 generate.py scarborough
    python3 generate.py --notes    # imprime só as notas decodificadas (conferência)
"""
import os
import subprocess
import sys

import tabdecode
import fingermap
import emit_abc
import rhythms
import sources

RENDER_DPI = 200
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_renders")


def render(pdf, tag):
    """Renderiza a 1ª página do PDF para PNG (cacheado). Devolve o caminho."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    prefix = os.path.join(CACHE_DIR, tag)
    png = f"{prefix}-1.png"
    if not os.path.exists(png):
        subprocess.run(
            ["pdftoppm", "-r", str(RENDER_DPI), "-png", "-f", "1", "-l", "1", pdf, prefix],
            check=True, capture_output=True,
        )
    return png


def note_of(col):
    """Nota soante de uma coluna (com sobressopro somando uma oitava)."""
    semi = fingermap.semitone_of(col["holes"])
    if semi is None:
        return None
    if col["overblow"]:
        semi += 12
    return fingermap.note_name(semi)


def decode(tune):
    """Colunas decodificadas da tablatura de um tune (linha de `sources.TUNES`)."""
    info = sources.meta(tune)
    return tabdecode.decode(render(info["pdf"], info["id"]))


def events(tune):
    """Lista de (nota_soante, duração_em_colcheias) do tune."""
    cols = decode(tune)
    durs = rhythms.rhythm_for(sources.meta(tune)["id"], cols)
    return [(note_of(col) or "z", dur) for col, dur in zip(cols, durs)]


def abc(tune):
    """ABC completo (concerto, K:D) pronto para `tunes.ts`."""
    info = sources.meta(tune)
    num, den = info["meter"]
    body = emit_abc.emit(events(tune), info["meter"])
    return f"X:1\nT:{info['title']}\nM:{num}/{den}\nL:1/8\nK:Dmaj\n{body}"


def _find(tag):
    for tune in sources.TUNES:
        if sources.meta(tune)["id"] == tag:
            return tune
    raise SystemExit(f"tune desconhecido: {tag}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only_notes = "--notes" in sys.argv
    tunes = [_find(args[0])] if args else sources.TUNES
    for tune in tunes:
        info = sources.meta(tune)
        if only_notes:
            notes = [note_of(col) or "?" for col in decode(tune)]
            print(f"{info['id']} ({len(notes)}): " + " ".join(notes))
        else:
            print(f"\n===== {info['title']} [{info['id']}] {info['meter']} =====")
            print(abc(tune))
