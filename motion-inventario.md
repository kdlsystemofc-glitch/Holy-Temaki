# Inventário de motion

Todas as animações do site, depois da etapa final de motion (24/09/2026). Fonte: o código em
`site/css/*.css` e `site/js/motion/*.js`; contrato em DESIGN.md §5.0 (D26–D44).

**Tokens.**
- **Durações:** `--t-fast` 220 ms · `--t-mid` 600 ms · `--t-slow` 1200 ms · `--t-cine` 2400 ms ·
  `--t-enter` 800 ms · `--t-fade` 200 ms.
- **Curvas:** `--ease-out` (entradas) · `--ease-soft` (transições de estado: hover, foco,
  fechar, rolagem programada).
- **Loops:** usam curvas de oscilação (`linear`, `ease-in-out`, `sine.inOut`); os tokens são para
  entradas e transições.

**Colunas.**
- **Loop:** animação infinita.
- **low:** o que muda com `html[data-quality="low"]`.
- **reduced:** o que acontece com `prefers-reduced-motion: reduce`. Em reduced não há `js-motion`,
  entradas, loops nem parallax, e só fades de `opacity`/`visibility` até 200 ms (`reset.css`).
- **✱:** fora dos tokens, com o motivo na última tabela.

## Global

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Véu de entrada (`body::before`) | opacity | 800 ms `--t-enter` | `--ease-soft` | 0 | não | igual | não existe |
| `data-reveal` (utilitário; nenhum elemento usa) | transform + opacity | 600 ms `--t-mid` | `--ease-out` | `data-reveal-delay` | não | igual | fade de 200 ms `--t-fade` |
| Rolagem programada (⏮ ⏭, âncoras; Lenis) | scroll | 1200 ms `--t-slow` | `--ease-soft` | 0 | não | igual | nativa, instantânea |
| Parallax (`data-parallax`) | transform (scrub) | rolagem | linear | — | — | desligado | desligado |

## Cabeçalho, menu e player

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Hambúrguer → X (traços) | transform + opacity | abrir 320 ms ✱ / fechar 200 ms `--t-fade` | `--ease-out` / `--ease-soft` | 0 | não | igual | instantâneo |
| Overlay do menu | opacity (+ visibility depois) | abrir 320 ms ✱ / fechar 200 ms `--t-fade` | `--ease-out` / `--ease-soft` | 0 | não | igual | fade de 200 ms |
| Itens do menu (4) | transform + opacity | 500 ms ✱ | `--ease-out` | 0 / 60 / 120 / 180 ms ✱ | não | igual | sem (só o fade do overlay) |
| Névoa do menu | translate | 40 s | ease-in-out, alternate | 0 | sim, **só aberto** | estática | sem |
| Links do menu (hover) | color | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | instantâneo |
| Traço ativo do trilho | transform + opacity | 300 ms ✱ | `--ease-out` | 0 | não | igual | fade de 200 ms (opacity) |
| Botões do player (hover) | border-color | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | instantâneo |
| HUD e player (entrada) | opacity | 600 ms `--t-mid` | `--ease-out` (era `--ease-soft`: corrigido) | 1600 ms ✱ | não | igual | sem |

## ACT I — hero

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Wordmark (+ cópia no reflexo) | scale + blur | 1800 ms ✱ | `--ease-out` | 0 | não | scale + opacity, sem blur | sem |
| Rótulo "ACT I" | transform + opacity | 600 ms `--t-mid` | `--ease-out` | 2000 ms ✱ | não | igual | sem |
| Fumaça (3 camadas) | translate + scale | 56 / 70 / 40 s | linear, alternate | 0 | sim | só a central | sem |
| Bolhas (14) | translate + opacity | 6–14 s | linear | fases fixas | sim | 6 | sem |
| Nigiri | transform | 7 s | ease-in-out, alternate | 0 | sim | igual | sem |
| Piso + reflexo (`#wave`, `#ripple`) | feTurbulence (GSAP) | 12 s (6 + 6) | sine.inOut, yoyo | reflexo +400 ms | sim | sem (e < 768 px) | sem |
| Parallax: wordmark .25 · fumaça .10 · água .40 | transform | rolagem | linear | — | — | desligado | desligado |

