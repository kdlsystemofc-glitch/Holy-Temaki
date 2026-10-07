// Auditoria responsiva: screenshots + verificações automáticas em todas as telas-alvo.
// Uso: npm run audit            (todas as telas + modos especiais)
//      npm run audit -- 390x844 (só uma tela)
// Saída: screenshots/audit/<tela>/*.png e screenshots/audit/report.json
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve("site");
const OUT = resolve("screenshots/audit");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = normalize(join(ROOT, p));
  try { res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_ = `http://127.0.0.1:${server.address().port}/`;

const TELAS = [
  ["2560x1440", "desktop"], ["1920x1080", "desktop"], ["1440x900", "desktop"], ["1366x768", "desktop"], ["1280x720", "desktop"],
  ["1024x768", "tablet"], ["768x1024", "tablet"],
  ["430x932", "celular"], ["390x844", "celular"], ["360x740", "celular"], ["320x568", "celular"],
  ["844x390", "celular deitado"],
];
const filtro = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a));
const alvo = filtro.length ? TELAS.filter(([t]) => filtro.includes(t)) : TELAS;
const MODOS_EXTRA = filtro.length ? [] : ["texto200", "reduzido-claro", "sem-fontes"];
const TELAS_EXTRA = ["1440x900", "390x844", "320x568"];

const browser = await chromium.launch();
const requests = new Set();
const relatorio = [];

