# DESIGN.md — Asami Sushi São Bernardo

Especificação derivada de `design/mockup-full.png` (768 × 1376 px) e das fatias em
`design/secoes/`. **O mockup é referência visual apenas.** Nenhum pixel dele entra no
site: tudo vira HTML/CSS/SVG, foto real tratada ou *plate* gerado.

> **Status:** todas as dúvidas da §7 foram decididas (D1–D56). As tabelas abaixo já refletem as
> decisões. O que sobrou de genuinamente pendente está isolado na **§8**.

---

## 0. Como o mockup foi lido

| Item | Valor |
|---|---|
| Arquivo | `design/mockup-full.png`, 768 × 1376 px, RGB |
| Natureza | Export de página inteira, reduzido de um layout-mãe de **1440 px** → **fator 1,875** (confirmado) |
| Conversão usada | `valor_mockup ÷ 768 × 100 = vw` (independente de escala) |
| Script de corte | `design/slice.py` (reproduzível: `python design/slice.py`) |

Todas as medidas abaixo aparecem como **`px@768 · vw · px@1440`**. Como o CLAUDE.md pede
unidades fluidas, os tokens finais são `clamp()` ancorados no `vw` medido.

### Seções identificadas

| # | Arquivo | Faixa Y (768) | Tamanho | Nome na peça | Papel |
|---|---|---|---|---|---|
| 01 | `design/secoes/01-hero.png` | 0 – 437 | 768×437 | **ACT I — THE ARRIVAL** | Nav + hero cinematográfico |
| 02 | `design/secoes/02-rodizio.png` | 437 – 790 | 768×353 | **ACT II — THE FEAST OF ABUNDANCE / SPATIAL RODÍZIO** | Rodízio / cardápio |
| 03 | `design/secoes/03-sanctum.png` | 790 – 1105 | 768×315 | **ACT III — THE SANCTUM / THE ROOM** | Ambiente / localização |
| 04 | `design/secoes/04-reserva.png` | 1105 – 1376 | 768×271 | **ACT IV — THE RITUAL OF CONNECTION** | Reserva + contato |
| 05 | — (não existe no mockup) | — | — | Rodapé | Endereço, horário, preço, Instagram, logo |

O rótulo `ACT I / THE ARRIVAL` **não está no mockup** — foi acrescentado por decisão (D8),
para dar consistência aos quatro atos. O rodapé (05) também é novo (D10) e segue a mesma
linguagem visual, descrito em §4/05.

Recortes de leitura em `design/secoes/detalhes/`: `nav-topo`, `hero-controles`,
`hero-rail-esquerda`, `rodizio-callouts`, `reserva-form`, `reserva-reflexo`.

> Continuam fora do escopo da v1: seção "sobre", grade de serviços, cards, depoimentos e
> um quinto ato de cardápio — o cardápio é link no menu (D12).

---

## 1. Paleta

Amostrada pixel a pixel (moda local + média do decil superior por região).

### Base — preto molhado
| Token | HEX | Onde aparece |
|---|---|---|
| `--ink-900` | `#040507` | Fundo absoluto: topo do hero, laterais do ACT III |
| `--ink-850` | `#08090C` | Água profunda do hero |
| `--ink-800` | `#0C0E11` | Transição hero → rodízio |
| `--ink-700` | `#16191E` | Névoa baixa, fundo do ACT II |
| `--ink-600` | `#1D2025` | Superfície de campo/select do formulário |
| `--ink-500` | `#2D221E` | Sombra quente (borda do ACT III) |

### Cromo, fumaça e texto
| Token | HEX | Onde aparece |
|---|---|---|
| `--chrome-100` | `#FFFEFF` | Specular do wordmark 3D, logo da nav |
| `--mist-100` | `#EAF1F9` | Topo da fumaça (frio, levemente azulado) |
| `--mist-200` | `#C9D0DA` | Corpo da fumaça |
| `--steel-300` | `#656B77` | Fumaça média / linhas de callout |
| `--steel-400` | `#454E57` | Sombra do cromo, aresta do bisel do wordmark |
| `--chrome-900` | `#2D3138` | Base do degradê cromado do wordmark (já citado em §4/01 camada 5) |
| `--text-hi` | `#F5F6F9` | Valores do formulário (`05/03`, `20:00`, `02`) |
| `--text-base` | `#D8D9DB` | Títulos de ACT, label do botão |
| `--text-mid` | `#9E9F9F` | HUD do hero, callouts do ACT II, itens do rodapé |
| `--text-dim` | `#84868A` | Labels de formulário (`DATA`, `HORÁRIO`, `PESSOAS`) |
| `--text-faint` | `#62666A` | **Só elementos não textuais** — hairlines, ticks do trilho (D19) |
| `--line-hud` | `#91969F` | Linhas-guia / leader lines |

### Acentos
| Token | HEX | Onde aparece |
|---|---|---|
| `--salmon-200` | `#FACAB3` | Gordura / marmoreio do salmão |
| `--salmon-500` | `#EA794F` | Salmão — cor-chave da marca no escuro |
| `--salmon-600` | `#D67952` | Média do nigiri flutuante |
| `--amber-200` | `#FFE5D0` | Núcleo do neon vertical (ACT III) |
| `--amber-400` | `#FDD4A0` | Halo do neon |
| `--amber-700` | `#5E391F` | Madeira iluminada |
| `--wood-800` | `#331D08` | Madeira em sombra |

```css
:root{
  --ink-900:#040507; --ink-850:#08090C; --ink-800:#0C0E11;
  --ink-700:#16191E; --ink-600:#1D2025; --ink-500:#2D221E;
  --chrome-100:#FFFEFF; --mist-100:#EAF1F9; --mist-200:#C9D0DA;
  --steel-300:#656B77; --steel-400:#454E57;
  --text-hi:#F5F6F9; --text-base:#D8D9DB; --text-mid:#9E9F9F;
  --text-dim:#84868A; --text-faint:#62666A; --line-hud:#91969F;
  --salmon-200:#FACAB3; --salmon-500:#EA794F; --salmon-600:#D67952;
  --amber-200:#FFE5D0; --amber-400:#FDD4A0; --amber-700:#5E391F;
  --wood-800:#331D08;
}
```

**Regra de uso:** `--salmon-500` e `--amber-400` são os dois únicos acentos. Salmão =
comida/ação; âmbar = ambiente/luz. Nunca os dois na mesma peça de UI.

