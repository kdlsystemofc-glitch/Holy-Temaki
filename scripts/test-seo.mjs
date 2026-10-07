// SEO local e metadados (DESIGN.md D51–D56). Tudo validado localmente, sem serviço externo:
//   1. <head>: lang, title, description, theme-color = --ink-900, ícones, manifest;
//   2. Open Graph / Twitter (open-graph-scraper lê as tags do HTML) e a imagem 1200×630;
//   3. JSON-LD: JSON válido, JSON-LD válido (jsonld.expand), tipado contra o vocabulário do
//      schema.org (schema-dts + tsc, com controles negativos) e fiel ao CLIENTE.md;
//   4. robots.txt e sitemap.xml;
//   5. semântica: um <h1>, títulos em ordem, alt em toda imagem, plates decorativos escondidos,
//      "pular para o conteúdo" funcionando;
//   6. nenhuma URL de domínio inventada: o que depende do domínio é placeholder .invalid comentado.
// Uso: node scripts/test-seo.mjs
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import ogs from "open-graph-scraper";
import jsonld from "jsonld";
import { servir } from "./lib-motion.mjs";
import { lerDominio, jsonLd as esperadoJsonLd, TITULO, DESCRICAO, OG_IMAGEM, PLACEHOLDER, RESTAURANTE } from "./seo.mjs";

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const dominio = lerDominio();
const html = readFileSync("site/index.html", "utf8");
const cliente = readFileSync("CLIENTE.md", "utf8");
console.log(`domínio: ${dominio || "(vazio — placeholders comentados)"}`);

const srv = await servir("site");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const erros = [];
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
page.on("pageerror", (e) => erros.push(e.message));
await page.goto(srv.url, { waitUntil: "load" });

// ═══ 1. HEAD ═══
console.log("\n— <head> —");
const head = await page.evaluate(() => ({
  lang: document.documentElement.lang,
  title: document.title,
  desc: document.querySelector('meta[name="description"]')?.content,
  theme: document.querySelector('meta[name="theme-color"]')?.content,
  ink: getComputedStyle(document.documentElement).getPropertyValue("--ink-900").trim(),
  icones: [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')].map((l) => ({ rel: l.rel, href: l.href, sizes: l.sizes.value })),
  canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
}));
ok(head.lang === "pt-BR", `<html lang="${head.lang}">`);
ok(head.title === TITULO && head.title.length <= 60, `<title> (${head.title.length} caracteres): ${head.title}`);
ok(head.desc === DESCRICAO && head.desc.length >= 70 && head.desc.length <= 160, `meta description (${head.desc?.length} caracteres)`);
ok(head.theme.toLowerCase() === head.ink.toLowerCase(), `theme-color ${head.theme} = --ink-900 (${head.ink})`);
ok(!/\bAsami\b/i.test(head.title.replace(/Asami Sushi São Bernardo/, "")) && head.title !== "Asami", "título não repete o wordmark sozinho (nome completo + bairro + especialidade)");
for (const i of head.icones) {
  const r = await page.request.get(i.href);
  const tipo = r.headers()["content-type"];
  let extra = "";
  if (/\.png$/.test(i.href)) {
    const dim = await page.evaluate(async (u) => { const im = new Image(); im.src = u; await im.decode(); return `${im.naturalWidth}x${im.naturalHeight}`; }, i.href);
    extra = ` ${dim}`;
    if (i.rel === "apple-touch-icon") ok(dim === "180x180", `apple-touch-icon 180×180 (${dim})`);
  }
  ok(r.ok(), `${i.rel} ${i.href.replace(srv.url, "")} ${i.sizes || ""} → ${r.status()} ${tipo}${extra}`);
}
{
  const r = await page.request.get(srv.url + "site.webmanifest");
  let m = null; try { m = await r.json(); } catch { /* inválido */ }
  ok(m && m.name === RESTAURANTE.nome && m.short_name && m.lang === "pt-BR" && m.theme_color.toLowerCase() === head.ink.toLowerCase() && m.background_color.toLowerCase() === head.ink.toLowerCase(),
    `site.webmanifest: JSON válido, name/short_name/lang, cores = --ink-900`);
  for (const ic of m?.icons ?? []) {
    const u = srv.url + ic.src;
    const dim = await page.evaluate(async (x) => { const im = new Image(); im.src = x; await im.decode(); return `${im.naturalWidth}x${im.naturalHeight}`; }, u);
    ok(dim === ic.sizes, `manifest: ${ic.src} declara ${ic.sizes}, tem ${dim}`);
  }
}
{ // favicon.ico: 3 imagens (16, 32, 48)
  const b = readFileSync("site/assets/icons/favicon.ico");
  const n = b.readUInt16LE(4), lados = Array.from({ length: n }, (_, k) => b[6 + 16 * k] || 256);
  ok(b.readUInt16LE(2) === 1 && lados.join(",") === "16,32,48", `favicon.ico com ${lados.join("/")} px`);
}

// ═══ 2. OPEN GRAPH / TWITTER ═══
console.log("\n— Open Graph / Twitter —");
const { result: og } = await ogs({ html });
ok(og.ogTitle === TITULO, `og:title = <title>`);
ok(og.ogDescription === DESCRICAO, `og:description = meta description`);
ok(["website", "restaurant.restaurant"].includes(og.ogType), `og:type = ${og.ogType}`);
ok(og.ogLocale === "pt_BR", `og:locale = ${og.ogLocale}`);
ok(og.ogSiteName === RESTAURANTE.nome, `og:site_name = ${og.ogSiteName}`);
ok(og.twitterCard === "summary_large_image", `twitter:card = ${og.twitterCard}`);
const comentarios = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]).join("\n");
if (dominio) {
  ok(og.ogUrl === dominio && head.canonical === dominio, `og:url e canonical = ${dominio}`);
  ok(og.ogImage?.[0]?.url === dominio + OG_IMAGEM.caminho, `og:image absoluta = ${og.ogImage?.[0]?.url}`);
} else {
  ok(!og.ogUrl && !og.ogImage?.length && head.canonical === null, "sem domínio: nenhuma canonical, og:url ou og:image ativa");
  ok(["canonical", "og:url", "og:image"].every((t) => comentarios.includes(t)) && comentarios.includes(PLACEHOLDER),
    `sem domínio: canonical, og:url e og:image estão no comentário PLACEHOLDER (${PLACEHOLDER})`);
}
{
  const f = `site/${OG_IMAGEM.caminho}`;
  const kb = statSync(f).size / 1024;
  const b = readFileSync(f);
  const jpeg = b[0] === 0xff && b[1] === 0xd8;
  const dim = await page.evaluate(async (u) => { const im = new Image(); im.src = u; await im.decode(); return [im.naturalWidth, im.naturalHeight]; }, srv.url + OG_IMAGEM.caminho);
  ok(jpeg && dim[0] === 1200 && dim[1] === 630 && kb < 300, `og:image ${OG_IMAGEM.caminho}: JPEG ${dim.join("×")}, ${kb.toFixed(0)} KB (< 300 KB, limite do WhatsApp)`);
}