// ── verificações dentro da página ──────────────────────────────────────────
function checar({ toque }) {
  const vw = document.documentElement.clientWidth;
  const problemas = [];
  const vis = (el) => {
    for (let e = el; e && e !== document; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0 || e.inert) return false;
    }
    return true;
  };
  const desc = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 70);
  };
  const doc = (r) => ({ l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY });
  const cruza = (a, b, tol = 1) => a.l < b.r - tol && b.l < a.r - tol && a.t < b.b - tol && b.t < a.b - tol;

  // 1 · rolagem horizontal
  if (document.documentElement.scrollWidth > vw) problemas.push(`rolagem horizontal: ${document.documentElement.scrollWidth} > ${vw}`);

  // 2 · caixas de texto (cada nó de texto visível)
  const ignorar = ".hero__reflection, .reserve__reflection, .sanctum__place-fx, .visually-hidden, .skip-link, .svg-defs, script, style";
  const textos = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (el.closest(ignorar) || !vis(el)) continue;
    const eb = el.getBoundingClientRect();
    if (eb.width <= 1 || eb.height <= 1) continue; // padrão "visualmente oculto" (texto só para leitor de tela)
    const rg = document.createRange(); rg.selectNodeContents(n);
    const rs = [...rg.getClientRects()].filter((q) => q.width > .5 && q.height > .5);
    if (!rs.length) continue;
    const box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    for (const q of rs) { const d = doc(q); box.l = Math.min(box.l, d.l); box.t = Math.min(box.t, d.t); box.r = Math.max(box.r, d.r); box.b = Math.max(box.b, d.b); }
    textos.push({ el, box, txt: n.textContent.trim().slice(0, 28), fixo: !!el.closest(".act-nav") });
  }

  for (const t of textos) {
    // fora da tela na horizontal
    if (t.box.l < -1 || t.box.r > vw + 1) problemas.push(`texto fora da tela: "${t.txt}" (${Math.round(t.box.l)}–${Math.round(t.box.r)} de ${vw})`);
    // cortado por ancestral com overflow
    for (let a = t.el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) {
        const ab = doc(a.getBoundingClientRect());
        if (t.box.l < ab.l - 1 || t.box.r > ab.r + 1 || t.box.t < ab.t - 1 || t.box.b > ab.b + 1) {
          problemas.push(`texto cortado: "${t.txt}" por ${desc(a)}`); break;
        }
      }
    }
  }
  // sobreposição texto × texto (conteúdo que rola; o nav fixo é checado à parte)
  const rolam = textos.filter((t) => !t.fixo);
  for (let i = 0; i < rolam.length; i++)
    for (let j = i + 1; j < rolam.length; j++) {
      const a = rolam[i], b = rolam[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (cruza(a.box, b.box, 2)) problemas.push(`texto sobreposto: "${a.txt}" × "${b.txt}"`);
    }

  // campos: valor cabe no campo (select não expõe scrollWidth do valor: mede com canvas)
  const cv = document.createElement("canvas").getContext("2d");
  for (const c of document.querySelectorAll("input, select")) {
    if (!vis(c)) continue;
    if (c.scrollWidth > c.clientWidth + 1) problemas.push(`campo cortando o valor: ${desc(c)}`);
    const cs = getComputedStyle(c);
    const val = c.tagName === "SELECT" ? (c.selectedOptions[0]?.text ?? "") : c.value;
    cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const livre = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (val && cv.measureText(val).width > livre + 1) problemas.push(`campo sem espaço para o valor "${val}": ${desc(c)} (${Math.round(livre)}px livres)`);
  }
  // nada transborda os contêineres de UI
  for (const sel of [".reserve__slot .reserve__card", ".site-header", ".site-footer__grid", ".menu__list", ".hero__bar"]) {
    const box = document.querySelector(sel);
    if (!box || !vis(box)) continue;
    const bb = box.getBoundingClientRect();
    for (const d of box.querySelectorAll("*")) {
      if (!vis(d) || d.closest(".visually-hidden")) continue;
      const r = d.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.left < bb.left - 1 || r.right > bb.right + 1) { problemas.push(`${desc(d)} transborda ${sel}`); break; }
    }
  }

  // 3 · alvo de toque
  const interativos = [...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((e) => !e.closest(".skip-link") && vis(e));
  const pequenos = [];
  if (toque) for (const e of interativos) {
    const r = e.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) pequenos.push(`${desc(e)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  if (pequenos.length) problemas.push(...pequenos.map((p) => `alvo de toque < 44px: ${p}`));

  // 4 · hero
  const hero = document.getElementById("ato-1");
  const hb = doc(hero.getBoundingClientRect());
  const wmNode = document.querySelector(".hero__wordmark .hero__wordmark-text").firstChild; // o do h1, não a cópia do reflexo
  const rg = document.createRange(); rg.selectNodeContents(wmNode);
  const wm = doc(rg.getBoundingClientRect());
  const pecas = {
    wordmark: wm,
    menu: document.querySelector(".menu-toggle"),
    logo: document.querySelector(".site-header .logo"),
    reservar: document.querySelector(".pill-cta"),
    rotulo: document.querySelector(".hero__label"),
    hud: document.querySelector(".hero__hud"),
    player: document.querySelector(".player"),
    trilho: document.querySelector(".rail"),
    progresso: document.querySelector(".progress"),
  };
  const caixas = {};
  for (const [k, v] of Object.entries(pecas)) {
    if (!v) continue;
    if (v instanceof Element) { if (!vis(v)) continue; caixas[k] = doc(v.getBoundingClientRect()); }
    else caixas[k] = v;
  }
  const nomes = Object.keys(caixas);
  for (let i = 0; i < nomes.length; i++)
    for (let j = i + 1; j < nomes.length; j++)
      if (cruza(caixas[nomes[i]], caixas[nomes[j]], 1)) problemas.push(`hero: ${nomes[i]} sobrepõe ${nomes[j]}`);
  for (const k of nomes) {
    const c = caixas[k];
    if (c.t < hb.t - 1 || c.b > hb.b + 1 || c.l < hb.l - 1 || c.r > hb.r + 1) problemas.push(`hero: ${k} sai do hero`);
  }
  const razao = hb.b - hb.t ? (hb.b - hb.t) / innerHeight : 0;
  if (razao < .72 || razao > 1.3) problemas.push(`hero com ${Math.round(hb.b - hb.t)}px = ${razao.toFixed(2)}× a altura da tela`);

  return { problemas, heroPx: Math.round(hb.b - hb.t), razao: +razao.toFixed(2), interativos: interativos.length };
}

// nav fixo em repouso em cada ato: não pode cobrir texto nem controles
function checarNavFixo() {
  const fixo = getComputedStyle(document.querySelector(".player")).position === "fixed";
  if (!fixo) return [];
  const probs = [];
  const nav = [...document.querySelectorAll(".act-nav .rail, .act-nav .progress, .act-nav .player")]
    .filter((e) => getComputedStyle(e).visibility !== "hidden").map((e) => [e.className, e.getBoundingClientRect()]);
  const cruza = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const alvos = [];
  const walker = document.createTreeWalker(document.getElementById("conteudo"), NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || n.parentElement.closest(".hero__reflection, .reserve__reflection, .sanctum__place-fx, .visually-hidden")) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const q of rg.getClientRects()) if (q.width > 1 && q.bottom > 0 && q.top < innerHeight) alvos.push([`"${n.textContent.trim().slice(0, 20)}"`, q]);
  }
  for (const e of document.querySelectorAll("#conteudo a[href], #conteudo button, #conteudo input, #conteudo select")) {
    const q = e.getBoundingClientRect(); if (q.width && q.bottom > 0 && q.top < innerHeight) alvos.push([e.tagName.toLowerCase() + (e.id ? "#" + e.id : ""), q]);
  }
  for (const [n, r] of nav) for (const [t, q] of alvos) if (cruza(r, q)) probs.push(`${n} cobre ${t}`);
  return [...new Set(probs)];
}

async function carregar(page) {
  await page.goto(URL_, { waitUntil: "networkidle" });
  for (const id of ["#ato-2", "#ato-3", "#ato-4", "#rodape"]) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function rodar(tela, tipo, modo = "normal") {
  const [w, h] = tela.split("x").map(Number);
  const toque = tipo !== "desktop";
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: toque, isMobile: tipo.startsWith("celular"),
    reducedMotion: modo === "reduzido-claro" ? "reduce" : "no-preference",
    colorScheme: modo === "reduzido-claro" ? "light" : "dark",
  });
  // sem as fontes (auto-hospedadas desde D45): o layout tem de aguentar os fallbacks de base.css
  if (modo === "sem-fontes") await ctx.route(/\/assets\/fonts\/.*\.woff2$/, (r) => r.abort());
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => { if (m.type() === "error" && !(modo === "sem-fontes" && /ERR_FAILED/.test(m.text()))) erros.push(m.text()); });
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("request", (r) => requests.add(r.url()));
  // Texto a 200 % = "tamanho da fonte do navegador" 32px: rem e media queries em rem acompanham.
  // Toda captura de tela do Playwright reaplica a emulação do aparelho e desfaz isso, então
  // a fonte é reaplicada (e conferida) depois de cada captura e antes de cada medição.
  const cdp = modo === "texto200" ? await ctx.newCDPSession(page) : null;
  const fonte = async () => {
    if (!cdp) return;
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
    await page.waitForTimeout(120);
    const fs = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    if (fs !== "32px") throw new Error(`texto 200 % não aplicado (html = ${fs})`);
  };
  if (cdp) await cdp.send("Page.enable");
  await carregar(page);
  await fonte();

  const dir = join(OUT, modo === "normal" ? tela : `${tela}-${modo}`);
  await mkdir(dir, { recursive: true });
  if (cdp) {
    // texto 200 %: fullPage/clip refazem o layout com a fonte padrão durante a captura,
    // então aqui a captura é da tela visível, uma por seção (sem fullPage a emulação se mantém)
    for (const id of ["ato-1", "ato-2", "ato-3", "ato-4", "rodape"]) {
      await page.evaluate((s) => document.getElementById(s).scrollIntoView({ behavior: "instant" }), id);
      await page.waitForTimeout(150);
      await fonte();
      await page.screenshot({ path: join(dir, `${id}.png`) });
    }
  } else {
    await page.screenshot({ path: join(dir, "pagina.png"), fullPage: true });
    for (const id of ["ato-1", "ato-2", "ato-3", "ato-4", "rodape"]) {
      // rola até a seção e espera a pintura (filtros SVG e backdrop-filter pintam em blocos)
      await page.evaluate((s) => document.getElementById(s).scrollIntoView({ behavior: "instant" }), id);
      await page.waitForTimeout(250);
      await page.locator(`#${id}`).screenshot({ path: join(dir, `${id}.png`) });
    }
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
  await fonte();
  const r = await page.evaluate(checar, { toque });

  // nav fixo em repouso em cada ato
  const navFixo = [];
  for (const id of ["#ato-1", "#ato-2", "#ato-3", "#ato-4"]) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(120);
    navFixo.push(...(await page.evaluate(checarNavFixo)).map((p) => `${id}: ${p}`));
  }
  await ctx.close();
  const problemas = [...r.problemas, ...navFixo.map((p) => `nav fixo ${p}`), ...erros.map((e) => `console: ${e}`)];
  relatorio.push({ tela, tipo, modo, heroPx: r.heroPx, razao: r.razao, problemas });
  const rot = `${tela.padEnd(9)} ${modo === "normal" ? tipo : modo}`.padEnd(30);
  console.log(`${problemas.length ? "✘" : "✔"} ${rot} hero ${r.heroPx}px (${r.razao}×)  ${problemas.length} problema(s)`);
  for (const p of problemas.slice(0, 12)) console.log(`     · ${p}`);
  if (problemas.length > 12) console.log(`     … +${problemas.length - 12}`);
}

