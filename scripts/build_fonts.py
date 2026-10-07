# Fontes auto-hospedadas: gera site/assets/fonts/*.woff2 e site/css/fonts.css (DESIGN.md D45).
# Uso: npm run fonts   (py scripts/build_fonts.py)
#
# Origem: fonts-src/ tem os WOFF2 "latin" que a Google Fonts servia ao site (Archivo v25 e
# Space Grotesk v22, fontes variáveis, SIL Open Font License 1.1 — OFL-*.txt ao lado).
# O script:
# - corta os eixos para o que o site usa (medido em todos os elementos com texto, 1440 e 390):
#   o site usa Archivo wght 400–500 × wdth 92–100 e Space Grotesk wght 400–500; os arquivos da
#   Google traziam o eixo inteiro (wght 100–900, wdth 62–125). O corte vai até o padrão de cada
#   fonte (Archivo wght 600, Space Grotesk 300): mudar o padrão re-arredonda as larguras dos
#   glifos (medido: o logo ficava 0,03 px mais largo). Custa 1 KB;
# - mantém o subconjunto de glifos "latin" da Google (o site todo, com acentos do português),
#   as tabelas de layout (kerning) e o hinting, para o texto desenhar igual;
# - põe um hash do conteúdo no nome (cache longo: DEPLOY.md) e escreve o @font-face.
# Para usar outro peso ou largura, amplie EIXOS e rode de novo: fora da faixa o navegador
# prende o valor na borda (e não avisa).
import hashlib
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-src"
OUT = ROOT / "site" / "assets" / "fonts"
CSS = ROOT / "site" / "css" / "fonts.css"

# a faixa "latin" exata da Google Fonts (a mesma do CSS que o site usava)
LATIN = ("U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, "
         "U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD")

FONTES = [
    # família, arquivo de origem, nome de saída, eixos, descritores do @font-face
    ("Archivo", "archivo-v25-latin.woff2", "archivo-latin",
     {"wght": (400, 600), "wdth": (92, 100)}, "font-weight: 400 600;\n  font-stretch: 92% 100%;"),
    ("Space Grotesk", "spacegrotesk-v22-latin.woff2", "space-grotesk-latin",
     {"wght": (300, 500)}, "font-weight: 300 500;"),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for velho in OUT.glob("*.woff2"):
        velho.unlink()
    faces = []
    for familia, src, nome, eixos, descritores in FONTES:
        # recalcTimestamp=False: sem a data de agora no head, o mesmo conteúdo dá o mesmo hash
        fonte = TTFont(SRC / src, recalcTimestamp=False)
        antes = (SRC / src).stat().st_size
        fonte = instancer.instantiateVariableFont(fonte, eixos)
        fonte.flavor = "woff2"
        tmp = OUT / f"{nome}.tmp"
        fonte.save(tmp)
        h = hashlib.sha256(tmp.read_bytes()).hexdigest()[:8]
        dst = OUT / f"{nome}.{h}.woff2"
        tmp.replace(dst)
        print(f"{dst.name:34} {antes // 1024} KB -> {dst.stat().st_size // 1024} KB")
        faces.append(f"""@font-face {{
  font-family: "{familia}";
  font-style: normal;
  {descritores}
  font-display: swap;
  src: url("../assets/fonts/{dst.name}") format("woff2");
  unicode-range: {LATIN};
}}""")
    for lic in SRC.glob("OFL-*.txt"):
        (OUT / lic.name).write_bytes(lic.read_bytes())
    CSS.write_text(
        "/* GERADO por scripts/build_fonts.py — não editar à mão.\n"
        "   Archivo e Space Grotesk auto-hospedadas (SIL OFL 1.1, assets/fonts/OFL-*.txt), eixos cortados\n"
        "   ao que o site usa. Os fallbacks com métricas ajustadas continuam em base.css. */\n"
        + "\n".join(faces) + "\n", encoding="utf-8", newline="\n")
    print(f"{CSS.relative_to(ROOT)} escrito")


if __name__ == "__main__":
    main()
