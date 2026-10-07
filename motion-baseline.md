# Linha de base antes do motion

Medida em 24/09/2026 no commit `ae83ff0` ("docs: regra de commit e push por etapa"), antes de
qualquer código de motion. Serve para comparar as etapas de motion.

## Auditoria responsiva (`npm run audit`)

- **Telas:** 12 (2560×1440 até 320×568 e 844×390 deitado), com **0 problemas** em todas.
- **Modos especiais:** texto 200 %, movimento reduzido + tema claro e fontes bloqueadas, com **0 problemas**.
- **CLS com fontes atrasadas 1,5 s:** 0,0030 em 1440×900 e 0,0011 em 390×844.
- **Requests a `/design` ou `/IMAGENS`:** 0, de 30 requests únicas.

## Lighthouse mobile (`npm run lh`)

Lighthouse 13.5.0, perfil mobile com throttling simulado, rodando no Chromium do Playwright.
O servidor estático sobe dentro do script (`scripts/lighthouse.mjs`). São 3 execuções e vale a
mediana.

| Desempenho | Acessibilidade | Boas práticas | SEO |
|---|---|---|---|
| **80** | **100** | **100** | **100** |

| FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|
| 3,0 s | 3,7 s | 0 ms | 0,000 | 5,5 s |

As 3 execuções deram exatamente os mesmos números.

- **Elemento de LCP:** `img.hero__smoke-layer--c` (a fumaça do hero). O nigiri tem `preload` e
  `fetchpriority="high"`. Quase todo o LCP é "element render delay" (2,95 s), que é a espera
  pelo CSS e pelas fontes que bloqueiam a renderização.
- **JavaScript:** 4 arquivos, 14,1 KB transferidos (config.js, menu.js, nav.js e reserva.js).
  O peso total da página é de 465 KB.
- **Oportunidades:**
  - render-blocking: economia estimada de 1 760 ms no FCP;
  - cache: 320 KiB;
  - entrega de imagens: 128 KiB;
  - CSS sem minificar: 25 KiB.

A passada responsiva registrou 84 (SI 3,4 s) com a mesma versão do Lighthouse. Aquela medição
foi uma execução só, contra `npm run serve`. Os números não são comparáveis entre os dois
métodos, por isso as etapas de motion comparam só medições feitas com `npm run lh`.

---

## Depois da etapa "motion base"

Medido com o mesmo método (`npm run lh`, 3 execuções, mediana) e a mesma auditoria.

| | Desempenho | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| Antes | 80 | 3,0 s | 3,7 s | 0 ms | 0,000 | 5,5 s |
| Depois | **84** | 3,0 s | 3,7 s | 0 ms | 0,001 | 3,0 s |

Acessibilidade, boas práticas e SEO continuam em 100. O elemento de LCP não mudou
(`img.hero__smoke-layer--c`).

- **LCP e FCP:** idênticos.
- **Os 4 pontos a mais vêm do Speed Index**, que nesta sessão variou entre 3,0 e 5,9 s em
  execuções do mesmo código. A leitura correta é "não piorou", não "melhorou".
- **Primeira tentativa (scripts com `defer`):** 76, com LCP de 4,4 s. Um experimento sem os
  scripts voltou a 84 / 3,7 s. Por isso o motion passou a ser carregado depois do `load`, na
  1ª interação ou 2,5 s depois (D29).
- **Auditoria responsiva:** 0 problemas nas 12 telas e nos 3 modos especiais. CLS com fontes
  atrasadas continua em 0,0030 / 0,0011. Requests a `/design` ou `/IMAGENS`: 0, de 35.

**JS novo** (pedido depois do `load`):

| Arquivo | Tamanho | gzip |
|---|---|---|
| `vendor/gsap.min.js` | 71,2 KB | 27,7 KB |
| `vendor/ScrollTrigger.min.js` | 43,5 KB | 17,6 KB |
| `vendor/lenis.min.js` | 18,3 KB | 5,3 KB |
| `motion/core.js` | 16,0 KB | 5,6 KB |
| **Total de JS** | **149,0 KB** | **56,2 KB** |

Somam-se `css/motion.css` (2,3 KB, 1,0 KB gzip, bloqueante como os outros CSS) e cerca de
1,6 KB de script inline no `<head>`. O servidor local não comprime, por isso o Lighthouse
contabiliza 164 KB transferidos. Numa hospedagem com gzip ou brotli (Vercel), vão cerca de
56 KB.

---

## Depois da etapa "motion hero"

A comparação que vale é a lado a lado, rodada na mesma sessão de rede, com o commit
`33b2baf` como referência. As duas versões foram servidas com quebras de linha LF, como no git e
em produção. A cópia de trabalho no Windows usa CRLF (`core.autocrlf`), o que acrescenta cerca de
3,5 KB de CSS bloqueante e distorce a medição.

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Referência (`33b2baf`, motion base) | 84 | 2,9 s | 3,6 s | 2 ms | 0,001 |
| Motion hero | 83 | 2,9 s | **3,6 s** | 0 ms | 0,000 |

- **Linha de base original:** 80 / LCP 3,7 s.
- **Primeira versão do hero:** LCP 3,8 s em todas as execuções. Dois motivos:
  - os loops ficavam no CSS bloqueante;
  - o carregador foi para um arquivo externo.

  Os dois saíram do caminho crítico (D31).
- **O que o hero acrescenta:**
  - `hero-loops.css` (3,4 KB) e `js/motion/hero.js` (2,4 KB), pedidos junto com o motion
    depois do `load`;
  - cerca de 3 KB no `hero.css` bloqueante, com as entradas.