// CLS com fontes atrasadas (troca fallback → web font)
async function cls(tela) {
  const [w, h] = tela.split("x").map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/\/assets\/fonts\/.*\.woff2$/, async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); r.continue(); });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const v = await page.evaluate(() => window.__cls);
  await ctx.close();
  return v;
}

console.log(`\nAuditoria em ${alvo.length} tela(s)\n`);
for (const [tela, tipo] of alvo) await rodar(tela, tipo);
for (const modo of MODOS_EXTRA) {
  console.log(`\n— modo: ${modo} —`);
  for (const tela of TELAS_EXTRA) await rodar(tela, TELAS.find(([t]) => t === tela)[1], modo);
}
if (!filtro.length) {
  console.log("\n— CLS com fontes atrasadas 1,5 s (troca fallback → web font) —");
  for (const tela of ["1440x900", "390x844"]) {
    const v = await cls(tela);
    console.log(`  ${tela}: CLS ${v.toFixed(4)} ${v < .1 ? "(bom, < 0,1)" : "(ruim, ≥ 0,1)"}`);
    relatorio.push({ tela, modo: "cls-fontes", cls: v });
  }
}

const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
console.log(`\n${proibidos.length ? "✘" : "✔"} requests a /design ou /IMAGENS: ${proibidos.length} (de ${requests.size} únicas)`);
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "report.json"), JSON.stringify({ relatorio, proibidos }, null, 1));
const total = relatorio.reduce((n, r) => n + (r.problemas?.length ?? 0), 0);
console.log(total ? `\n${total} problema(s) no total` : "\nNenhum problema.");
await browser.close();
server.close();
process.exit(total || proibidos.length ? 1 : 0);
