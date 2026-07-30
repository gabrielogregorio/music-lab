# -*- coding: utf-8 -*-
"""Render de alta fidelidade (PNG) só para o detector - nunca para leitura visual."""
import os
import subprocess
import sys

from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hi")
DPI = "300"
MIN_WIDTH = 2400


def convert(path, slug):
    os.makedirs(OUT_DIR, exist_ok=True)
    if path.lower().endswith(".pdf"):
        subprocess.run(
            ["pdftoppm", "-r", DPI, "-gray", "-png", path, os.path.join(OUT_DIR, slug)],
            check=True,
            capture_output=True,
        )
        return sorted(
            os.path.join(OUT_DIR, name) for name in os.listdir(OUT_DIR) if name.startswith(slug + "-")
        )
    target = os.path.join(OUT_DIR, "%s.png" % slug)
    image = Image.open(path).convert("L")
    # Ampliar é de graça (nada disso vira token) e é o que deixa a linha do
    # pentagrama com espessura suficiente para o detector achar.
    if image.width < MIN_WIDTH:
        scale = MIN_WIDTH / image.width
        image = image.resize((MIN_WIDTH, round(image.height * scale)), Image.LANCZOS)
    image.save(target)
    return [target]


if __name__ == "__main__":
    for target in convert(sys.argv[1], sys.argv[2]):
        print(target, Image.open(target).size)