**Contraste (D19):** `--text-faint` (#62666A) sobre `--ink-900` dá ≈ 3,5:1 e reprova em AA,
então **deixa de ser cor de texto**. Piso para qualquer texto do site — inclusive os
callouts do ACT II, que passaram a carregar informação real (D6) — é `--text-mid`
(#9E9F9F, ≈ 6,5:1). `--text-faint` fica restrito a traços, ticks e bordas.

---

## 2. Tipografia

### O que o mockup mostra
Grotesca neutra, caixa-alta, tracking largo nos micro-labels, contraste de haste zero,
`M` com vértice descendo à linha de base, `R` de perna reta, `0` sem corte. Família do
grupo Helvetica Now / Suisse Int'l / Aktiv Grotesk. O wordmark 3D é a mesma grotesca em
corte **estendido**.

> Sinal de alerta: `SPATIAL RODİZIO` sai com **İ pontuado** (glifo turco) e os callouts
> saem como `WIKER MSASUREMENTS` / `LASER MOISCREMENT` / `SALARN SASHIMI`. Isso é ruído de
> geração de imagem, não uma fonte real — nenhum desses textos vai para o site. A copy
> reescrita está em §4/02 (D6); o `RODÍZIO` do título leva I normal.

### Famílias (auto-hospedadas desde a etapa de otimização, D45)

| Papel | Fonte | Por quê | Eixos/pesos |
|---|---|---|---|
| **Display** | **Archivo** | Grotesca com eixo de largura real (`wdth` 62–125) na variável — é o que reproduz o wordmark estendido e os títulos de ACT sem recorrer a `transform: scaleX()`. Desenho neutro; `R`/`M`/`S` batem com a referência. Não é Inter/Roboto/Arial. | `wght` 400–700, `wdth` 100–125 |
| **Corpo / HUD** | **Space Grotesk** | Numerais e sinais (`432Hz`, `05/03`, `01:20`, `//`) com o caráter técnico que a peça pede, algarismos tabulares, boa leitura em 11–14 px com tracking aberto. | 400, 500 |

Suplentes, se Archivo ficar larga demais no corpo: **Schibsted Grotesk** ou **Chivo**. Se
o cliente quiser os números ainda mais "instrumento": **JetBrains Mono** só para os
dígitos do formulário (terceira família — usar com parcimônia).

As duas saem de `site/assets/fonts/`, geradas por `npm run fonts` a partir dos WOFF2 "latin" que
a Google Fonts servia: nenhum pedido a `fonts.googleapis.com` (§9, D45). **O que está na tela usa
Archivo 400–500 × `wdth` 92–100 e Space Grotesk 400–500; o arquivo cobre só isso** (e até o
padrão da fonte). Outro peso ou largura exige ampliar a faixa em `scripts/build_fonts.py`; fora
dela, o navegador prende o valor na borda sem avisar.

### Escala tipográfica

Medida = altura de maiúscula (cap-height) no mockup; `font-size ≈ cap ÷ 0,72`.

| Token | Uso | cap@768 | vw | @1440 | `clamp()` | Tracking | Line-height |
|---|---|---|---|---|---|---|---|
| `--fs-wordmark` | `ASAMI` do hero | **96** (remedido) | 12,5 | 180 px | mobile `clamp(4rem, 24.4vw, 22rem)` · ≥768 `clamp(4rem, 17.9vw, 22rem)` ✱ | `.045em` ✱ | `1` + `text-box: trim-both cap alphabetic` |
| `--fs-display` | `SÃO BERNARDO DO CAMPO // CENTRO` | 15 | 2,71 | 39 px | `clamp(1.25rem, 2.7vw, 2.5rem)` | `0` ✱ (`wdth 92`) | `1.1` |
| `--fs-title` | `THE FEAST OF ABUNDANCE` | **9,5** ✱ | 1,78 | 25,6 px | `clamp(1.125rem, 1.78vw, 1.6rem)` ✱ | `.01em` | `1.2` ✱ |
| `--fs-eyebrow` | *(não usado no rótulo de ato)* ✱ | 8 | 1,45 | 21 px | `clamp(.75rem, 1.45vw, 1.25rem)` | `.08em` | `1.2` |
| `--fs-logo` | `ASAMI` da nav | 19 | 3,43 | 49 px | `clamp(1.375rem, 2.2vw, 1.75rem)` ✔︎ | `.03em` ✱ | `1` |
| `--fs-logo-sub` | `SUSHI` | 8 | 1,45 | 21 px | `clamp(.5rem, .8vw, .7rem)` ✔︎ | `.48em` | `1` |
| `--fs-hud` | `DEPTH 0.4MM / TENSION / MA` | 6,5 | 1,17 | 17 px | `clamp(.625rem, 1.17vw, .875rem)` ✔︎ | `.14em` | `1.3` |
| `--fs-label` | `DATA`, `HORÁRIO`, `PESSOAS` | 5,5 | 1,00 | 14 px | `clamp(.5625rem, 1vw, .75rem)` | `.16em` | `1.3` |
| `--fs-value` | `05/03`, `20:00`, `02` | 17 | 3,07 | 44 px | `clamp(1.25rem, 2.6vw, 2rem)` ✔︎ | `0` | `1` |

✔︎ (D15) = topo do `clamp()` **deliberadamente reduzido** em relação ao mockup escalado, e
essa redução fica. Fiel à proporção, os micro-textos dariam 17–21 px no desktop (grande
demais para label de UI) e os valores do formulário 44 px (estouram o card). A escala-mãe
de 1440 px está confirmada (D14), então os valores da coluna `@1440` são definitivos.

✱ **Recalibrado na construção do hero (24/09/2026)**, por medição na referência: o cap do
wordmark é 96 px@768 (não 135) e o desenho é de largura normal, não estendido — a 1440 px a
caixa da maiúscula fica em y 426–603 contra 424–604 do mockup. O tracking do logo da nav no
mockup é justo (~.03em), não .16em.

✱ **Recalibrado no ACT II (24/09/2026):** as três linhas do rótulo de ato (`ACT II`,
`THE FEAST OF ABUNDANCE`, `SPATIAL RODÍZIO`) têm o **mesmo** cap (9,5 px@768), mesma fonte e
mesmo peso, em largura normal. O rótulo inteiro usa `--fs-title` em Archivo `400 / wdth 100`;
`ACT I…IV` não é mais eyebrow menor. A 1440 px, `THE FEAST OF ABUNDANCE` mede 354 px contra
350 px no mockup.

Pesos: wordmark `500 / wdth 100` ✱ (`--fw-wordmark`, `--wdth-wordmark`); display e title `400 / wdth 112`; eyebrow, hud e label
`500 / wdth 100`. Todo texto da peça é caixa-alta — escrever em caixa normal no HTML e
aplicar `text-transform: uppercase` no CSS (leitor de tela e SEO agradecem).

---

## 3. Espaçamento, grid e raio

### Espaçamento — base 8 no layout-mãe

| Token | @1440 | vw | Onde |
|---|---|---|---|
| `--sp-1` | 8 px | 0,56 | Eyebrow → título |
| `--sp-2` | 16 px | 1,11 | Entre linhas do bloco de rótulo |
| `--sp-3` | 24 px | 1,67 | Gutter interno do grid |
| `--sp-4` | 32 px | 2,22 | Padding-top do card de reserva (17px@768) |
| `--sp-5` | 41 px | 2,86 | **Margem lateral da página** (22px@768) |
| `--sp-6` | 64 px | 4,44 | Respiro entre bloco de rótulo e palco |
| `--sp-7` | 96 px | 6,67 | Folga vertical interna de seção |
| `--sp-8` | 128 px | 8,89 | Separação entre atos |

```css
--gutter: clamp(1.25rem, 2.86vw, 2.5rem);   /* margem lateral */
--sp-3:   clamp(1rem, 1.67vw, 1.5rem);
--sp-6:   clamp(2rem, 4.44vw, 4rem);
--sp-8:   clamp(3.5rem, 8.89vw, 8rem);
```

### Grid

- Seções **full-bleed** (`width:100%`), fundo sangrando de borda a borda. Nenhum container
  de largura fixa.
- Dentro: `display:grid; grid-template-columns:repeat(12,1fr); gap:var(--sp-3);
  padding-inline:var(--gutter);`
- **Bloco de rótulo** (`ACT II` + título): colunas **1–4**, alinhado ao topo da seção,
  `margin-top: var(--sp-4)`.
- **Palco** (composição visual): sangra de borda a borda, com o conteúdo ocupando os ~70 %
  centrais.
- **Card de reserva**: x 165→604 de 768 = 21,5 %→78,6 %, largura **57 %**, centralizado →
  **colunas 3–10** (8 colunas centradas; "4–11" também são 8, mas ficariam fora do centro).
- Mobile (< 768 px): 1 coluna, rótulo acima do palco, card a 100 % menos gutter.

### Alturas de seção

| Seção | @768 | Proporção | Alvo desktop |
|---|---|---|---|
| Hero | 437 | 0,569 W | ver **§3b** (depende do regime) |
| Rodízio | 353 | 0,460 W | `max(80svh, 46vw)` |
| Sanctum | 315 | 0,410 W | `max(72svh, 41vw)` |
| Reserva | 271 | 0,353 W | `auto`, mínimo `60svh` |
| Rodapé (novo) | — | — | `auto`, ~`clamp(14rem, 22vw, 20rem)` |

### 3b. Regimes responsivos (passada responsiva, 24/09/2026)

A composição do hero e do palco do ACT II depende da **orientação**, não só da largura:

| Regime | Condição | Hero | Nav de atos (trilho/progresso/player) |
|---|---|---|---|
| **Retrato** | `< 48rem` **ou** mais alto que largo (celular, tablet em pé) | `max(100svh, 540px)`, composição vertical | `absolute`, sobre o hero |
| **Paisagem baixa** | `≥ 48rem`, mais largo que alto, `< 32rem` de altura (celular deitado) | `max(min(100svh, 56.9vw), min(56.9vw, 480px))` — o quadro 16:9 do mockup, sem achatar (480 px em 844×390) | `absolute`, sobre o hero |
| **Paisagem** | `≥ 48rem`, mais largo que alto, `≥ 32rem` de altura | `100svh` | `fixed` |

- **No regime Paisagem, cada ato tem ao menos `100svh`** (`--h-rodizio: max(100svh, 46vw)`,
  `--h-sanctum: max(100svh, 41vw)`, `--h-reserva-min: 100svh`). Com o player fixo no canto
  inferior esquerdo, um ato mais baixo que a tela deixava o rótulo do ato seguinte (canto superior
  esquerdo) aparecer sob o player quando ⏭ parava num ato. O hero em `100svh` mantém a linha do
  player sempre na base do hero.
- **Retrato baixo** (regime retrato com `< 50rem` de altura: 360×740, 320×568, texto a 200 %):
  trilho e progresso saem (`display: none`) — com alvos de 44 px o trilho tem ~210 px e não cabe
  entre o rótulo e o wordmark. Menu e player cobrem a navegação.
- **Nigiri no retrato:** `min(76%, 38% da altura do hero)`, centrado — em 768×1024 os 76 % da
  largura desciam sobre o wordmark.
- **Palco do ACT II no retrato:** `max-width: 600px`, centrado.
- **Wordmark:** limitado também pela largura — retrato `min(clamp(4rem, 24.4vw, 22rem), 25vw)`,
  paisagem `min(clamp(4rem, 17.9vw, 22rem), 19vw)`. Com texto a 200 % o piso `4rem` estouraria.
- **Formulário:** três grupos lado a lado só a partir de `64rem`; entre 48 e 64rem, DATA numa
  linha e HORÁRIO + PESSOAS lado a lado (nas caixas de 36 px não cabia o alvo de toque). Os dois
  selects de DATA quebram para uma coluna quando não cabem (`auto-fit`, mínimo `7rem`).

**Alvo de toque:** `--touch: 44px` — medida física, em px de propósito (não cresce com o texto).
`--ctl-size: clamp(var(--touch), 3.1vw, 48px)` (player, pílula), hambúrguer em caixa 44×44, traços
do trilho com 44 px de altura (o traço visível continua curto), logo, links do rodapé e skip link
com `min-height: var(--touch)`.

**Fontes de fallback com métricas ajustadas** (`base.css`): `Archivo Fallback` (Segoe UI,
`size-adjust 107%`) e `Archivo Fallback Helvetica` (Helvetica/Liberation/DejaVu, `99.4%`), idem
para Space Grotesk (`99.6%` / `92.5%`), com `ascent/descent-override` medidos. CLS com as web fonts
atrasadas 1,5 s: 0,003 (1440) e 0,001 (390).

**Compatibilidade (Safari/iOS) já tratada no CSS:** `svh` com fallback em `vh` via
`@supports not (height: 1svh)`; `overflow: clip` com `overflow: hidden` antes; `text-box` com
fallback `line-height: .73` no wordmark (`@supports not`); `-webkit-` em `mask-*`,
`backdrop-filter`, `background-clip: text`, `appearance`; `color-mix()` com cor sólida antes onde
a falta dele apagaria algo (fundo do card, fundo das caixas, halo do título do ACT III);
`-webkit-appearance: none` nos campos numéricos; `-webkit-tap-highlight-color: transparent`;
`overscroll-behavior: contain` no menu. Campos com fonte ≥ 20 px (o iOS não dá zoom no foco).

**Ferramentas:** `npm run audit` (12 telas + texto 200 %, movimento reduzido + tema claro, fontes
bloqueadas, CLS), `npm run test:nav`, `npm run test:form`, `npm run serve` (porta 4173 ou `PORT`).

### Raio de borda

| Token | Valor | Onde (medido) |
|---|---|---|
| `--r-sm` | 6 px | Chips / tags novos |
| `--r-md` | 10 px | Select e botão do formulário (5,5px@768) |
| `--r-lg` | 12 px | Card de reserva (5,5–6px@768, borda externa) |
| `--r-pill` | 9999 px | Pílula `432Hz`, toggle de som |
| `--r-full` | 50 % | Botões circulares do player (⏮ ⏸ ⏭) |

`--ctl-size: clamp(2rem, 3.1vw, 2.75rem)` — diâmetro dos botões do player e altura das
pílulas `432Hz` (24 px@768).

Bordas de 1 px: `--border-hud: 1px solid rgb(255 255 255 / .18)` e
`--border-strong: 1px solid rgb(234 238 242 / .85)` (contorno do botão WhatsApp).

Sem `box-shadow` padrão. Profundidade vem de **glow** (`filter: drop-shadow`) e de
gradientes radiais de névoa — nunca de sombra cinza genérica.

---

## 4. Camadas por seção

Legenda da coluna **Origem**:
`CSS` = puro CSS · `SVG` = SVG inline · `FOTO` = foto real de `IMAGENS/` tratada ·
`PLATE` = asset que **precisa ser gerado** (`design/plates/` → `site/assets/`) ·
`TEXTO` = texto HTML real.

---

### 01 — HERO (`01-hero.png`, y 0–437)

| # | Camada | O que é | Como implementar | Origem |
|---|---|---|---|---|
| 1 | Fundo | Preto azulado, mais claro no centro-alto | `background: radial-gradient(120% 90% at 50% 28%, #16191E 0%, #08090C 45%, #040507 100%)` | CSS |
| 2 | Névoa volumétrica | Nuvens de fumaça no terço médio, borda fria | 2–3 camadas do **mesmo** `plate-smoke-hero` (sem alpha, fundo preto), `mix-blend-mode: screen`, `mask-image` em degradê que deixa só a faixa do terço médio, `opacity .35–.5`, escalas e posições diferentes | PLATE |
| 3 | Bolhas | ~14 círculos finos, 2–6 px, subindo | 14 `<i>` com `border:1px solid rgb(255 255 255/.5); border-radius:50%` + `animation: rise` | CSS |
| 3b | Rótulo do ato | `ACT I` / `THE ARRIVAL` — **novo, não está no mockup** (D8) | `p` + `h2` no mesmo padrão dos demais atos, colunas 1–4, canto superior esquerdo abaixo da nav | TEXTO |
| 4 | Nigiri flutuante | Nigiri de salmão suspenso acima do wordmark, luz de cima | `plate-nigiri` (fundo preto) com `mix-blend-mode: screen`, sem recorte | PLATE |
| 5 | Wordmark `ASAMI` | Letras cromadas 3D, 60 % da largura | **`<h1>` de texto real.** Archivo 700/wdth 125 + `background: linear-gradient(180deg,#FFFEFF 0%,#C9D0DA 28%,#454E57 52%,#EAF1F9 62%,#2D3138 100%); -webkit-background-clip:text; color:transparent;` + `filter: drop-shadow(0 2px 0 #0C0E11) drop-shadow(0 0 40px rgb(201 208 218/.25))`. Bisel = `::before` idêntico deslocado 1 px | TEXTO+CSS |
| 6 | Piso em grade | Malha em perspectiva sob as letras, deformada ao centro | `svg` de linhas + `transform: perspective(600px) rotateX(72deg)`; ondulação com `filter:url(#wave)` (`feTurbulence`+`feDisplacementMap`) | SVG |
| 7 | Espelho d'água | Reflexo ondulado das letras na metade inferior | Clone do `h1` com `aria-hidden`, `transform: scaleY(-1)`, `mask-image: linear-gradient(to top, #000, transparent 95%)` (a máscara é aplicada antes do flip), `filter: blur(1px) url(#ripple)` | CSS+SVG |
| 8 | Nav — menu | Hambúrguer de 3 traços, ~28×22 @1440, à esquerda | `button aria-expanded` com 3 `span`; vira X ao abrir. Abre o overlay (camada 17) | CSS |
| 9 | Nav — logo | `ASAMI` / `SUSHI` centralizado, branco puro | `a` com 2 linhas; `SUSHI` com `letter-spacing:.48em` + `text-indent:.48em` para compensar | TEXTO |
| 10 | Nav — pílula `RESERVAR` | Cápsula contornada (era `432Hz` no mockup) | **D25:** `a.pill-cta` para `#ato-4`, texto `RESERVAR` + seta SVG, hover e foco visível. Só a seta em header estreito | CSS |
| 11 | Trilho esquerdo | ~8 traços empilhados + botão circular `‹` | **Navegação por ato (D17).** `<nav aria-label="Atos">` com 4 `<a href="#ato-1…4">`; traço = `span` 1×6 px em `--text-faint`, ativo em `--chrome-100`. Os traços extras do mockup são decorativos e não entram | CSS |
| 12 | Indicador direito | Linha vertical fina com ponto | **Progresso de scroll (D17).** `div` de 1 px + `span` circular posicionado por `--progress`; `aria-hidden` (é espelho do trilho, não controle) | CSS |
| 13 | Barra de player | 3 botões circulares ⏮ ⏸ ⏭, canto inferior esquerdo | **Sem áudio (D13).** ⏸ vira `button aria-pressed` que **pausa/retoma as animações** (alterna `.is-paused` no `<html>`, que zera `animation-play-state` e desliga o parallax); ⏮ ⏭ **navegam entre os atos** (`scrollIntoView` no ato anterior/seguinte). Rótulos acessíveis: "Pausar animações", "Ato anterior", "Próximo ato" | SVG+CSS+JS |
| 14 | HUD central | `DEPTH 0.4MM / TENSION / MA` — texto completo confirmado (D16) | `p` em Space Grotesk 500, `--fs-hud`, `--text-mid`. Decorativo em inglês (D7) → `aria-hidden="true"` | TEXTO |
| 15 | Toggle inferior | Cápsula `432Hz` com knob claro deslizante | **Removido (D25).** | — |
| 16 | Grão | Ruído sutil sobre tudo | `::after` full-bleed com `feTurbulence` em `data:` URI, `opacity .04`, `mix-blend-mode:overlay` | SVG |
| 17 | Overlay de menu | **Não existe no mockup** — tela cheia ao clicar no hambúrguer (D11) | `<dialog>` ou `div[role=dialog]` full-bleed, `background: rgb(4 5 7 / .96)` + `backdrop-filter: blur(20px)`. Itens em `--fs-title`: **Ato I · A Chegada**, **Ato II · Rodízio**, **Ato III · O Salão**, **Ato IV · Reservas** e **Cardápio** (D12 — link externo, PDF ou WhatsApp). Rótulos em PT-BR (D7). Foco preso dentro do overlay, `Esc` fecha, foco volta ao hambúrguer | CSS+JS |

---

### 02 — RODÍZIO (`02-rodizio.png`, y 437–790)

| # | Camada | O que é | Como implementar | Origem |
|---|---|---|---|---|
| 1 | Fundo | Preto puro no topo, clareando até a água embaixo | `linear-gradient(180deg,#040507 0%,#0C0E11 58%,#16191E 82%,#0A0B0F 100%)` | CSS |
| 2 | Vapor | Fumaça fina e vertical subindo dos pratos | `plate-smoke-thin.webp` × 2 (o segundo espelhado com `scaleX(-1)`), `mix-blend-mode:screen`, `animation: drift 18s` | PLATE |
| 3 | Faíscas | Pontos laranja quentes dispersos | 10–14 `<i>` de 2 px em `--salmon-500` + `filter:blur(.5px)`, `animation: ember` | CSS |
| 4 | Rótulo | `ACT II` / `THE FEAST OF ABUNDANCE` / `SPATIAL RODÍZIO` | `p` + `h2` em 2 linhas, colunas 1–4 | TEXTO |
| 5 | Tábua esquerda | Ardósia flutuante | `plate-board-left` com `screen`. **Provisório (D22)**: o arquivo atual mostra lula e polvo, que não constam no CLIENTE.md, e será substituído. Nenhum rótulo cita o conteúdo desta tábua | PLATE (provisório) |
| 6 | Tábua direita | Ardósia com sashimi de salmão e atum, wasabi | `plate-board-right` com `screen`. Se o parallax exigir camada separada, recortar com `rembg` | PLATE |
| 7 | Sombra de contato | Mancha escura difusa sob cada tábua | `::after` com `radial-gradient(ellipse, #000 0%, transparent 70%)` + `filter:blur(12px)` | CSS |
| 8 | Callouts | Linhas-guia finas, colchetes e micro-rótulos em volta da comida | `svg` inline com `line`/`path` em `--line-hud` a 1 px; os **rótulos ficam em `span` HTML** posicionados por cima, para continuarem texto real. Cor `--text-mid` (D19), todos `aria-hidden="true"` (D6) | SVG+TEXTO |
| 9 | Micro-label do topo | Rótulo com leader line horizontal | Era `STAGE // 01 TO 18` no mockup — o CLIENTE.md não tem "18 etapas" (o único "18" é o eixo do gráfico de horário de pico). **Removido** (D6). Entra `RODÍZIO // À LA CARTE`. `span` + `span` de 1 px que cresce na entrada | TEXTO+CSS |
| 10 | Espelho d'água | Reflexo ondulado das tábuas no rodapé da seção | Mesmo padrão do hero: clone `aria-hidden` + `scaleY(-1)` + máscara + `feDisplacementMap` | CSS+SVG |

#### Copy dos callouts (D6)

Os textos do mockup estão corrompidos (`WIKER MSASUREMENTS`, `LASER MOISCREMENT`,
`SALARN SASHIMI`) e a proposta anterior — `CORTE 8MM`, `180°C`, `18 ETAPAS` — inventava
dados. **Regra vigente: só informação verificável no CLIENTE.md, ou nada.**

| Posição | Texto | Fonte no CLIENTE.md |
|---|---|---|
| Label do topo | `RODÍZIO // À LA CARTE` | "rodízio e à la carte" |
| Tábua esquerda | — (linha-guia sem rótulo, D22) | A tábua provisória não mostra nada que conste no CLIENTE.md |
| Tábua direita | `SASHIMI` | "Combinado de Sushi E Sashimis"; tag de fotos "Sashimi" |
| Tábua direita | `SUSHI` | tag de fotos "Sushi" |
| Rodapé da seção | `R$ 80–160 POR PESSOA` | "R$ 80–160 por pessoa" |

**Removidos por não terem lastro:** `SHIMEJI NA CHAPA` (não aparece na tábua), lula, polvo, qualquer temperatura, espessura de corte, contagem de
etapas, `STAGE // 01 TO 18`, `LASER …`, `DEPTH`/`TENSION` dentro desta seção. Onde uma
linha-guia ficar visualmente órfã, ela permanece como traço puro, **sem rótulo** — a linha
é decoração, o texto é que precisava ser verdadeiro.

Todos os callouts levam `aria-hidden="true"` e cor `--text-mid`.

#### Notas de implementação (construção do ACT II)

- **Palco de proporção fixa** (`.rodizio__stage`): 1440×662 no desktop, 390×560 no mobile.
  Tábuas, linhas-guia (SVG com `viewBox` nas mesmas coordenadas) e rótulos HTML usam o mesmo
  sistema, então nada se desalinha em outra largura. Em mobile o SVG é outro (`.callouts--narrow`)
  e o colchete `SUSHI` sai.
- **Screen e stacking context.** `mix-blend-mode: screen` só alcança o fundo até o stacking
  context mais próximo. Por isso o palco é centralizado **sem `transform`**, as camadas de plate
  ficam num grupo `.rodizio__screen` em `screen`, e a sombra de contato (camada 7) fica **fora**
  desse grupo, senão some. A mesma regra vale para `.hero__smoke`.
- **Emenda entre atos:** o hero termina num degradê de saída para `--ink-900` (`.hero__exit`),
  o ACT II começa em `--ink-900`, o vapor nasce transparente no topo e o grão (camada 16 do
  hero) passou a ser global (`.section::after`).
- **Sem asset para o camarão/lula flutuante** do centro do mockup: o espaço fica com vapor e
  faíscas.

---

### 03 — SANCTUM (`03-sanctum.png`, y 790–1105)

| # | Camada | O que é | Como implementar | Origem |
|---|---|---|---|---|
| 1 | Fundo | Preto absoluto nas laterais, vinheta forte | `#040507` + `box-shadow: inset 0 0 200px 80px #040507` | CSS |
| 2 | Salão | **`plate-room`, PROVISÓRIO (D24)** — imagem gerada por IA, não é o salão real. **Imagem normal, sem `screen`** (não tem fundo preto): `background` de `.sanctum__room`, `filter: brightness(.42) saturate(.6) sepia(.25)` + `--ink-900` a 40 % em `multiply`, máscara em degradê nas 4 bordas (laterais quase pretas). **Um único caminho de arquivo:** `--room-img` em `css/sanctum.css` — trocar a foto real é mudar essa linha | PLATE (provisório) |
| 3 | Neon vertical | 6 barras âmbar, simétricas em torno do centro (x 403, 460, 572, 861, 974, 1033 @1440; as duas do vão da porta mais suaves) | **CSS puro:** `<i>` de 3 px, núcleo `--amber-400` com fio `--amber-200`; halo em `::before` (faixa de ~30 px, `blur(10px)`) e `::after` (~120 px, `blur(22px)`) — `box-shadow` num elemento de 2 px quase não espalha luz. Mobile: 4 barras, afastadas do título | CSS |
| 4 | Luz rebatida | Trapézios de luz nas paredes laterais | `clip-path: polygon(...)` com `linear-gradient` âmbar a 8 % de opacidade | CSS |
| 5 | Névoa de chão | Fumaça densa cobrindo a base do salão | `plate-smoke-floor.webp`, `screen`, `mask-image` vertical, `opacity .5` | PLATE |
| 6 | Rótulo | `ACT III` / `THE SANCTUM` / `THE ROOM` | `p` + `h2`, colunas 1–4 | TEXTO |
| 7 | Título de lugar | `SÃO BERNARDO DO CAMPO // CENTRO` — corrigido (D1) | `p.place` em `--fs-display`, Archivo `wdth 92` ✱, tracking 0 ✱, `--place-warm`. Halo escuro em `text-shadow` garante AA onde cruza o neon (mínimo medido 6,05:1 @1440, 12,4:1 @390). Mobile: 2 linhas (`// CENTRO` embaixo). O `SANTO ANDRÉ // JARDIM BELA VISTA` do mockup é de outra unidade e não entra | TEXTO |
| 8 | Entrada e saída | `--ink-900` no topo (emenda com o ACT II) e na base, rumo ao ACT IV | `linear-gradient(180deg, --ink-900 0%, transparent 11%, transparent 78%, --ink-900 100%)`. A névoa (camada 5) é filha direta da seção para o `screen` alcançar o fundo | CSS |

**Resolvido (D1/D2):** o mockup traz a unidade *Santo André / Jardim Bela Vista*. O site é
da unidade **São Bernardo do Campo** — Av. das Nações Unidas, 50, Centro, 09726-110.
Nenhum dado escrito no mockup (endereço, bairro, telefone) é aproveitado; tudo vem do
CLIENTE.md. O texto do mockup serve só como referência de posição e peso visual.

---

### 04 — RESERVA (`04-reserva.png`, y 1105–1376)

| # | Camada | O que é | Como implementar | Origem |
|---|---|---|---|---|
| 1 | Fundo | Lâmina d'água escura de borda a borda | `#08090C` + água **procedural** em `feTurbulence` (D21). Não existe `plate-water-tile` | CSS/SVG |
| 2 | Ondulação | Ondas horizontais finas, brilho frio | `svg` full-bleed com `feTurbulence baseFrequency="0.01 0.06"` + `feDisplacementMap` sobre um gradiente; `baseFrequency` animado | SVG |
| 3 | Névoa lateral | Bruma baixa vindo das laterais | `plate-smoke-floor.webp` reaproveitado (não há `plate-smoke-low`), `screen`, `opacity .4` | PLATE |
| 4 | Rótulo | `ACT IV` / `THE RITUAL OF CONNECTION` | `p` + `h2`, colunas 1–4 | TEXTO |
| 5 | Card de reserva | Painel preto, borda 1 px clara, `--r-lg`, 57 % de largura, colunas 4–11 | `form` com `background: rgb(4 5 7 / .78); backdrop-filter: blur(8px); border: var(--border-hud)`. **Sem backend (D9)** — nenhum `action`, `novalidate` fora, validação nativa ligada | CSS |
| 6 | Labels | `DATA`, `HORÁRIO`, `PESSOAS` — PT-BR (D7/D9) | `label` em `--fs-label`, `--text-dim`, cada um preso ao campo por `for`/`id`. `TABLE SELECT` e `TABLE GOORDINATE` do mockup são descartados: o primeiro era ilegível para o cliente e o segundo é erro de geração | TEXTO |
| 7 | Campo **DATA** | Ocupa os 2 selects biselados do mockup | `input type="date"` com `min` = hoje. Estilo do mockup: `appearance:none`, `background: linear-gradient(180deg,#3A3E44,#1D2025)`, `--r-md`, ícone SVG em `background-image` | CSS+SVG |
| 8 | Campo **HORÁRIO** | Assume a caixa `01 : 20` | `select` com faixas de 30 min. Limite superior vindo do CLIENTE.md: fecha **23:00** → última opção `22:00`. Caixa em `--ink-600` com `--border-hud` | CSS |
| 8b | Campo **PESSOAS** | Assume a caixa `01 : 02` | `input type="number" inputmode="numeric" min="1" max="20"`, mesma caixa. Substitui o `TABLE COORDINATE`, que não tinha sentido para o cliente final | CSS |
| 9 | Botão WhatsApp | Contorno claro, largura total | `button type="submit"` (não `<a>`: o texto é montado no clique). No `submit`, monta a mensagem e abre `https://wa.me/55<DDD><numero>?text=<encodeURIComponent(msg)>` em `_blank` (D9). **Número: só o do CLIENTE.md — (11) 2669-7175** (D2); ver §8.1. Rótulo em PT-BR: `RESERVAR PELO WHATSAPP`. `--border-strong`, `--r-md`, altura 66 px, `--fs-hud`. Hover: preenche em `--chrome-100`, texto em `--ink-900` | TEXTO+CSS+JS |
| 10 | Reflexo do card | O card inteiro espelhado e distorcido na água abaixo | Clone `aria-hidden`, `scaleY(-1)`, `mask-image: linear-gradient(#000 0%, transparent 65%)`, `filter: blur(2px) url(#ripple)`, `opacity .5`. Abaixo de 768 px vira reflexo estático (D18) | CSS+SVG |

#### Formulário como construído (ACT IV)

| Campo | Controle | Regras |
|---|---|---|
| **DATA** | 2 `select` com bisel metálico e chevron SVG (máscara colorida por token): **dia** e **mês** | Só de hoje até hoje + 60 dias; o select de dia se refaz ao trocar o mês. Padrão: hoje (amanhã se já passou das 20:00) |
| **HORÁRIO** | 2 `input` numéricos `HH` : `MM` (`inputmode="numeric"`, 2 dígitos) | HH 0–23, MM 0–59; **antes das 23:00** (único dado do CLIENTE.md, ver §8.2); se a data for hoje, depois de agora |
| **PESSOAS** | 2 `input` numéricos **ADULTOS** : **CRIANÇAS** | Pelo menos 1 adulto; crianças ≥ 0 |

- Cada grupo é `fieldset` + `legend` visível (`DATA`, `HORÁRIO`, `PESSOAS`); cada campo tem
  `label for` próprio (visualmente oculto: Dia, Mês, Hora, Minutos, Adultos, Crianças).
- Erros em PT-BR num `p[role=alert]` dentro do card, campo com `aria-invalid`, foco no primeiro
  inválido, borda âmbar. Sem `alert()`.
- Botão: `RESERVAR PELO WHATSAPP // (11) 2669-7175`, montado da constante `WHATSAPP` no topo de
  `js/reserva.js`. Abaixo: "A reserva é confirmada pelo restaurante no WhatsApp."
- **Sem JS**, o botão é um `<a href="https://wa.me/551126697175">` simples, sem mensagem; o JS o
  troca por `<button type="submit">`. (O número aparece no HTML só nesse fallback.)
- **Reflexo:** réplica visual do card (só `span`), `aria-hidden` + `inert`, sem ids nem campos;
  o JS espelha os valores digitados nela.
- **Água:** `feTurbulence` estático (`#water`) usado só como alfa das cristas; a cor vem do
  `fill` por token. < 768 px: faixas em gradiente + `blur` (D18).
- **Emenda:** o ACT IV começa em `--ink-900` (o mockup começa em água clara) por uma entrada em
  degradê; a página termina no reflexo do card.
- Testes: `npm run test:form` (envio, texto do wa.me, erros, sem JS, ids, Tab, foco).

#### Mensagem do WhatsApp (D9)

```
Olá! Gostaria de reservar uma mesa para o dia 27/09 às 20:30, 2 adultos e 1 criança.
```

Plural correto (`1 adulto`, `2 adultos`, `0 crianças`), `encodeURIComponent`, aberto com
`window.open(…, "_blank", "noopener")`.

---

### 05 — RODAPÉ (novo, D10)

Não existe no mockup: a página termina no reflexo do card. O rodapé é acrescentado no mesmo
registro visual — preto, hairlines, caixa-alta com tracking largo, nenhuma caixa nova.

| # | Camada | O que é | Como implementar | Origem |
|---|---|---|---|---|
| 1 | Fundo | Continuação da água, escurecendo até preto chapado | `linear-gradient(180deg, #08090C 0%, #040507 55%)`; sem borda superior — a transição é só o gradiente | CSS |
| 2 | Régua | Hairline de 1 px separando do ACT IV | `border-top: 1px solid rgb(255 255 255 / .08)` com `margin-inline: var(--gutter)` | CSS |
| 3 | Endereço | `Av. das Nações Unidas, 50 — Centro, São Bernardo do Campo — SP, 09726-110` | `address` em `--fs-hud`, `--text-mid`, link para o Google Maps (plus code `8C5R+2J` como reforço) | TEXTO |
| 4 | Horário | `Todos os dias · fecha às 23:00` | `p` em `--fs-label`, `--text-dim`. **Só "fecha 23:00" consta no CLIENTE.md** — o horário de abertura está em §8.2 | TEXTO |
| 5 | Faixa de preço | `R$ 80–160 por pessoa` | `p` em `--fs-label`, `--text-dim` | TEXTO |
| 6 | Instagram | Link único de rede | `a` com ícone SVG inline (traço 1,5 px, `currentColor`) + handle. URL em §8.3 | SVG+TEXTO |
| 7 | Marca | Wordmark `ASAMI` / `SUSHI` **em texto**, no mesmo desenho do logo da nav (D23). O logo real (`imgi_2`, 150 px) é pequeno demais e fica **só como favicon** até chegar um arquivo melhor | TEXTO |
| 8 | Créditos | Linha final discreta | `p` em `--fs-label`, `--text-dim` | TEXTO |

Layout **como construído** (id `#rodape`): **3 colunas iguais** no desktop — (1) wordmark
`ASAMI SUSHI` em texto + nome + "restaurante japonês · rodízio e à la carte"; (2) endereço, um
link único para o Google Maps (`maps/search`, sem iframe) com "Ver no Google Maps ↗";
(3) horário (`Fecha às 23:00`), preço (`R$ 80–160`) e telefone (`tel:`, montado da constante
`WHATSAPP`). Empilha em 1 coluna no mobile, na mesma ordem. **Sem Instagram** (não consta no
CLIENTE.md), sem CNPJ, sem créditos. Começa em `--ink-900` puro (o ACT IV termina num degradê
de saída) e usa o mesmo grão global (`.section::after`).

---

## 4b. Navegação e menu (como construídos)

**Onde fica cada peça.** Trilho (camada 11), progresso (12) e player (13) ficam num
`<div class="act-nav">` no nível do `<body>`, **fora das seções**: cada ato é um stacking
context isolado (`isolation: isolate`, necessário para o `screen` dos plates), e como filhos do
hero seriam cobertos pelos atos seguintes.

| Peça | Desktop (≥ 768 px) | Mobile |
|---|---|---|
| Trilho | `fixed`, centro a 51,5 % da altura; some quando o rodapé invade a faixa central | `absolute` sobre o hero (fixo cobriria os cards) |
| Progresso | `fixed`, ponto em `top: calc(var(--progress) * 100%)`; `--progress` = scroll ÷ (altura − viewport) | idem, sobre o hero |
| Player | `fixed` no canto inferior esquerdo; **sobe junto com o rodapé** (`--nav-lift`) para nunca cobri-lo nem sumir | `absolute`, na linha inferior do hero |

- **Trilho (D17):** 4 links reais `#ato-1…4` com `aria-label` ("Ato III · Ambiente"…). O ato que
  cruza a **linha do meio da viewport** (`IntersectionObserver`, `rootMargin -50% 0 -50% 0`)
  recebe `aria-current="location"` e o traço longo em `--chrome-100`.
- **⏮ ⏭:** rolam até o ato vizinho com `scrollIntoView` — `smooth`, ou `auto` sob
  `prefers-reduced-motion`. Nas pontas ficam `aria-disabled="true"` (continuam focáveis).
- **Âncoras:** `.section { scroll-margin-block: 0 }` — atos full-bleed encostam no topo.
- **Pílula do topo (D25):** link `RESERVAR` para `#ato-4`. O toggle inferior foi removido.

**Menu (camada 17, D11).** Itens: **Rodízio** (`#ato-2`), **Ambiente** (`#ato-3`),
**Reservas** (`#ato-4`), **Cardápio** (`wa.me` com "Olá! Gostaria de ver o cardápio.", mesma
constante `WHATSAPP` de `js/config.js`; nova aba). Overlay `div[role=dialog][aria-modal]` em
`--ink-900` com `plate-smoke-floor` em `screen` (recortado por `.menu__bg`, que não cria stacking
context), itens em `--fs-display`, fade de 200 ms na abertura.
- Com JS: o hambúrguer vira `<button aria-expanded aria-controls="menu">` e se transforma em X;
  o header fica `fixed` acima do overlay; foco preso (X → itens → X), `Esc` fecha e devolve o foco
  ao botão, o resto da página fica `inert`, rolagem travada (`overflow: hidden` + `padding-right`
  da largura da barra, para nada se deslocar). Clicar num item fecha e segue o link.
- **Sem JS:** o hambúrguer é `<a href="#menu">`, o overlay abre por `:target`, os itens são
  links comuns e há um link "Fechar menu"; o trilho continua com links reais.

Testes: `npm run test:nav` (menu por teclado e clique, foco preso, Esc, scroll travado,
⏮ ⏭ + trilho, ⏸, progresso, sem JS, overflow, console, requests) e `npm run test:form`.

---

## 5. Animação por seção

Base global (tokens em `css/tokens.css`):
`--ease-out: cubic-bezier(.16,1,.3,1)` · `--ease-soft: cubic-bezier(.4,0,.2,1)` ·
durações `--t-fast:220ms` `--t-mid:600ms` `--t-slow:1200ms` `--t-cine:2400ms` ·
`--t-enter:800ms` (véu de entrada) · `--t-fade:200ms` (único movimento do modo "reduced") ·
`--reveal-y:1.5rem` · `--reveal-scale:.96` · `--reveal-at:.35` (fração visível que dispara a entrada).

### 5.0 Infraestrutura (etapa "motion base", 24/09/2026)

Arquivos:
- `js/motion/core.js`: o núcleo;
- `css/motion.css`: estados iniciais, pausa, véu e Lenis;
- `js/vendor/`: GSAP 3.15 core + ScrollTrigger e Lenis 1.3, builds UMD/IIFE copiados por
  `npm run vendor`;
- o script inline do `<head>`.

Tudo em scripts clássicos: o site continua abrindo por duplo clique (`file://`). Testes:
`npm run test:motion`.

**Modos (D26).** `core.js` é a fonte única de verdade. Precedência: `paused` > `reduced` > `full`.

| Modo | Quando | O que acontece |
|---|---|---|
| `full` | padrão | Lenis ligado, parallax (se `quality="high"`), loops, revelações completas |
| `reduced` | `prefers-reduced-motion: reduce` (ouvido em tempo real) | Sem Lenis, sem parallax, sem loops (`motion.loop` recusa). Revelação vira fade de `--t-fade`. `html.js-motion` sai: nada fica escondido antes da pintura |
| `paused` | ⏸ do player → `html[data-motion="paused"]` (observado em tempo real) | `gsap.globalTimeline` pausada, `animation-play-state: paused` em tudo (CSS), Lenis desligado (rolagem nativa), parallax em `y = 0`. Revelações pendentes aparecem na hora. Uma rolagem suave em andamento termina no destino. Ao sair, tudo continua de onde parou |

Com a aba escondida (`document.hidden`) tudo pausa também (`html[data-page-hidden]` + timeline
global) e volta ao reaparecer, salvo se o visitante tiver pausado.

**API (`window.motion`).**

| Membro | Uso |
|---|---|
| `motion.mode` | `"full"`, `"reduced"` ou `"paused"` |
| `motion.base` | `"full"` ou `"reduced"`: o que as animações registradas montaram (a pausa não muda a base) |
| `motion.quality` | `"high"` ou `"low"` (D27) |
| `motion.on("mode", fn)` | `fn(mode, anterior)` a cada troca; devolve a função que cancela |
| `motion.register(setup)` | ver abaixo; devolve a função que desregistra |
| `motion.loop(el, anim, { grupo })` | animação GSAP contínua: pausada com `el` fora da tela; em `reduced` é morta e devolve `null`. Num `grupo` (ex.: `"turbulencia"`) só roda a do elemento mais visível (D34) |
| `motion.rolando` | `true` enquanto a página rola, até 200 ms depois do último scroll. Quem anima um filtro caro não reescreve durante a rolagem (D32) |
| `motion.debug` | gancho de inspeção dos testes: cada seção expõe suas timelines (`motion.debug.ato2.entrada` etc.) |
| `motion.abaixo(el)` | `true` se `el` ainda não chegou a `--reveal-at` (35 %) de visibilidade — só isso pode ser escondido para uma entrada (D35) |
| `motion.entrada(gatilho, tl, fim)` | entrada de seção: a timeline pausada toca uma vez quando 35 % do gatilho aparece; em `paused` conclui na hora (e as em andamento também); `fim()` ao terminar. Usada pelo ACT II e pelo ACT III |
| `motion.scrollTo(alvo, { imediato })` | rola até elemento/seletor com offset zero (Lenis se ativo, senão nativo) |
| `motion.scan()` | relê `data-reveal`, `data-parallax` e `data-loop` (conteúdo inserido depois) |
| `motion.ease`, `motion.easeSoft`, `motion.dur("--t-mid")` | tokens já convertidos para o GSAP |
| `motion.lenis` | instância do Lenis ou `null` |

**Como cada animação futura se registra** (contrato das próximas etapas). O script da seção
entra na fila do carregador do `<head>`, depois de `core.js` (D29):

```js
// js/motion/rodizio.js
motion.register((m) => {
  // roda dentro de um gsap.context: tweens e ScrollTriggers criados aqui são desfeitos
  // sozinhos quando m.base muda (full ↔ reduced) e refeitos com a nova base
  if (m.base === "reduced") return;                 // nada de loop/parallax/entrada longa
  gsap.from(".rodizio__board", { y: 40, duration: m.dur("--t-slow"), ease: m.ease,
    scrollTrigger: { trigger: "#ato-2", start: "top 65%" } });
  m.loop(document.querySelector(".rodizio__boards"),   // pausa fora da tela
    gsap.to(".rodizio__board", { y: 6, duration: 9, yoyo: true, repeat: -1, ease: "sine.inOut" }));
  if (m.quality === "low") return;                  // camadas caras só em "high" (D27)
  // …
  return () => { /* limpeza do que não for GSAP (listeners etc.) */ };
});
```

Regras:
- **Só `transform` e `opacity`.** `filter` e `clip-path` pontualmente. Nunca `width`, `height`,
  `top`, `left`, `margin`.
- **Estados iniciais escondidos só sob `html.js-motion`** (CSS) ou criados dentro do `register`
  (desfeitos pelo `gsap.context`). Sem JS, com falha ou em `reduced`, o conteúdo aparece.
- **A pausa é global:** não é preciso tratar `paused` em cada animação. Só reaja a
  `motion.on("mode")` se algo precisar voltar ao repouso (como o parallax faz). Escritas de
  estado durante a pausa vão direto no `style`: `gsap.set` entra na timeline global, que está
  pausada, e não seria aplicado.
- **Loops CSS** ficam dentro de um elemento com `data-loop`: fora da tela ele recebe
  `data-offscreen` e as animações dentro dele pausam. **Loops GSAP** passam por `motion.loop`.
- **`will-change` só durante a animação:** os utilitários põem e tiram. Nunca em CSS fixo.
- **Nada na primeira tela depende do GSAP (D29).** Entradas do hero são `@keyframes` em CSS
  sob `html.js-motion`, como o véu.

**Atributos declarativos** (lidos por `core.js`; nenhum elemento usa ainda):

| Atributo | Efeito |
|---|---|
| `data-reveal="up"` · `"fade"` · `"scale"` | Entra uma vez quando `--reveal-at` (35 %) do elemento está visível: `opacity` 0 → 1, mais `translateY(--reveal-y)` ou `scale(--reveal-scale)` → repouso, em `--t-mid` com `--ease-out`. Em `reduced`, só fade de `--t-fade`, e só para quem ainda está abaixo da tela. Ao terminar: `data-revealed`, estilos inline limpos |
| `data-reveal-delay="120"` | Atraso em ms (só no modo `full`) |
| `data-parallax="0.12"` | `y = fator × (scroll − repouso)`, só `transform`. **Repouso = ato alinhado ao topo da tela**, então cada ato parado por ⏮ ⏭ ou âncora mostra exatamente o layout estático. Desligado em `reduced`, `paused` e `quality="low"` |
| `data-loop` | Container de loops CSS: pausa fora da tela (`IntersectionObserver`, margem de 10 %) |

Não combine `data-reveal` e `data-parallax` no mesmo elemento nem use em elementos que já têm
`transform` próprio: os dois escrevem em `transform`. Use um wrapper.

**Qualidade (D27).** O `<head>` marca `html[data-quality="low"]` quando o aparelho tem
`hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, `saveData` ou tela com menos de 768 px; senão
`"high"`. Fixo por carga (não muda ao girar a tela). `?quality=low|high` força para testes.
**Contrato para as próximas etapas: em `"low"`, degradar as camadas caras**, na linha da D18:
- `feTurbulence` e reflexos animados passam a estáticos;
- parallax desligado (já feito);
- menos camadas de fumaça e bolhas;
- sem `backdrop-filter` animado;
- neon sem pulsação de `box-shadow`, que vira `opacity`.

**Entrada da página (D28).** Véu `--ink-900` (`body::before` sob `html.motion-enter`) que se
desfaz em `--t-enter` (800 ms), só `opacity`. É CSS puro: não espera JS, e o conteúdo (e o LCP)
pinta por baixo desde o primeiro quadro. Não existe em `reduced` e ignora a pausa (pausado, ficaria
preto).

**Carregamento tardio (D29, D31, D33).** GSAP, ScrollTrigger, Lenis e `core.js` somam 51 KB gzip (164 KB
sem compressão). Pedidos com `defer`, disputavam banda com a imagem de LCP no 4G simulado: o
Lighthouse mobile caiu de 80 para 76 e o LCP subiu de 3,7 s para 4,4 s. Por isso o carregador do
`<head>` só os pede depois do `load`, na 1ª interação (`scroll`, `wheel`, `touchstart`,
`pointerdown`, `keydown`) ou 2,5 s depois, o que vier antes. Se a página abrir numa âncora ou já
rolada, carrega na hora. A fila é `gsap`, `ScrollTrigger`, `lenis`, `core.js`, `hero.js` e o CSS
`hero-loops.css` (D31), nunca durante uma rolagem ou uma sequência de cliques (D33). Se o núcleo
não ficar pronto em 6 s, `js-motion`/`motion-enter` saem,
tudo aparece e o núcleo não religa depois. Consequência: o primeiro gesto de rolagem pode ainda
ser nativo, e **nada da primeira tela pode depender do GSAP**.

**Rolagem suave (D30).** Lenis só no modo `full`, sincronizado com o ScrollTrigger
(`lenis.on("scroll", ScrollTrigger.update)` + `gsap.ticker`).
- **Âncoras da página** (trilho, menu, skip link, `#ato-*`): clique interceptado e
  `lenis.scrollTo` com offset zero. Por teclado, o foco acompanha o alvo, como na âncora nativa.
- **Navegação programada** (⏮ ⏭, âncoras): duração fixa `--t-slow` com `--ease-soft`, não o
  `lerp`. A cauda sub-pixel do `lerp` desfaria uma rolagem nativa feita logo depois.
- **⏮ ⏭ contam a partir do destino pedido** enquanto a rolagem está a caminho (`js/nav.js`).
  Antes, cliques rápidos voltavam para um ato atravessado. O destino é descartado quando o
  visitante rola por conta própria.
- **Menu:** `lenis.stop()` ao abrir e `start()` ao fechar (observando `html.menu-open`). O
  overlay tem `data-lenis-prevent` e rola nativo.
- **Tab** para um campo fora da tela rola nativamente, e o Lenis se sincroniza.

**Pausa manual (antes D13, agora D25/D26).** O ⏸ (`[data-pause]`, `js/nav.js`) alterna
`<html data-motion="paused">` e `aria-pressed`; `core.js` observa o atributo e aplica o modo
`paused` acima.

**Corte em mobile (D18).** Abaixo de **768 px**, todos os reflexos perdem o
`filter: url(#ripple)` e ficam **estáticos com `blur(3px)`**; a distorção por
`feTurbulence` roda só a partir de 768 px. Vale para os 3 reflexos (hero, rodízio,
reserva) e para a ondulação da água do ACT IV, que em mobile vira gradiente fixo.
`feTurbulence` animado é caro demais para GPU de celular. Telas < 768 px já são
`quality="low"` (D27).

As tabelas abaixo são o plano por seção, a implementar nas próximas etapas sobre esta base.
Onde elas pedem entrada no hero, vale a D29: CSS, não GSAP.

### Hero — construído (etapa "motion hero", 24/09/2026)

Arquivos:
- `css/hero.css`: entradas e o wrapper `.hero__water`;
- `css/hero-loops.css`: loops;
- `js/motion/hero.js`: ondulação da água;
- `data-parallax` e `data-loop` no HTML;
- traço do trilho em `css/nav.css`.

Testes e medição: `npm run test:motion` (`scripts/test-motion-hero.mjs`), com saída em
`screenshots/motion/`.

| Elemento | Como ficou | Técnica |
|---|---|---|
| Entrada da página | Véu `#040507` → conteúdo, 800 ms (D28) | CSS |
| Wordmark (e a cópia no reflexo) | `scale(1.06)` + `blur(14px)` → repouso, 1800 ms `--ease-out`. Em `quality="low"`: `scale(1.06)` + `opacity 0` → repouso, sem blur. Sem `fill: forwards` e sem `will-change`: ao terminar, o `filter` volta aos dois `drop-shadow` estáticos e a camada deixa de ser promovida | CSS (`@keyframes hero-wordmark-in`) |
| Rótulo `ACT I / THE ARRIVAL` | `translateY(12px)` + fade, 600 ms, delay 2000 ms | CSS |
| HUD e player | `opacity 0→1`, 600 ms, delay 1600 ms. Hover do player: borda → `--chrome-100` em 220 ms (`--t-fast`, já existia) | CSS |
| Fumaça | 3 camadas: 56 s, 70 s e 40 s, `linear infinite alternate`, `translate` + `scale` como propriedades individuais (compõem com o `scaleX(-1)` da camada espelhada). **low: só a camada central anima** | CSS (`hero-loops.css`) |
| Bolhas | 14 bolhas, 6–14 s, fases escalonadas por delay negativo. O ciclo **passa pela pose estática**: parte dela, sobe 180 px sumindo (0–62 %), renasce 40 px abaixo e volta à pose (62–100 %). **low: 6 animam**, as outras 8 ficam na pose estática | CSS |
| Nigiri | `translateY(±10px)` + `rotate(±2deg)`, 7 s `ease-in-out infinite alternate`, compondo com o `rotate: -14deg` de base | CSS |
| Grade do piso e reflexo | `baseFrequency` do `#wave` e do `#ripple` oscila (+12–20 %), 6 s ida + 6 s volta = ciclo de 12 s, reflexo defasado 400 ms. **Só `full` + `high` + ≥ 768 px** (D18, D27). Durante a rolagem o atributo não é reescrito (D32) | GSAP em `motion.register` + `motion.loop` |
| Parallax | Wordmark `× .25` (`h1`), fumaça `× .10` (`.hero__smoke`), água `× .40` (wrapper novo `.hero__water` com piso + reflexo, porque o reflexo já tem `scaleY(-1)`). Repouso no topo da página. Desligado em `reduced`, `paused` e `low` | `data-parallax` (§5.0) |
| Trilho | Traço em duas camadas (`::before` apagado, `::after` aceso) com a altura do ativo; inativo `scaleY(.45)` ≈ 6,3 de 14 px; ativo cresce para `scaleY(1)` e acende por `opacity`, 300 ms `--ease-out` | CSS (`nav.css`) |
| ⏮ ⏭ | Ver D30 | — |
| Overlay de menu | Ver "Menu, player e rodapé" (etapa final) | — |

**Modos.**
- **`reduced`:** sem `html.js-motion` → nenhuma entrada, nenhum loop, nenhum parallax, e o hero
  aparece direto no estado estático. O "fade de 200 ms" pedido não existe aqui: o `reset.css`
  já zera animações em `reduced`, e o conteúdo do hero nunca some.
- **`paused`:** congela tudo (CSS por `animation-play-state`, ondulação pela timeline global) e
  retoma de onde parou.
- **Fora da tela:** `data-loop` no `#ato-1` pausa os loops CSS, e `motion.loop` pausa a ondulação.
- **Aba escondida:** tudo pausa.

**Estado final = estático aprovado.** Todo loop está na pose estática na fase 0 e toda entrada
termina nela. O teste compara o `#ato-1` com a entrada terminada e os loops na fase 0 contra o
hero do commit `33b2baf`. Tolerância: pixel diferente = algum canal com diferença > 24/255, e no
máximo 0,5 % dos pixels podem diferir. Medido: **0,078 % em 1440** e **0,142 % em 390** (média
0,60 e 0,46/255). A diferença é antialiasing e o traço inativo do trilho (6,3 px contra 6,48 px).

**Custo (medido, 24/09/2026)**, em Chromium headless com GPU (Intel UHD 770, ANGLE/D3D11), 10 s
parado e 10 s rolando.
- **Métricas:** rAF, Long Animation Frames e quadros do compositor pelo trace (`PipelineReporter`).
- **Orçamento:**
  - até 2 quadros > 50 ms isolados em 10 s;
  - até 5 % de quadros do compositor descartados;
  - uma fase fora do orçamento é medida de novo uma vez.
- **Parado:** 60 fps e 0 descartados em todos os casos.
- **Rolando:**

  | Caso | Quadros descartados | Quadros longos |
  |---|---|---|
  | high com a ondulação | ~1–3 % | 1–2 isolados, 120–130 ms, sem script |
  | high sem a ondulação (controle) | ~0,5–2 % | ~1 isolado |
  | low | 0–2 % | — |
  | celular 390 | 0 % | — |

- **Ruído do ambiente:** o controle mostra rajadas esporádicas de ~20 quadros descartados sem
  nenhuma animação cara.
- **Primeira medida da ondulação:** reescrever o `baseFrequency` durante a rolagem derrubava 18
  quadros, com picos de 141–189 ms. Daí a D32.
- **A/B de 8 rodadas de rolagem, já com a D32:** 11 contra 5 descartados em média, ~1,1 % contra
  0,5 %.

Por isso o `feTurbulence` animado foi **mantido**: parado custa zero, e rolando fica dentro do
orçamento.

**Lighthouse mobile** (5 execuções, mediana; versão atual e `33b2baf` servidas com LF, como vão
para produção): referência 84 / LCP 3,6 s; hero 83 / LCP 3,6 s. Duas coisas atrasavam o LCP
em 0,2 s e foram tiradas do caminho crítico (D31):
- os loops no CSS bloqueante;
- um arquivo externo para o carregador.

### Rodízio — construído (etapa "motion ato 2", 24/09/2026)

Arquivos:
- `js/motion/rodizio.js`: entradas, callouts e ondulação;
- `css/rodizio-motion.css`: loops e hover, pedido junto com o motion (D31);
- `data-parallax` e `data-loop` no HTML;
- dois ajustes no `rodizio.css`: o grupo de mescla e o wrapper do reflexo.

Teste e medição: `scripts/test-motion-ato2.mjs`, com saída em `screenshots/motion/ato2-*`.

**Estrutura — um efeito de movimento por elemento:**

| Elemento | Efeito | Propriedade |
|---|---|---|
| `.rodizio__boards`, `.rodizio__shadows` | parallax ×.12 | `transform` (core.js) |
| `.board` (tábua) | entrada | `transform` (GSAP) |
| `.board` (tábua) | hover | `scale` (propriedade individual, separada da entrada) |
| `.board img` | flutuação | `translate` |
| `.rodizio__steam` | parallax ×.06 | `transform` |
| `.rodizio__steam-layer` | loop do vapor | `translate` + `opacity` |
| `.rodizio__reflection-wrap` (novo) | parallax ×.20 + fade da entrada | `transform` / `opacity` |
| `.rodizio__reflection` | espelho (estático) + ondulação | `scaleY(-1)` / `filter` |

**Mescla.**
- **Wrapper transformado dentro do grupo em screen:** vira stacking context, e as tábuas passam
  a mesclar só dentro dele. Por isso o `.rodizio__boards` também faz `mix-blend-mode: screen`.
  O screen é associativo, então o resultado é o mesmo.
- **Só quando há parallax** (`html.js-motion[data-quality="high"]`): isolar o grupo muda a
  reamostragem das imagens (1,7 % dos pixels no retrato), e sem parallax ele não é necessário.
- **`rotateX` com `perspective` na própria tábua em screen não quebra a mescla.** Verificado em
  cada quadro-chave da entrada: pixels "preto de plate" (todos os canais ≤ 3; o fundo nunca
  desce de `#040507` e os plates têm o preto esmagado em 0) nas tábuas = **0** em 1440 e 390.

| Elemento | Como ficou |
|---|---|
| Rótulo | `translateY(16px)` + fade, 600 ms `--ease-out`, uma vez, a 35 % de visibilidade |
| Tábuas | `translateY(40px) rotateX(6deg)` → repouso, 1200 ms `--ease-out`, 180 ms entre esquerda e direita. **Sem fade**: com `opacity 0` desde a montagem o Chrome não rasteriza as tábuas (imagens grandes em screen), e o 1º quadro da entrada rasterizava tudo de uma vez (~400 ms medidos). Sombras e reflexo entram por `opacity` **no container** (o filho de um elemento com `blur` obrigaria a refazer o filtro a cada quadro) |
| Flutuação | `translate` ±6 px, 9 s e 11 s (defasadas), `ease-in-out infinite alternate`, só depois da entrada (`.is-flutuando`) |
| Vapor | 18 s, sobe 7 % e volta, `opacity` a 55 % no meio. 2 camadas; **low: 1** |
| Faíscas | 12 de 13 (a 13ª fica na pose); **low: 5**. Sobem 60 px sumindo e renascem 16 px abaixo; 3–5 s com fases fixas por elemento (sem `Math.random`) |
| Callouts | Linha desenhada por `stroke-dashoffset` (comprimento → 0) em 700 ms `--ease-soft`; ponto junto; rótulo 200 ms depois de a linha terminar; 120 ms entre callouts (esquerda, preço, sashimi, colchete), começando 400 ms depois das tábuas. **O `pathLength` normalizado não funciona aqui**: as linhas usam `vector-effect: non-scaling-stroke`, e com ele o tracejado é medido na tela (o `dasharray` de 1 virava pontilhado de 1 px). O comprimento é medido em pixels de tela (`getScreenCTM`). Sem JS, as linhas aparecem inteiras |
| Parallax | Tábuas e sombras ×.12, vapor ×.06, reflexo ×.20. Desligado em `reduced`, `paused` e `low` |
| Hover na tábua | `scale: 1.02` + as linhas-guia dela em `--chrome-100`, 220 ms, só em `@media (hover: hover)` (`:has()` liga a tábua às linhas) |
| Reflexo d'água | Filtro próprio `#ripple-ato2`; anima o deslocamento (0 → 14) e o ruído, ciclo de 12 s, 3 s defasado do hero. **Fase 0 = deslocamento 0 = estático aprovado**, que não tinha ondulação. Só `full` + `high` + paisagem ≥ 768 px; congela durante a rolagem (D32); grupo exclusivo com o hero (D34) |

**Entradas nunca prendem conteúdo escondido (D35).**
- **O que é escondido:** só o que ainda está abaixo da tela quando o motion se instala (menos de
  35 % visível). O motion chega depois do load (D29), e o que já está à vista fica como está.
- **Visitante que pula o ato** (trilho ou menu até o ACT IV, ⏭ ⏮ rápidos): a entrada dispara ao
  passar e termina fora da tela.
- **Pausa:** conclui a entrada na hora.
- **Testado:** o ACT II termina visível e no estado final nos três caminhos.

**Um `feTurbulence` por vez (D34).** Hero e ACT II usam `motion.loop(..., { grupo: "turbulencia" })`.
Só roda a ondulação da seção mais visível, e a do hero também pausa quando ele sai da tela.
Medido em 6 posições de rolagem: nunca as duas ao mesmo tempo. As duas ondulações do hero, piso e
reflexo, contam como um efeito só.

**Estado final = estático aprovado** (`382ecc4`, mesma tolerância do hero).
- **Loops cancelados** (pose de repouso): **0,017 % em 1440** e **0,000 % em 390**.
- **Loops parados na fase 0:** 0,133 % e 0,044 %. A diferença é o elemento animado virando
  camada do compositor.

**Custo** (GPU Intel UHD 770; 10 s parado no ACT II e rolagem hero → ACT II → ACT III; mesmo
orçamento do hero, com uma fase repetida se estourar):

| Caso | Parado | Rolando |
|---|---|---|
| high | 0 descartados | 0–3,8 % descartados, 0–1 quadro longo isolado |
| low | 0 descartados | 0–2,5 % |
| celular 390 | 0 | 0 |

- **Controle:** a mesma rolagem no site aprovado teve 0–63 descartados em 3 rodadas, com picos
  de até 1 s sem script. É o ruído do ambiente.
- **Primeira versão:** 20 % de quadros descartados e picos de 900 ms. As causas eram o fade das
  tábuas e a opacidade animada dentro dos elementos com `blur`, as duas corrigidas acima.

**Lighthouse mobile** (5 execuções, mediana, as duas versões com LF): `382ecc4` 84 / LCP 3,6 s;
com o ACT II 83 / LCP 3,6 s.

### Sanctum — construído (etapa "motion ato 3", 24/09/2026)

Arquivos:
- `js/motion/sanctum.js`: entrada, título e zoom de rolagem;
- `css/sanctum-motion.css`: loops, pedido junto com o motion (D31);
- `data-parallax` e `data-loop` no HTML;
- wrappers novos no `sanctum.css`, que não mudam o estático.

Teste e medição: `scripts/test-motion-ato3.mjs`, com saída em `screenshots/motion/ato3-*`.

**Estrutura — um efeito de movimento por elemento:**

| Elemento | Efeito | Propriedade |
|---|---|---|
| `.sanctum__room` | parallax ×.08 + **a máscara** (nunca escala) | `transform` |
| `.sanctum__room-zoom` (novo) | zoom de rolagem 1 → 1,03 | `transform: scale` (escrita direta) |
| `.sanctum__room-in` (novo) | entrada 1,08 → 1 | `transform` (GSAP) |
| `.sanctum__room-img` (novo) | a imagem, o multiply e o filtro (estáticos) | — |
| `.sanctum__spills` (novo) | parallax ×.08, junto com o salão (a luz está nas paredes dele) | `transform` |
| `.sanctum__spill` | fade da entrada | `opacity` |
| `.neon` | parallax ×.14 | `transform` |
| `.neon__slot` (novo, 1 por barra) | cascata da entrada | `opacity` |
| `.neon__bar` | micro-flicker | `opacity` |
| `.neon__bar::after` (halo largo) | pulso | `opacity` |
| `.sanctum__fog-wrap` (novo) | parallax ×.22; faz screen quando existe (D36) | `transform` |
| `.sanctum__fog` | deriva horizontal | `translate` |

**Salão e máscara (item 3 do pedido).** A máscara saiu da camada que escala: ela fica em
`.sanctum__room`, que só se desloca pelo parallax. Imagem e filtro ficam em
`.sanctum__room-img`, e a escala da entrada e a do zoom ficam em wrappers próprios entre os dois.
- **A borda dissolvida fica parada na tela:** a imagem ampliada é recortada por ela, então nenhuma
  borda de imagem aparece nem na entrada (1,08) nem no zoom (1,03).
- **As escalas são só composição:** `will-change` durante a entrada e enquanto o ScrollTrigger do
  zoom está ativo, e o filtro e a máscara não são refeitos a cada quadro.
- **Custo medido:** parado, 0 quadros descartados.

**Título sem animar `letter-spacing` (D38).**
- **Onde cada letra fica:** o `sanctum.js` mede, com `Range`, onde o texto original desenha cada
  letra, já com o kerning. Cria uma cópia `aria-hidden` (`.sanctum__place-fx`) com uma letra por
  `span` nesses pontos e corrige cada uma pela própria medida.
- **A abertura:** cada letra parte deslocada como se o espaçamento fosse +0,12em a partir do
  centro da sua linha (no retrato são duas linhas, cada uma centrada) e converge por `translateX`,
  com fade, em 1400 ms `--ease-out`.
- **O texto original:** fica transparente (`.is-letras`), mas continua no layout e na árvore de
  acessibilidade. Ao terminar, a cópia sai e o original — um nó só, nunca desmontado — volta.
  Estado final = o texto estático, sem aproximação.
- **Sem JS ou em "low":** nada disso existe; em "low" é só fade.
- **Espaçamento de chegada:** o pedido falava em `.12em → .02em`, mas o estático aprovado usa
  `--ls-display: 0`. A abertura termina em 0 para ficar idêntica.

| Elemento | Como ficou |
|---|---|
| Neon (entrada) | Cascata da esquerda para a direita, 90 ms entre barras; cada `.neon__slot` faz `opacity 0 → .2 → 1 → .7 → 1` em 4 passos de 50 ms (núcleo e halos juntos, porque são o mesmo slot) |
| Neon (loop) | Pulso do halo largo (`::after`), 5 s, fases fixas por barra. A opacidade não passa de 1, então o "±8 %" virou uma oscilação de 16 % abaixo do repouso (1 → .84 → 1). **low: pulso só nas 2 barras externas** |
| Micro-flicker | A 5ª barra, a cada 12 s, sempre a mesma sequência (`--i → 35 % → --i → 55 % → --i` em ~300 ms), em CSS puro, sem `Math.random`. **Sem micro-flicker em low** |
| Salão | Entrada `scale(1.08) → 1`, 2400 ms `--ease-out`. Zoom de rolagem: 1 com o ato no topo da tela (repouso) → 1,03 quando ele sai por cima. Em ⏸ volta a 1 |
| Névoa | Deriva de 4 % em 50 s, `alternate`, com `translate` na própria imagem em screen. **Pausa enquanto a página rola** (D32): uma classe no próprio elemento, e não um atributo no `<html>`, que invalidava o estilo da página inteira a cada gesto (medido: picos de 900 ms). **low: estática** |
| Luz rebatida | Fade `0 → 1` em 1200 ms, começando depois da 3ª barra (380 ms) |
| Título | Ver D38 acima; começa aos 300 ms |
| Rótulo | Como no ACT II: `translateY(16px)` + fade, 600 ms, a 35 % de visibilidade |
| Parallax | Salão e luz ×.08, neon ×.14, névoa ×.22. Desligado em `reduced`, `paused` e `low`. Verificado em ±120 e ±240 px de rolagem: a máscara esconde as bordas do salão, a luz acompanha as paredes, e só as barras deslizam em relação à sala (é a profundidade). A borda de baixo da névoa (`bottom: -26 %`) continua fora da seção no pior caso (−32 px em 1440 × 810) |

**Contraste do título**, medido pixel a pixel:
- **Método:** captura do título com e sem as letras (com `color: transparent`, o halo escuro
  continua), contando só o miolo das letras.
- **Pior caso depois do fade:** 6,68:1 em 1440 (estático: 7,44:1) e 9,24:1 em 390. Inclui a fase
  0 do pulso, que é o pico de brilho, o micro-flicker e o neon deslizando atrás pelo parallax.
- **Durante o fade de entrada:** o contraste sobe junto com a opacidade (5,11:1 aos 900 ms, só nos
  pixels já com a cor do título).

**Estado final = estático aprovado** (`1267f2a`):
- **Loops cancelados:** 0,099 % em 1440 e 0,000 % em 390.
- **Reduced:** idêntico, 0,000 %.
- **Mescla da névoa:** em screen ela só clareia. Nos quadros-chave, nenhum pixel fica mais
  escuro com a névoa do que sem ela.

**Custo** (GPU Intel UHD 770; 10 s parado no ACT III e rolagem ACT II → ACT III → ACT IV):

| Caso | Parado | Rolando |
|---|---|---|
| high | 0 descartados | 0–3,2 % |
| low | 0–3 % | 0,7–2,8 % |
| celular 390 | 0 % | 0 % |

- **Controle:** a mesma rolagem no site aprovado teve 0–6 % de quadros descartados e picos de até
  380 ms entre rodadas. Por isso a rolagem é julgada contra o controle medido na mesma execução:
  até 5 %, ou até 2 pontos acima dele.
- **Primeira versão:** a deriva da névoa rodando durante a rolagem dava cerca de 2× o controle.
  Resolvido pela pausa.

**Lighthouse mobile** (5 execuções, mediana, as duas versões com LF): `1267f2a` 83 / LCP 3,6 s;
com o ACT III 85 / LCP 3,6 s.

### Reserva — construído (etapa "motion ato 4", 24/09/2026)

**Prioridade absoluta: nenhuma animação atrapalha preencher e enviar o formulário (D40).**
- **Sem bloqueio:** nenhum `inert`, `pointer-events: none` ou atraso nos campos.
- **Interação vence:** qualquer foco, clique, tecla ou digitação no formulário conclui a entrada e
  cancela o contador na hora.
- **O `js/reserva.js` continua dono dos dados.** O motion não toca em `value`, no que o leitor
  de tela lê nem no reflexo.
- **Duas linhas novas nele:**
  - `data-rotulo` no botão, para a varredura;
  - o evento `reserva:enviada`, disparado depois do `window.open`.
- **Bug do estático corrigido:** o zero à esquerda aplicado ao sair do campo ("1" → "01") não
  chegava ao reflexo, que ficava com "1". Agora o `blur` também espelha.

Arquivos:
- `js/motion/reserva.js`;
- `css/reserve-motion.css`, pedido junto com o motion (D31);
- no `reserve.css`: foco suave, varredura do botão, wrapper dos números e wrapper da bruma.

Teste e medição: `scripts/test-motion-ato4.mjs`, com saída em `screenshots/motion/ato4-*`.

**Estrutura — um efeito de movimento por elemento:**

| Elemento | Efeito | Propriedade |
|---|---|---|
| `.reserve__water` | parallax ×.10 | `transform` |
| filtro `#water` (novo estágio `feDisplacementMap`) | ondulação | atributos `scale` / `baseFrequency` |
| `.reserve__mist-wrap` (novo) | parallax ×.06 (+ screen quando existe; D36) | `transform` |
| `.reserve__mist` | deriva horizontal | `translate` |
| `.act-label` | entrada | `transform` + `opacity` |
| `.reserve__slot` (wrapper externo do card) | entrada do card | só `transform` (ver abaixo) |
| `.reserve__card` | `backdrop-filter` (estático, nunca animado) | — |
| `.reserve__reflection` | entrada do reflexo | `opacity` |
| `.num-campo` (novo, 1 por campo numérico) e `.select` | anel de foco (`::before`) | `opacity` |
| `.num-contador` (criado pelo JS, `aria-hidden`) | contador | `transform` das faixas |
| `.btn-wa::before` / `::after` | varredura do hover | `transform` / `clip-path` |
| `.reserve__onda` (criado pelo JS, `aria-hidden`) | confirmação | `transform` + `opacity` |

**Card: só `translate` (item 4 do pedido, medido).**
- **Opacidade no wrapper não serve:** opacity num ancestral do `backdrop-filter` faz dele a raiz
  do backdrop. O blur do card deixa de enxergar a água e volta de uma vez quando a opacidade
  chega a 1.
- **Medido com opacity .99:** 2,8 % dos pixels do card mudam mais de 6/255, contra 0,46 % com
  `translate` (ruído).
- **O card entra só com `translateY(24px) → 0`**, em 900 ms `--ease-out`, sem fade.
- **Alternativa medida, não aplicada:** opacity no próprio card (o elemento com o
  `backdrop-filter`) não salta (0,48 %).
- **Cintilação, quadros de 30 ms no fim da entrada:** no máximo 0,41 % dos pixels mudam entre
  quadros, e 0,006 % entre o último quadro e os estilos limpos.

| Elemento | Como ficou |
|---|---|
| Água | Novo estágio no fim do `#water`: `feDisplacementMap` sobre as cristas, com um ruído próprio. Anima o deslocamento 0 → 16 e o `baseFrequency` 0,008 → 0,014, ciclo de 9 s (4,5 + 4,5). **Fase 0 = deslocamento 0 = estático aprovado.** Só `full` + `high` + ≥ 768 px (D18); congela durante a rolagem (D32); grupo exclusivo "turbulencia" (D34): nunca junto com o hero nem com o ACT II (verificado em 14 posições) |
| Bruma | Deriva de 4 % em 60 s, `alternate`; pausa durante a rolagem por classe no próprio elemento (D39). **low: estática** |
| Rótulo | `translateY(16px)` + fade, 600 ms, a 35 % de visibilidade (como nos atos anteriores) |
| Card | Ver acima |
| Reflexo | 250 ms depois do card, `opacity 0 → .62` (o valor estático, lido do CSS), 900 ms. Continua `inert` e `aria-hidden`, espelhando os campos |
| Contador | A partir de 300 ms, por 500 ms: uma camada `aria-hidden` sobre cada campo numérico. Cada dígito rola por uma faixa de 10 algarismos até o valor do campo, com `steps(9)`, e o texto do input fica transparente só nesse intervalo. **Nunca altera o `value`**, o que o leitor de tela lê nem o reflexo. Cancela na hora com qualquer interação no formulário. Toca uma vez por carregamento da página (a entrada é `once`). Termina removendo a camada: idêntico ao estático |
| Foco dos campos | A borda vai a `--chrome-100` em 180 ms e um anel (`box-shadow` fixo num `::before`) acende por `opacity` em 180 ms. O contorno âmbar de `:focus-visible` não tem transição: aparece na hora |
| Botão WhatsApp | Só com `(hover: hover)`: `::before` (`--chrome-100`) cresce da esquerda com `scaleX` e `::after` (o mesmo rótulo, em `--ink-900`, de `data-rotulo`) é recortado pela mesma frente (`clip-path: inset(0 X 0 0)`), com mesmo tempo e mesma curva, 300 ms `--ease-soft`. Cada letra fica clara sobre escuro ou escura sobre claro. **Pior quadro da varredura: 10,6:1**, igual ao botão em repouso; no fim, 15,8:1. Foco por teclado: só o contorno âmbar. Sem hover real, fica o hover simples de antes |
| Confirmação | Só depois de um envio válido: `reserva.js` abre o WhatsApp e só então avisa (`reserva:enviada`). Um círculo com borda parte do centro do botão, sob o card e sobre a água: `scale` 1 → ~20 e `opacity` .8 → 0, 600 ms. Erro de validação: nada além do estado de erro que já existia. `reduced`/`paused`: sem ondulação |
| Parallax | Água ×.10, bruma ×.06. Desligado em `reduced`, `paused` e `low` |

**Formulário durante a animação** (testado, `test-motion-ato4.mjs`):
- **Preencher e enviar com a entrada e o contador rodando:** o `wa.me` sai exato.
- **Digitar "21" no meio do contador:** o valor permanece e o contador some na hora.
- **Tab até o 1º campo antes do fim da entrada:** o campo fica focado e visível, com o contorno
  âmbar.
- **Erro de validação:** sem ondulação e sem abrir nada.
- **Envio válido:** abre o link e dispara a ondulação.
- **Reflexo:** espelha os valores durante e depois.

**Contraste:**
- **Botão:** pior quadro da varredura 10,6:1, igual ao botão em repouso no site aprovado; no fim,
  15,8:1.
- **Legendas e nota:** contraste nominal 5,56:1 e 7,42:1 (cor do texto × fundo real medido). A
  métrica por pixel é igual à do estático aprovado; em texto de 11 px ela subestima, porque o
  miolo das letras quase não atinge a cor exata.

**Estado final = estático aprovado** (`54ca0c2`):
- **1440:** 0,004 %.
- **390:** 0,000 %.
- **Reduced:** idêntico, 0,000 %.

**Custo** (GPU Intel UHD 770; 10 s parado no ACT IV e rolagem ACT III → fim da página):

| Caso | Parado | Rolando |
|---|---|---|
| high | 0 descartados | 6,0 % (controle, site aprovado: 8,3 %) |
| low | 0 | 1,0 % |
| celular 390 | 0 | 0,2 % |

Tarefas longas: no máximo 2 isoladas, sem script.

### Menu, player e rodapé — construído (etapa "motion final", 24/09/2026)

Testes: `scripts/test-motion-final.mjs`. Inventário completo de todas as animações do site:
`motion-inventario.md`.

**Menu overlay (D43).**
- **Abertura:** o overlay fica sempre em `display: grid`. Abrir liga `visibility: visible` na
  hora e faz o fade de `opacity` em 320 ms `--ease-out`.
- **Fechamento:** fade de 200 ms (`--t-fade`, `--ease-soft`), e só **depois** dele entra o
  `visibility: hidden`. Por isso o leitor de tela e o Tab não alcançam o menu fechado, e nunca há
  `display: none` no meio da transição.
- **Itens:** `translateY(16px)` + fade, 500 ms `--ease-out`, com 60 ms entre eles, só na abertura.
  Com ⏸ entram direto: parados no 1º quadro ficariam invisíveis.
- **Hambúrguer → X:** `transform` nos traços, 320 ms ao abrir e 200 ms ao fechar; em reduced,
  instantâneo.
- **Névoa:** deriva de 40 s em `translate`, só com o menu aberto (fechado não há animação nem
  pintura); estática em low.
- **Utilizável desde o 1º quadro:** sem `inert` nem `pointer-events: none` na transição. Um item
  clicado fecha o menu e a rolagem começa na hora (medido: clique em 150 ms, já rolando).
- **Interrupções:** a acessibilidade continua toda no `js/menu.js` (foco preso, `aria-expanded`,
  Esc, foco devolvido, trava de rolagem só com o menu aberto) e é instantânea — a animação é só
  CSS por cima. 20 ciclos abre/fecha seguidos (mouse e teclado) terminam coerentes, sem nada
  travado.
- **Reduced:** só o fade de 200 ms.
- **Sem JS:** `:target` continua abrindo o overlay.
- **Contraste dos itens durante a entrada:** pior quadro 10,86:1.

**Player.** Com o ⏸ ativo o ícone vira ▶ (`aria-pressed="true"`) e o `aria-label` passa a
"Retomar animações"; ao retomar, volta a "Pausar animações". ⏮ ⏭ e o trilho: sem regressão
(`test:nav`). Com ⏸ ativo, até as transições do traço ativo do trilho ficam instantâneas.

**Rodapé.**
- **Entrada:** `translateY(16px)` + fade, 600 ms `--t-mid` `--ease-out`, uma vez, a 35 % de
  visibilidade (`motion.entrada`), na grade do rodapé. Só se ele ainda estiver abaixo da tela
  quando o motion se instala (D35): abrir em `#rodape` ou chegar ao fim da página nunca o deixa
  escondido (testado).
- **Links:** com `(hover: hover)`, um traço cresce da esquerda (`scaleX`, 220 ms `--ease-soft`)
  num `span` que abraça o texto — o link tem 44 px de altura, então o traço na base dele ficaria
  longe do texto. O traço aparece no hover e no foco; o contorno âmbar de foco não muda e o
  sublinhado discreto de antes continua. O `config.js` escreve o telefone dentro do `span`.
- **Estado final × estático aprovado:** 0,000 % em 1440 e 390.
- **Mudanças em relação à tabela original:** 16 px e 600 ms (pedido desta etapa) em vez de 12 px e
  500 ms; o wordmark do rodapé não ganhou hover.

**Card do ACT IV (pendência da parte 5): o fade no próprio card foi testado e revertido.**
- **Medido:** no fim da entrada a camada criada pelo fade é desfeita e o card com
  `backdrop-filter` é redesenhado — 0,514 % dos pixels mudam entre quadros de 30 ms, acima do
  limite de 0,5 %.
- **Resultado:** o card continua entrando só por `translate` (D40).

### Coerência global (etapa final)

- **Curvas.** Entradas usam `--ease-out`; transições de estado (hover, foco, fechar, rolagem
  programada) usam `--ease-soft`; loops, curvas de oscilação. Corrigidos:
  - HUD e player do hero, luz rebatida do ACT III e linhas-guia e rótulos do ACT II usavam
    `--ease-soft` numa entrada;
  - os pontos das linhas-guia não tinham curva (caíam no `power1.out` do GSAP);
  - a ondulação de confirmação tinha 600 ms literal, agora `--t-mid`.
- **Durações fora dos tokens:** todas vêm de pedido explícito das etapas e ficaram como estão
  (lista em `motion-inventario.md`).
- **Loops simultâneos (D41).** Medidos em passos de 25 % da tela:
  - **1440 high:** pico de 34, do topo até a emenda hero + ACT II (a margem de 10 % inclui o ACT II).
  - **390 low:** pico de 14.
  - **Orçamento:** até 36 em high e 16 em low, no máximo 2 seções com loops ao mesmo tempo e 1
    `feTurbulence` (D34).
  - **Margem mantida:** o observador dos loops tem 10 % de margem, então os loops já estão rodando
    quando a seção aparece.
  - **Tentativa revertida:** margem 0 derrubava 2,5 pontos a mais de quadros na rolagem da página
    inteira, porque as camadas de dezenas de animações eram criadas na tela, no meio da rolagem.
  - **Ajuste mantido:** é preciso área visível > 0; só encostar na borda não conta mais como
    visível.
- **⏸ na página inteira:** em todas as posições, nenhuma animação CSS rodando e a timeline GSAP
  pausada; ao retomar, tudo volta.
- **Reduced na página inteira (D42):** nenhum loop, parallax ou entrada animada. O `reset.css`
  fazia **toda propriedade de todo elemento** transicionar em 200 ms em reduced — o ponto do
  progresso animava `top` e o trilho, `transform`. Agora só `opacity` e `visibility` transicionam
  (os "fades de 200 ms" do contrato).
- **Limpeza:** depois de todas as entradas, nenhum `will-change`, `filter`, `transform` ou
  `opacity` esquecido inline em nenhum elemento.
  - **Corrigido:** o GSAP deixava `transform-origin` e `data-svg-origin` nas linhas-guia (SVG) do
    ACT II, e o parallax, `translate/rotate/scale: none`.
  - **Ouvintes:** os de `scroll` saem quando as animações se desfazem (full 5 → reduced 2 → full
    5 → reduced 2).
- **Âncora na abertura (D44):** com a página aberta em `#…`, o carregador também espera a
  rolagem até a âncora terminar antes de pedir o motion. Registrado no meio dela, o ScrollTrigger
  a interrompia e o rodapé ficava abaixo da tela, com a entrada escondida.

---

## 6. Inventário de assets

### Fotos reais disponíveis (`IMAGENS/`)
| Arquivo | Conteúdo | Dimensão | Uso proposto |
|---|---|---|---|
| `imgi_21_…812_n.jpg` | Mesa farta: sashimis, sushis, shimeji na chapa, carne | 720×1280 | Origem dos recortes das tábuas (ACT II) |
| `imgi_22_…016_n.jpg` | Camarão na chapa de ferro sobre base de madeira | 1080×1350 | Nenhum na v1 |
| `imgi_23_…555_n.jpg` | Pessoa segurando travessa de sushi, mesa posta à frente | 1080×1350 | Nenhum na v1 (não mostra o salão, ver D20) |
| `imgi_25_…397_n.jpg` | Camarão empanado na chapa de ferro | 1080×1350 | Recorte para a tábua esquerda |
| `imgi_27_…611_n.jpg` | Camarão empanado com molho, close em prato | 1080×1350 | Recorte / detalhe |
| `imgi_2_…314_n.jpg` | **Logo real:** "ASAMI Sushi" em pincelada vermelha sobre onda de Hokusai | 150×150 | **Só favicon** (D3, D23) |

**Tratamento obrigatório (D4).** As 5 fotos são registros de celular, luz de dia, madeira
clara e saturada, todas com **marca d'água vermelha "Asami Sushi"** no canto superior. A
direção de arte é noturna e dessaturada. Toda foto passa por: recorte da marca d'água,
remoção de fundo, regrade (`saturate(.55) contrast(1.15) brightness(.7)` + camada
`--ink-900` em `multiply` a 35 %) e luz de contato pintada. O resultado é gravado como
plate em `design/plates/` e copiado para `site/assets/` — **a pasta `IMAGENS/` nunca é
referenciada pelo site**. `imgi_21` (720×1280) é curta de resolução: usar só para recortes
pequenos, nunca em elemento de largura total.

**Nada de ambiente inventado (D5).** Todo plate fotográfico nasce de uma das 5 fotos
acima. Não há geração de cenário, prato ou salão que não exista.

### Plates (`design/plates/` → `site/assets/`)

Mapeamento completo e pesos em **`assets.md`**. Todos em WebP 600–1600 px (só as larguras que
algum `srcset` usa, qualidade 70: D48), fundo preto, `mix-blend-mode: screen`, sem recorte.

| Asset | Para quê | Status |
|---|---|---|
| `plate-smoke-hero` | Névoa do hero (substitui `plate-smoke-01/02/03`) | ✅ |
| `plate-smoke-thin` | Vapor do ACT II (duplicado/espelhado) | ✅ |
| `plate-smoke-floor` | Névoa de chão (ACT III) + bruma (ACT IV, substitui `plate-smoke-low`) | ✅ |
| `plate-nigiri` | Nigiri flutuante do hero | ✅ |
| `plate-board-left` | Tábua esquerda do ACT II | ⚠️ provisório (D22) |
| `plate-board-right` | Tábua direita do ACT II | ✅ |
| `plate-water-tile` | — | ❌ cancelado: água procedural (D21) |
| `plate-room` | Salão do ACT III | ⚠️ **provisório (D24)** — gerado por IA |
| `logo-asami-150` | Favicon | ✅ só favicon (D23) |

`plate-room` (salão gerado) entra como **provisório** (D24, substitui D5/D20 para o ACT III).
Fumaça é plate sintético; água é procedural (D21).

Feito só em CSS/SVG, sem asset nenhum: grade do piso, neon, bolhas, faíscas, grão, todos
os reflexos, todo o cromo do wordmark, todas as linhas de callout e a água do ACT IV.

---

## 7. Decisões (dúvidas resolvidas)

As dúvidas levantadas estão **todas fechadas**: D1–D19 na análise do mockup, D20–D23 no
inventário de plates, D24–D25 na construção dos atos, D26–D30 na base de motion e D31–D33 no motion do hero, D34–D36 no motion do ACT II, D37–D39 no motion do ACT III, D40 no motion do ACT IV e D41–D44 na etapa final, D45–D50 na otimização e D51–D56 no SEO local. Cada uma
vira uma regra, com
o efeito que já foi aplicado nas seções acima.

### Conteúdo e marca

| # | Decisão | Onde já está aplicado |
|---|---|---|
| **D1** ✅ | **Unidade: São Bernardo do Campo.** Texto do ACT III passa a `SÃO BERNARDO DO CAMPO // CENTRO`. | §4/03 camada 7 |
| **D2** ✅ | **Telefone e endereço só do CLIENTE.md.** Nada escrito no mockup é aproveitado como dado: o `(11) 4427-8202` e o bairro *Jardim Bela Vista* são descartados. Valem `(11) 2669-7175` e Av. das Nações Unidas, 50, Centro, SBC, 09726-110. | §4/03 nota, §4/04 camada 9, §4/05 camadas 3 e 6 |
| **D3** ✅ | **Logo real (pincelada vermelha sobre a onda) = favicon + rodapé, só.** O visual do site segue o mockup. O vermelho da marca fica contido no logo e **não entra na paleta**. | §4/05 camada 7, §6 |
| **D6** ✅ | **Callouts só com informação verdadeira do CLIENTE.md.** Temperatura, espessura de corte e contagem de etapas saem por não terem lastro; onde não houver dado real, a linha-guia fica sem rótulo. Todos `aria-hidden`. | §4/02, tabela de copy |
| **D7** ✅ | **Rótulos de ato em inglês (decorativos), todo texto funcional em PT-BR.** `ACT II / THE FEAST OF ABUNDANCE` fica; menu, formulário, botão e rodapé são português. | §4/01 camada 17, §4/04, §4/05 |
| **D8** ✅ | **`ACT I / THE ARRIVAL` acrescentado ao hero**, no padrão dos outros atos. | §0 tabela de seções, §4/01 camada 3b |
| **D10** ✅ | **Rodapé mínimo criado** no mesmo estilo: endereço, horário, faixa de preço, Instagram, logo real. | §4/05 (nova) |
| **D11** ✅ | **Menu = overlay em tela cheia** com âncoras para os 4 atos + Cardápio. | §4/01 camada 17 |
| **D12** ✅ | **Cardápio é link no menu** (PDF ou WhatsApp). Sem quinto ato na v1. | §4/01 camada 17, §0 nota |

### Imagem

| # | Decisão | Onde já está aplicado |
|---|---|---|
| **D4** ✅ | **Plates gerados a partir das fotos reais**, em `design/plates/`. A pasta `IMAGENS/` nunca é referenciada pelo site. | §6 |
| **D5** ✅ | **Nada de ambiente inventado.** `plate-room` cancelado. Fumaça e água seguem sintéticas — são fenômeno, não ambiente. | §4/03 camada 2, §6 |
| ~~D20~~ | **Substituída por D24.** ACT III sem foto do salão. Nenhuma foto do cliente mostra o salão (`imgi_23` é uma pessoa com uma travessa). O ato fica só com neon + névoa; slot comentado para a foto real futura. | §4/03 camada 2, §6 |
| **D21** ✅ | **Água do ACT IV procedural** (`feTurbulence`). Não existe `plate-water-tile`. | §4/04 camada 1, §6 |
| **D22** ✅ | **`plate-board-left` é provisório** (mostra lula/polvo, fora do CLIENTE.md) e será substituído. Callouts só com texto do CLIENTE.md; a tábua esquerda fica sem rótulo. | §4/02 camadas 5 e 8, §6 |
| **D23** ✅ | **Logo real só como favicon.** O rodapé usa o wordmark em texto até chegar um arquivo em alta. | §4/05 camada 7, §6 |
| **D25** ✅ | **Substitui a D13.** A pílula `432Hz` do topo direito vira o link **`RESERVAR` → `#ato-4`**: mesmo visual de pílula, ícone de seta no lugar do alto-falante, hover (preenche em `--chrome-100`) e foco visível âmbar. O toggle `432Hz` inferior do hero **sai**. Continua sem áudio na v1; ⏸ alterna `html[data-motion="paused"]` e ⏮ ⏭ navegam entre atos. Em header estreito (< 19rem de conteúdo) a pílula mostra só a seta; o texto fica para leitor de tela. | §4/01 camadas 10 e 15, §4b |
| **D24** ✅ | **`plate-room` no ACT III como imagem PROVISÓRIA** (substitui D5 e D20 para esta camada). É gerado por IA e **não corresponde ao salão real**: confirmar com o cliente ou trocar por foto real antes da entrega. Sem `screen` (não tem fundo preto): imagem normal escurecida, mascarada e com vinheta. Trocar = mudar `--room-img` em `css/sanctum.css`. | §4/03 camada 2, §6, assets.md |

### Comportamento

| # | Decisão | Onde já está aplicado |
|---|---|---|
| **D9** ✅ | **Formulário sem backend.** Campos `DATA`, `HORÁRIO`, `PESSOAS`. No clique, monta a mensagem e abre `wa.me` com texto pré-preenchido. | §4/04 camadas 5–9 + bloco da mensagem |
| ~~D13~~ | **Substituída pela D25.** Sem áudio na v1; as pílulas `432Hz` eram ornamento inerte. ⏸ ⏮ ⏭ continuam como descritos na D25. | §4/01 camadas 10, 13 e 15 |
| **D17** ✅ | **Trilho esquerdo = navegação por ato** (links reais). **Indicador direito = progresso de scroll** (decorativo, `aria-hidden`). | §4/01 camadas 11 e 12 |

### Técnicas

| # | Decisão | Onde já está aplicado |
|---|---|---|
| **D14** ✅ | **Escala-mãe do mockup: 1440 px** (fator 1,875). A coluna `@1440` da escala tipográfica é definitiva. | §0, §2 |
| **D15** ✅ | **Redução dos micro-textos mantida.** Os topos de `clamp()` marcados ✔︎ ficam como estão, mesmo divergindo da proporção do mockup. | §2 |
| **D16** ✅ | **HUD do hero: `DEPTH 0.4MM / TENSION / MA`**, texto completo. Decorativo em inglês → `aria-hidden`. | §2, §4/01 camada 14 |
| **D18** ✅ | **Abaixo de 768 px, reflexo estático com blur.** `feTurbulence` animado só a partir de 768 px, nos 3 reflexos e na água do ACT IV. | §5 interruptores globais, §4/04 camada 10 |
| **D19** ✅ | **Piso de `--text-mid` para todo texto informativo.** `--text-faint` deixa de ser cor de texto e fica só para traços, ticks e bordas. | §1 nota de contraste, §4/02 camada 8 |
| **D26** ✅ | **Modos de motion `full` / `reduced` / `paused`** com fonte única em `js/motion/core.js`, reagindo em tempo real a `prefers-reduced-motion` e ao ⏸. API `motion.mode`, `motion.on`, `motion.register` (+ `loop`, `scrollTo`, `scan`). | §5.0 |
| **D27** ✅ | **Camada de qualidade** `html[data-quality]` = `low` ou `high` (núcleos ≤ 4, memória ≤ 4 GB, `saveData`, tela < 768 px; `?quality=` força). Em `low` as próximas etapas degradam as camadas caras. | §5.0 |
| **D28** ✅ | **Entrada da página = véu `--ink-900` em CSS puro**, 800 ms, só `opacity`; não espera JS nem atrasa o LCP. | §5.0 |
| **D29** ✅ | **Motion carregado fora do caminho do LCP**: depois do `load`, na 1ª interação ou 2,5 s depois. Nada da primeira tela depende do GSAP; entradas do hero em CSS. | §5.0 |
| **D30** ✅ | **Lenis só no modo `full`**; âncoras e ⏮ ⏭ com offset zero e duração fixa dos tokens; menu para o Lenis; ⏮ ⏭ contam a partir do destino pedido. | §5.0, §4b |
| **D31** ✅ | **Nada do motion no caminho crítico do LCP.** Loops do hero em `css/hero-loops.css`, pedido junto com o motion; carregador inline no `<head>` (um arquivo externo a mais também atrasava). Medido: LCP simulado 3,8 → 3,6 s, igual ao da referência. Entradas continuam no CSS bloqueante porque valem desde o 1º quadro. | §5 Hero |
| **D32** ✅ | **Ondulação da água por `feTurbulence` mantida, mas congelada durante a rolagem**: o `baseFrequency` não é reescrito enquanto a página rola (retoma 200 ms depois). Reescrever durante a rolagem re-rasterizava o filtro e derrubava quadros. | §5 Hero (custo) |
| **D33** ✅ | **O motion nunca se instala no meio de uma navegação.** Ao se registrar, o ScrollTrigger reescreve a posição de rolagem e matava uma rolagem suave em andamento (⏭ ou âncora antes do motion chegar). O carregador espera 250 ms sem rolar e 600 ms sem gesto; o núcleo monta tudo só depois de 150 ms de rolagem parada (`data-motion-ready="pending"` até lá); e `js/nav.js` retoma até o destino pedido se algo ainda interromper (evento `motion:pronto`). | §5.0, §4b |
| **D34** ✅ | **Um `feTurbulence` animado por vez.** `motion.loop` ganhou grupos exclusivos: no grupo `"turbulencia"` só roda a ondulação da seção mais visível (fração visível pelo `IntersectionObserver`). `motion.rolando` é compartilhado por quem congela o filtro durante a rolagem. | §5.0, §5 Rodízio |
| **D35** ✅ | **Entradas só escondem o que ainda está abaixo da tela** quando o motion se instala, e a pausa as conclui na hora. Tábuas do ACT II sem fade (a opacidade 0 adiava a rasterização e causava um quadro de ~400 ms); sombras e reflexo com `blur` entram pelo container. | §5 Rodízio |
| **D36** ✅ | **Wrapper transformado dentro de um grupo em screen também faz screen**, e só quando o transform existe (parallax: `js-motion` + `high`). Um efeito de movimento por elemento: entrada, flutuação, hover e parallax em elementos ou propriedades separados. | §5 Rodízio |
| **D37** ✅ | **Máscara em quem não escala.** No ACT III a máscara do salão ficou no wrapper do parallax; entrada e zoom de rolagem escalam wrappers internos, e a imagem com filtro não é refeita. A escala do zoom é escrita direto no `style` (o `quickSetter` do GSAP não aceita o atalho `scale`). | §5 Sanctum |
| **D38** ✅ | **Espaçamento de letras sem animar `letter-spacing`:** cópia `aria-hidden` com as letras nas posições medidas do texto original (com kerning), convergindo por `translateX`; o original, um nó só, fica transparente e volta intacto no fim. Sem JS e em "low": não existe. | §5 Sanctum |
| **D39** ✅ | **Loops caros pausam durante a rolagem por classe no próprio elemento**, nunca por atributo no `<html>`, que força recálculo de estilo da página inteira a cada gesto. O núcleo ganhou `motion.entrada()` e `motion.abaixo()` (padrão D35 compartilhado pelos atos). | §5.0, §5 Sanctum |
| **D40** ✅ | **O formulário vence qualquer animação.** Foco, clique, tecla ou digitação concluem a entrada e cancelam o contador na hora; o contador é uma camada visual `aria-hidden` que nunca toca o `value`; a confirmação só toca depois do `window.open`. O card entra só por `translate` no wrapper: opacity num ancestral do `backdrop-filter` faz o blur perder o fundo e voltar de uma vez (medido). | §5 Reserva |
| **D41** ✅ | **Orçamento de loops simultâneos:** até 36 em high e 16 em low (medido: 34 e 14), no máximo 2 seções com loops ao mesmo tempo e 1 `feTurbulence`. O observador dos loops tem 10 % de margem (margem 0 criava as camadas na tela, no meio da rolagem: medido) e exige área visível > 0. | §5 Coerência global |
| **D42** ✅ | **Reduced = só fades:** em `prefers-reduced-motion: reduce`, só `opacity` e `visibility` transicionam (200 ms); antes o reset fazia toda propriedade animar. | §5 Coerência global, `reset.css` |
| **D43** ✅ | **Menu por `visibility` + `opacity`:** sempre em `display: grid`; `visibility: hidden` só depois do fade de saída (200 ms); abertura em 320 ms com os itens em sequência; a acessibilidade (JS) é instantânea e independente da animação. | §5 Menu, player e rodapé |
| **D44** ✅ | **Âncora na abertura:** com `#…` na URL, o motion só é pedido depois que a rolagem até a âncora termina (complementa a D33). | §5.0, §5 Coerência global |
| **D45** ✅ | **Fontes auto-hospedadas:** Archivo e Space Grotesk em `site/assets/fonts/` (SIL OFL 1.1). O subconjunto de glifos é o "latin" da Google; os eixos só vão até o que o site usa, mais o padrão da fonte; hash no nome; `swap`; `preload` das duas, por script. Em `file://`, fontes embutidas num CSS só desse caso. Nenhum pedido à Google Fonts. | §2, §9 |
| **D46** ✅ | **Build de CSS:** fontes legíveis em `css/*.css`, gerado por `npm run build`. O minificador é conservador (só comentários e espaços). `--check` no `audit`. Arquivos gerados com hash, em `css/build/`. | §9, `scripts/build.mjs` |
| **D47** ✅ | **CSS crítico inline:** dois `<style>` (fonts…hero; nav + motion) com o `<link>` das seções inserido por script entre eles. A cascata fica igual, a pintura não espera o CSS das seções, e numa âncora ou ao voltar ele recebe `blocking="render"`. | §9 |
| **D48** ✅ | **Imagens:** `sizes` = largura de layout real em cada regime; o mesmo `sizes` em camadas do mesmo arquivo; larguras 600/800/1200/1600 onde usadas; WebP q70. A fumaça central do hero é o LCP: `fetchpriority="high"` + `preload`. | §9, assets.md |
| **D49** ✅ | **CSS não usado removido:** utilitários `.t-*` (menos `.t-label`) e `.col-1-5/6-8/9-12` de `base.css`. | §9 |
| **D50** ✅ | **Entrega:** política de cache por tipo de arquivo em `DEPLOY.md` (hash → 1 ano `immutable`; HTML e JS → revalidar; imagens → 7 dias). A hospedagem não foi escolhida. `npm run bundle` confere os pesos. | §9, DEPLOY.md |
| **D51** ✅ | **Título e descrição:** "Asami Sushi São Bernardo — Rodízio japonês no Centro" (52) e uma descrição de 139 caracteres, só com dados do CLIENTE.md; iguais nas tags Open Graph. `lang="pt-BR"` e `theme-color` = `--ink-900` já estavam certos. | §10 |
| **D52** ✅ | **Domínio num lugar só:** `seo.config.json` → `npm run build`. Sem domínio, tudo o que exige URL absoluta sai comentado, com o placeholder `https://dominio-a-definir.invalid/` (TLD reservado, nunca é um endereço real). Nenhum domínio inventado. | §10 |
| **D53** ✅ | **Prévia ao compartilhar:** `og:type=website` (não existe o tipo OG "restaurant"), `og:locale=pt_BR`, `twitter:card=summary_large_image`. `og:image` = o hero aprovado renderizado em 1200×630, sem o texto pequeno; o wordmark vira pixel só nessa imagem, que não aparece no site. | §10 |
| **D54** ✅ | **Ícones do logo real (150 px):** `favicon.ico` 16/32/48, `apple-touch-icon` 180 e 192 para o manifest (upscale de 1,2–1,3×). O 512 não é gerado (seria 3,4×) e pede o logo em alta. `site.webmanifest` com `display: browser`. | §10 |
| **D55** ✅ | **JSON-LD `Restaurant`**, só com o que o CLIENTE.md diz. Horário: só `closes 23:00`. Ficam de fora `hasMenu`, `sameAs` e a nota do Google, que as diretrizes do Google não aceitam marcada pelo próprio site. `hasMap` = o link do rodapé. | §10 |
| **D56** ✅ | **robots.txt** libera tudo; **sitemap.xml** com a raiz. Semântica conferida: um `<h1>`, `<h2>` em ordem e plates com `alt=""` + `aria-hidden` (faltava no nigiri). | §10 |

---

## 8. Pendências

Nenhuma bloqueia o início do desenvolvimento — todas têm um caminho padrão definido. São
dados que o CLIENTE.md simplesmente não tem.

**8.1 — O número do CLIENTE.md parece ser fixo.** `(11) 2669-7175` tem cara de telefone fixo,
e `wa.me` exige uma linha com WhatsApp. **Por decisão do cliente (24/09/2026), o botão já usa
`wa.me` com esse número**, que está numa única constante (`WHATSAPP`, topo de
`js/reserva.js`) com um aviso para confirmar. Se não for WhatsApp, basta trocar a constante
(e o `href` do fallback sem JS no `index.html`).

**8.2 — Horário de abertura.** O CLIENTE.md só registra "Aberto · Fecha 23:00" e o gráfico
de movimento indo das 06h às 21h, o que não é horário de funcionamento. Até haver
confirmação, o rodapé exibe apenas `Fecha às 23:00`, sem afirmar dias nem hora de abertura, e
**o formulário só valida o limite superior (antes das 23:00)** — não há limite inferior. Quando
a abertura for confirmada, é uma constante (`FECHA` → acrescentar `ABRE`) em `js/reserva.js`.

**8.3 — Instagram.** As fotos vêm claramente do Instagram, mas o CLIENTE.md não traz o
`@`. O link do rodapé fica atrás da mesma constante; sem ele, o item simplesmente não
renderiza (nada de link morto).

**8.4 — Destino do cardápio.** D12 define "PDF ou WhatsApp", mas não há arquivo nem URL.
Padrão: o item `Cardápio` do menu aponta para o mesmo destino do botão de contato, até
existir um PDF.

**8.5 — CNPJ e razão social.** Não constam no CLIENTE.md. O rodapé fica sem eles; se forem
exigidos, entram como uma quarta linha na coluna do endereço, sem mudar o layout.

---

## 9. Desempenho e entrega (etapa de otimização, 25/09/2026)

Nada visual, nenhum timing e nenhum comportamento mudou. `scripts/test-otimizacao.mjs` compara
com o commit anterior (`5563fa9`), com a tolerância de sempre (canal > 24, no máximo 0,5 % dos
pixels):
- cada seção do estático aprovado e do estado final do motion, e o menu aberto, em 1440, 1024, 768
  e 390;
- os estilos computados de todos os elementos.

Números antes/depois em `otimizacao-baseline.md`. Publicação e cache em `DEPLOY.md`.

**Fontes (D45).**
- **Origem:** Archivo e Space Grotesk saem de `site/assets/fonts/`; `@font-face` gerado em
  `css/fonts.css`, com `font-display: swap` e o `unicode-range` "latin" da Google.
- **Arquivos:**
  - glifos: o mesmo subconjunto que a Google servia;
  - eixos cortados, só até o padrão de cada fonte (mudar o padrão re-arredonda as larguras dos
    glifos);
  - hash no nome.
- **Tamanho:** Archivo 88 → 37 KB; Space Grotesk 22 → 21 KB.
- **Preload:** das duas, com `crossorigin`. As duas aparecem acima da dobra: wordmark e títulos na
  Archivo, HUD na Space Grotesk. O `preload` é inserido por um script no topo do `<head>`, e não
  escrito no HTML, porque em `file://` ele falharia.
- **`file://` (duplo clique no `index.html`):** o Chrome bloqueia fonte de arquivo local (CORS,
  origem "null"). Só nesse caso entra `css/build/fontes-file.<hash>.css`, com as duas fontes
  embutidas em `data:` e `blocking="render"`.
  - Ele é declarado depois do `@font-face` normal, que por isso nem é pedido.
  - O http(s) nunca baixa esse arquivo.
  - Resultado: `file://` desenha igual ao http (0,000 %), sem erro no console.
- **Fallbacks com métricas:** os de `base.css` não mudaram. CLS no carregamento: 0.
- **Licença:** SIL OFL 1.1, sem "Reserved Font Name" (README).

**CSS (D46–D47).**
- **Fontes legíveis e build:** os arquivos-fonte continuam em `css/*.css`. `npm run build` gera o
  que o `index.html` carrega, entre os marcadores `<!-- build:css -->` e
  `/*build:motion-css*/`. `npm run build:dev` volta a um `<link>` por arquivo. `npm run audit`
  começa por `build --check`, que falha se o gerado não bater com as fontes.
- **Minificador próprio e conservador:** tira só comentários e espaços, e deixa os valores de
  propriedades customizadas como estão. O lightningcss foi testado e descartado: ele apaga
  fallbacks como `overflow-x: hidden` antes de `clip`, mesmo mirando Safari 15.
- **Ordem na página (a cascata é a mesma de antes):**

  | Posição | Conteúdo | Como carrega |
  |---|---|---|
  | 1 | `<style>`: fonts, tokens, reset, base, header, hero | inline |
  | 2 | `<link>`: rodizio, sanctum, reserve, footer, em `css/build/secoes.<hash>.css` | inserido por script nesse ponto; não bloqueia a pintura |
  | 3 | `<style>`: nav, motion | inline |

  - O menu, o trilho, o player e o véu de entrada são fixos, por isso ficam no crítico.
  - Um `<link>` criado por script ocupa o mesmo lugar na ordem do documento.
  - Sem JS: `<noscript>` com o mesmo `<link>`.
- **Âncora e voltar:** com `#…` na URL, ou voltando/recarregando uma página rolada, o `<link>`
  das seções ganha `blocking="render"`: a seção na tela nunca pinta sem estilo (testado em
  `#ato-4` e `#rodape`).
- **Crítico = a 1ª tela inteira:** com o CSS das seções bloqueado, a 1ª tela é idêntica à completa
  (0,000 %) nas 4 larguras.
- **CSS de motion das seções:** 4 arquivos viraram 1 (`css/build/motion-secoes.<hash>.css`),
  pedido depois do `load` como antes (D29).
- **Peso:** HTML + CSS da página, 12 pedidos e 29,6 KB em gzip → 2 pedidos e 20,1 KB.

**Imagens (D48).**
- **`sizes`:** descreve a largura de layout que o CSS dá a cada imagem em cada regime (paisagem
  ≥ 48rem com proporção ≥ 1 × retrato), conferida no teste em 6 telas/densidades: o candidato
  escolhido é sempre o menor que cobre o exibido.
  - Camadas que dividem o arquivo (3 fumaças do hero, 3 vapores, 3 névoas de chão) levam o `sizes`
    da maior; assim o navegador baixa um arquivo só.
  - Os reflexos das tábuas ganharam o mesmo `srcset` das tábuas. Antes baixavam sempre a 800,
    mesmo quando a tábua usava a 1600.
- **Larguras:** entraram 600 (vapor, nigiri e tábuas no celular) e 1200 (telas 2× e 3×). Cada
  plate só tem as larguras que algum `srcset` usa.
- **Qualidade 70 (era 82):** no pior plate, 0,26 % dos pixels mudam mais de 24 níveis; média de
  ~2 níveis.
- **LCP = a fumaça central do hero (não o nigiri):**
  - `fetchpriority="high"` nas 3 camadas, que são o mesmo arquivo;
  - `preload` com `imagesrcset`/`imagesizes` idênticos aos do `<img>`;
  - nigiri com `preload` e `high`, como antes;
  - nada acima da dobra é `lazy` (testado nas 4 larguras).
- **Efeito colateral aceito:** o `sizes` antigo das fumaças subestimava o retrato (dizia 70vw e
  100vw; o CSS desenha 130 % e 220 % da tela). Com o valor certo, a fumaça no retrato vem de um
  arquivo maior e fica um pouco mais nítida. Pior diferença: o hero em 768, com 0,40 % dos pixels,
  dentro do limite.
- **Total de imagem por aparelho, página inteira:**

  | Tela | Antes | Depois |
  |---|---|---|
  | 1440 @1× | 266 KB | 162 KB |
  | 1440 @2× | 498 KB | 271 KB |
  | 390 @3× | 467 KB | 249 KB |
  | 412 @1,75× (perfil do Lighthouse) | 239 KB | 162 KB |

**CSS não usado (D49).** Saíram de `base.css` utilitários que nenhum elemento usava:
- `.t-wordmark`, `.t-display`, `.t-title`, `.t-eyebrow`, `.t-hud`, `.t-value`;
- `.col-1-5`, `.col-6-8`, `.col-9-12`.

Cada seção aplica os tokens do §2 direto. O papel "wordmark 700/`wdth` 125" nunca chegou à tela:
o hero usa 500/100. O resto do CSS é usado; `lenis-smooth` é posto pela biblioteca.

**JS (D50).**
- **Motion:** GSAP, Lenis e motion continuam só depois do `load` (D29, testado).
- **Peso:** `npm run bundle` lista o peso de cada arquivo entregue, cru/gzip/brotli, pelo momento em
  que é pedido.
  - JS total: 75,5 KB em gzip, sem mudança; nada foi minificado.
  - Antes do `load`, só 6,5 KB de JS de interface.

---

## 10. SEO local e metadados (etapa "seo", 25/09/2026)

Nada visual nem de motion mudou: `test-otimizacao.mjs`, pixels e estilos, continua passando.
Teste desta etapa: `scripts/test-seo.mjs`, todo local e sem serviço externo.
- **Open Graph:** lido do HTML pelo `open-graph-scraper`.
- **JSON-LD:** `jsonld.expand` para a sintaxe; tipagem do vocabulário do schema.org com
  `schema-dts` + `tsc`, com controles negativos: propriedade inventada e tipo errado têm de falhar.
- **Fidelidade ao CLIENTE.md:** conferida campo a campo.

**`<head>` (D51).**
- **Título:** "Asami Sushi São Bernardo — Rodízio japonês no Centro" (52 caracteres). Traz nome,
  bairro e especialidade e não repete só o wordmark.
- **Descrição (139 caracteres):** "Restaurante japonês no Centro de São Bernardo do Campo: rodízio e
  à la carte, bebidas e sobremesas em clima familiar. R$ 80–160 por pessoa."
- **Já estavam certos:** `lang="pt-BR"` e `theme-color` `#040507` (`--ink-900`).
- **Fonte única:** título e descrição vêm de `TITULO`/`DESCRICAO` em `scripts/seo.mjs`, e o teste
  confere que o `<head>` e o Open Graph batem.

**Domínio (D52): o que falta preencher na publicação.** Um campo só: `"dominio"` em
`seo.config.json`, no formato `https://www.exemplo.com.br/` (com `/` no fim). Depois,
`npm run build`. O build gera e o teste confere:

| Onde | O que entra com o domínio | Hoje (sem domínio) |
|---|---|---|
| `index.html` | `<link rel="canonical">` | comentado, com o placeholder |
| `index.html` | `og:url` | comentado |
| `index.html` | `og:image` (URL absoluta de `assets/og-asami.jpg`) + `og:image:type/width/height/alt` | comentado |
| `index.html`, JSON-LD | `"url"` e `"image"` | fora do JSON-LD, com comentário |
| `sitemap.xml` | `<loc>` da raiz | `https://dominio-a-definir.invalid/`, marcado em comentário |
| `robots.txt` | `Sitemap: <domínio>sitemap.xml` | linha comentada |

- **Por que comentado e não um domínio de mentira:** uma `canonical` apontando para outro domínio
  derruba a nota de SEO do Lighthouse e confunde o Google.
- **Placeholder:** usa o TLD reservado `.invalid` (RFC 2606), que nunca vira endereço real.
- **Teste:** o modo com domínio foi rodado com `https://www.example.com/` (reservado) e desfeito.

**Prévia ao compartilhar (D53).**
- **Tags:** `og:type` `website` (o Open Graph não tem tipo "restaurant"; o antigo
  `restaurant.restaurant` era só do Facebook), `og:locale` `pt_BR`, `og:site_name`,
  `og:title` = título, `og:description` = descrição e `twitter:card` `summary_large_image`. O
  Twitter/X lê título, descrição e imagem do Open Graph.
- **Imagem:** `assets/og-asami.jpg`, 1200×630, JPEG de 72 KB (o WhatsApp recusa acima de ~300 KB).
  Gerada por `npm run og`:
  - é o hero aprovado, renderizado numa tela de 1200×630 em pose estática;
  - sem o cabeçalho, o rótulo do ato, o HUD e o player, que numa miniatura viram texto ilegível;
  - ficam o nigiri, a fumaça e o wordmark.
- **Exceção à regra "nenhum texto dentro de imagem":** vale só para essa prévia, que é uma imagem
  por natureza e não aparece no site.

**Ícones (D54).**
- **Origem:** o favicon atual é o logo real (`IMAGENS/`, 150 px) e continua.
- **Gerados por `npm run assets`, sem mexer na arte:**
  - `favicon.ico` com 16, 32 e 48 px;
  - `apple-touch-icon.png` 180 px;
  - `icon-192.png` para o manifest.
- **Upscale:** 180 e 192 são 1,2–1,3× maiores que a origem.
- **Sem o 512:** seria 3,4× (borrado). Com um logo em alta resolução, é só trocar `LOGO` em
  `build_assets.py`, gerar o 512 e acrescentá-lo ao manifest.
- **`site.webmanifest`:** nome, nome curto, `lang`, cores `--ink-900` e ícones.
  - `display: browser`: adicionado à tela inicial, abre como um favorito, com a barra do
    navegador, igual ao site.
  - Sem o 512, o Chrome não oferece "instalar app", só "adicionar à tela inicial".

**Dados estruturados (D55).** Um `Restaurant` em JSON-LD, só com o CLIENTE.md:

| Campo | Valor |
|---|---|
| `name`, `description` | a frase do "Visão geral" |
| `address` | rua, bairro, cidade, UF, CEP, país |
| `telephone` | +55 11 2669-7175 |
| `servesCuisine` | Japonesa |
| `priceRange` | R$ 80–160, já exibido no site |
| `hasMap` | o mesmo link do rodapé |
| `openingHoursSpecification` | só `closes: 23:00` |

Ficaram de fora:
- **Dias e hora de abertura:** o CLIENTE.md não informa (§8.2). O placeholder está comentado no
  HTML.
- **`hasMenu` e `sameAs` (Instagram):** não há link real (§8.3, §8.4); placeholders comentados.
- **Nota 4,3 / 3.091 avaliações:** o Google não aceita marcar avaliações de terceiros no próprio
  site ("self-serving reviews").

**robots.txt, sitemap e semântica (D56).**
- **robots.txt:** `User-agent: *` / `Allow: /`.
- **sitemap.xml:** só a raiz.
- **Títulos:** um `<h1>` ("Asami Sushi São Bernardo": o wordmark mais o resto em
  `visually-hidden`), depois os `<h2>` ACT I–IV e o "Endereço" do rodapé, sem pular nível.
- **Imagens:** as 14 são plates decorativos, com `alt=""` e `aria-hidden`. Faltava o
  `aria-hidden` no nigiri, que já tinha `alt=""` e por isso já saía da árvore de acessibilidade.
- **"Pular para o conteúdo":** é o 1º Tab e fica visível. Enter + Tab caem dentro do `<main>`,
  com e sem motion.

**Lighthouse mobile (mediana de 5), depois do SEO.**
- **Notas:** desempenho 98, acessibilidade 100, boas práticas 100, **SEO 100**.
- **Métricas:** FCP 1,0 s · LCP 2,3 s · TBT 52 ms · CLS 0 · SI 2,2 s; nada caiu em relação à
  otimização (98).
- **Auditorias de SEO:** todas passam, inclusive `robots-txt` (agora existe).
- **Dados estruturados:** é uma verificação manual no Lighthouse; aqui é coberta pelo
  `test-seo.mjs`.
