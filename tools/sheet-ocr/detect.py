# -*- coding: utf-8 -*-
"""
Lê a ALTURA das notas de uma partitura gravada, por imagem.

O olho erra linha/espaço; a régua não. Acha as linhas do pentagrama, apaga elas,
pega as cabeças de nota por componente conexo e converte a posição vertical em
grau da escala. A DURAÇÃO não sai daqui (haste/bandeirola/barra de ligação são
outro problema) - essa continua vindo do olho, que enxerga ritmo bem.

Só PIL + numpy: rotulagem por RUNS de linha (não pixel a pixel), senão uma
página de 200 dpi levaria minutos.
"""
import sys

import numpy as np
from PIL import Image

# Uma linha de pentagrama atravessa boa parte da folha.
STAFF_RUN_COVERAGE = 0.25
# Cabeça de nota: ~1,3 espaço de largura por ~1 espaço de altura.
HEAD_WIDTH_RANGE = (0.95, 1.7)
HEAD_HEIGHT_RANGE = (0.72, 1.55)
# Cabeça de nota é uma elipse deitada: mais larga que alta, sempre.
HEAD_ASPECT_RANGE = (1.02, 1.75)
# Preenchimento: cheia é quase toda tinta; vazada (mínima/semibreve) é anel.
FILLED_MIN_RATIO = 0.7
HOLLOW_MIN_RATIO = 0.3
# Quanto mais clara que o limiar de Otsu ainda conta como linha de pentagrama.
LINE_THRESHOLD_MARGIN = 0.45
# Largura do traço horizontal que ainda é cabeça de nota (em espaços de pauta).
HEAD_RUN_RANGE = (0.55, 2.4)

LETTERS = ["C", "D", "E", "F", "G", "A", "B"]


def otsu_threshold(gray):
    histogram = np.bincount(gray.ravel(), minlength=256).astype(float)
    total = histogram.sum()
    weight_background = np.cumsum(histogram)
    weight_foreground = total - weight_background
    mean_cumulative = np.cumsum(histogram * np.arange(256))
    valid = (weight_background > 0) & (weight_foreground > 0)
    mean_background = np.where(valid, mean_cumulative / np.maximum(weight_background, 1), 0)
    mean_foreground = np.where(
        valid, (mean_cumulative[-1] - mean_cumulative) / np.maximum(weight_foreground, 1), 0
    )
    variance = weight_background * weight_foreground * (mean_background - mean_foreground) ** 2
    return int(np.argmax(np.where(valid, variance, 0)))


def load_ink(path):
    """
    Duas máscaras: a de Otsu (tinta cheia, para as cabeças) e uma mais frouxa só
    para as LINHAS do pentagrama - linha de 1 px sai cinza no anti-aliasing e
    some no limiar da cabeça de nota.
    """
    gray = np.array(Image.open(path).convert("L"))
    threshold = otsu_threshold(gray)
    line_threshold = threshold + (255 - threshold) * LINE_THRESHOLD_MARGIN
    return gray < threshold, gray < line_threshold


def row_runs(row):
    """(início, fim_exclusivo) de cada sequência de tinta da linha."""
    padded = np.concatenate(([False], row, [False]))
    edges = np.flatnonzero(padded[1:] != padded[:-1])
    return edges[0::2], edges[1::2]


def find_staff_lines(ink):
    minimum = ink.shape[1] * STAFF_RUN_COVERAGE
    rows = []
    for index in range(ink.shape[0]):
        starts, ends = row_runs(ink[index])
        if starts.size and (ends - starts).max() >= minimum:
            rows.append(index)
    groups = []
    for row in rows:
        if groups and row - groups[-1][-1] <= 2:
            groups[-1].append(row)
        else:
            groups.append([row])
    return [int(np.mean(group)) for group in groups]


def group_staves(line_ys):
    """
    Agrupa as linhas em pentagramas de 5.

    O vão TÍPICO entre linhas vizinhas é a régua: qualquer salto bem maior que
    ele é troca de sistema. Assim um traço solto na folha (sublinhado do título,
    grade de acorde) fica sozinho e é descartado por não fechar cinco.
    """
    if len(line_ys) < 5:
        return []
    gaps = np.diff(line_ys)
    spacing = float(np.median(gaps[gaps <= np.median(gaps) * 2]))

    staves = []
    current = [line_ys[0]]
    for gap, line_y in zip(gaps, line_ys[1:]):
        if gap > spacing * 1.8 or len(current) == 5:
            staves.append(current)
            current = []
        current.append(line_y)
    staves.append(current)
    return [staff for staff in staves if len(staff) == 5]