## ACT II — rodízio

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Rótulo | transform + opacity | 600 ms `--t-mid` | `--ease-out` | 0 | não | igual | sem |
| Tábuas | transform (translate + rotateX) | 1200 ms `--t-slow` | `--ease-out` | 0 / 180 ms ✱ | não | igual | sem |
| Sombras e reflexo (containers) | opacity | 1200 ms `--t-slow` | `--ease-out` | 90 ms | não | igual | sem |
| Linhas-guia | stroke-dashoffset | 700 ms ✱ | `--ease-out` (era `--ease-soft`: corrigido) | 400 ms + 120 ms por callout | não | igual | sem |
| Pontos das linhas | opacity | 220 ms `--t-fast` | `--ease-out` (estava sem curva: corrigido) | com a linha | não | igual | sem |
| Rótulos dos callouts | opacity | 220 ms `--t-fast` | `--ease-out` (era `--ease-soft`: corrigido) | linha + 900 ms | não | igual | sem |
| Flutuação das tábuas | translate | 9 / 11 s | ease-in-out, alternate | depois da entrada | sim | igual | sem |
| Vapor (2 camadas) | translate + opacity | 18 s | ease-in-out | fase −9 s na 2ª | sim | 1 camada | sem |
| Faíscas (12 de 13) | translate + opacity | 3–5 s | linear | fases fixas | sim | 5 | sem |
| Reflexo (`#ripple-ato2`) | feTurbulence (GSAP) | 12 s (6 + 6) | sine.inOut, yoyo | 3 s | sim | sem | sem |
| Tábua (hover) | scale | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | instantâneo |
| Linhas da tábua (hover) | stroke | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | instantâneo |
| Parallax: tábuas/sombras .12 · vapor .06 · reflexo .20 | transform | rolagem | linear | — | — | desligado | desligado |

## ACT III — sanctum

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Rótulo | transform + opacity | 600 ms `--t-mid` | `--ease-out` | 0 | não | igual | sem |
| Salão (entrada) | scale | 2400 ms `--t-cine` | `--ease-out` | 0 | não | igual | sem |
| Salão (zoom de rolagem) | scale 1 → 1,03 | rolagem | linear | — | — | igual | sem |
| Neon (cascata) | opacity, 4 passos de 50 ms ✱ | 200 ms | sem curva (passos) | 90 ms entre barras | não | igual | sem |
| Luz rebatida | opacity | 1200 ms `--t-slow` | `--ease-out` (era `--ease-soft`: corrigido) | 380 ms | não | igual | sem |
| Título (letras) | translateX + opacity | 1400 ms ✱ | `--ease-out` | 300 ms | não | só fade (sem letras) | sem |
| Pulso do halo | opacity | 5 s | ease-in-out | fases fixas | sim | 2 barras | sem |
| Micro-flicker (5ª barra) | opacity | 12 s | linear | 0 | sim | sem | sem |
| Névoa de chão | translate | 50 s | ease-in-out, alternate | 0 | sim (pausa na rolagem) | estática | sem |
| Parallax: salão/luz .08 · neon .14 · névoa .22 | transform | rolagem | linear | — | — | desligado | desligado |

