// Build de produção do CSS (DESIGN.md D46–D47). Os arquivos-fonte legíveis ficam em site/css/*.css;
// este script gera o que o index.html carrega, entre os marcadores <!-- build:css --> e
// /*build:motion-css*/ — nunca editar o gerado à mão.
//
// Uso:
//   npm run build            produção: CSS crítico inline + seções sem bloquear + motion num arquivo só
//   npm run build -- --dev   desenvolvimento: um <link> por arquivo-fonte, como antes (sem minificar)
//   npm run build -- --check sai com erro se o index.html/arquivos gerados não baterem com as fontes
//
// Cascata: a ordem dos arquivos é a de sempre (fonts, tokens, reset, base, header, hero, rodizio,
// sanctum, reserve, footer, nav, motion; depois do load, os 4 de motion das seções). Em produção:
//   <style>  antes   (fonts … hero)          crítico, inline
//   <link>   secoes  (rodizio … footer)      inserido por script NO MESMO PONTO → a ordem da
//                                            cascata (ordem no documento) é a mesma de antes
//   <style>  depois  (nav, motion)           crítico, inline (menu, trilho, player e véu são fixos)
// O <link> das seções não bloqueia a pintura (criado por script). Aberta numa âncora ou voltando a
// uma posição rolada, ele recebe blocking="render": a seção na tela nunca pinta sem estilo.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { lerDominio, blocoHead, robots, sitemap } from "./seo.mjs";

const SITE = resolve("site");
const CSS = (n) => readFileSync(`${SITE}/css/${n}.css`, "utf8");
const GRUPOS = {
  antes: ["fonts", "tokens", "reset", "base", "header", "hero"],
  secoes: ["rodizio", "sanctum", "reserve", "footer"],
  depois: ["nav", "motion"],
  motion: ["hero-loops", "rodizio-motion", "sanctum-motion", "reserve-motion"],
};
const modo = process.argv.includes("--dev") ? "dev" : "prod";
const checar = process.argv.includes("--check");

