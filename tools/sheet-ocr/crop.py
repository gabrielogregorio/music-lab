# -*- coding: utf-8 -*-
"""Recorta uma faixa da página e amplia, pra conferir o ritmo de perto."""
import os
import sys

from PIL import Image

SCALE = 2


def crop(path, top_pct, bottom_pct, target, left_pct=0.0, right_pct=1.0):
    image = Image.open(path)
    box = (
        int(image.width * left_pct),
        int(image.height * top_pct),
        int(image.width * right_pct),
        int(image.height * bottom_pct),
    )
    piece = image.crop(box)
    piece = piece.resize((piece.width * SCALE, piece.height * SCALE), Image.LANCZOS)
    piece.convert("L").save(target, "WEBP", quality=80, method=6)
    return target, piece.size


if __name__ == "__main__":
    path, top, bottom, target = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    written, size = crop(path, top, bottom, target)
    print("%s %s %.0f kB" % (written, size, os.path.getsize(written) / 1024))