## ACT IV — reserva

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Rótulo | transform + opacity | 600 ms `--t-mid` | `--ease-out` | 0 | não | igual | sem |
| Card (wrapper) | translate | 900 ms ✱ | `--ease-out` | 0 | não | igual | sem |
| Reflexo do card | opacity 0 → .62 | 900 ms ✱ | `--ease-out` | 250 ms | não | igual | sem |
| Contador (HH, MM, adultos, crianças) | transform das faixas | 500 ms ✱ | steps(9) | 300 ms | não | igual | sem |
| Foco (borda) | border-color | 180 ms ✱ | `--ease-soft` | 0 | não | igual | instantâneo |
| Foco (anel `::before`) | opacity | 180 ms ✱ | `--ease-soft` | 0 | não | igual | fade de 200 ms |
| Botão (varredura, hover) | scaleX + clip-path | 300 ms ✱ | `--ease-soft` | 0 | não | igual | instantâneo |
| Confirmação (ondulação) | scale + opacity | 600 ms `--t-mid` (era 600 ms literal: corrigido) | `--ease-out` | depois do `window.open` | não | igual | sem |
| Bruma | translate | 60 s | ease-in-out, alternate | 0 | sim (pausa na rolagem) | estática | sem |
| Água (`#water`) | feTurbulence (GSAP) | 9 s (4,5 + 4,5) | sine.inOut, yoyo | 0 | sim | sem (e < 768 px) | sem |
| Parallax: água .10 · bruma .06 | transform | rolagem | linear | — | — | desligado | desligado |

## Rodapé

| Elemento | Tipo | Duração | Curva | Atraso | Loop | low | reduced |
|---|---|---|---|---|---|---|---|
| Entrada (grade) | transform + opacity | 600 ms `--t-mid` | `--ease-out` | 0 | não | igual | sem |
| Sublinhado que cresce (hover/foco) | scaleX | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | sem (só com `hover: hover`) |
| Sublinhado discreto (hover) | text-decoration-color | 220 ms `--t-fast` | `--ease-soft` | 0 | não | igual | instantâneo |

## Fora dos tokens (✱) — por quê

Todos os valores fora dos tokens vêm de pedido explícito nas etapas de motion:
- **Hero:** 1800 ms e os atrasos de 1600 e 2000 ms na entrada (parte 2).
- **Trilho:** 300 ms no traço ativo (parte 2).
- **ACT II:** 180 ms entre as tábuas e 700 ms nas linhas-guia (parte 3).
- **ACT III:** 50 ms por passo de flicker e 1400 ms no título (parte 4).
- **ACT IV:** 900 ms no card e no reflexo, 500 ms no contador, 180 ms no foco e 300 ms na
  varredura do botão (parte 5).
- **Menu:** 320 ms e 500 ms com 60 ms de defasagem (parte 6).

Nenhum foi trocado pelo token mais próximo: são o ritmo que foi pedido e aprovado.

**Corrigido nesta passada** (fugiam dos tokens sem motivo):
- **Curvas de entradas que usavam `--ease-soft`:** HUD e player, luz rebatida, linhas-guia e
  rótulos dos callouts.
- **Tween sem curva explícita:** os pontos das linhas-guia caíam no `power1.out` padrão do GSAP.
- **Duração literal:** os 0,6 s da ondulação de confirmação passaram a ser `--t-mid`.

## Loops simultâneos (orçamento, D41)

Medido em passos de 25 % da altura da tela (`test-motion-final.mjs`). A conta inclui as animações
infinitas **rodando** (CSS e GSAP).

**1440, high** — pico de 34, na emenda hero + ACT II:

| Rolagem | Loops rodando |
|---|---|
| 0–609 px | 34 (hero + ACT II, o topo do ACT II dentro da margem de 10 %) |
| 812–1421 px | 16 |
| 1624–2233 px | 3 |
| fim | 2 |

**390, low** — pico de 14 (hero).

**Orçamento proposto:**
- até 36 loops em high e 16 em low;
- no máximo 2 seções com loops ao mesmo tempo (só na emenda);
- no máximo 1 `feTurbulence` (D34).

**Margem do observador (testado e mantido em 10 %).**
- **Com margem 0**, os loops de uma seção só começavam quando ela aparecia, e as camadas de dezenas
  de animações eram criadas na tela, no meio da rolagem: +2,5 pontos de quadros descartados na
  rolagem da página inteira.
- **Com 10 %**, os loops já estão rodando quando a seção aparece.
- **Por isso o pico de 34 aparece já em 0 px:** o topo do ACT II está dentro da margem.
- **Mantido desta passada:** exigir área visível > 0 (só encostar na borda não conta).
