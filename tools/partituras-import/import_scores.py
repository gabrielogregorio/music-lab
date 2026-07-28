# -*- coding: utf-8 -*-
"""
Gera `src/modules/practice/music/scores/*.ts` e `repertoire.ts` a partir das
partituras canônicas do projeto "tabs in C tin whistle".

Lá a ALTURA de cada nota foi decodificada da tablatura de 6 furos (imagem) e a
DURAÇÃO veio de uma versão de referência citada (thesession, Wikipédia), com o
casamento de altura medido nota a nota. Aqui a gente só traduz aquele formato
para o modelo de `score.ts` - nada de ritmo inventado no caminho.

O que muda na tradução:

- a altura usada é a `escrita` (whistle em Ré), UMA OITAVA ABAIXO, porque a
  régua daqui é `WRITTEN_ROOT = D4` (`whistleTuning.ts`);
- a `soando` (whistle em Dó) não entra: quem escolhe a afinação é o usuário, e
  `scoreToSong` transpõe;
- os avisos por nota (QA do editor de lá) ficam de fora; os avisos da peça
  inteira viram `warnings`.

Uso:

    python3 tools/partituras-import/import_scores.py
    python3 tools/partituras-import/import_scores.py --fonte /caminho/para/partituras
"""
import argparse
import json
import os
import re

import abc_tunes

DEFAULT_SOURCE = os.path.expanduser(
    "~/Área de trabalho/TOP MUSICAS/tabs in C tin whistle/partituras"
)

REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MUSIC_DIR = os.path.join(REPO, "src", "modules", "practice", "music")
SCORES_DIR = os.path.join(MUSIC_DIR, "scores")
REPERTOIRE = os.path.join(MUSIC_DIR, "repertoire.ts")

# Como cada música entra no repertório do Treino, na ordem da biblioteca.
# `tab` é o slug da partitura vinda da tablatura; `abc` é a chave em
# `abc_tunes.ABC_TUNES` (tune que já nasce em ABC de sessão).
# O `id` é o id VELHO quando a música já existia: o histórico de tentativas do
# usuário está guardado por id, e renomear apagaria a prática dele.
# `tempo` só aparece quando a fonte não traz BPM.
CATALOG = [
    {"abc": "inisheer", "id": "inisheer", "title": "Inisheer",
     "collection": "irish", "tolerance": 35},
    {"tab": "brian-boru-s-march", "id": "brian-boru", "title": "Brian Boru's March",
     "collection": "irish", "tolerance": 30},
    {"tab": "down-by-the-sally-gardens", "id": "sally-gardens",
     "title": "Down by the Sally Gardens", "collection": "irish", "tolerance": 35},
    {"tab": "i-ll-tel-me-ma", "id": "ill-tell-me-ma", "title": "I'll Tell Me Ma",
     "collection": "irish", "tolerance": 30},
    {"tab": "johnny-i-hardly-knew-ya", "id": "johnny-hardly-knew",
     "title": "Johnny I Hardly Knew Ya", "collection": "irish", "tolerance": 30},
    {"tab": "raggle-taggle-gypsy", "id": "raggle-taggle", "title": "Raggle Taggle Gypsy",
     "collection": "irish", "tolerance": 30},
    {"tab": "rattling-bog", "id": "rattlin-bog", "title": "The Rattlin' Bog",
     "collection": "irish", "tolerance": 30},
    {"tab": "the-dawning-of-the-day", "id": "dawning", "title": "The Dawning of the Day",
     "collection": "irish", "tolerance": 35},
    {"tab": "britches-full-of-stitches", "id": "britches",
     "title": "Britches Full of Stitches", "collection": "irish", "tolerance": 30},
    {"tab": "drunken-sailor", "id": "drunken-sailor", "title": "Drunken Sailor",
     "collection": "irish", "tolerance": 30},
    {"tab": "molly-malone", "id": "molly-malone", "title": "Molly Malone",
     "collection": "irish", "tolerance": 35},
    {"tab": "star-of-the-county-down", "id": "county-down",
     "title": "Star of the County Down", "collection": "irish", "tolerance": 35},
    {"tab": "scarborough-fair", "id": "scarborough", "title": "Scarborough Fair",
     "collection": "ballads", "tolerance": 35},
    {"tab": "greensleeves", "id": "greensleeves", "title": "Greensleeves",
     "collection": "ballads", "tolerance": 30},
    {"tab": "auld-lang-syne", "id": "auld-lang-syne", "title": "Auld Lang Syne",
     "collection": "ballads", "tolerance": 35},
    {"tab": "danza-del-oso", "id": "danza-del-oso", "title": "Danza del Oso",
     "collection": "ballads", "tolerance": 30},
    {"tab": "skye-boat-song", "id": "skye-boat-song", "title": "The Skye Boat Song",
     "collection": "ballads", "tolerance": 35},
    {"tab": "scotland-the-brave", "id": "scotland-the-brave", "title": "Scotland the Brave",
     "collection": "ballads", "tolerance": 30},
    # Sem fonte de ritmo: vem com TODA nota em 1 tempo, e isso fica escrito na
    # procedência em vez de disfarçado. O BPM aqui é chute de andamento para dar
    # por onde começar, não dado da fonte.
    {"tab": "this-old-man", "id": "this-old-man", "title": "This Old Man",
     "collection": "ballads", "tolerance": 30, "tempo": 100},
]

