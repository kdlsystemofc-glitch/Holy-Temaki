# assets.md — Inventário e mapeamento

Gerado por `py scripts/build_assets.py` (`npm run assets`). Saída em `site/assets/`.
Fonte de verdade dos slots: **DESIGN.md §4 e §6**.

## 1. Inventário de origem

### Plates (`design/plates/`)
| Arquivo | Dimensão | Fundo | Conteúdo |
|---|---|---|---|
| `plate-smoke-hero.jpeg.jpeg` | 1376×768 | preto, mas a fumaça **preenche o quadro** | Massa de fumaça fria azulada |
| `plate-smoke-thin.jpeg.jpeg` | 768×1376 | preto | Coluna única de fumaça fina subindo |
| `plate-smoke-floor.jpeg.jpeg` | 1376×768 | preto (metade de cima) | Névoa rasteira na metade inferior, sangra nas bordas de baixo |
| `plate-nigiri.jpeg.jpeg` | 1200×896 | preto | Nigiri de salmão flutuando, luz de cima |
| `plate-board-left.jpeg.jpeg` | 1200×896 | preto | Ardósia: camarão, lula, polvo, ervas |
| `plate-board-right.jpeg.jpeg` | 1200×896 | preto | Ardósia: sashimi de salmão e atum, nabo, wasabi |
| `plate-room.jpeg.jpeg` | 1376×768 | cena completa, **sem fundo preto** | Salão gerado por IA. **Provisório** no ACT III (D24) |

Extensão dupla `.jpeg.jpeg` mantida na origem; os arquivos de saída têm nome limpo.

### Fotos reais (`IMAGENS/`) — nunca referenciadas pelo site
| Arquivo | Dimensão | Conteúdo real |
|---|---|---|
| `imgi_2` | 150×150 | Logo: "ASAMI Sushi" em pincelada vermelha sobre onda |
| `imgi_21` | 720×1280 | Mesa farta (sashimis, sushis, shimeji) |
| `imgi_22` | 1080×1350 | Camarão na chapa de ferro sobre base de madeira |
| `imgi_23` | 1080×1350 | Pessoa segurando travessa com sushi, mesa posta à frente |
| `imgi_25` | 1080×1350 | Camarão empanado na chapa |
| `imgi_27` | 1080×1350 | Camarão empanado com molho |

## 2. Saída (`site/assets/`)

Todos em WebP q82, Lanczos. Nos plates de fundo preto, um *black point* leve (0–8 → 0)
garante que o `screen` não revele a borda do retângulo sobre `--ink-900`. Nenhum recorte,
nenhum canal alpha.

WebP qualidade 70 (era 82 até a etapa de otimização, D48). Larguras só onde algum `srcset` usa:

| Arquivo | Larguras (px) | Peso por largura |
|---|---|---|
| `plate-smoke-hero-*.webp` | 800 / 1200 / 1600 | 12 / 21 / 31 KB |
| `plate-smoke-thin-*.webp` | 600 / 800 / 1200 / 1600 | 16 / 23 / 37 / 53 KB |
| `plate-smoke-floor-*.webp` | 800 / 1200 / 1600 | 6 / 11 / 16 KB |
| `plate-nigiri-*.webp` | 600 / 800 / 1200 / 1600 | 12 / 19 / 35 / 48 KB |
| `plate-board-left-*.webp` | 600 / 800 / 1200 / 1600 | 17 / 29 / 61 / 81 KB |
| `plate-board-right-*.webp` | 600 / 800 / 1200 / 1600 | 13 / 21 / 41 / 56 KB |
| `plate-room-1600.webp` | 1600 (fundo em CSS, sem srcset) | 46 KB (sem black point, sem screen) |
| `logo-asami-150.webp` | 150 | 5 KB (tamanho nativo, sem upscale; só favicon) |

> **A variante 1600 é upscale.** As origens têm 768–1376 px de largura. Para fumaça em
> `screen` isso não se nota; para nigiri e tábuas, a 1600 fica um pouco mais mole. Se
> houver plates em resolução maior, é só trocar a origem e rodar `npm run assets`.