// ═══ 3. JSON-LD ═══
console.log("\n— JSON-LD (schema.org/Restaurant) —");
const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok(blocos.length === 1, `${blocos.length} bloco JSON-LD`);
let dados = null;
try { dados = JSON.parse(blocos[0]); ok(true, "JSON válido"); } catch (e) { ok(false, `JSON inválido: ${e.message}`); }
// JSON-LD: expande com o contexto do schema.org servido localmente (@vocab); nada pode sumir
{
  const carregador = async (url) => {
    if (/^https?:\/\/schema\.org\/?$/.test(url)) return { contextUrl: null, documentUrl: url, document: { "@context": { "@vocab": "https://schema.org/" } } };
    throw new Error(`contexto externo não permitido: ${url}`);
  };
  const exp = await jsonld.expand(dados, { documentLoader: carregador, safe: true }).catch((e) => e);
  const chaves = (o) => Object.keys(o).filter((k) => !k.startsWith("@"));
  ok(Array.isArray(exp) && exp.length === 1 && Object.keys(exp[0]).length - 1 === chaves(dados).length,
    `JSON-LD expande sem perder termos (${Array.isArray(exp) ? Object.keys(exp[0]).length - 1 : "erro: " + exp.message} de ${chaves(dados).length})`);
}
// vocabulário do schema.org: tipagem do schema-dts (nomes e tipos de propriedade), com controles
{
  const tmp = mkdtempSync(join(tmpdir(), "asami-jsonld-"));
  const tsc = (obj) => {
    writeFileSync(join(tmp, "x.ts"), `import type { WithContext, Restaurant } from "schema-dts";\nexport const x: WithContext<Restaurant> = ${JSON.stringify(obj, null, 2)};\n`);
    try {
      execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "--strict", "--skipLibCheck", "--moduleResolution", "bundler", "--module", "esnext", "--typeRoots", "node_modules", join(tmp, "x.ts")], { stdio: "pipe", cwd: process.cwd() });
      return "";
    } catch (e) { return (e.stdout?.toString() || e.message).split("\n").filter(Boolean).slice(0, 3).join(" | "); }
  };
  const r = tsc(dados);
  ok(r === "", `tipado contra o vocabulário do schema.org (schema-dts)${r ? ": " + r : ""}`);
  ok(tsc({ ...dados, avaliacaoInventada: 5 }) !== "", "controle: propriedade inexistente é rejeitada");
  ok(tsc({ ...dados, address: 50 }) !== "", "controle: tipo errado é rejeitado");
  rmSync(tmp, { recursive: true, force: true });
}
// fiel ao CLIENTE.md, sem inventar
{
  const d = dados, a = d.address, digitos = (s) => s.replace(/\D/g, "");
  ok(d["@type"] === "Restaurant" && d.name === "Asami Sushi São Bernardo" && cliente.includes(d.name), `name "${d.name}" (CLIENTE.md)`);
  ok(cliente.includes(`${a.streetAddress}, ${a.addressLocality} - ${a.addressRegion}, ${a.postalCode}`), `address = "${a.streetAddress}, ${a.addressLocality} - ${a.addressRegion}, ${a.postalCode}" (CLIENTE.md)`);
  ok(digitos(d.telephone) === "55" + digitos("(11) 2669-7175") && cliente.includes("(11) 2669-7175"), `telephone ${d.telephone} = (11) 2669-7175 com +55`);
  ok(cliente.includes(d.priceRange) && cliente.includes("Restaurante japonês") && d.servesCuisine === "Japonesa", `priceRange "${d.priceRange}", servesCuisine "${d.servesCuisine}"`);
  ok(cliente.includes(d.description), "description é a frase do CLIENTE.md");
  const h = d.openingHoursSpecification;
  ok(h.length === 1 && h[0].closes === "23:00" && !h[0].opens && !h[0].dayOfWeek && cliente.includes("Fecha 23:00"),
    "openingHoursSpecification só com closes 23:00 (sem abertura nem dias inventados)");
  ok(!("hasMenu" in d) && !("menu" in d) && !("sameAs" in d), "sem hasMenu/menu/sameAs (não há link real no CLIENTE.md)");
  const mapaRodape = await page.evaluate(() => document.querySelector('.site-footer a[href*="google.com/maps"]')?.href);
  ok(d.hasMap === mapaRodape, "hasMap = o link \"Ver no Google Maps\" do rodapé");
  ok(dominio ? d.url === dominio && d.image === dominio + OG_IMAGEM.caminho : !("url" in d) && !("image" in d),
    dominio ? "url e image com o domínio" : "sem domínio: url e image fora do JSON-LD (placeholder comentado)");
  ok(JSON.stringify(d) === JSON.stringify(esperadoJsonLd(dominio)), "JSON-LD do HTML = o gerado por scripts/seo.mjs (build em dia)");
}

