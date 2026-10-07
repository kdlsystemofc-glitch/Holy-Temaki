# Corta design/mockup-full.png em fatias por secao, resolucao original (sem resize).
# Uso: python design/slice.py
from PIL import Image
from pathlib import Path

SRC = Path(__file__).parent / "mockup-full.png"
OUT = Path(__file__).parent / "secoes"
DET = OUT / "detalhes"

# (arquivo, y_inicio, y_fim)  -- largura sempre 0..768
SECOES = [
    ("01-hero.png",            0,  437),
    ("02-rodizio.png",       437,  790),
    ("03-sanctum.png",       790, 1105),
    ("04-reserva.png",      1105, 1376),
]

# recortes de detalhe (x0, y0, x1, y1) para leitura de micro-UI
DETALHES = [
    ("nav-topo.png",            0,    0,  768,   64),
    ("hero-controles.png",      0,  380,  768,  430),
    ("hero-rail-esquerda.png",  8,  180,   48,  270),
    ("rodizio-callouts.png",   90,  520,  700,  760),
    ("reserva-form.png",      160, 1190,  610, 1320),
    ("reserva-reflexo.png",   160, 1320,  610, 1376),
]

def main():
    im = Image.open(SRC).convert("RGB")
    W, H = im.size
    OUT.mkdir(parents=True, exist_ok=True)
    DET.mkdir(parents=True, exist_ok=True)
    for nome, y0, y1 in SECOES:
        im.crop((0, y0, W, min(y1, H))).save(OUT / nome)
        print(f"{nome:22} {W}x{min(y1,H)-y0}  (y {y0}-{y1})")
    for nome, x0, y0, x1, y1 in DETALHES:
        im.crop((x0, y0, x1, y1)).save(DET / nome)
        print(f"  detalhes/{nome:24} {x1-x0}x{y1-y0}")

if __name__ == "__main__":
    main()
