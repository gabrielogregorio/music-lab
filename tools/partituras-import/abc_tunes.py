# -*- coding: utf-8 -*-
"""
Tunes que já nascem em ABC de sessão, convertidos para o modelo de partitura.

Quando a fonte é um ABC do thesession, altura e ritmo vêm do MESMO lugar - não
há tab para decodificar nem ritmo para transferir, e por isso essas melodias não
passam pelo pipeline das tablaturas. O ABC fica aqui verbatim (com repetições e
casas), e o parser abaixo o abre em sequência linear.

O parser é de BUILD, deliberadamente limitado ao subconjunto que estes tunes
usam: notas com oitava e multiplicador, pausas, acidentes explícitos, armadura,
`|: :|` e casas `|1 |2`. Não faz quiáltera, ligadura de valor, ritmo pontuado
(`>`), acorde nem grace note. Precisou de mais? O leitor completo é o
`src/music/abcEvents.ts` - traga o tune por lá em vez de inchar este.
"""
import re

# Tônica maior -> acidentes na armadura (positivo = sustenidos).
MAJOR_SIGNATURE = {
    "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6,
    "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5,
}
# Quantos passos no ciclo de quintas cada modo anda em relação ao maior.
MODE_SIGNATURE_OFFSET = {"major": 0, "mixolydian": -1, "dorian": -2, "minor": -3}
MODE_OF_ABC = {
    "": "major", "maj": "major", "major": "major",
    "m": "minor", "min": "minor", "minor": "minor", "aeo": "minor",
    "dor": "dorian", "dorian": "dorian",
    "mix": "mixolydian", "mixolydian": "mixolydian",
}
SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"]
FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"]

ACCIDENTAL_ALTER = {"^": 1, "_": -1, "=": 0, "^^": 2, "__": -2}

# ABC escreve a oitava com maiúscula/minúscula: `C` é dó central (C4), `c` é C5.
LOWER_CASE_OCTAVE = 5
UPPER_CASE_OCTAVE = 4
# `L:1/8` diz que a unidade é a colcheia; em tempos de semínima ela vale 0,5.
BEATS_PER_WHOLE_NOTE = 4

ABC_TUNES = {
    "inisheer": {
        "composer": "Tommy Walsh",
        "tempo": 90,
        "pickupBeats": 1,
        "source": {
            "pitches": "ABC de sessão do thesession.org (altura e ritmo da mesma fonte)",
            "rhythm": "ritmo do próprio ABC - não há tab para decodificar nem duração a transferir",
            "referenceName": "Inisheer (setting 20740, por Tommy Walsh)",
            "referenceUrl": "https://thesession.org/tunes/211#setting20740",
        },
        "abc": """X:1
T:Inisheer
C:Tommy Walsh
R:waltz
M:3/4
L:1/8
K:Gmaj
D2|:B3A Bd|B3A Bd|E3B AB|D3B AG|
B3A Bd|B3A Bd|G3B AB|1 G4D2:|2 G6||
|:e3f ed|B3A Bd|ef ed Bd|e3fgf|
e3f ed|B3A Bd|D3B AB|G6:|""",
    },
}


def key_signature(abc_key):
    """Alterações da armadura, por letra: {"F": 1} para Sol maior."""
    match = re.fullmatch(r"([A-G][#b]?)\s*([A-Za-z]*)", abc_key.strip())
    if not match:
        raise ValueError('armadura não reconhecida: "%s"' % abc_key)
    tonic, mode_label = match.group(1), match.group(2).lower()
    mode = MODE_OF_ABC.get(mode_label)
    if mode is None:
        raise ValueError('modo não reconhecido: "%s"' % abc_key)
    accidentals = MAJOR_SIGNATURE[tonic] + MODE_SIGNATURE_OFFSET[mode]
    signature = {}
    if accidentals > 0:
        for letter in SHARP_ORDER[:accidentals]:
            signature[letter] = 1
    else:
        for letter in FLAT_ORDER[:-accidentals]:
            signature[letter] = -1
    return tonic, mode, signature


def split_headers(abc):
    headers = {}
    body_lines = []
    for line in abc.strip().splitlines():
        field = re.match(r"^([A-Za-z]):(.*)$", line)
        if field:
            headers[field.group(1)] = field.group(2).strip()
        else:
            body_lines.append(line.strip())
    return headers, " ".join(body_lines)


