// SEO local e metadados: gera o bloco <!-- build:seo --> do <head>, o
// robots.txt e o sitemap.xml. Chamado por scripts/build.mjs (npm run build).
import { readFileSync } from "node:fs";

export const PLACEHOLDER = "https://dominio-a-definir.invalid/";
export const OG_IMAGEM = {
  caminho: "assets/og-holy-temaki.jpg",
  largura: 1200,
  altura: 630,
  tipo: "image/jpeg",
  alt: "Holy Temaki Santo André — O melhor Temaki do ABC",
};

// ── CLIENTE.md ──────────────────────────────────────────────────────────────────────────────
export const RESTAURANTE = {
  nome: "Holy Temaki Santo André",
  descricao: "Restaurante japonês em Vila Assunção, Santo André – SP: temaki, hot roll, yakisoba e combinados feitos com amor. R$ 40–60 por pessoa.",
  cozinha: "Japonesa",
  faixaPreco: "R$ 40–60",
  telefone: "+55 11 96842-5330",
  endereco: {
    rua: "R. Guilherme Marconi, 199 - Vila Assunção",
    cidade: "Santo André",
    uf: "SP",
    cep: "09020-270",
    pais: "BR",
  },
  abre: "17:00",
  fecha: "22:45",
  dias: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  mapa: "https://www.google.com/maps/search/?api=1&query=Holy%20Temaki%2C%20R.%20Guilherme%20Marconi%2C%20199%20-%20Vila%20Assun%C3%A7%C3%A3o%2C%20Santo%20Andr%C3%A9%20-%20SP%2C%2009020-270",
  redes: [
    "https://www.instagram.com/holytemaki",
    "https://www.facebook.com/holytemaki",
  ],
};
export const TITULO = "Holy Temaki Santo André — O melhor Temaki do ABC";
export const DESCRICAO = "Restaurante japonês em Vila Assunção, Santo André – SP: temaki, hot roll, yakisoba e combinados feitos com amor. R$ 40–60 por pessoa.";

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
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: r.dias,
      opens: r.abre,
      closes: r.fecha,
    }],
    hasMap: r.mapa,
    sameAs: r.redes,
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
