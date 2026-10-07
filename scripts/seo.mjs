// SEO local e metadados (DESIGN.md D51–D56): gera o bloco <!-- build:seo --> do <head>, o
// robots.txt e o sitemap.xml. Chamado por scripts/build.mjs (npm run build).
//
// Só dados reais do CLIENTE.md. O que falta fica como placeholder comentado, sem inventar:
// - domínio: `dominio` em seo.config.json (vazio até haver hospedagem). Vazio, tudo o que exige
//   URL absoluta (canonical, og:url, og:image, url/image do JSON-LD, sitemap, linha Sitemap do
//   robots.txt) sai comentado, com o placeholder no TLD reservado .invalid (RFC 2606), que nunca
//   será um domínio real;
// - horário de abertura e dias: o CLIENTE.md só diz "Fecha 23:00";
// - Instagram e link do cardápio: não existem no CLIENTE.md (hasMenu/sameAs omitidos).
import { readFileSync } from "node:fs";

export const PLACEHOLDER = "https://dominio-a-definir.invalid/";
export const OG_IMAGEM = { caminho: "assets/og-asami.jpg", largura: 1200, altura: 630, tipo: "image/jpeg",
  alt: "Nigiri de salmão flutuando sobre o letreiro cromado ASAMI, entre fumaça, em fundo escuro" };

// ── CLIENTE.md ──────────────────────────────────────────────────────────────────────────────
export const RESTAURANTE = {
  nome: "Asami Sushi São Bernardo",
  // "Variedade de opções da culinária japonesa em rodízio e à la carte, bebidas e sobremesas, em clima familiar."
  descricao: "Variedade de opções da culinária japonesa em rodízio e à la carte, bebidas e sobremesas, em clima familiar.",
  cozinha: "Japonesa",                            // "Restaurante japonês"
  faixaPreco: "R$ 80–160",                        // "R$ 80–160 por pessoa" (já exibido no site)
  telefone: "+55 11 2669-7175",                   // "(11) 2669-7175"
  endereco: {                                     // "Av. das Nações Unidas, 50 - Centro, São Bernardo do Campo - SP, 09726-110"
    rua: "Av. das Nações Unidas, 50 - Centro", cidade: "São Bernardo do Campo", uf: "SP", cep: "09726-110", pais: "BR",
  },
  fecha: "23:00",                                 // "Aberto · Fecha 23:00" — sem dias nem abertura
  // o mesmo link "Ver no Google Maps" do rodapé
  mapa: "https://www.google.com/maps/search/?api=1&query=Asami%20Sushi%2C%20Av.%20das%20Na%C3%A7%C3%B5es%20Unidas%2C%2050%20-%20Centro%2C%20S%C3%A3o%20Bernardo%20do%20Campo%20-%20SP%2C%2009726-110",
};
export const TITULO = "Asami Sushi São Bernardo — Rodízio japonês no Centro";
export const DESCRICAO = "Restaurante japonês no Centro de São Bernardo do Campo: rodízio e à la carte, bebidas e sobremesas em clima familiar. R$ 80–160 por pessoa.";

export function lerDominio() {
  const cfg = JSON.parse(readFileSync("seo.config.json", "utf8"));
  const d = (cfg.dominio || "").trim();
  if (!d) return "";
  if (!/^https:\/\/[^/\s]+\.[^/\s]+\/$/.test(d)) throw new Error(`seo.config.json: "dominio" deve ser como "https://exemplo.com.br/" (com / no fim), veio "${d}"`);
  return d;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function jsonLd(dominio) {
  const r = RESTAURANTE;
  const dados = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.nome,
    description: r.descricao,
    servesCuisine: r.cozinha,
    priceRange: r.faixaPreco,
    telephone: r.telefone,
    address: {
      "@type": "PostalAddress",
      streetAddress: r.endereco.rua,
      addressLocality: r.endereco.cidade,
      addressRegion: r.endereco.uf,
      postalCode: r.endereco.cep,
      addressCountry: r.endereco.pais,
    },
    // só o fechamento: o CLIENTE.md não informa dias nem abertura (placeholder no HTML)
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", closes: r.fecha }],
    hasMap: r.mapa,
  };
  if (dominio) Object.assign(dados, { url: dominio, image: dominio + OG_IMAGEM.caminho });
  return dados;
}

export function blocoHead(dominio) {
  const u = dominio || PLACEHOLDER;
  const absolutas = [
    `<link rel="canonical" href="${u}">`,
    `<meta property="og:url" content="${u}">`,
    `<meta property="og:image" content="${u}${OG_IMAGEM.caminho}">`,
    `<meta property="og:image:type" content="${OG_IMAGEM.tipo}">`,
    `<meta property="og:image:width" content="${OG_IMAGEM.largura}">`,
    `<meta property="og:image:height" content="${OG_IMAGEM.altura}">`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGEM.alt)}">`,
  ];
  const linhas = [
    `<!-- Prévia ao compartilhar (Open Graph / Twitter) e dados estruturados: gerado por scripts/seo.mjs -->`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:site_name" content="${esc(RESTAURANTE.nome)}">`,
    `<meta property="og:title" content="${esc(TITULO)}">`,
    `<meta property="og:description" content="${esc(DESCRICAO)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    ...(dominio ? absolutas : [
      `<!-- PLACEHOLDER (domínio a definir): estas tags exigem URL absoluta. Preencha "dominio" em`,
      `     seo.config.json e rode npm run build — elas entram prontas, sem este comentário.`,
      ...absolutas.map((l) => `     ${l.replace(/--/g, "- -")}`),
      `-->`,
    ]),
    `<!-- PLACEHOLDER (horário): o CLIENTE.md só informa "Fecha 23:00" (sem dias e sem abertura).`,
    `     Com o horário confirmado, completar openingHoursSpecification em scripts/seo.mjs:`,
    `     dayOfWeek, opens e closes por dia. -->`,
    `<!-- PLACEHOLDER (Instagram e cardápio): sem @ nem link real no CLIENTE.md. Quando existirem,`,
    `     "sameAs": ["https://www.instagram.com/<@>/"] e "hasMenu": "<link>" em scripts/seo.mjs. -->`,
    ...(dominio ? [] : [`<!-- PLACEHOLDER (domínio): com o domínio, o JSON-LD abaixo ganha "url" e "image". -->`]),
    `<script type="application/ld+json">${JSON.stringify(jsonLd(dominio)).replace(/</g, "\\u003c")}</script>`,
  ];
  return linhas.map((l) => `  ${l}`).join("\n");
}

export function robots(dominio) {
  return [
    "# Site de uma página: tudo liberado.",
    "User-agent: *",
    "Allow: /",
    "",
    dominio
      ? `Sitemap: ${dominio}sitemap.xml`
      : `# PLACEHOLDER (domínio a definir): preencha "dominio" em seo.config.json e rode npm run build\n# Sitemap: ${PLACEHOLDER}sitemap.xml`,
    "",
  ].join("\n");
}

export function sitemap(dominio) {
  return `<?xml version="1.0" encoding="UTF-8"?>
${dominio ? "" : `<!-- PLACEHOLDER (domínio a definir): ${PLACEHOLDER} não é um endereço real (TLD reservado .invalid).
     Preencha "dominio" em seo.config.json e rode npm run build. -->
`}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${dominio || PLACEHOLDER}</loc>
  </url>
</urlset>
`;
}
