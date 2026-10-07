// Etapa de otimização (DESIGN.md D45–D50): nada visual, nenhum timing, nenhum comportamento muda.
// Compara o site atual com o commit de antes da otimização (REF_COMMIT, servido com LF):
//   1. cada seção do estático aprovado (reduced) e o menu aberto, em 1440, 1024, 768 e 390;
//   2. o estado final do motion de cada seção (entradas terminadas, loops na fase 0, ⏸);
//   3. estilos computados de todos os elementos (e ::before/::after) — iguais, propriedade a propriedade;
//   4. CSS crítico: a 1ª tela só com o CSS inline (seções bloqueadas) é igual à tela completa, e a
//      pintura não espera o CSS das seções; aberta numa âncora, espera (blocking="render");
//   5. fontes locais (sem Google Fonts), pedidos proibidos, console, rolagem horizontal, CLS;
//   6. imagens: candidato escolhido × tamanho exibido, lazy só abaixo da dobra, LCP com prioridade;
//   7. GSAP/Lenis só depois do load (D29).
// Uso: node scripts/test-otimizacao.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { servir, extrairCommit, comparar, poseEstatica } from "./lib-motion.mjs";

const REF_COMMIT = process.env.REF_COMMIT || "5563fa9"; // "motion final pronto"
const OUT = "screenshots/otimizacao";
const LIMIAR_CANAL = 24, MAX_PIXELS = 0.005;
const LARGURAS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
const SECOES = ["#ato-1", "#ato-2", "#ato-3", "#ato-4", "#rodape"];

const ref = await extrairCommit(REF_COMMIT);
const srvRef = await servir(ref.raiz);
const atual = await servir("site");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let falhas = 0;
const SO = process.env.SO?.split(",").map(Number); // ex.: SO=3 roda só a seção 3
const roda = (n) => !SO || SO.includes(n);
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const erros = [], requests = new Set();

