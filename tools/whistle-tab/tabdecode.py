"""
Leitor de tablatura de tin whistle (6 furos) a partir de um PDF.

A tablatura é uma grade de círculos: cheio = furo fechado (x), vazado = furo
aberto (o), do bocal (topo) para a base. Um "+" abaixo de uma coluna marca o
sobressopro (2ª oitava).

Estratégia (sem scipy/cv2): rótulo de componentes conexos por RUN-LENGTH -
rápido e exato numa imagem limpa. Cada componente circular vira um furo; a
razão de preenchimento (pixels/área do bounding box) separa cheio de vazado.
Depois os furos são agrupados em linhas (bandas de 6) e colunas (notas).
"""
import sys
import numpy as np
from PIL import Image


def load_binary(path, threshold=140):
    """Carrega em cinza e binariza: True onde há tinta (escuro)."""
    img = Image.open(path).convert("L")
    arr = np.asarray(img)
    return arr < threshold


def connected_components(mask):
    """Rótulo por runs. Devolve lista de componentes: dict com bbox e área."""
    height, width = mask.shape
    # union-find sobre runs
    parent = []

    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    # runs[row] = lista de (x0, x1, run_id)
    runs_per_row = []
    prev_runs = []
    for y in range(height):
        row = mask[y]
        if not row.any():
            runs_per_row.append([])
            prev_runs = []
            continue
        # acha runs horizontais
        diff = np.diff(row.astype(np.int8))
        starts = list(np.where(diff == 1)[0] + 1)
        ends = list(np.where(diff == -1)[0] + 1)
        if row[0]:
            starts = [0] + starts
        if row[-1]:
            ends = ends + [width]
        cur_runs = []
        for x0, x1 in zip(starts, ends):
            run_id = len(parent)
            parent.append(run_id)
            cur_runs.append((x0, x1, run_id))
            # conecta com runs da linha anterior que se sobrepõem em x
            for px0, px1, pid in prev_runs:
                if px0 < x1 and x0 < px1:
                    union(run_id, pid)
        runs_per_row.append(cur_runs)
        prev_runs = cur_runs

    # agrega por raiz
    comps = {}
    for y, runs in enumerate(runs_per_row):
        for x0, x1, rid in runs:
            root = find(rid)
            comp = comps.get(root)
            if comp is None:
                comps[root] = {"x0": x0, "x1": x1, "y0": y, "y1": y + 1, "area": x1 - x0}
            else:
                comp["x0"] = min(comp["x0"], x0)
                comp["x1"] = max(comp["x1"], x1)
                comp["y0"] = min(comp["y0"], y)
                comp["y1"] = max(comp["y1"], y + 1)
                comp["area"] += x1 - x0
    return list(comps.values())


def circle_components(comps):
    """Filtra os componentes que são círculos de furo (tamanho ~ mediano, ~quadrados)."""
    # dimensões
    sized = []
    for c in comps:
        w = c["x1"] - c["x0"]
        h = c["y1"] - c["y0"]
        c["w"], c["h"] = w, h
        c["cx"] = (c["x0"] + c["x1"]) / 2
        c["cy"] = (c["y0"] + c["y1"]) / 2
        sized.append(c)
    if not sized:
        return [], 0
    # o diâmetro típico é a mediana das larguras de componentes "quadrados"
    squarish = [c for c in sized if 0.6 <= c["w"] / max(1, c["h"]) <= 1.66]
    if not squarish:
        return [], 0
    widths = np.array([c["w"] for c in squarish])
    diameter = float(np.median(widths))
    lo, hi = diameter * 0.62, diameter * 1.5
    circles = []
    for c in squarish:
        if lo <= c["w"] <= hi and lo <= c["h"] <= hi:
            c["cx"] = (c["x0"] + c["x1"]) / 2
            c["cy"] = (c["y0"] + c["y1"]) / 2
            c["fill"] = c["area"] / (c["w"] * c["h"])
            circles.append(c)
    return circles, diameter


def cluster_1d(values, gap):
    """Agrupa valores próximos (distância < gap) e devolve os centros dos grupos, ordenados."""
    order = sorted(values)
    groups = []
    cur = [order[0]]
    for v in order[1:]:
        if v - cur[-1] <= gap:
            cur.append(v)
        else:
            groups.append(cur)
            cur = [v]
    groups.append(cur)
    return [float(np.mean(g)) for g in groups]


def assign(value, centers, tol):
    for i, c in enumerate(centers):
        if abs(value - c) <= tol:
            return i
    return None