# `the-godfather` está na fonte, mas fica de fora a pedido do usuário: tema
# protegido, sem partitura livre - e também sem fonte de ritmo.
SKIPPED = {"the-godfather": "tema protegido; fora do repertório a pedido"}

NO_RHYTHM_SOURCE = (
    "SEM FONTE DE RITMO: toda nota em 1 tempo, a duração ainda precisa ser levantada"
)

MODES = {
    "maior": "major",
    "major": "major",
    "menor": "minor",
    "minor": "minor",
    "dorian": "dorian",
    "dórico": "dorian",
    "mixolydian": "mixolydian",
    "mixolídio": "mixolydian",
}

ALTER_OF_SUFFIX = {"": 0, "#": 1, "b": -1, "##": 2, "bb": -2}

# A tab é escrita para whistle em Ré com o Ré grave em D5; aqui a régua é D4.
WRITTEN_OCTAVE_SHIFT = -1


def ts_string(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def ts_number(value):
    return str(int(value)) if float(value).is_integer() else repr(round(float(value), 4))


def parse_pitch(written):
    match = re.fullmatch(r"([A-G])(##|bb|#|b)?(-?\d+)", written)
    if not match:
        raise ValueError('altura fora do formato esperado: "%s"' % written)
    step, suffix, octave = match.group(1), match.group(2) or "", int(match.group(3))
    return step, ALTER_OF_SUFFIX[suffix], octave + WRITTEN_OCTAVE_SHIFT


def parse_key(label):
    tonic, _, mode_label = label.partition(" ")
    mode = MODES.get(mode_label.strip().lower())
    if mode is None:
        raise ValueError('tonalidade não reconhecida: "%s"' % label)
    return tonic, mode


def parse_time_signature(label):
    numerator, _, denominator = label.partition("/")
    return int(numerator), int(denominator)


def measure_beats(time_signature):
    numerator, denominator = time_signature
    return numerator * 4 / denominator


def split_measures(events, beats_per_measure, pickup_beats):
    """A MESMA regra de `splitByBeats` em score.ts - o lint precisa concordar."""
    measures = []
    current = []
    current_beats = 0.0
    capacity = pickup_beats if pickup_beats > 0 else beats_per_measure
    for event in events:
        if current and current_beats + event["beats"] > capacity + 1e-6:
            measures.append(current)
            current = []
            current_beats = 0.0
            capacity = beats_per_measure
        current.append(event)
        current_beats += event["beats"]
    if current:
        measures.append(current)
    return measures


def irregular_measures(events, beats_per_measure, pickup_beats):
    measures = split_measures(events, beats_per_measure, pickup_beats)
    irregular = []
    for index, measure in enumerate(measures[:-1]):
        expected = pickup_beats if (index == 0 and pickup_beats > 0) else beats_per_measure
        if abs(sum(event["beats"] for event in measure) - expected) > 1e-6:
            irregular.append(index)
    return irregular


def read_partitura(path, entry):
    data = json.load(open(path, encoding="utf-8"))

    events = []
    for note in data["notas"]:
        event = {"beats": float(note["duracao"])}
        if note.get("pausa"):
            event["pitch"] = None
        else:
            event["pitch"] = parse_pitch(note["escrita"])
        if note.get("secao"):
            event["section"] = note["secao"]
        events.append(event)

    time_signature = parse_time_signature(data["compasso"])
    pickup_beats = float(data.get("anacruse") or 0.0)
    tonic, mode = parse_key(data["tom"]["tab"])
    reference = data.get("referencia") or {}
    match = data.get("ritmo", {}).get("casamento")
    warnings = list(data.get("avisos") or [])

    if match is None:
        rhythm = NO_RHYTHM_SOURCE
        warnings.insert(0, NO_RHYTHM_SOURCE)
    else:
        rhythm = "ritmo transferido da referência (%d%% de casamento de altura com a tab)" % round(
            match * 100
        )

    tempo = data["bpm"]["valor"] or entry.get("tempo")
    if tempo is None:
        raise SystemExit("%s: a fonte não traz BPM e o CATALOG não declara um" % entry["id"])

    return {
        "id": entry["id"],
        "title": entry["title"],
        "composer": data.get("compositor") or None,
        "collection": entry["collection"],
        "timeSignature": time_signature,
        "pickupBeats": pickup_beats,
        "key": {"tonic": tonic, "mode": mode},
        "tempo": int(tempo),
        "toleranceCents": entry["tolerance"],
        "source": {
            "pitches": 'Tablatura de 6 furos "%s" (whistle em Ré), decodificada por imagem'
            % data["fonte"]["arquivo"],
            "rhythm": rhythm,
            "referenceName": reference.get("nome") or None,
            "referenceUrl": reference.get("url") or None,
            "rhythmMatch": match,
        },
        "irregularMeasures": irregular_measures(
            events, measure_beats(time_signature), pickup_beats
        ),
        "warnings": warnings,
        "events": events,
        "origin": "%s.json" % entry["tab"],
    }


def read_abc_tune(entry):
    tune = abc_tunes.ABC_TUNES[entry["abc"]]
    _title, time_signature, key, events = abc_tunes.parse_abc(tune["abc"])
    pickup_beats = float(tune.get("pickupBeats") or 0.0)
    source = dict(tune["source"])
    source.setdefault("referenceName", None)
    source.setdefault("referenceUrl", None)
    source.setdefault("rhythmMatch", None)

    return {
        "id": entry["id"],
        "title": entry["title"],
        "composer": tune.get("composer"),
        "collection": entry["collection"],
        "timeSignature": time_signature,
        "pickupBeats": pickup_beats,
        "key": key,
        "tempo": int(tune["tempo"]),
        "toleranceCents": entry["tolerance"],
        "source": source,
        "irregularMeasures": irregular_measures(
            events, measure_beats(time_signature), pickup_beats
        ),
        "warnings": [],
        "events": events,
        "origin": "ABC em tools/partituras-import/abc_tunes.py",
    }


def const_name(score_id):
    return re.sub(r"[^A-Z0-9]+", "_", score_id.upper())


def render_event(event):
    parts = []
    if event["pitch"] is None:
        parts.append("pitch: null")
    else:
        step, alter, octave = event["pitch"]
        parts.append("pitch: { step: '%s', alter: %d, octave: %d }" % (step, alter, octave))
    parts.append("beats: %s" % ts_number(event["beats"]))
    if event.get("section"):
        parts.append("section: %s" % ts_string(event["section"]))
    return "    { %s }," % ", ".join(parts)


def render_score(score):
    source = score["source"]
    lines = []
    lines.append("/**")
    lines.append(" * %s - partitura do repertório do Treino." % score["title"])
    lines.append(" *")
    lines.append(" * GERADO por `tools/partituras-import/import_scores.py` a partir de")
    lines.append(" * `%s` - não editar à mão." % score["origin"])
    lines.append(" */")
    lines.append("import type { ScoreJSON } from '../score';")
    lines.append("")
    lines.append("export const %s: ScoreJSON = {" % const_name(score["id"]))
    lines.append("  id: %s," % ts_string(score["id"]))
    lines.append("  title: %s," % ts_string(score["title"]))
    if score["composer"]:
        lines.append("  composer: %s," % ts_string(score["composer"]))
    lines.append("  collection: %s," % ts_string(score["collection"]))
    lines.append("  timeSignature: [%d, %d]," % score["timeSignature"])
    lines.append("  pickupBeats: %s," % ts_number(score["pickupBeats"]))
    lines.append(
        "  key: { tonic: %s, mode: %s },"
        % (ts_string(score["key"]["tonic"]), ts_string(score["key"]["mode"]))
    )
    lines.append("  tempo: %d," % score["tempo"])
    lines.append("  toleranceCents: %d," % score["toleranceCents"])
    lines.append("  source: {")
    lines.append("    pitches: %s," % ts_string(source["pitches"]))
    lines.append("    rhythm: %s," % ts_string(source["rhythm"]))
    if source["referenceName"]:
        lines.append("    referenceName: %s," % ts_string(source["referenceName"]))
    if source["referenceUrl"]:
        lines.append("    referenceUrl: %s," % ts_string(source["referenceUrl"]))
    if source["rhythmMatch"] is not None:
        lines.append("    rhythmMatch: %s," % ts_number(source["rhythmMatch"]))
    lines.append("  },")
    lines.append(
        "  irregularMeasures: [%s]," % ", ".join(str(i) for i in score["irregularMeasures"])
    )
    if score["warnings"]:
        lines.append("  warnings: [")
        for warning in score["warnings"]:
            lines.append("    %s," % ts_string(warning))
        lines.append("  ],")
    lines.append("  events: [")
    lines.extend(render_event(event) for event in score["events"])
    lines.append("  ],")
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


REPERTOIRE_HEADER = """/**
 * O repertório do Treino: as partituras que acompanham o app.
 *
 * GERADO por `tools/partituras-import/import_scores.py` - não editar à mão.
 * As alturas vêm decodificadas das tablaturas de 6 furos da apostila; as
 * durações vêm de uma versão de referência citada em cada `source` (a tab de
 * furos não carrega duração nenhuma). Ver `score.ts` para o formato.
 */
import type { ScoreJSON } from './score';
"""


def render_repertoire(scores):
    lines = [REPERTOIRE_HEADER.rstrip("\n")]
    for score in scores:
        lines.append(
            "import { %s } from './scores/%s';" % (const_name(score["id"]), score["id"])
        )
    lines.append("")
    lines.append("export const REPERTOIRE: ScoreJSON[] = [")
    for score in scores:
        lines.append("  %s," % const_name(score["id"]))
    lines.append("];")
    lines.append("")
    lines.append(
        "/** A partitura do repertório com esse id, ou undefined se a música não vier daqui. */"
    )
    lines.append("export function findScore(id: string): ScoreJSON | undefined {")
    lines.append("  return REPERTOIRE.find((score) => score.id === id);")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fonte", default=DEFAULT_SOURCE, help="pasta partituras/ do outro projeto")
    args = parser.parse_args()

    scores = []
    for entry in CATALOG:
        if "abc" in entry:
            scores.append(read_abc_tune(entry))
            continue
        path = os.path.join(args.fonte, entry["tab"] + ".json")
        if not os.path.exists(path):
            raise SystemExit("partitura não encontrada: %s" % path)
        scores.append(read_partitura(path, entry))

    os.makedirs(SCORES_DIR, exist_ok=True)
    for score in scores:
        target = os.path.join(SCORES_DIR, "%s.ts" % score["id"])
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(render_score(score))
        flags = []
        if score["irregularMeasures"]:
            flags.append("compassos irregulares %s" % score["irregularMeasures"])
        if score["source"]["rhythmMatch"] is None and "abc" not in score["origin"]:
            flags.append("SEM FONTE DE RITMO")
        print(
            "%-20s %3d eventos  %s  anacruse %s  %s"
            % (
                score["id"],
                len(score["events"]),
                "%d/%d" % score["timeSignature"],
                ts_number(score["pickupBeats"]),
                "; ".join(flags),
            )
        )

    with open(REPERTOIRE, "w", encoding="utf-8") as handle:
        handle.write(render_repertoire(scores))

    for slug, reason in SKIPPED.items():
        print("fora do repertório: %-16s %s" % (slug, reason))
    print("%d partituras escritas em %s" % (len(scores), SCORES_DIR))


if __name__ == "__main__":
    main()