async function abrir(url, { width = 1440, height = 900, query = "", contexto = {}, rotas = null, espera = "load", init = null } = {}) {
  // com rotas (CSS das seções bloqueado de propósito), a falha desse pedido não conta como erro
  const ctx = await browser.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  if (rotas) await rotas(ctx);
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  const doAtual = url === atual.url;
  page.on("request", (r) => doAtual && requests.add(r.url()));
  page.on("console", (m) => { if (doAtual && (m.type() === "error" || m.type() === "warning") && !(rotas && /ERR_FAILED/.test(m.text()))) erros.push(`[${width}${query}] ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => doAtual && erros.push(`[${width}${query}] ${e.message}`));
  await page.goto(url + query, { waitUntil: espera });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const esperarMotion = (page) =>
  page.waitForFunction(() => ["true", "failed"].includes(document.documentElement.dataset.motionReady), null, { timeout: 10000 })
    .then(() => page.waitForTimeout(300));
const tirarMouse = (page, w) => page.mouse.move(w - 2, 2);

async function compararPar(nome, pngRef, png, page) {
  const d = await comparar(page, pngRef, png, LIMIAR_CANAL);
  const bate = d.fracao <= MAX_PIXELS && /^(\d+)×(\d+) \/ \1×\2$/.test(d.tamanhos);
  ok(bate, `${nome}: ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (limite ${MAX_PIXELS * 100} %) · ${d.tamanhos}`);
  return d;
}

// ═══ 1. ESTÁTICO APROVADO (reduced) ═══
if (roda(1)) {
console.log("— Estático aprovado (reduced) × antes da otimização —");
async function capturasEstaticas(url, w, h) {
  const { ctx, page } = await abrir(url, { width: w, height: h, contexto: { reducedMotion: "reduce" } });
  await tirarMouse(page, w);
  const pngs = {};
  for (const s of SECOES) {
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ behavior: "instant" }), s);
    await page.waitForTimeout(250);
    pngs[s] = await page.locator(s).screenshot();
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  await page.click("[aria-controls=menu]"); await tirarMouse(page, w); await page.waitForTimeout(500);
  pngs.menu = await page.screenshot();
  return { ctx, page, pngs };
}
for (const [w, h] of LARGURAS) {
  const r = await capturasEstaticas(srvRef.url, w, h); await r.ctx.close();
  const a = await capturasEstaticas(atual.url, w, h);
  for (const k of Object.keys(r.pngs)) await compararPar(`${w} estático ${k}`, r.pngs[k], a.pngs[k], a.page);
  await a.ctx.close();
}

}
// ═══ 2. ESTADO FINAL DO MOTION ═══
if (roda(2)) {
console.log("\n— Estado final do motion × antes da otimização —");
async function capturasMotion(url, w, h) {
  const { ctx, page } = await abrir(url, { width: w, height: h, query: w >= 768 ? "?quality=high" : "" });
  await esperarMotion(page);
  await tirarMouse(page, w);
  const pngs = {};
  for (const s of SECOES) {
    await page.evaluate((sel) => void motion.scrollTo(sel, { imediato: true }), s);
    await page.waitForTimeout(2600); // a entrada mais longa (ACT II) termina em ~2 s
    await page.evaluate(() => document.querySelector("[data-pause]").getAttribute("aria-pressed") !== "true" && document.querySelector("[data-pause]").click());
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ behavior: "instant" }), s);
    await page.waitForTimeout(250);
    await poseEstatica(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
    await tirarMouse(page, w); await page.waitForTimeout(150);
    pngs[s] = await page.locator(s).screenshot();
    await page.evaluate(() => document.querySelector("[data-pause]").click()); // retoma para a próxima
  }
  return { ctx, page, pngs };
}
for (const [w, h] of LARGURAS) {
  const r = await capturasMotion(srvRef.url, w, h); await r.ctx.close();
  const a = await capturasMotion(atual.url, w, h);
  for (const s of SECOES) await compararPar(`${w} motion final ${s}`, r.pngs[s], a.pngs[s], a.page);
  await a.ctx.close();
}

}
// ═══ 3. ESTILOS COMPUTADOS ═══
if (roda(3)) {
console.log("\n— Estilos computados (todos os elementos, ::before e ::after) —");
const estilos = (page) => page.evaluate(() => {
  const out = [];
  const els = [document.documentElement, document.body, ...document.body.querySelectorAll("*")];
  els.forEach((el, i) => {
    for (const ps of [null, "::before", "::after"]) {
      const cs = getComputedStyle(el, ps);
      if (ps && (cs.content === "none" || cs.content === "normal")) continue;
      const v = {};
      for (let k = 0; k < cs.length; k++) v[cs[k]] = cs.getPropertyValue(cs[k]);
      out.push([`${i}:${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].join(".") : ""}${ps || ""}`, v]);
    }
  });
  return out;
});
const assentar = async (page, modo) => {
  if (modo !== "reduce") {
    await esperarMotion(page);
    await page.click("[data-pause]");
    await poseEstatica(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
  }
  await page.mouse.move(2, 400); // longe dos controles (sem hover)
  await page.waitForTimeout(600); // fades de 200 ms (reduced) terminados
};
// o que muda de propósito: o CSS das seções mora em css/build/ (url relativa com um ../ a mais,
// mesmo arquivo) e cada versão roda num servidor com porta própria
const normal = (v) => String(v).replace(/url\("\.\.\/\.\.\//g, 'url("../').replace(/http:\/\/127\.0\.0\.1:\d+\//g, "/");
for (const [w, h, modo] of [[1440, 900, "reduce"], [390, 844, "reduce"], [1440, 900, "no-preference"]]) {
  const r = await abrir(srvRef.url, { width: w, height: h, contexto: { reducedMotion: modo } });
  await assentar(r.page, modo);
  const er = await estilos(r.page); await r.ctx.close();
  const a = await abrir(atual.url, { width: w, height: h, contexto: { reducedMotion: modo } });
  await assentar(a.page, modo);
  const ea = await estilos(a.page); await a.ctx.close();
  // diferença só de fração de pixel (mesmo texto, números a menos de 0,5 px) é contada à parte:
  // vem de medidas derivadas (ex.: altura de imagem pela proporção do arquivo escolhido)
  const subpixel = (a, b) => {
    const na = a.match(/-?[\d.]+/g), nb = String(b).match(/-?[\d.]+/g);
    return na && nb && na.length === nb.length && a.replace(/-?[\d.]+/g, "#") === String(b).replace(/-?[\d.]+/g, "#")
      && na.every((x, j) => Math.abs(x - nb[j]) < 0.5);
  };
  const difs = [], finas = [];
  if (er.length !== ea.length) difs.push(`nº de elementos ${er.length} → ${ea.length}`);
  er.forEach(([k, v], i) => {
    const [ka, va] = ea[i] || [];
    if (k !== ka) { difs.push(`elemento ${k} → ${ka}`); return; }
    for (const p of Object.keys(v)) if (normal(v[p]) !== normal(va[p])) (subpixel(v[p], va[p]) ? finas : difs).push(`${k} ${p}: ${v[p].slice(0, 60)} → ${String(va[p]).slice(0, 60)}`);
  });
  ok(difs.length === 0, `${w} ${modo === "reduce" ? "reduced" : "full (motion montado)"}: ${er.length} elementos/pseudo, ${difs.length} propriedades diferentes (+ ${finas.length} só em fração de pixel)`);
  difs.slice(0, 12).forEach((d) => console.log(`    ${d}`));
  finas.slice(0, 4).forEach((d) => console.log(`    (fração de pixel) ${d}`));
}

}
// ═══ 4. CSS CRÍTICO ═══
if (roda(4)) {
console.log("\n— CSS crítico —");
const bloquearSecoes = (ctx) => ctx.route(/\/css\/build\/secoes\.[0-9a-f]{8}\.css$/, (r) => r.abort());
for (const [w, h] of LARGURAS) {
  const r = await abrir(atual.url, { width: w, height: h, contexto: { reducedMotion: "reduce" } });
  await tirarMouse(r.page, w); await r.page.waitForTimeout(300);
  const cheio = await r.page.screenshot(); await r.ctx.close();
  const a = await abrir(atual.url, { width: w, height: h, contexto: { reducedMotion: "reduce" }, rotas: bloquearSecoes });
  await tirarMouse(a.page, w); await a.page.waitForTimeout(300);
  const so = await a.page.screenshot();
  await compararPar(`${w} 1ª tela só com o CSS crítico × completa`, cheio, so, a.page);
  await a.ctx.close();
}
// o CSS das seções não bloqueia a pintura; numa âncora, bloqueia
const atrasar = (ms) => (ctx) => ctx.route(/\/css\/build\/secoes\.[0-9a-f]{8}\.css$/, async (r) => { await new Promise((f) => setTimeout(f, ms)); await r.continue(); });
{
  const { ctx, page } = await abrir(atual.url, { rotas: atrasar(1500), espera: "commit" });
  const fcp = await page.evaluate(() => new Promise((f) => new PerformanceObserver((l, o) => { const e = l.getEntries().find((x) => x.name === "first-contentful-paint"); if (e) { o.disconnect(); f(e.startTime); } }).observe({ type: "paint", buffered: true })));
  ok(fcp < 1200, `topo: 1ª pintura em ${Math.round(fcp)} ms, sem esperar o CSS das seções (atrasado 1,5 s)`);
  await ctx.close();
}
for (const alvo of ["#ato-4", "#rodape"]) {
  const { ctx, page } = await abrir(atual.url, { query: alvo, rotas: atrasar(1500), espera: "commit" });
  const fcp = await page.evaluate(() => new Promise((f) => new PerformanceObserver((l, o) => { const e = l.getEntries().find((x) => x.name === "first-contentful-paint"); if (e) { o.disconnect(); f(e.startTime); } }).observe({ type: "paint", buffered: true })));
  await page.waitForLoadState("load");
  const bloq = await page.evaluate(() => document.querySelector('link[href*="secoes."]')?.getAttribute("blocking"));
  ok(fcp >= 1400 && bloq === "render", `aberta em ${alvo}: pintura espera o CSS das seções (1ª pintura ${Math.round(fcp)} ms, blocking=${bloq})`);
  await ctx.close();
}

}
// ═══ 5. FONTES, PEDIDOS, CONSOLE, ROLAGEM, CLS ═══
if (roda(5)) {
console.log("\n— Fontes, pedidos, console, rolagem horizontal, CLS —");
for (const [w, h] of LARGURAS) {
  const { ctx, page } = await abrir(atual.url, { width: w, height: h });
  const f = await page.evaluate(() => ({
    faces: [...document.fonts].filter((x) => x.status === "loaded").map((x) => `${x.family} ${x.weight}`),
    arch: document.fonts.check('500 16px "Archivo"'), sg: document.fonts.check('400 16px "Space Grotesk"'),
    largura: document.documentElement.scrollWidth - innerWidth,
  }));
  ok(f.arch && f.sg && f.faces.some((x) => x.startsWith("Archivo")) && f.faces.some((x) => x.startsWith("Space Grotesk")), `${w}: Archivo e Space Grotesk locais carregadas (${f.faces.join(", ")})`);
  ok(f.largura <= 0, `${w}: sem rolagem horizontal (${f.largura} px)`);
  await ctx.close();
}
async function cls(url, w, h) {
  const init = () => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true }); };
  const { ctx, page } = await abrir(url, { width: w, height: h, init });
  await page.waitForTimeout(3500); // motion carrega em 2,5 s
  const v = await page.evaluate(() => window.__cls);
  await ctx.close();
  return v;
}
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const [cr, ca] = [await cls(srvRef.url, w, h), await cls(atual.url, w, h)];
  ok(ca <= Math.max(cr, 0.001) + 1e-4, `${w}: CLS no carregamento ${ca.toFixed(4)} (antes ${cr.toFixed(4)})`);
}

}
// ═══ 6. IMAGENS ═══
if (roda(6)) {
console.log("\n— Imagens: candidato escolhido × tamanho exibido —");
// o candidato escolhido é o menor que cobre a largura exibida (offsetWidth × DPR; o sizes descreve
// a caixa de layout, sem transform). Camadas que dividem o arquivo usam o sizes da maior: o ideal
// do grupo é o da maior. E quanto de imagem cada aparelho baixa, antes × depois (página inteira).
const bytesImagens = {};
async function imagensNoAparelho(url, w, h, dpr) {
  const { ctx, page } = await abrir(url, { width: w, height: h, contexto: { deviceScaleFactor: dpr, reducedMotion: "reduce" } });
  for (let y = 0; y < 14; y++) { await page.mouse.wheel(0, h); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  const r = await page.evaluate((d) => {
    const grupos = {};
    for (const i of document.querySelectorAll("img[srcset]")) {
      const vis = getComputedStyle(i).visibility !== "hidden" && i.offsetWidth > 0;
      const g = (grupos[i.srcset] ??= { cls: [], exibido: 0, esc: new Set(), vis: false, cands: i.srcset.split(",").map((c) => +c.trim().split(" ")[1].replace("w", "")).sort((a, b) => a - b) });
      g.cls.push([...i.classList].filter((c) => c !== "plate").join(".") || i.closest(".board")?.className.split(" ")[1]);
      if (vis) { g.vis = true; g.exibido = Math.max(g.exibido, i.offsetWidth * d); }
      const esc = +(i.currentSrc.match(/-(\d+)\.webp/)?.[1] ?? 0);
      if (esc) g.esc.add(esc);
    }
    const bytes = [...new Map(performance.getEntriesByType("resource").filter((e) => /\.webp$/.test(e.name)).map((e) => [e.name, e.encodedBodySize])).values()].reduce((t, n) => t + n, 0);
    return { bytes, grupos: Object.values(grupos).map((g) => ({ ...g, esc: [...g.esc], ideal: g.cands.find((c) => c >= g.exibido) ?? g.cands.at(-1) })) };
  }, dpr);
  await ctx.close();
  return r;
}
for (const [w, h, dpr] of [[1440, 900, 1], [1440, 900, 2], [1024, 768, 2], [768, 1024, 2], [412, 823, 1.75], [390, 844, 3]]) {
  const antes = await imagensNoAparelho(srvRef.url, w, h, dpr);
  const agora = await imagensNoAparelho(atual.url, w, h, dpr);
  bytesImagens[`${w}@${dpr}`] = [antes.bytes, agora.bytes];
  const erradas = agora.grupos.filter((g) => g.vis && (g.esc.length !== 1 || g.esc[0] !== g.ideal));
  ok(erradas.length === 0, `${w}@${dpr}: cada imagem no menor candidato que cobre o exibido — imagens ${(antes.bytes / 1024).toFixed(0)} → ${(agora.bytes / 1024).toFixed(0)} KB${erradas.length ? " — " + erradas.map((g) => `${g.cls.join("+")} ${g.esc.join("/")}w p/ ${Math.round(g.exibido)}px (ideal ${g.ideal}w)`).join("; ") : ""}`);
}
for (const [w, h] of LARGURAS) {
  const { ctx, page } = await abrir(atual.url, { width: w, height: h, contexto: { reducedMotion: "reduce" } });
  const r = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => {
    const b = i.getBoundingClientRect();
    return { cls: [...i.classList].filter((c) => c !== "plate").join(".") || i.alt, lazy: i.loading === "lazy", acima: b.top < innerHeight && b.bottom > 0 && getComputedStyle(i).visibility !== "hidden", prio: i.getAttribute("fetchpriority") };
  }));
  const lazyAcima = r.filter((i) => i.lazy && i.acima);
  const lcp = r.find((i) => i.cls.includes("hero__smoke-layer--c"));
  ok(lazyAcima.length === 0, `${w}: nenhuma imagem lazy acima da dobra${lazyAcima.length ? " — " + lazyAcima.map((i) => i.cls).join(", ") : ""}`);
  ok(lcp && !lcp.lazy && lcp.prio === "high", `${w}: fumaça do hero (candidata a LCP) com fetchpriority=high e sem lazy`);
  await ctx.close();
}

}
// ═══ 7. MOTION SÓ DEPOIS DO LOAD (D29) ═══
if (roda(7)) {
console.log("\n— GSAP/Lenis depois do load (D29) —");
{
  const { ctx, page } = await abrir(atual.url);
  await esperarMotion(page);
  const t = await page.evaluate(() => {
    const load = performance.getEntriesByType("navigation")[0].loadEventEnd;
    const vend = performance.getEntriesByType("resource").filter((r) => /vendor\/|motion\/|motion-secoes/.test(r.name));
    return { load, primeiro: Math.min(...vend.map((r) => r.startTime)), n: vend.length };
  });
  ok(t.primeiro > t.load, `${t.n} arquivos de motion pedidos só depois do load (${Math.round(t.primeiro)} ms > load ${Math.round(t.load)} ms)`);
  await ctx.close();
}

}
const proibidos = [...requests].filter((u) => /fonts\.(googleapis|gstatic)\.com|\/design\/|\/IMAGENS\//i.test(u));
ok(proibidos.length === 0, `nenhum pedido a Google Fonts, /design ou /IMAGENS (${requests.size} pedidos únicos)${proibidos.length ? " — " + proibidos.join(", ") : ""}`);
ok(erros.length === 0, `console sem erros nem avisos${erros.length ? " — " + erros.slice(0, 5).join(" | ") : ""}`);

await browser.close(); srvRef.fechar(); atual.fechar(); await ref.apagar();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
