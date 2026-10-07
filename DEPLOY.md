# Publicação do site — Asami Sushi São Bernardo

O site é estático: publique a pasta **`site/`** como está. Antes de cada commit, confirme que ela
está em modo de produção: `npm run build` gera o que o `index.html` carrega, e `npm run audit`
falha se isso estiver desatualizado. Não há etapa de build na hospedagem.

**Ao definir o domínio:** preencha `"dominio"` em `seo.config.json` (ex.:
`"https://www.exemplo.com.br/"`), rode `npm run build` e `npm run test:seo`, e faça o commit.
Isso ativa canonical, `og:url`, `og:image`, `url`/`image` do JSON-LD, o `<loc>` do `sitemap.xml` e
a linha `Sitemap` do `robots.txt` (lista completa: DESIGN.md §10). Sem o domínio, a prévia do link
sai sem imagem: redes sociais e mensageiros só aceitam `og:image` com URL absoluta.

A hospedagem ainda não foi escolhida. Os exemplos abaixo cobrem Netlify, Vercel e GitHub Pages;
nenhum arquivo de configuração deles foi criado no repositório.

## Cabeçalhos de cache recomendados

| Arquivos | Nome muda quando o conteúdo muda? | `Cache-Control` |
|---|---|---|
| `index.html` | não | `no-cache` (revalida a cada visita; responde 304 se nada mudou) |
| `css/build/*` (`secoes.<hash>.css`, `motion-secoes.<hash>.css`; `fontes-file.<hash>.css` só é pedido em `file://`, nunca pela hospedagem) | **sim** (hash de 8 caracteres) | `public, max-age=31536000, immutable` |
| `assets/fonts/*.<hash>.woff2` | **sim** | `public, max-age=31536000, immutable` |
| `assets/*.webp` (plates, logo) | não | `public, max-age=604800, stale-while-revalidate=86400` (7 dias) |
| `js/**/*.js` (inclui `js/vendor/`) | não | `no-cache` |
| `css/*.css` (arquivos-fonte, só no modo dev) | não | `no-cache` |

Por quê:
- **HTML sempre revalidado.** É ele que aponta para os arquivos com hash; publicar um deploy novo
  vale na próxima visita.
- **Arquivos com hash: cache de 1 ano, `immutable`.** Um conteúdo novo gera um nome novo, e o nome
  velho nunca muda de conteúdo.
- **Imagens sem hash: 7 dias.** Trocar uma imagem mantendo o nome pode levar até 7 dias para chegar a
  quem já visitou. Para trocar na hora, mude o nome (ex.: `plate-room-v2-1600.webp`) no
  `build_assets.py` e no HTML/CSS.
- **JS sem hash: `no-cache`.** Com revalidação, o JS nunca fica de uma versão diferente da do HTML
  (o custo é um 304 por arquivo). Os arquivos de motion só são pedidos depois do `load` (D29), então
  isso não pesa na abertura.

## Compressão e protocolo

- **Compressão:** ative Brotli (ou gzip) para `html`, `css`, `js`, `svg` e `txt`. Não comprima
  `woff2` e `webp`, que já são comprimidos. Netlify, Vercel e GitHub Pages comprimem sozinhos.
  - O HTML tem o CSS crítico inline: 61 KB crus, 16 KB em gzip.
  - O servidor local dos testes não comprime; o Lighthouse local mede os arquivos crus.
- **Protocolo:** HTTP/2 ou HTTP/3. O site faz ~40 pedidos pequenos depois do `load`.
- **Tipos MIME:** `font/woff2` para `.woff2` e `image/webp` para `.webp` (os três fazem isso
  sozinhos).

## Exemplos por hospedagem

As regras por pasta abaixo não se sobrepõem. Netlify e Vercel já mandam
`public, max-age=0, must-revalidate` (= revalidar sempre) em tudo que não tiver regra, então o HTML
e o JS ficam certos sem regra nenhuma.

### Netlify: arquivo `site/_headers`
Com "Publish directory" = `site`.
```
/css/build/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```
- **Imagens:** ficam no padrão (revalidar sempre, 304 quando nada mudou).
- **Por que sem regra de 7 dias:** uma regra `/assets/*` também casaria com `/assets/fonts/*`, e o
  Netlify junta os dois valores de `Cache-Control` quando duas regras casam.

### Vercel: arquivo `vercel.json` na pasta publicada
Com "Root Directory" = `site` e sem framework ("Other"), o arquivo vai em `site/vercel.json`.
```json
{
  "headers": [
    { "source": "/css/build/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/assets/fonts/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/assets/(.*)\\.webp", "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800, stale-while-revalidate=86400" }] }
  ]
}
```
A regra de `.webp` não casa com as fontes (`.woff2`).

### GitHub Pages
Não permite cabeçalhos próprios: tudo sai com `max-age=600` (10 minutos), com ou sem hash.
- **Funciona:** HTML, CSS e JS atualizam em até 10 minutos.
- **Não aproveita:** o cache longo das fontes e do CSS com hash.
- **Alternativa:** pôr uma CDN na frente (ex.: Cloudflare) com regras de cache iguais às da tabela.

## O que só se resolve na hospedagem real
- **Compressão do HTML/CSS/JS:** o Lighthouse local aponta "document latency" e "minify JS" com os
  arquivos crus.
- **Cache:** "use efficient cache lifetimes" continua apontado localmente, porque o servidor de
  teste não manda `Cache-Control`.
- **Latência real:** a rede do Lighthouse é simulada; o TTFB e a distância até o servidor dependem da
  hospedagem e da CDN.
