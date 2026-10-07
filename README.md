# Asami Sushi — São Bernardo do Campo

Landing page do **Asami Sushi São Bernardo** (rodízio, Centro de SBC), construída a partir de um
mockup em quatro "atos" + rodapé. HTML/CSS/JS estático, sem framework: o que está em `site/` é o
que vai para o ar. O único build é o do CSS (`npm run build`, D46), e o resultado dele fica
commitado em `site/` — a hospedagem não roda nada. Ver `DEPLOY.md`.

> **Repositório privado.** Contém material do cliente (fotos, dados do restaurante) e imagens
> **geradas por IA, provisórias**, que não podem ir para produção sem aprovação:
> `plate-board-left` (tábua do ACT II, **D22**) e `plate-room` (salão do ACT III, que **não é o
> salão real**, **D24**). Ver `assets.md`.

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `site/` | O site publicável: `index.html`, `css/` (arquivos-fonte legíveis: um por seção + `fonts.css`, `tokens.css`, `motion.css`; `css/build/` = gerado), `js/` (`config.js`, `menu.js`, `nav.js`, `reserva.js`, `motion/` com `core.js` e um arquivo por seção, `vendor/`), `assets/` (WebP gerados, `fonts/` com as fontes auto-hospedadas) |
| `fonts-src/` | WOFF2 originais da Archivo e da Space Grotesk (subconjunto latin da Google Fonts) e as licenças OFL; `npm run fonts` gera `site/assets/fonts/` |
| `DEPLOY.md` | Como publicar: cabeçalhos de cache por tipo de arquivo, compressão, exemplos Netlify/Vercel/GitHub Pages |
| `seo.config.json` | **Domínio final do site** (vazio até haver hospedagem). Preencher e rodar `npm run build` gera canonical, `og:url`, `og:image`, `url`/`image` do JSON-LD, `sitemap.xml` e a linha `Sitemap` do `robots.txt` (DESIGN.md §10) |
| `DESIGN.md` | Especificação: paleta, tipografia, grid, camadas de cada ato, regimes responsivos, motion, desempenho, SEO e o registro de decisões (D1–D56) |
| `CLIENTE.md` | Dados do restaurante (endereço, horário, telefone, preço). Única fonte de texto factual do site |
| `assets.md` | Inventário de imagens, mapeamento slot → arquivo e pendências |
| `design/` | **Referência visual apenas** (mockup, recortes por seção, plates originais). Nunca carregada pelo site |
| `IMAGENS/` | Fotos enviadas pelo cliente (material de referência) |
| `scripts/` | Geração de assets, servidor local, screenshots, testes e auditoria |
| `CLAUDE.md` | Regras do projeto |

## Como rodar

Requisitos: Node 18+ e, para regerar os assets, Python 3 com Pillow (`py` no Windows); para
regerar as fontes, `fonttools` e `brotli` (`py -m pip install fonttools brotli`).

```sh
npm install                 # Playwright (testes), GSAP e Lenis (fonte de site/js/vendor)
npx playwright install chromium

npm run serve               # site em http://localhost:4173 (PORT=4391 npm run serve para outra porta)
npm run build               # CSS de produção (crítico inline + css/build/) e SEO (bloco do <head>, robots.txt, sitemap.xml)
npm run build:dev           # volta o index.html a um <link> por arquivo-fonte (depurar CSS); rode build antes do commit
npm run assets              # regera site/assets/*.webp (plates) e site/assets/icons/ (favicon, apple-touch, manifest)
npm run fonts               # regera site/assets/fonts/ e css/fonts.css a partir de fonts-src/
npm run og                  # regera a imagem de prévia (og:image, 1200×630) a partir do hero
npm run shots               # screenshots em 1440 e 390 → screenshots/
npm run audit               # confere o build + 12 telas, texto 200 %, movimento reduzido/tema claro, fontes bloqueadas, CLS
npm run test:nav            # menu, teclado, trilho de atos, ⏮ ⏭ ⏸
npm run test:form           # validação e mensagem do formulário de reserva
npm run test:motion         # motion: base (modos, Lenis, âncoras, data-*, sem JS, file://) + os 4 atos (quadros, vídeo, custo; no ACT IV, o formulário durante a animação) + final (menu, player, rodapé, loops, ⏸, reduced, limpeza, página inteira)
npm run test:otimizacao     # otimização × commit anterior: pixels (estático e motion), estilos, CSS crítico, fontes, imagens, D29
npm run test:seo            # head, Open Graph, JSON-LD (schema.org), robots/sitemap, semântica, nenhum domínio inventado
npm run vendor              # copia os builds de GSAP/Lenis de node_modules para site/js/vendor
npm run lh                  # Lighthouse mobile, 3 execuções, mediana (-- --runs 5)
npm run bundle              # peso de cada arquivo entregue (cru, gzip, brotli), por momento do carregamento
```