// ── Minificador conservador ────────────────────────────────────────────────────────────────
// Só tira comentários e espaços que não mudam nada; não reescreve valores nem junta regras
// (minificadores "espertos" apagam fallbacks como overflow-x: hidden antes de clip).
export function minificar(css) {
  let out = "", i = 0;
  const custom = [];
  while (i < css.length) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") { const f = css.indexOf("*/", i + 2); i = f < 0 ? css.length : f + 2; out += " "; continue; }
    if (c === '"' || c === "'") { // string: copiada como está
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      out += css.slice(i, j + 1); i = j + 1; continue;
    }
    if (/url\($/i.test(out.slice(-4)) && !/["'\s]/.test(c)) { // url( sem aspas: opaco até o )
      const f = css.indexOf(")", i); out += css.slice(i, f); i = f; continue;
    }
    // propriedade customizada: o valor fica como está (o JS lê alguns como texto, ex. --ease-out);
    // só o espaço depois do ":" sai — o navegador já o descarta
    if (c === "-" && css[i + 1] === "-" && /[{;]\s*$/.test(out)) {
      const m = /^(--[\w-]+)\s*:\s*/.exec(css.slice(i));
      if (m) {
        let j = i + m[0].length, prof = 0, aspas = null;
        for (; j < css.length; j++) {
          const x = css[j];
          if (aspas) { if (x === "\\") j++; else if (x === aspas) aspas = null; continue; }
          if (x === '"' || x === "'") aspas = x;
          else if (x === "(") prof++;
          else if (x === ")") prof--;
          else if ((x === ";" || x === "}") && prof === 0) break;
        }
        out = out.replace(/\s+$/, "") + `${m[1]}:\u0002${custom.push(css.slice(i + m[0].length, j).replace(/\s+$/, "")) - 1}\u0002`;
        i = j; continue;
      }
    }
    if (/\s/.test(c)) { if (!out.endsWith(" ")) out += " "; i++; continue; }
    out += c; i++;
  }
  // strings e url() protegidas: os cortes abaixo só tocam em espaços vizinhos de { } ; ,
  return protegerStrings(out, (s) => s
    .replace(/ ?([{};,]) ?/g, "$1")
    .replace(/([{;])([\w-]+): /g, "$1$2:")   // "prop: valor" → "prop:valor" (só logo após { ou ;)
    .replace(/;}/g, "}")
    .trim()).replace(/\u0002(\d+)\u0002/g, (_, n) => custom[+n]);
}
function protegerStrings(s, fn) {
  const guardadas = [];
  const semStr = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^"')]*\)/g, (m) => `\u0000${guardadas.push(m) - 1}\u0000`);
  return fn(semStr).replace(/\u0000(\d+)\u0000/g, (_, n) => guardadas[+n]);
}

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);
const junta = (nomes) => nomes.map((n) => `/* ${n}.css */\n${CSS(n)}`).join("\n");
// os url("../x") das fontes (em css/) são relativos a css/: no <style> inline (index.html na raiz)
// viram url("x"); nos arquivos de css/build/, url("../../x")
const paraRaiz = (css) => css.replace(/url\((["']?)\.\.\//g, "url($1");
const paraBuild = (css) => css.replace(/url\((["']?)\.\.\//g, "url($1../../");

const fontes = [...CSS("fonts").matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g)].map((m) => m[1]);
// file:// (duplo clique no index.html): o Chrome bloqueia fonte de arquivo local (CORS, origem
// "null"). Só nesse caso entra um CSS com as fontes embutidas (data:), declarado depois do
// @font-face normal — o último vence, e o normal nem chega a ser pedido. No http(s) nada muda.
const fontesFile = () => minificar(CSS("fonts").replace(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g,
  (_, f) => `url(data:font/woff2;base64,${readFileSync(`${SITE}/${f}`).toString("base64")})`));
const preloads = fontes.map((f) =>
  `  <link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin>`).join("\n");

let blocoCss, listaMotion;
const gerados = {}; // arquivo → conteúdo
// SEO (D51–D56): bloco do <head>, robots.txt e sitemap.xml, a partir de seo.config.json
const dominio = lerDominio();
gerados["robots.txt"] = robots(dominio);
gerados["sitemap.xml"] = sitemap(dominio);
if (modo === "dev") {
  blocoCss = [preloads, ...[...GRUPOS.antes, ...GRUPOS.secoes, ...GRUPOS.depois]
    .map((n) => `  <link rel="stylesheet" href="css/${n}.css">`)].join("\n");
  listaMotion = JSON.stringify(GRUPOS.motion.map((n) => `css/${n}.css`)).replace(/,/g, ", ");
} else {
  const antes = paraRaiz(minificar(junta(GRUPOS.antes)));
  const depois = paraRaiz(minificar(junta(GRUPOS.depois)));
  // gerados com hash no nome, numa pasta só deles (cache de 1 ano por pasta: DEPLOY.md)
  const secoes = paraBuild(minificar(junta(GRUPOS.secoes)));
  const motion = paraBuild(minificar(junta(GRUPOS.motion)));
  const ff = fontesFile();
  const arqSecoes = `css/build/secoes.${hash(secoes)}.css`, arqMotion = `css/build/motion-secoes.${hash(motion)}.css`;
  const arqFile = `css/build/fontes-file.${hash(ff)}.css`;
  gerados[arqSecoes] = secoes; gerados[arqMotion] = motion; gerados[arqFile] = ff;
  // preload das fontes por script: em file:// ele falharia (CORS) e sujaria o console
  blocoCss = `  <script>
    location.protocol !== "file:" && ${JSON.stringify(fontes)}.forEach(function (f) {
      var l = document.createElement("link");
      l.rel = "preload"; l.as = "font"; l.type = "font/woff2"; l.crossOrigin = ""; l.href = f;
      document.currentScript.before(l);
    });
  </script>
  <style>${antes}</style>
  <script>
    (function (d) {
      var l = d.createElement("link"), nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      l.rel = "stylesheet";
      l.href = "${arqSecoes}";
      if (location.hash || (nav && nav.type !== "navigate")) l.setAttribute("blocking", "render");
      d.currentScript.after(l);
      if (location.protocol === "file:") { // fontes embutidas, antes da 1ª pintura
        var f = d.createElement("link");
        f.rel = "stylesheet"; f.href = "${arqFile}"; f.setAttribute("blocking", "render");
        l.after(f);
      }
    })(document);
  </script>
  <noscript><link rel="stylesheet" href="${arqSecoes}"></noscript>
  <style>${depois}</style>`;
  listaMotion = JSON.stringify([arqMotion]);
}

const INICIO = "<!-- build:css — gerado por scripts/build.mjs a partir de css/*.css; não editar até /build:css -->";
const FIM = "<!-- /build:css -->";
const html = readFileSync(`${SITE}/index.html`, "utf8");
const a = html.indexOf(INICIO), b = html.indexOf(FIM);
if (a < 0 || b < 0) throw new Error("marcadores <!-- build:css --> não encontrados no index.html");
let novo = `${html.slice(0, a)}${INICIO}\n${blocoCss}\n  ${html.slice(b)}`;
novo = novo.replace(/\/\*build:motion-css\*\/.*?\/\*\/build:motion-css\*\//, `/*build:motion-css*/${listaMotion}/*/build:motion-css*/`);
const SEO_INICIO = "<!-- build:seo — gerado por scripts/seo.mjs (seo.config.json); não editar até /build:seo -->";
const SEO_FIM = "<!-- /build:seo -->";
const sa = novo.indexOf(SEO_INICIO), sb = novo.indexOf(SEO_FIM);
if (sa < 0 || sb < 0) throw new Error("marcadores <!-- build:seo --> não encontrados no index.html");
novo = `${novo.slice(0, sa)}${SEO_INICIO}
${blocoHead(dominio)}
  ${novo.slice(sb)}`;

mkdirSync(`${SITE}/css/build`, { recursive: true });
const velhos = readdirSync(`${SITE}/css/build`).filter((f) => /\.[0-9a-f]{8}\.css$/.test(f)).map((f) => `css/build/${f}`);
if (checar) {
  const erros = [];
  if (novo !== html) erros.push("index.html desatualizado");
  for (const [f, c] of Object.entries(gerados)) if (!existsSync(`${SITE}/${f}`) || readFileSync(`${SITE}/${f}`, "utf8") !== c) erros.push(`${f} ausente ou desatualizado`);
  for (const f of velhos) if (!(f in gerados)) erros.push(`${f} sobrando`);
  if (erros.length) { console.error(`✘ build ${modo} fora de dia: ${erros.join("; ")} — rode npm run build`); process.exit(1); }
  console.log(`✔ build (${modo}) em dia com css/*.css`);
} else {
  for (const f of velhos) if (!(f in gerados)) unlinkSync(`${SITE}/${f}`);
  for (const [f, c] of Object.entries(gerados)) writeFileSync(`${SITE}/${f}`, c);
  writeFileSync(`${SITE}/index.html`, novo);
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
  console.log(`build ${modo}: index.html ${kb(novo)} KB` +
    Object.entries(gerados).map(([f, c]) => ` · ${f} ${kb(c)} KB`).join(""));
}