Uso padrão: o `sizes` descreve a largura de layout que o CSS dá à imagem em cada regime
(paisagem ≥ 48rem × retrato), medida pelo `test-otimizacao.mjs`. Camadas que usam o mesmo
arquivo levam o mesmo `sizes`, o da maior; assim o navegador baixa um arquivo só.
```html
<img class="plate" src="assets/plate-nigiri-800.webp"
     srcset="assets/plate-nigiri-600.webp 600w, assets/plate-nigiri-800.webp 800w,
             assets/plate-nigiri-1200.webp 1200w, assets/plate-nigiri-1600.webp 1600w"
     sizes="(min-width: 48rem) and (min-aspect-ratio: 1/1) 33.5vw, (min-aspect-ratio: 1/2) 38vh, 76vw"
     alt="" decoding="async">
```
Plates são decorativos → `alt=""`. Na 1ª tela, sem `lazy`:
- **Fumaça do hero:** é o LCP. Tem `fetchpriority="high"` e `preload`.
- **Nigiri:** tem `fetchpriority="high"` e `preload`.

Abaixo da dobra, `loading="lazy"`.

## 3. Mapeamento slot → arquivo

| Slot (DESIGN.md) | Seção / camada | Arquivo | Notas de uso |
|---|---|---|---|
| `plate-smoke-01/02/03` | Hero, camada 2 | `plate-smoke-hero` | **Um só arquivo** para as 3 camadas (variar escala, posição, velocidade). Preenche o quadro → `mask-image` em degradê vertical que deixa só uma faixa no terço médio. `opacity .35–.5` (`--smoke-hero-opacity`). `screen`. |
| `plate-nigiri` | Hero, camada 4 | `plate-nigiri` | `screen`, sem recorte. |
| `plate-smoke-thin` | Rodízio, camada 2 | `plate-smoke-thin` | Uma coluna só → **duplicar e espelhar** (`scaleX(-1)`) para formar o vapor. `screen`. |
| `plate-board-left` | Rodízio, camada 5 | `plate-board-left` | ⚠️ **TODO — provisório (D22).** Mostra lula e polvo, que não constam no CLIENTE.md; o cliente vai substituir. Nenhum callout cita o conteúdo. Ao trocar: mesmo nome de origem em `design/plates/` + `npm run assets`. `screen`; `rembg` só se o parallax exigir. |
| `plate-board-right` | Rodízio, camada 6 | `plate-board-right` | `screen`. `rembg` só se o parallax exigir. |
| `plate-smoke-floor` | Sanctum, camada 5 | `plate-smoke-floor` | Névoa de chão. `screen`. |
| `plate-smoke-low` | Reserva, camada 3 | `plate-smoke-floor` | Mesmo arquivo, reaproveitado como bruma do ACT IV. |
| `logo-asami` | Favicon | `logo-asami-150` | **Só favicon (D23).** O rodapé usa o wordmark em texto. |
| `plate-sala` | Sanctum, camada 2 | `plate-room` | ⚠️ **TODO — provisório (D24).** Imagem normal, **sem `screen`** (não tem fundo preto): escurecida, dessaturada, máscara nas bordas. Caminho único: `--room-img` em `site/css/sanctum.css`. |
| `plate-water-tile` | Reserva, camada 1 | — | **Cancelado (D21).** Água procedural em `feTurbulence`. |

## 4. Decisões e TODOs

Decididas em 24/09/2026 e registradas no DESIGN.md como D20–D23.

- **TODO D24 · `plate-room`** — plate-room é gerado por IA e não corresponde ao salão real.
  Confirmar com o cliente ou trocar por foto real antes da entrega. Para trocar: gravar a foto
  em `design/plates/`, acrescentar ao `build_assets.py` (sem black point), rodar
  `npm run assets` e mudar `--room-img` em `site/css/sanctum.css`. (Substitui D20.)
- **D21 · Água do ACT IV** — `feTurbulence` procedural. Sem arquivo.
- **D22 · TODO `plate-board-left`** — provisório, será substituído pelo cliente. Callouts só
  com texto do CLIENTE.md; nada de lula/polvo. A tábua esquerda fica sem rótulo.
- **D23 · Logo** — só favicon. Rodapé com wordmark em texto até chegar arquivo em alta.
- **Variantes 1600 são upscale** (ver §2).