def split_measures(body):
    """Compassos com as marcas de repetição e o número da casa (`|1`, `|2`)."""
    pieces = re.split(r"(\|\||\|:|:\||\|)", body)
    measures = []
    pending_start = False
    for index in range(0, len(pieces), 2):
        content = pieces[index].strip()
        bar_after = pieces[index + 1] if index + 1 < len(pieces) else ""
        ending = None
        house = re.match(r"^([12])\s+(.*)$", content)
        if house:
            ending = int(house.group(1))
            content = house.group(2)
        if content:
            measures.append(
                {
                    "content": content,
                    "startRepeat": pending_start,
                    "endRepeat": bar_after == ":|",
                    "ending": ending,
                }
            )
        pending_start = bar_after == "|:"
    return measures


def expand_repeats(measures):
    """Abre `|: :|` e as casas `|1 |2` numa sequência linear de compassos."""
    expanded = []
    start = 0
    index = 0
    while index < len(measures):
        measure = measures[index]
        if measure["startRepeat"]:
            start = index
        expanded.append(measure)
        if not measure["endRepeat"]:
            index += 1
            continue
        # 2ª volta: repete do início até a primeira casa (que fica de fora) e
        # segue pelas casas seguintes.
        for replayed in measures[start : index + 1]:
            if replayed["ending"] == 1:
                break
            expanded.append(replayed)
        index += 1
        while index < len(measures) and measures[index]["ending"] == 2:
            expanded.append(measures[index])
            index += 1
        start = index
    return expanded


def parse_measure(content, unit_beats, signature):
    events = []
    cursor = 0
    while cursor < len(content):
        char = content[cursor]
        if char in " \t":
            cursor += 1
            continue
        alter = None
        while char in "^_=":
            symbol = char
            if content[cursor + 1] in "^_":
                symbol += content[cursor + 1]
                cursor += 1
            alter = ACCIDENTAL_ALTER[symbol]
            cursor += 1
            char = content[cursor]
        if char.isalpha() and char.upper() in "ABCDEFG":
            letter = char.upper()
            octave = LOWER_CASE_OCTAVE if char.islower() else UPPER_CASE_OCTAVE
            cursor += 1
            while cursor < len(content) and content[cursor] in "',":
                octave += 1 if content[cursor] == "'" else -1
                cursor += 1
            length, cursor = read_length(content, cursor)
            pitch = (letter, alter if alter is not None else signature.get(letter, 0), octave)
            events.append({"pitch": pitch, "beats": length * unit_beats})
        elif char == "z":
            cursor += 1
            length, cursor = read_length(content, cursor)
            events.append({"pitch": None, "beats": length * unit_beats})
        else:
            raise ValueError('caractere fora do subconjunto suportado: "%s"' % char)
    return events


def read_length(content, cursor):
    """O multiplicador de duração depois da nota: `A3`, `A/2`, `A3/2`, `A`."""
    numerator = ""
    while cursor < len(content) and content[cursor].isdigit():
        numerator += content[cursor]
        cursor += 1
    denominator = ""
    if cursor < len(content) and content[cursor] == "/":
        cursor += 1
        while cursor < len(content) and content[cursor].isdigit():
            denominator += content[cursor]
            cursor += 1
        denominator = denominator or "2"
    return int(numerator or 1) / int(denominator or 1), cursor


def parse_abc(abc):
    """Devolve (título, compasso, tonalidade, eventos) do ABC."""
    headers, body = split_headers(abc)
    numerator, _, denominator = headers["M"].partition("/")
    time_signature = (int(numerator), int(denominator))
    unit_numerator, _, unit_denominator = headers["L"].partition("/")
    unit_beats = int(unit_numerator) / int(unit_denominator) * BEATS_PER_WHOLE_NOTE
    tonic, mode, signature = key_signature(headers["K"])

    events = []
    for measure in expand_repeats(split_measures(body)):
        events.extend(parse_measure(measure["content"], unit_beats, signature))

    return headers.get("T", ""), time_signature, {"tonic": tonic, "mode": mode}, events
