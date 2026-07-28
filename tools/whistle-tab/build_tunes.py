# -*- coding: utf-8 -*-
"""
Gera `src/modules/practice/music/tunes.ts` a partir das tablaturas.

Uso: python3 build_tunes.py   (precisa dos PDFs da apostila em ~/Downloads)
"""
import os

import generate
import sources

OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "src", "modules", "practice", "music", "tunes.ts",
)

HEADER = '''/**
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
'''


def ts_str(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def entry(tag, title, collection, tempo, tol, origin_text, abc_text):
    body = abc_text.replace("\\", "\\\\").replace("`", "\\`")
    return (
        "  {\n"
        f"    id: '{tag}',\n"
        f"    title: {ts_str(title)},\n"
        f"    collection: '{collection}',\n"
        f"    tempo: {tempo},\n"
        f"    toleranceCents: {tol},\n"
        f"    origin: {ts_str(origin_text)},\n"
        f"    abc: `{body}`,\n"
        "  },\n"
    )


def main():
    out = [HEADER]
    # Inisheer primeiro (irlandesa), depois o resto na ordem de sources.TUNES.
    inis = sources.INISHEER
    out.append(entry(inis["id"], inis["title"], inis["collection"], inis["tempo"],
                     inis["toleranceCents"], inis["origin"], inis["abc"]))
    for tune in sources.TUNES:
        info = sources.meta(tune)
        out.append(entry(info["id"], info["title"], info["collection"], info["tempo"],
                         info["toleranceCents"], sources.origin(tune), generate.abc(tune)))
    out.append("];\n")
    with open(os.path.normpath(OUT), "w", encoding="utf-8") as fh:
        fh.write("".join(out))
    print("escrito:", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