def erase_staff_lines(ink, staves):
    """Apaga a linha do pentagrama onde ela é fina - o que tem nota em cima fica."""
    cleaned = ink.copy()
    height = ink.shape[0]
    for staff in staves:
        spacing = (staff[4] - staff[0]) / 4
        reach = max(1, int(round(spacing * 0.2)))
        for line_y in staff:
            above = line_y - reach - 2
            below = line_y + reach + 2
            keep = np.zeros(ink.shape[1], dtype=bool)
            if above >= 0:
                keep |= ink[above]
            if below < height:
                keep |= ink[below]
            for row in range(max(0, line_y - reach), min(height, line_y + reach + 1)):
                cleaned[row] &= keep
    return cleaned


def fill_holes(mask):
    """
    Tapa os buracos fechados: a mínima e a semibreve são ANEL, e sem isso a
    cabeça vazada se parte em dois arcos. Fecha só o que o desenho cerca - não
    junta cabeça vizinha como um fechamento horizontal juntaria.
    """
    background = label_runs(~mask, with_border=True)
    filled = mask.copy()
    for top, bottom, left, right, _area, touches_border, pixels in background.values():
        if touches_border:
            continue
        for row, start, end in pixels:
            filled[row, start:end] = True
    return filled


def looks_like_head(top, bottom, left, right, spacing):
    height = bottom - top + 1
    width = right - left + 1
    return (
        HEAD_WIDTH_RANGE[0] * spacing <= width <= HEAD_WIDTH_RANGE[1] * spacing
        and HEAD_HEIGHT_RANGE[0] * spacing <= height <= HEAD_HEIGHT_RANGE[1] * spacing
        and HEAD_ASPECT_RANGE[0] <= width / height <= HEAD_ASPECT_RANGE[1]
    )


def merge_ring_arcs(boxes, spacing):
    """
    Remonta a cabeça VAZADA (mínima, semibreve).

    Ela é um anel: o filtro de largura fica com o arco de cima e o de baixo e
    joga fora o miolo, que são dois traços curtos. Aqui os dois arcos - largos,
    baixos e alinhados na vertical - voltam a ser uma cabeça só, e SÓ quando o
    resultado tem cara de cabeça. Fechar o vão na horizontal resolveria também,
    mas colaria semicolcheias vizinhas.
    """
    arcs = []
    others = []
    for box in boxes:
        top, bottom, left, right, _area = box
        height = bottom - top + 1
        is_arc = height <= spacing * 0.6 and (right - left + 1) / height >= 2.0
        (arcs if is_arc else others).append(box)

    used = set()
    merged = []
    for first, (top, bottom, left, right, area) in enumerate(arcs):
        if first in used:
            continue
        best = None
        for second, (other_top, other_bottom, other_left, other_right, other_area) in enumerate(arcs):
            if second == first or second in used:
                continue
            overlap = min(right, other_right) - max(left, other_left)
            reach = min(right - left, other_right - other_left)
            if reach <= 0 or overlap < reach * 0.7:
                continue
            box = (
                min(top, other_top),
                max(bottom, other_bottom),
                min(left, other_left),
                max(right, other_right),
            )
            if not looks_like_head(*box, spacing):
                continue
            distance = abs((other_top + other_bottom) - (top + bottom)) / 2
            if best is None or distance < best[0]:
                best = (distance, second, box, other_area)
        if best is None:
            continue
        _distance, second, box, other_area = best
        used.add(first)
        used.add(second)
        merged.append((*box, area + other_area))
    return others + merged


def close_ring_rows(mask, spacing):
    """
    Fecha o miolo da cabeça VAZADA (mínima, semibreve).

    Só age na linha que tem EXATAMENTE dois traços e cujo vão total ainda cabe
    numa cabeça - que é o desenho de um anel cortado ao meio. Duas cabeças
    vizinhas somam bem mais que isso, então nada de colar semicolcheia com
    semicolcheia.
    """
    closed = mask.copy()
    for row in range(mask.shape[0]):
        starts, ends = row_runs(mask[row])
        if starts.size != 2:
            continue
        span = ends[1] - starts[0]
        if span <= HEAD_WIDTH_RANGE[1] * spacing and starts[1] - ends[0] <= spacing * 0.8:
            closed[row, ends[0] : starts[1]] = True
    return closed


def keep_head_runs(mask, spacing):
    """
    Fica só com os traços horizontais do tamanho de uma cabeça de nota.

    É o que separa a cabeça da HASTE (traço de 2-3 px) e da BARRA de ligação
    (traço longo demais) - sem isso um grupo de colcheias vira um componente só.
    """
    minimum = spacing * HEAD_RUN_RANGE[0]
    maximum = spacing * HEAD_RUN_RANGE[1]
    kept = np.zeros_like(mask)
    for row in range(mask.shape[0]):
        starts, ends = row_runs(mask[row])
        for start, end in zip(starts, ends):
            if minimum <= end - start <= maximum:
                kept[row, start:end] = True
    return kept


