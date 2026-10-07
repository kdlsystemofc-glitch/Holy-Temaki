# Converte os plates de design/plates/ (e o logo real) para WebP em site/assets/.
# Uso: py scripts/build_assets.py
#
# Regras:
# - Plates saem nas larguras que algum srcset usa (lado horizontal), Lanczos (D48):
#   600 serve vapor, nigiri e tabuas no celular (1,75x); 1200, telas 3x e 2x.
#   As fumacas nunca aparecem com menos de ~800 px; a sala (fundo em CSS) so em
#   1600. Os originais tem 768-1376 px de largura, entao a variante 1600 e upscale
#   (ver assets.md).
# - Qualidade 70 (era 82): medido contra os WebP aprovados, no pior plate 0,26 %
#   dos pixels mudam mais de 24 niveis (limite dos testes: 0,5 %), media ~2 niveis.
# - Plates de fundo preto passam por um "black point" leve: tudo abaixo de
#   BLACK_POINT vira 0, para que mix-blend-mode: screen nao deixe a borda do
#   retangulo aparecer sobre --ink-900. Nada de recorte / alpha.
# - O logo (150 px) e so convertido, sem upscale.
# - Icones (D54), todos do mesmo logo real, sem mexer na arte: favicon.ico (16/32/48),
#   apple-touch-icon (180) e icon-192 (manifest). 180 e 192 sao upscale de 1,2-1,3x
#   (a origem tem 150 px); 512 nao e gerado: seria 3,4x. Com um logo em alta, trocar
#   LOGO e rodar de novo.
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "plates"
IMG = ROOT / "IMAGENS"
OUT = ROOT / "site" / "assets"

WIDTHS = (600, 800, 1200, 1600)
WIDTHS_ESPECIAIS = {
    "plate-smoke-hero": (800, 1200, 1600),
    "plate-smoke-floor": (800, 1200, 1600),
    "plate-room": (1600,),      # fundo em CSS (sanctum.css), sem srcset
}
QUALITY = 70
BLACK_POINT = 8

# nome final -> (arquivo de origem, aplicar black point?)
PLATES = {
    "plate-smoke-hero":  ("plate-smoke-hero.jpeg.jpeg",  True),
    "plate-smoke-thin":  ("plate-smoke-thin.jpeg.jpeg",  True),
    "plate-smoke-floor": ("plate-smoke-floor.jpeg.jpeg", True),
    "plate-nigiri":      ("plate-nigiri.jpeg.jpeg",      True),
    "plate-board-left":  ("plate-board-left.jpeg.jpeg",  True),
    "plate-board-right": ("plate-board-right.jpeg.jpeg", True),
    # cena completa, sem fundo preto: sem black point, sem screen. PROVISÓRIO (D24)
    "plate-room":        ("plate-room.jpeg.jpeg",        False),
}

LOGO = "imgi_2_412624567_893134862433209_6900609809336659314_n.jpg"


def crush_blacks(im: Image.Image) -> Image.Image:
    lut = [0 if v < BLACK_POINT else round((v - BLACK_POINT) * 255 / (255 - BLACK_POINT))
           for v in range(256)]
    return im.point(lut * 3)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for velho in OUT.glob("plate-*.webp"):  # larguras que deixaram de existir não ficam para trás
        velho.unlink()
    for name, (src, crush) in PLATES.items():
        im = Image.open(SRC / src).convert("RGB")
        if crush:
            im = crush_blacks(im)
        for w in WIDTHS_ESPECIAIS.get(name, WIDTHS):
            h = round(im.height * w / im.width)
            dst = OUT / f"{name}-{w}.webp"
            im.resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY, method=6)
            print(f"{dst.name:28} {w}x{h}  {dst.stat().st_size // 1024} KB")

    logo = Image.open(IMG / LOGO).convert("RGB")
    dst = OUT / f"logo-asami-{logo.width}.webp"
    logo.save(dst, "WEBP", quality=90, method=6)
    print(f"{dst.name:28} {logo.width}x{logo.height}  {dst.stat().st_size // 1024} KB")

    icones = OUT / "icons"
    icones.mkdir(exist_ok=True)
    logo.save(icones / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for nome, lado in (("apple-touch-icon.png", 180), ("icon-192.png", 192)):
        logo.resize((lado, lado), Image.LANCZOS).save(icones / nome, optimize=True)
    for f in sorted(icones.iterdir()):
        print(f"icons/{f.name:22} {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