O site também abre por duplo clique em `site/index.html` (`file://`): todo o JS é script clássico.

`screenshots/` e relatórios do Lighthouse são gerados e ficam fora do git.

## Decisões principais

Todas registradas em [`DESIGN.md`](DESIGN.md) (tabela de decisões e §3b "Regimes responsivos").
Em resumo:

- **Plates com fundo preto + `mix-blend-mode: screen`**, sem recorte.
- **Reserva pelo WhatsApp**: o formulário monta a mensagem e abre `wa.me`. O número fica numa
  única constante em `site/js/config.js`. **Falta confirmar com o cliente que o número tem WhatsApp.**
- **Sem áudio na v1**: a pílula do topo é o link `RESERVAR` (D25); ⏸ pausa todas as animações.
- **Motion (D26–D44)**: modos `full` / `reduced` / `paused` em `js/motion/core.js`, qualidade
  `low`/`high` por aparelho, rolagem suave com Lenis, GSAP carregado fora do caminho do LCP. Ver
  DESIGN.md §5.0 e §5; todas as animações do site estão em `motion-inventario.md`.
- **Responsivo por orientação**: retrato usa a composição vertical, paisagem a do mockup.
  Alvos de toque de 44 px.
- **Tudo é texto HTML real**; cores, fontes e espaçamentos só por variáveis de `tokens.css`.

## Fontes

Auto-hospedadas em `site/assets/fonts/` (D45), sem pedido à Google Fonts. As duas são da
**SIL Open Font License 1.1**, que permite uso comercial, auto-hospedagem e subconjuntos. Nenhuma
declara "Reserved Font Name", então a versão cortada mantém o nome. O texto de cada licença vai
junto das fontes (`site/assets/fonts/OFL-*.txt`) e também está em `fonts-src/`.

| Fonte | Versão (Google Fonts) | Arquivo | Licença |
|---|---|---|---|
| [Archivo](https://github.com/Omnibus-Type/Archivo) (Omnibus-Type) | v25 | `archivo-latin.<hash>.woff2` | SIL OFL 1.1, © 2020 The Archivo Project Authors |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) (Florian Karsten) | v22 | `space-grotesk-latin.<hash>.woff2` | SIL OFL 1.1, © 2020 The Space Grotesk Project Authors |

## Bibliotecas de terceiros

Auto-hospedadas em `site/js/vendor/` (sem CDN), copiadas de `node_modules` por `npm run vendor`.

| Biblioteca | Versão | Arquivos | Licença |
|---|---|---|---|
| [GSAP](https://gsap.com) (core + ScrollTrigger) | 3.15.0 | `gsap.min.js`, `ScrollTrigger.min.js` | GSAP Standard "no charge" License ([gsap.com/standard-license](https://gsap.com/standard-license)): uso gratuito, inclusive comercial; o aviso de copyright fica no topo de cada arquivo. Não é uma licença open source; os termos completos estão no link |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.26 | `lenis.min.js` | MIT, © darkroom.engineering. O texto da licença está em `site/js/vendor/lenis.LICENSE.txt`, já que o build minificado não traz o aviso |

## Pendências antes da entrega

- Confirmar o WhatsApp de (11) 2669-7175 e o horário de abertura (hoje só "fecha 23:00").
- Trocar ou aprovar as imagens provisórias geradas por IA (D22, D24).
- Testes em iPhone e Android reais (lista no fim da passada responsiva, `DESIGN.md` §3b).
- Conferir o motion em aparelhos reais (lista em `motion-baseline.md`, "Depois da etapa motion final").