def decode(path, threshold=140, debug=False):
    mask = load_binary(path, threshold)
    comps = connected_components(mask)
    circles, diameter = circle_components(comps)
    if not circles:
        return []

    # níveis-y de todos os círculos, e o espaçamento típico entre furos.
    y_levels = cluster_1d([c["cy"] for c in circles], gap=diameter * 0.6)
    diffs = np.diff(sorted(y_levels))
    small = [d for d in diffs if d <= diameter * 1.8]
    hole_spacing = float(np.median(small)) if small else diameter

    # agrupa níveis-y em BANDAS (linhas de tablatura): dentro de uma banda o
    # espaçamento é ~hole_spacing; entre bandas o salto é bem maior.
    bands = []
    cur = [y_levels[0]]
    for y in sorted(y_levels)[1:]:
        if y - cur[-1] <= hole_spacing * 2.2:
            cur.append(y)
        else:
            bands.append(cur)
            cur = [y]
    bands.append(cur)

    tol = hole_spacing * 0.5
    # razão de preenchimento: separa cheio de vazado. Calibra pelo histograma.
    fills = np.array([c["fill"] for c in circles])
    fill_cut = (fills.min() + fills.max()) / 2 if fills.max() - fills.min() > 0.15 else 0.55

    # componentes que NÃO viraram círculo (ex.: "+" fino) - candidatos a sobressopro.
    noncircles = [c for c in comps if c not in circles]

    columns = []
    band_index = 0
    for band in bands:
        band_levels = sorted(band)
        if len(band_levels) < 5:
            continue  # título ou ruído - uma linha de tablatura tem 6 furos
        low, high = band_levels[0] - tol, band_levels[-1] + tol
        band_circles = [c for c in circles if low <= c["cy"] <= high]
        # As 6 linhas de furo são as 6 mais ALTAS; qualquer nível extra abaixo é a
        # fileira de "+" (sobressopro), que só aparece em algumas colunas.
        row_centers = cluster_1d([c["cy"] for c in band_circles], gap=hole_spacing * 0.55)
        row_centers.sort()
        hole_rows = row_centers[:6]
        plus_rows = row_centers[6:]
        bottom_hole = hole_rows[-1]

        band_x = cluster_1d([c["cx"] for c in band_circles], gap=diameter * 0.6)
        # gaps entre colunas: um salto grande marca fronteira de grupo (compasso/beat).
        col_gaps = np.diff(band_x) if len(band_x) > 1 else np.array([])
        typical_gap = float(np.median(col_gaps)) if len(col_gaps) else diameter
        for col_i, xc in enumerate(band_x):
            gap_before = bool(col_i > 0 and (band_x[col_i] - band_x[col_i - 1]) > typical_gap * 1.55)
            gap_before = gap_before or col_i == 0  # começo de linha também abre grupo
            col_circles = [c for c in band_circles if abs(c["cx"] - xc) <= tol]
            holes = ["?"] * len(hole_rows)
            for c in col_circles:
                ri = assign(c["cy"], hole_rows, tol)
                if ri is not None:
                    holes[ri] = "x" if c["fill"] >= fill_cut else "o"
            # sobressopro: círculo-"+" na fileira extra, OU um traço não-círculo
            # logo abaixo do 6º furo, na coluna.
            overblow = any(
                abs(c["cx"] - xc) <= tol and any(abs(c["cy"] - pr) <= hole_spacing * 0.6 for pr in plus_rows)
                for c in band_circles
            ) or any(
                abs(nc["cx"] - xc) <= diameter * 1.1
                and bottom_hole + hole_spacing * 0.4 < nc["cy"] <= bottom_hole + hole_spacing * 2.2
                for nc in noncircles
            )
            columns.append(
                {"band": band_index, "cx": xc, "holes": "".join(holes), "overblow": overblow, "gap_before": gap_before}
            )
        band_index += 1

    columns.sort(key=lambda c: (c["band"], c["cx"]))
    if debug:
        print(
            f"diameter={diameter:.1f} hole_spacing={hole_spacing:.1f} bands={band_index} "
            f"circles={len(circles)} fill_cut={fill_cut:.2f}",
            file=sys.stderr,
        )
    return columns


if __name__ == "__main__":
    path = sys.argv[1]
    thr = int(sys.argv[2]) if len(sys.argv) > 2 else 140
    cols = decode(path, threshold=thr, debug=True)
    for i, c in enumerate(cols):
        mark = " +" if c["overblow"] else ""
        print(f"{i:3d}  band{c['band']}  {c['holes']}{mark}")