def label_runs(mask, with_border=False):
    """Componentes conexos via união-busca sobre os runs de cada linha."""
    parent = []

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(first, second):
        first, second = find(first), find(second)
        if first != second:
            parent[max(first, second)] = min(first, second)

    runs = []  # (row, start, end, id)
    previous = []
    for row in range(mask.shape[0]):
        starts, ends = row_runs(mask[row])
        current = []
        for start, end in zip(starts, ends):
            identifier = len(parent)
            parent.append(identifier)
            runs.append((row, start, end, identifier))
            current.append((start, end, identifier))
            for other_start, other_end, other_id in previous:
                if other_start < end and start < other_end:
                    union(identifier, other_id)
        previous = current

    height, width = mask.shape
    boxes = {}
    for row, start, end, identifier in runs:
        root = find(identifier)
        box = boxes.get(root)
        on_border = row == 0 or row == height - 1 or start == 0 or end == width
        if box is None:
            boxes[root] = [row, row, start, end - 1, end - start, on_border, []]
        else:
            box[1] = row
            box[2] = min(box[2], start)
            box[3] = max(box[3], end - 1)
            box[4] += end - start
            box[5] = box[5] or on_border
        if with_border:
            boxes[root][6].append((row, start, end))
    return boxes


def staff_of(center_y, staves):
    return min(range(len(staves)), key=lambda index: abs(center_y - np.mean(staves[index])))


def step_from_position(center_y, staff):
    """Graus acima da linha de baixo do pentagrama (E4 na clave de sol = 0)."""
    spacing = (staff[4] - staff[0]) / 4
    return int(round((staff[4] - center_y) / (spacing / 2)))


def note_name(step, bottom_line_letter="E", bottom_line_octave=4):
    absolute = LETTERS.index(bottom_line_letter) + bottom_line_octave * 7 + step
    return "%s%d" % (LETTERS[absolute % 7], absolute // 7)


def read_heads(path):
    ink, line_ink = load_ink(path)
    staves = group_staves(find_staff_lines(line_ink))
    if not staves:
        raise ValueError("nenhum pentagrama encontrado em %s" % path)
    spacing = float(np.mean([(staff[4] - staff[0]) / 4 for staff in staves]))

    without_lines = close_ring_rows(erase_staff_lines(ink, staves), spacing)
    heads_only = keep_head_runs(without_lines, spacing)
    boxes = [
        (top, bottom, left, right, area)
        for top, bottom, left, right, area, _border, _pixels in label_runs(heads_only).values()
    ]

    found = []
    for top, bottom, left, right, area in merge_ring_arcs(boxes, spacing):
        height = bottom - top + 1
        width = right - left + 1
        if not HEAD_WIDTH_RANGE[0] * spacing <= width <= HEAD_WIDTH_RANGE[1] * spacing:
            continue
        if not HEAD_HEIGHT_RANGE[0] * spacing <= height <= HEAD_HEIGHT_RANGE[1] * spacing:
            continue
        if not HEAD_ASPECT_RANGE[0] <= width / height <= HEAD_ASPECT_RANGE[1]:
            continue
        ratio = area / (height * width)
        if ratio < HOLLOW_MIN_RATIO:
            continue
        # Cheia x vazada sai da tinta ORIGINAL: o fechamento encheu o miolo.
        original = ink[top : bottom + 1, left : right + 1]
        fill = original.sum() / original.size
        center_y = (top + bottom) / 2
        staff_index = staff_of(center_y, staves)
        found.append(
            {
                "staff": staff_index,
                "x": float((left + right) / 2),
                "y": center_y,
                "step": step_from_position(center_y, staves[staff_index]),
                "filled": fill >= FILLED_MIN_RATIO,
                "ratio": round(float(fill), 2),
            }
        )
    found.sort(key=lambda head: (head["staff"], head["x"]))
    return staves, found


def report(path, every=None, offset=0, bottom_letter="E", bottom_octave=4):
    staves, heads = read_heads(path)
    print("%s: %d pentagramas" % (path, len(staves)))
    for staff_index in range(len(staves)):
        if every and staff_index % every != offset:
            continue
        line = [
            "%s%s" % (note_name(head["step"], bottom_letter, bottom_octave), "" if head["filled"] else "o")
            for head in heads
            if head["staff"] == staff_index
        ]
        print("  pauta %2d (%2d): %s" % (staff_index, len(line), " ".join(line)))


if __name__ == "__main__":
    arguments = sys.argv[1:]
    report(
        arguments[0],
        every=int(arguments[1]) if len(arguments) > 1 else None,
        offset=int(arguments[2]) if len(arguments) > 2 else 0,
    )
