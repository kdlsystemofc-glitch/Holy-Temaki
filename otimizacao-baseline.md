# Otimização de desempenho — antes e depois

Método igual nas duas medições:
- **Lighthouse:** `npm run lh -- --runs 5` (Lighthouse 13.5.0, mobile, throttling simulado, mediana
  de 5).
- **O que foi servido:** uma cópia com LF do que está (ou vai) no git, pelo servidor do próprio
  script. Esse servidor não comprime nem manda cabeçalhos de cache, então os arquivos contam crus
  (ver "O que ainda sobrou").
- **Antes:** commit `5563fa9` ("motion final pronto"), medido no início da etapa, antes de qualquer
  mudança.
- **Depois:** o conteúdo do commit "otimizacao pronta".

## Notas

| 5 execuções, mediana | Desempenho | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| **Antes** (`5563fa9`) | **82** | 2,9 s | 3,8 s | 19 ms | 0,000 | 4,5 s |
| **Depois** | **98** | 1,0 s | 2,3 s | 60 ms | 0,000 | 2,7 s |

- **As execuções:**
  - Antes: 72 / 84 / 81 / 84 / 82 (TBT 0–359 ms).
  - Depois: 96 / 98 / 98 / 98 / 98 (TBT 0–144 ms).
- **Acessibilidade, boas práticas e SEO:** 100 antes e depois.
- **Elemento de LCP:** o mesmo nos dois, a fumaça central do hero (`hero__smoke-layer--c`).
  - Antes, 1 216 ms dos 3,8 s eram "element render delay": a espera pelo CSS bloqueante, com o da
    Google Fonts à frente (815 ms, outra origem).
  - Depois, esse atraso é de 178 ms.
- **Por que o TBT subiu (19 → 60 ms) sem trabalho novo:** a tarefa longa é a mesma de antes, o
  `js/nav.js` (121 ms antes, 106 ms depois, aos ~2,0 s com CPU 4× mais lenta). O TBT só conta
  tarefas entre o FCP e o TTI:
  - antes, com o FCP em 2,9 s, ela ficava fora da conta;
  - com o FCP em 1,0 s, entrou.
- **CLS:**
  - Lighthouse: 0 antes e depois.
  - No carregamento, medido no teste: 1440, 0,0033 → 0; 390, 0,0012 → 0.
  - Com as fontes atrasadas 1,5 s (`npm run audit`): 0,0030 / 0,0011 → 0,0030 / 0,0000.

## Pedidos e bytes (perfil mobile do Lighthouse)

| | Antes | Depois |
|---|---|---|
| Pedidos no carregamento | 42 | 28 |
| Bytes transferidos (crus, sem compressão) | 685 KB | 514 KB |
| CSS que bloqueia a pintura | 12 arquivos (11 locais + Google Fonts) | nenhum (crítico inline) |
| Outras origens | fonts.googleapis.com, fonts.gstatic.com | nenhuma |
| Fontes | 88 + 22 KB (Google) | 37 + 21 KB (locais) |
| CSS de motion (depois do `load`) | 4 arquivos, 14,7 KB crus | 1 arquivo, 6,6 KB |

HTML e CSS da página, medidos em gzip -9:

| | Antes | Depois |
|---|---|---|
| HTML | 9,0 KB | 15,7 KB (com o CSS crítico inline) |
| CSS | 20,7 KB, em 11 arquivos | 4,4 KB (seções, sem bloquear) |
| **Total** | **29,6 KB** | **20,1 KB** |

Imagens baixadas na página inteira (rolada até o fim), por aparelho:

| Tela | Antes | Depois |
|---|---|---|
| 1440 @1× | 266 KB | 162 KB |
| 1440 @2× | 498 KB | 271 KB |
| 1024 @2× | 345 KB | 202 KB |
| 768 @2× | 266 KB | 234 KB |
| 412 @1,75× (perfil do Lighthouse) | 239 KB | 162 KB |
| 390 @3× | 467 KB | 249 KB |

## JS (bundle-check: `npm run bundle`)

Nenhum arquivo de JS mudou nesta etapa. Totais: **75,5 KB em gzip, 68,1 KB em brotli**, 13 arquivos.

| Arquivo | Cru | gzip | Quando |
|---|---|---|---|
| `js/config.js` | 1,0 KB | 0,6 KB | antes do `load` (defer) |
| `js/menu.js` | 3,2 KB | 1,3 KB | antes do `load` |
| `js/nav.js` | 4,4 KB | 2,0 KB | antes do `load` |
| `js/reserva.js` | 6,1 KB | 2,5 KB | antes do `load` |
| `js/vendor/gsap.min.js` | 71,2 KB | 27,7 KB | depois do `load` (D29) |
| `js/vendor/ScrollTrigger.min.js` | 43,5 KB | 17,6 KB | depois do `load` |
| `js/vendor/lenis.min.js` | 18,3 KB | 5,3 KB | depois do `load` |
| `js/motion/core.js` | 20,3 KB | 7,1 KB | depois do `load` |
| `js/motion/hero.js` | 2,1 KB | 1,2 KB | depois do `load` |
| `js/motion/rodizio.js` | 7,3 KB | 3,0 KB | depois do `load` |
| `js/motion/sanctum.js` | 8,6 KB | 3,4 KB | depois do `load` |
| `js/motion/reserva.js` | 8,2 KB | 3,1 KB | depois do `load` |
| `js/motion/rodape.js` | 1,0 KB | 0,6 KB | depois do `load` |

- **D29 confirmado:** os 10 arquivos de motion são pedidos ~2,5 s depois do `load` (teste:
  `test-otimizacao.mjs`, seção 7).
- **Antes do `load`:** só 6,5 KB de JS em gzip.

## O que ainda sobrou (Lighthouse "depois")

**Só se resolve na hospedagem:**
- **"Use efficient cache lifetimes"** (446 KB): o servidor local não manda `Cache-Control`. A
  política recomendada está em `DEPLOY.md`.
- **"Document request latency"** (41 KB): o HTML sai sem compressão. Com gzip ou Brotli na
  hospedagem, 61 KB viram ~15 KB.

**Oportunidades no código (não mexidas: a etapa pedia só confirmar e relatar o JS):**
- **"Reduce unused JavaScript"** (52 KB): partes do GSAP e do ScrollTrigger que o site não usa. Só
  pesa depois do `load`.
- **"Minify JavaScript"** (22 KB): `core.js`, `sanctum.js`, `reserva.js` e `rodizio.js` vão
  legíveis. Um passo de minificação no build, como o do CSS, economizaria isso.
- **Tarefa longa do `nav.js`** (~106 ms com CPU 4×): a medição do progresso (`medir()`, linha 42)
  lê `scrollHeight` e força um layout enquanto imagens e fontes chegam ("forced reflow", 49 ms).
  É o que aparece no TBT.

**Aviso esperado, não é defeito:**
- **"Improve image delivery"** (66 KB): o Lighthouse mede só a parte da imagem que aparece na tela.
  A fumaça do hero é uma camada de 220 % da largura, mais larga que a tela, e as tábuas giram
  ou passam das bordas.
  - O `sizes` descreve a largura de layout.
  - O teste confere, em 6 telas/densidades, que o arquivo escolhido é o menor que a cobre.
