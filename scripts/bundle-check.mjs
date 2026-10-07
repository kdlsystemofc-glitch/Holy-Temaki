// Peso de tudo o que o site entrega, por arquivo: cru, gzip -9 e brotli (DESIGN.md D50).
// Uso: npm run bundle   (lê site/ como publicado; CRLF da cópia de trabalho vira LF, como no git)
// Agrupa pelo momento em que o arquivo é pedido: antes da 1ª pintura, até o load, depois do load.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const SITE = "site";
const TEXTO = /\.(html|css|js|svg|txt)$/;
const html = readFileSync(join(SITE, "index.html"), "utf8");

function tamanhos(arq) {
  let b = readFileSync(join(SITE, arq));
  if (TEXTO.test(arq)) b = Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"));
  const comprime = TEXTO.test(arq);
  return {
    cru: b.length,
    gz: comprime ? gzipSync(b, { level: 9 }).length : b.length,
    br: comprime ? brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length : b.length,
  };
}
const kb = (n) => (n / 1024).toFixed(1).padStart(6);

// o que o index.html de produção pede, e quando
// fontes: pré-carregadas por script (lista JSON no <head>; em file:// entra o CSS com as embutidas)
const listaFontes = html.match(/"file:" && (\[[^\]]*\])/)?.[1];
const antesPintura = ["index.html", ...(listaFontes ? JSON.parse(listaFontes) : [])];
const ateLoad = [
  ...[...html.matchAll(/l\.href = "([^"]+)"/g)].map((m) => m[1]),                // CSS das seções (sem bloquear)
  ...[...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]),               // JS de interface
];
const loader = html.match(/\[("js\/vendor[^\]]+)\]/)?.[1] ?? "";
const motionCss = html.match(/\/\*build:motion-css\*\/\[([^\]]*)\]/)?.[1] ?? "";
const depoisLoad = [...`${loader},${motionCss}`.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

let totais = {};
function grupo(nome, arqs) {
  console.log(`\n${nome}`);
  console.log(`  ${"arquivo".padEnd(46)}   cru KB  gzip KB  br KB`);
  const t = { cru: 0, gz: 0, br: 0 };
  for (const a of arqs) {
    const s = tamanhos(a);
    for (const k in t) t[k] += s[k];
    console.log(`  ${a.padEnd(46)} ${kb(s.cru)}  ${kb(s.gz)}  ${kb(s.br)}`);
  }
  console.log(`  ${"total".padEnd(46)} ${kb(t.cru)}  ${kb(t.gz)}  ${kb(t.br)}`);
  totais[nome] = t;
}
grupo("Antes da 1ª pintura (HTML com CSS crítico inline + fontes pré-carregadas)", antesPintura);
grupo("Até o load (CSS das seções, JS de interface)", ateLoad);
grupo("Depois do load (motion: GSAP, Lenis, núcleo, seções; D29)", depoisLoad);

// imagens: todas as variantes em assets/ (o navegador baixa só a do srcset que serve)
const imgs = readdirSync(join(SITE, "assets")).filter((f) => f.endsWith(".webp")).map((f) => `assets/${f}`);
grupo("Imagens (todas as variantes; cada tela baixa só as suas)", imgs);

const js = [...ateLoad, ...depoisLoad].filter((a) => a.endsWith(".js"));
const tjs = js.reduce((t, a) => { const s = tamanhos(a); t.gz += s.gz; t.br += s.br; return t; }, { gz: 0, br: 0 });
console.log(`\nJS total (${js.length} arquivos): ${(tjs.gz / 1024).toFixed(1)} KB gzip · ${(tjs.br / 1024).toFixed(1)} KB brotli`);
// arquivos em site/ que nada referencia (fora os arquivos-fonte de CSS do modo dev e as licenças)
const todos = [];
(function andar(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? andar(p) : todos.push(relative(SITE, p).replace(/\\/g, "/")); } })(SITE);
const css = readdirSync(join(SITE, "css/build")).map((f) => readFileSync(join(SITE, "css/build", f), "utf8")).join("");
const orfaos = todos.filter((f) => !/^css\/[^/]+\.css$|\.txt$|index\.html$/.test(f) && !html.includes(f) && !css.includes(f.replace(/^/, "../../")));
console.log(orfaos.length ? `\nNão referenciados: ${orfaos.join(", ")}` : "\nNenhum arquivo sem referência em site/.");