// ═══ 4. ROBOTS E SITEMAP ═══
console.log("\n— robots.txt e sitemap.xml —");
{
  const r = await page.request.get(srv.url + "robots.txt"), t = await r.text();
  const ativas = t.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  ok(r.ok() && ativas[0] === "User-agent: *" && ativas.includes("Allow: /") && !ativas.some((l) => /^Disallow:\s*\S/.test(l)), "robots.txt libera tudo");
  ok(dominio ? ativas.includes(`Sitemap: ${dominio}sitemap.xml`) : !ativas.some((l) => l.startsWith("Sitemap:")) && t.includes(`# Sitemap: ${PLACEHOLDER}`),
    dominio ? "robots.txt aponta o sitemap" : "robots.txt: linha Sitemap comentada (placeholder)");
  const x = await (await page.request.get(srv.url + "sitemap.xml")).text();
  const s = await page.evaluate((xml) => {
    const d = new DOMParser().parseFromString(xml, "application/xml");
    return { erro: !!d.querySelector("parsererror"), ns: d.documentElement.namespaceURI, locs: [...d.getElementsByTagName("loc")].map((l) => l.textContent) };
  }, x);
  ok(!s.erro && s.ns === "http://www.sitemaps.org/schemas/sitemap/0.9" && s.locs.length === 1 && s.locs[0] === (dominio || PLACEHOLDER),
    `sitemap.xml bem formado, 1 URL (${s.locs[0]})${dominio ? "" : " — placeholder marcado no comentário"}`);
}

