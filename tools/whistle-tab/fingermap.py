"""
Fingering (6 furos, x=fechado o=aberto) -> semitons acima da tônica grave do
whistle, pela carta REAL do tin whistle em Ré. Inclui as digitações de
ventilação (topo aberto) da 2ª oitava.

O "+" da tablatura (sobressopro) soma uma oitava.
"""

# semitons acima da nota mais grave (D5 no whistle em Ré)
FINGERING_SEMITONE = {
    "xxxxxx": 0,   # D
    "oxxxxx": 0,   # D (ventilação - 2ª oitava)
    "xxxxxo": 2,   # E
    "oxxxxo": 2,   # E (ventilação)
    "xxxxoo": 4,   # F#
    "oxxxoo": 4,   # F# (ventilação)
    "xxxooo": 5,   # G
    "oxxhoo": 6,   # G# (meia) - raro
    "xxoooo": 7,   # A
    "oxoooo": 7,   # A (ventilação)
    "xxhooo": 8,   # A#/Bb (meia) - raro
    "xooooo": 9,   # B
    "ooxooo": 9,   # B (ventilação, top+2 aberto)
    "oxxooo": 10,  # C natural (dedilhado cruzado)
    "xoxooo": 10,  # C natural (variante)
    "oooooo": 11,  # C#
    "ohoooo": 11,  # C# variante
}

# Nome cromático preferindo a grafia da escala de Ré maior (2 sustenidos).
# índice 0..11 a partir de D.
SEMITONE_NAME = ["D", "D#", "E", "F", "G", "G#", "A", "A#", "B", "C", "C", "C#"]
# Corrigido abaixo por um mapa direto (o array acima erra F#/C#); ver NOTE_FROM_SEMI.
NOTE_FROM_SEMI = {
    0: "D",
    1: "D#",
    2: "E",
    3: "F",
    4: "F#",
    5: "G",
    6: "G#",
    7: "A",
    8: "A#",
    9: "B",
    10: "C",   # C natural (uma oitava acima de D -> C6)
    11: "C#",
}


def semitone_of(holes):
    """Semitons acima da tônica, ou None se a digitação não estiver na carta."""
    return FINGERING_SEMITONE.get(holes)


def note_name(semitone_above_root, root_octave=5):
    """
    Nome científico a partir dos semitons acima de D(root_octave).
    D5=0. A oitava sobe ao cruzar de C# (11) para o próximo D.
    """
    letter = NOTE_FROM_SEMI[semitone_above_root % 12]
    octaves_up = semitone_above_root // 12
    # A tônica é D(root_octave). Letras de D..B ficam na mesma oitava científica;
    # C e C# caem na oitava seguinte (C6 vem depois de B5).
    octave = root_octave + octaves_up
    if letter.startswith("C"):
        octave += 1
    return f"{letter}{octave}"