- **Custo de CPU e GPU:** está no DESIGN.md, §5 Hero.

---

## Depois da etapa "motion ato 2"

Mesmo método da etapa anterior: comparação lado a lado com o commit `382ecc4` (motion do hero),
as duas versões servidas com LF, 5 execuções cada.

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Referência (`382ecc4`, motion hero) | 84 | 2,9 s | 3,6 s | 2 ms | 0,000 |
| Motion ACT II | 83 | 2,9 s | **3,6 s** | 0 ms | 0,000 |

- **Arquivos novos**, pedidos depois do `load` junto com o motion (D29, D31):
  - `js/motion/rodizio.js`, 7,8 KB;
  - `css/rodizio-motion.css`, 4,5 KB.
- **CSS bloqueante:** cresce menos de 1 KB, com o grupo de mescla e o wrapper do reflexo.
- **Custo de CPU e GPU:** está no DESIGN.md, §5 Rodízio.

---

## Depois da etapa "motion ato 3"

Comparação lado a lado com o commit `1267f2a` (motion do ACT II), as duas versões servidas com
LF, 5 execuções cada.

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Referência (`1267f2a`, motion ACT II) | 83 | 2,9 s | 3,6 s | 0 ms | 0,000 |
| Motion ACT III | 85 | 2,9 s | **3,6 s** | 0 ms | 0,000 |

- **Arquivos novos**, pedidos depois do `load` junto com o motion (D29, D31):
  - `js/motion/sanctum.js`, 8,8 KB;
  - `css/sanctum-motion.css`, 4,0 KB.
- **CSS bloqueante:** `sanctum.css` cresce 1,2 KB (os wrappers do ACT III; a maior parte são comentários).
- **Custo de CPU e GPU:** está no DESIGN.md, §5 Sanctum.

---

## Depois da etapa "motion ato 4"

Comparação lado a lado com o commit `54ca0c2` (motion do ACT III), as duas versões servidas com
LF, 5 execuções cada.

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Referência (`54ca0c2`, motion ACT III) | 84 | 2,9 s | 3,6 s | 6 ms | 0,000 |
| Motion ACT IV | 85 | 2,9 s | **3,6 s** | 16 ms | 0,000 |

- **Acessibilidade:** continua em 100.
- **Arquivos novos**, pedidos depois do `load` junto com o motion (D29, D31):
  - `js/motion/reserva.js`, 8,0 KB;
  - `css/reserve-motion.css`, 2,4 KB.
- **CSS bloqueante:** `reserve.css` cresce 2,6 KB. É CSS de interface que vale sem JS também: o
  foco suave e a varredura do botão, com comentários. O `index.html` cresce 0,7 KB.
- **Custo de CPU e GPU:** está no DESIGN.md, §5 Reserva.


## Depois da etapa "motion final"

Comparação com o commit `75b53d5` (motion do ACT IV). As duas versões foram servidas com LF, em duas rodadas de 5 execuções
cada, e a segunda rodada inverteu a ordem.

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Referência (`75b53d5`), rodada 1 | 84 | 3,0 s | 3,6 s | 14 ms | 0,000 |
| Motion final, rodada 1 | 82 | 3,0 s | 3,8 s | 14 ms | 0,000 |
| Motion final, rodada 2 | 82 | 3,0 s | 3,8 s | 41 ms | 0,000 |
| Referência (`75b53d5`), rodada 2 | 82 | 3,0 s | 3,8 s | 15 ms | 0,000 |

- **Diferença é ruído:** na rodada 2 as duas versões empatam (82 e 3,8 s). Contra a linha de base
  estática (80, LCP 3,7 s), o motion inteiro custa zero no desempenho.
- **Acessibilidade, boas práticas e SEO:** 100.
- **JS total (gzip -9, 13 arquivos):** 75,6 KB, contra 74,6 KB na referência.
  - Vendor (GSAP + ScrollTrigger + Lenis): 50,5 KB.
  - Motion (`core`, `hero`, `rodizio`, `sanctum`, `reserva`, `rodape`): 18,6 KB.
  - Interface (`config`, `menu`, `nav`, `reserva`): 6,5 KB.
  - Só os 4 arquivos de interface (6,5 KB) entram antes do `load`; o resto é pedido depois
    (D29, D33, D44).
- **Arquivo novo:** `js/motion/rodape.js`, 0,65 KB gzip.
- **Custo de CPU e GPU da página inteira** (quadros descartados na rolagem de cima a baixo, contra o
  controle estático da mesma rodada):
  - 1440 high: 11,5 % (controle, 12,3 %);
  - 1440 low: 4,5 %;
  - 390: 0,0 %.
  - Loops simultâneos e o orçamento: DESIGN.md §5 "Coerência global" (D41).

### Conferir em aparelho real
- **iPhone (Safari):**
  - `backdrop-filter` do card do ACT IV durante a entrada;
  - névoa do menu;
  - rolagem com Lenis e trava de rolagem com o menu aberto.
- **Android de entrada:**
  - se a detecção cai em `low`;
  - quadros na emenda hero + ACT II (34 loops em high).
- **Leitores de tela:**
  - VoiceOver e TalkBack no menu (foco preso e devolvido);
  - ⏸/▶ anunciando "Pausar animações" / "Retomar animações".
- **Sistema com "reduzir movimento" ativo:** só fades, em iOS e Android.
- **Trackpad e mouse de roda:** ritmo das entradas com a rolagem suave.