// ═══ 5. SEMÂNTICA ═══
console.log("\n— Semântica e acessibilidade —");
{
  const t = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({ n: +h.tagName[1], t: h.textContent.replace(/\s+/g, " ").trim() })));
  const h1 = t.filter((x) => x.n === 1);
  ok(h1.length === 1 && /^Asami\b/.test(h1[0].t), `exatamente um <h1>: "${h1[0]?.t}"`);
  const pulos = t.filter((x, k) => k > 0 && x.n > t[k - 1].n + 1);
  ok(t[0].n === 1 && pulos.length === 0, `títulos em ordem, sem pular nível: ${t.map((x) => `h${x.n} ${x.t}`).join(" · ")}`);
  const atos = t.filter((x) => x.n === 2).map((x) => x.t);
  ok(["The Arrival", "Spatial Rodízio", "The Room", "The Ritual of Connection"].every((a, k) => atos.findIndex((x) => x.includes(a)) >= 0)
    && atos.findIndex((x) => x.includes("The Arrival")) < atos.findIndex((x) => x.includes("The Ritual")), "ACT I–IV em <h2>, na ordem da página");
  const imgs = await page.evaluate(() => [...document.images].map((i) => ({ src: i.getAttribute("src"), alt: i.getAttribute("alt"), escondida: !!i.closest('[aria-hidden="true"]') || i.getAttribute("aria-hidden") === "true", plate: i.classList.contains("plate") })));
  ok(imgs.every((i) => i.alt !== null), `${imgs.length} imagens, todas com atributo alt`);
  const informativas = imgs.filter((i) => i.alt);
  ok(imgs.filter((i) => i.plate).every((i) => i.alt === "" && i.escondida), `plates decorativos: alt="" e aria-hidden (${imgs.filter((i) => i.plate).length}); informativas com alt: ${informativas.length}`);
}
for (const [modo, contexto] of [["com motion", {}], ["reduced", { reducedMotion: "reduce" }]]) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contexto });
  const p = await c.newPage();
  await p.goto(srv.url, { waitUntil: "load" });
  await p.waitForTimeout(300);
  await p.keyboard.press("Tab");
  const s = await p.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { cls: a.className, visivel: r.top >= 0 && r.bottom <= innerHeight && getComputedStyle(a).transform === "none" }; });
  await p.keyboard.press("Enter");
  await p.waitForTimeout(900);
  await p.keyboard.press("Tab");
  const d = await p.evaluate(() => ({ dentro: !!document.activeElement.closest("#conteudo"), foco: document.activeElement.className || document.activeElement.tagName, hash: location.hash }));
  ok(s.cls === "skip-link" && s.visivel && d.dentro && d.hash === "#conteudo",
    `${modo}: 1º Tab = "pular para o conteúdo" visível; Enter e Tab seguinte caem dentro de <main> (${d.foco})`);
  await c.close();
}

// ═══ 6. NENHUM DOMÍNIO INVENTADO ═══
console.log("\n— URLs absolutas no site —");
{
  // de terceiros e do vocabulário (não são "o nosso domínio"): licenças e bibliotecas ficam de fora
  const PERMITIDOS = ["schema.org", "www.sitemaps.org", "www.w3.org", "wa.me", "www.google.com", "www.instagram.com"];
  const arquivos = [];
  (function andar(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? andar(p) : arquivos.push(p); } })("site");
  const texto = arquivos.filter((f) => /\.(html|css|js|json|webmanifest|xml|txt)$/.test(f) && !/[\\/]vendor[\\/]|OFL-.*\.txt$|fontes-file\./.test(f));
  const achados = [];
  for (const f of texto) {
    const c = readFileSync(f, "utf8");
    const semComentario = c.replace(/<!--[\s\S]*?-->/g, "").replace(/^#.*$/gm, "");
    for (const m of c.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      const host = m[1].toLowerCase(), f2 = relative(".", f);
      if (PERMITIDOS.includes(host)) continue;
      if (dominio && m[0].startsWith(dominio.replace(/\/$/, ""))) continue;
      if (host === new URL(PLACEHOLDER).host) {
        // placeholder: só em comentário — exceto o <loc> do sitemap, marcado pelo comentário do arquivo
        const vivo = semComentario.includes(PLACEHOLDER) && !(f2.endsWith("sitemap.xml") && c.includes("PLACEHOLDER"));
        if (vivo) achados.push(`${f2}: placeholder fora de comentário`);
        continue;
      }
      achados.push(`${f2}: ${m[0]}`);
    }
  }
  ok(achados.length === 0, `${texto.length} arquivos de texto: nenhuma URL de domínio inventada; o domínio só aparece como ${PLACEHOLDER} em comentário${achados.length ? " — " + [...new Set(achados)].join("; ") : ""}`);
}
ok(erros.length === 0, `console sem erros${erros.length ? ": " + erros.join(" | ") : ""}`);

await browser.close(); srv.fechar();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
