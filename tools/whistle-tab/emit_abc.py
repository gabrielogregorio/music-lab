"""
Emite ABC (altura de concerto, whistle em Ré grafado com D grave = D4) a partir
de uma lista de (nota_soante, duração_em_colcheias).

A nota soante é o que sai NO whistle em Ré (D5 = furo grave). O app espera a
escrita 12 semitons abaixo (o `D` do ABC = D4 vira D5 no whistle em Ré), então
aqui baixamos uma oitava e escrevemos em ABC sob K:D.
"""

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
# grafia da escala de Ré maior: F e C já são sustenidos pela armadura.
KEY_D_SHARPS = {"F", "C"}


def parse_sci(name):
    """'F#5' -> ('F', '#', 5). 'D6' -> ('D','',6)."""
    letter = name[0]
    rest = name[1:]
    acc = ""
    while rest and rest[0] in "#b":
        acc += rest[0]
        rest = rest[1:]
    return letter, acc, int(rest)


def to_abc_token(sci):
    """Nota soante -> token ABC 12 semitons abaixo, sob K:D."""
    letter, acc, octave = parse_sci(sci)
    octave -= 1  # o app soma uma oitava ao transpor para o whistle em Ré

    # acidente explícito: só quando difere da armadura de Ré (F#, C#).
    prefix = ""
    if acc == "#":
        prefix = "" if letter in KEY_D_SHARPS else "^"
    elif acc == "b":
        prefix = "_"
    else:  # natural
        prefix = "=" if letter in KEY_D_SHARPS else ""

    # ABC: C..B maiúsculo = oitava 4; minúsculo = oitava 5; ' sobe, , desce.
    if octave >= 5:
        token = letter.lower()
        token += "'" * (octave - 5)
    else:
        token = letter.upper()
        token += "," * (4 - octave)
    return prefix + token


def dur_suffix(units):
    """Duração em colcheias -> sufixo ABC (L:1/8). 1->'', 2->'2', 0.5->'/'."""
    if units == 1:
        return ""
    if units == 0.5:
        return "/"
    if units == 1.5:
        return "3/2"
    if abs(units - round(units)) < 1e-9:
        return str(int(round(units)))
    # fração geral p/q
    from fractions import Fraction
    fr = Fraction(units).limit_denominator(16)
    return f"{fr.numerator}/{fr.denominator}"


def emit(events, meter, unit_eighths=None, per_line=4):
    """
    events: lista de (nota_ou_'z', duração_em_colcheias).
    meter: (num, den). Barras a cada compasso; quebra de linha a cada `per_line`.
    """
    num, den = meter
    measure_units = 8 * num / den  # em colcheias (L:1/8)
    out_measures = []
    cur = []
    acc = 0.0
    for note, units in events:
        if note == "z":
            cur.append("z" + dur_suffix(units))
        else:
            cur.append(to_abc_token(note) + dur_suffix(units))
        acc += units
        if acc >= measure_units - 1e-9:
            out_measures.append(" ".join(cur))
            cur = []
            acc = 0.0
    if cur:
        out_measures.append(" ".join(cur))

    lines = []
    for i in range(0, len(out_measures), per_line):
        lines.append("|".join(out_measures[i:i + per_line]) + "|")
    return "\n".join(lines)


def check_measures(events, meter):
    """Confere que a soma de durações fecha compassos inteiros. Devolve (ok, total, measure)."""
    num, den = meter
    measure_units = 8 * num / den
    total = sum(u for _, u in events)
    return abs(total % measure_units) < 1e-6, total, measure_units
