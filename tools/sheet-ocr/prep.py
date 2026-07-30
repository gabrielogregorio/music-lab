# -*- coding: utf-8 -*-
"""Converte PDF/JPG/PNG/WEBP das partituras para WebP enxuto, pra leitura visual."""
import os
import subprocess
import sys
import tempfile

from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
MAX_WIDTH = 1500
QUALITY = 72


def save(image, target):
    if image.mode not in ("L", "RGB"):
        image = image.convert("RGB")
    if image.width > MAX_WIDTH:
        height = round(image.height * MAX_WIDTH / image.width)
        image = image.resize((MAX_WIDTH, height), Image.LANCZOS)
    image = image.convert("L")
    image.save(target, "WEBP", quality=QUALITY, method=6)
    return target


def from_pdf(path, slug):
    written = []
    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "page")
        subprocess.run(
            ["pdftoppm", "-r", "150", "-png", path, prefix], check=True, capture_output=True
        )
        for name in sorted(os.listdir(tmp)):
            page = name.split("-")[-1].split(".")[0]
            target = os.path.join(OUT_DIR, "%s-p%s.webp" % (slug, page))
            written.append(save(Image.open(os.path.join(tmp, name)), target))
    return written


def convert(path, slug):
    os.makedirs(OUT_DIR, exist_ok=True)
    if path.lower().endswith(".pdf"):
        return from_pdf(path, slug)
    return [save(Image.open(path), os.path.join(OUT_DIR, "%s.webp" % slug))]


if __name__ == "__main__":
    source, slug = sys.argv[1], sys.argv[2]
    for target in convert(source, slug):
        print("%s  %.0f kB" % (target, os.path.getsize(target) / 1024))
