// Testa e mede o motion do hero (ACT I) — DESIGN.md §5 Hero, §5.0.
//   1. Frames da entrada (0, 300, 800, 1800, 2600 ms) → screenshots/motion/
//   2. Estado final × hero estático aprovado (commit 33b2baf, antes do motion do hero)
//   3. Vídeos curtos em 1440 e 390 → screenshots/motion/
//   4. Custo: quadros (rAF) e Long Animation Frames, 10 s parado e rolando, quality high e low
//   5. Modos: reduced sem loops; paused congela e retoma; ?quality=low reduz camadas
// Uso: npm run test:motion (roda depois de scripts/test-motion.mjs)
import { createServer } from "node:http";
import { readFile, mkdir, rm, rename, readdir } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const REF_COMMIT = "33b2baf"; // "motion base pronto": hero estático aprovado
const OUT = "screenshots/motion";
// Tolerância da comparação com o estático: canal com diferença > 24/255 conta como pixel
// diferente, e no máximo 0,5 % dos pixels do hero podem diferir. Cobre antialiasing do blur,
// o grão e o traço do trilho (inativo virou scaleY(.45) de 14 px = 6,3 px, antes 6,48 px).
const LIMIAR_CANAL = 24;
const MAX_PIXELS = 0.005;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp" };
const servir = async (raiz) => {
  const ROOT = resolve(raiz);
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = normalize(join(ROOT, p));
    try { res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }); res.end(await readFile(f)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  return { s, url: `http://127.0.0.1:${s.address().port}/` };
};

// site de referência: o site/ do commit aprovado, extraído numa pasta temporária
const REF_DIR = join(tmpdir(), `asami-ref-${REF_COMMIT}`);
await rm(REF_DIR, { recursive: true, force: true });
await mkdir(REF_DIR, { recursive: true });
for (const arq of execSync(`git ls-tree -r --name-only ${REF_COMMIT} site`, { encoding: "utf8" }).split("\n").filter(Boolean)) {
  const destino = join(REF_DIR, arq);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, execSync(`git show ${REF_COMMIT}:${arq}`, { maxBuffer: 64 << 20 }));
}

const atual = await servir("site");
const ref = await servir(join(REF_DIR, "site"));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const erros = [];
const requests = new Set();
const medidas = {};

async function abrir(url, { width = 1440, height = 810, query = "", contexto = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("request", (r) => requests.add(r.url()));
  page.on("console", (m) => { if (m.type() === "error") erros.push(`[${width}${query}] ${m.text()}`); });
  page.on("pageerror", (e) => erros.push(`[${width}${query}] ${e.message}`));
  await page.goto(url + query, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const esperarMotion = (page) =>
  page.waitForFunction(() => ["true", "failed"].includes(document.documentElement.dataset.motionReady), null, { timeout: 10000 }).then(() => page.waitForTimeout(300));

// todas as animações (CSS e GSAP) na "pose estática": entradas terminadas, loops na fase 0
const poseEstatica = (page) => page.evaluate(() => {
  for (const a of document.getAnimations()) {
    if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = a.effect.getTiming().delay; }
    else a.finish();
  }
  window.gsap?.globalTimeline.getChildren(true, true, false).forEach((t) => t.pause().progress(0));
});

// diferença de pixels, calculada num canvas do próprio navegador (sem dependências)
async function comparar(pagina, pngA, pngB) {
  return pagina.evaluate(async ([a, b, limiar]) => {
    const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = (img) => { const c = new OffscreenCanvas(w, h).getContext("2d"); c.drawImage(img, 0, 0); return c.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let n = 0, soma = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      soma += d; if (d > limiar) n++;
    }
    return { fracao: n / (w * h), media: soma / (w * h), tamanhos: `${ia.width}×${ia.height} / ${ib.width}×${ib.height}` };
  }, [`data:image/png;base64,${pngA.toString("base64")}`, `data:image/png;base64,${pngB.toString("base64")}`, LIMIAR_CANAL]);
}

// ═══ 1–2. ENTRADA E ESTADO FINAL ═══
for (const [w, h] of [[1440, 810], [390, 844]]) {
  console.log(`\n— Entrada do hero (${w}) —`);
  // referência estática (o véu do commit de referência já terminou)
  const r = await abrir(ref.url, { width: w, height: h });
  await r.page.waitForTimeout(1500);
  const pngRef = await r.page.locator("#ato-1").screenshot({ path: `${OUT}/hero-${w}-estatico-aprovado.png` });
  await r.ctx.close();

  const { ctx, page } = await abrir(atual.url, { width: w, height: h });
  await esperarMotion(page);
  // reinicia a entrada (CSS puro) e congela tudo no instante 0 para fotografar quadro a quadro
  await page.evaluate(() => {
    const raiz = document.documentElement;
    raiz.classList.remove("js-motion", "motion-enter"); void raiz.offsetWidth;
    raiz.classList.add("js-motion", "motion-enter");
    window.gsap?.globalTimeline.pause();
    for (const a of document.getAnimations()) a.pause();
  });
  for (const t of [0, 300, 800, 1800, 2600]) {
    await page.evaluate((ms) => { for (const a of document.getAnimations()) a.currentTime = ms; }, t);
    await page.screenshot({ path: `${OUT}/hero-${w}-entrada-${String(t).padStart(4, "0")}ms.png` });
  }
  const estado = await page.evaluate(() => {
    const wm = document.querySelector(".hero__wordmark-text");
    const cs = getComputedStyle(wm);
    return { transform: cs.transform, filter: cs.filter, willChange: cs.willChange };
  });
  ok(estado.transform === "none" && !/blur/.test(estado.filter) && estado.willChange === "auto",
    `${w}: aos 2600 ms o wordmark está em repouso (transform ${estado.transform}, sem blur no filter, will-change ${estado.willChange})`);

  await poseEstatica(page);
  await page.waitForTimeout(100);
  const pngFinal = await page.locator("#ato-1").screenshot({ path: `${OUT}/hero-${w}-final.png` });
  const d = await comparar(page, pngRef, pngFinal);
  medidas[`dif-${w}`] = d;
  ok(d.fracao <= MAX_PIXELS,
    `${w}: estado final × estático aprovado — ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (> ${LIMIAR_CANAL}/255), média ${d.media.toFixed(2)}/255 (${d.tamanhos}); limite ${MAX_PIXELS * 100} %`);
  await ctx.close();
}

// ═══ 3. VÍDEOS ═══
{
  console.log("\n— Vídeos —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const dir = join(OUT, `video-${w}`);
    await rm(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
    const page = await ctx.newPage();
    await page.goto(atual.url, { waitUntil: "load" });
    await page.waitForTimeout(3500); // entrada completa + motion carregado
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(120); } // parallax
    await page.waitForTimeout(900);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -90); await page.waitForTimeout(120); }
    await page.waitForTimeout(1500);
    await ctx.close();
    const [arq] = await readdir(dir);
    await rename(join(dir, arq), join(OUT, `hero-${w}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`  ${OUT}/hero-${w}.webm`);
  }
}

// ═══ 4. CUSTO ═══
// Chromium headless com GPU habilitada (ANGLE); os números são indicativos — ver DESIGN.md.
const medir = (page, ms) => page.evaluate(async (dur) => {
  const loaf = [];
  const longos = [];
  const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => {
    loaf.push(e.duration);
    if (e.duration <= 50) return;
    const scripts = (e.scripts || []).filter((x) => x.duration > 5)
      .map((x) => `${x.invoker || x.invokerType} ${(x.sourceURL || "").split("/").pop()}:${x.sourceFunctionName || ""} ${Math.round(x.duration)} ms`);
    const estiloLayout = e.styleAndLayoutStart ? Math.round(e.startTime + e.duration - e.styleAndLayoutStart) : 0;
    const bloqueio = Math.round(e.blockingDuration || 0);
    longos.push(`${Math.round(e.duration)} ms (bloqueio ${bloqueio}, estilo+layout+pintura ${estiloLayout}) ${scripts.join(" · ") || "sem script"}`);
  }));
  try { po.observe({ type: "long-animation-frame" }); } catch { /* sem LoAF */ }
  const quadros = [];
  await new Promise((fim) => {
    let ultimo = performance.now();
    const limite = ultimo + dur;
    const tick = (t) => { quadros.push(t - ultimo); ultimo = t; if (t < limite) requestAnimationFrame(tick); else fim(); };
    requestAnimationFrame(tick);
  });
  po.disconnect();
  const q = quadros.slice(1).sort((a, b) => a - b);
  const pct = (p) => q[Math.min(q.length - 1, Math.floor(q.length * p))];
  return {
    fps: +(q.length / (dur / 1000)).toFixed(1), p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), max: +q.at(-1).toFixed(1),
    perdidos: q.filter((f) => f > 25).length, loaf: loaf.length, loaf50: loaf.filter((d) => d > 50).length,
    loafMax: +Math.max(0, ...loaf).toFixed(0), longos,
  };
}, ms);

// Quadros do compositor pelo trace do Chromium (PipelineReporter): o custo do feTurbulence está
// no raster/GPU, que o rAF do thread principal não enxerga.
async function comTrace(navegador, page, fn) {
  const arq = join(tmpdir(), `asami-trace-${Date.now()}.json`);
  await navegador.startTracing(page, { path: arq, categories: ["cc", "benchmark", "disabled-by-default-devtools.timeline.frame"] });
  const r = await fn();
  await navegador.stopTracing();
  const seq = new Map();
  for (const e of JSON.parse(await readFile(arq, "utf8")).traceEvents) {
    const fr = e.name === "PipelineReporter" && e.ph === "b" && e.args?.frame_reporter;
    if (fr && fr.frame_type !== "FORKED") seq.set(fr.frame_sequence, fr.state);
  }
  await rm(arq, { force: true });
  const est = [...seq.values()];
  r.compositor = {
    quadros: est.length,
    apresentados: est.filter((x) => x === "STATE_PRESENTED_ALL").length,
    parciais: est.filter((x) => x === "STATE_PRESENTED_PARTIAL").length,
    descartados: est.filter((x) => x === "STATE_DROPPED").length,
  };
  return r;
}

{
  console.log("\n— Custo (10 s parado / 10 s rolando) —");
  const gpu = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
  {
    const p = await gpu.newPage();
    medidas.gpu = await p.evaluate(() => { const c = document.createElement("canvas").getContext("webgl"); const e = c?.getExtension("WEBGL_debug_renderer_info"); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "desconhecida"; });
    console.log(`  GPU: ${medidas.gpu}`);
    await p.close();
  }
  const casos = [
    ["high", "?quality=high", 1440, 810],
    ["high, sem a ondulação GSAP", "?quality=high", 1440, 810, true],
    ["low", "?quality=low", 1440, 810],
    ["low (390, celular)", "", 390, 844],
  ];
  for (const [rotulo, query, w, h, semOnda] of casos) {
    const ctx = await gpu.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(atual.url + query, { waitUntil: "load" });
    await esperarMotion(page);
    await page.waitForTimeout(2500); // entrada terminada
    if (semOnda) await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && t !== window.motion?.debug.ato2?.onda && t !== window.motion?.debug.ato4?.onda).forEach((t) => t.pause()));
    // uma fase que estoura o orçamento é medida de novo uma vez (rajadas do ambiente, ver abaixo)
    const noOrcamento = (m) => m.loaf50 <= 2 && m.compositor.descartados / Math.max(1, m.compositor.quadros) <= 0.05;
    const fase = async (fn) => {
      const a = await comTrace(gpu, page, fn);
      if (semOnda || noOrcamento(a)) return a;
      const b = await comTrace(gpu, page, fn);
      b.repetida = `1ª medida: ${a.compositor.descartados}/${a.compositor.quadros} descartados, ${a.loaf50} quadros longos`;
      return b;
    };
    const parado = await fase(() => medir(page, 10000));
    await page.mouse.move(w / 2, h / 2);
    const rol = await fase(async () => {
      const rolando = medir(page, 10000);
      for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, i < 20 ? 60 : -60); await page.waitForTimeout(240); }
      return rolando;
    });
    medidas[`custo-${rotulo}`] = { parado, rolando: rol };
    const linha = (m) => `rAF ${m.fps} fps (p95 ${m.p95} ms, máx ${m.max} ms, ${m.perdidos} > 25 ms) · compositor ${m.compositor.apresentados}/${m.compositor.quadros} apresentados, ${m.compositor.descartados} descartados, ${m.compositor.parciais} parciais · LoAF > 50 ms: ${m.loaf50} (máx ${m.loafMax} ms)${m.repetida ? ` [repetida; ${m.repetida}]` : ""}${m.longos.length ? "\n      " + m.longos.join("\n      ") : ""}`;
    console.log(`  ${rotulo}\n    parado:  ${linha(parado)}\n    rolando: ${linha(rol)}`);
    // Orçamento (DESIGN.md §5 Hero, "Custo"): até 2 quadros longos (> 50 ms) isolados em 10 s
    // (mais que isso é recorrente) e até 5 % de quadros do compositor descartados. O caso de
    // controle (sem a ondulação) mostra o ruído do ambiente: picos isolados e rajadas de ~20
    // quadros descartados sem nenhuma animação cara; ele só é relatado, não conta como falha.
    const pctDesc = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
    if (semOnda) { await ctx.close(); continue; }
    ok(parado.loaf50 <= 2 && rol.loaf50 <= 2 && pctDesc(parado) <= 0.05 && pctDesc(rol) <= 0.05,
      `${rotulo}: dentro do orçamento (quadros longos ${parado.loaf50}/${rol.loaf50}, descartados ${(pctDesc(parado) * 100).toFixed(1)} % / ${(pctDesc(rol) * 100).toFixed(1)} %)`);
    await ctx.close();
  }
  await gpu.close();
}

// ═══ 5. MODOS E QUALIDADE ═══
{
  console.log("\n— Modos e qualidade —");
  const infinitas = (page) => page.evaluate(() => document.getAnimations()
    .filter((a) => a.effect.getComputedTiming().iterations === Infinity && /^hero-/.test(a.animationName)) // só os do hero
    .map((a) => [a.animationName, a.playState]));

  // reduced: sem loops, sem parallax, sem entrada, wordmark visível
  {
    const { ctx, page } = await abrir(atual.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(page);
    const loops = (await infinitas(page)).filter(([, st]) => st === "running");
    await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
      y: gsap.getProperty(".hero__wordmark", "y"),
      op: getComputedStyle(document.querySelector(".hero__wordmark-text")).opacity,
      onda: gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && t !== window.motion?.debug.ato2?.onda && t !== window.motion?.debug.ato4?.onda).length,
    }));
    ok(loops.length === 0 && r.y === 0 && r.onda === 0 && r.op === "1",
      `reduced: ${loops.length} loops rodando, parallax y=${r.y}, ${r.onda} tweens GSAP, wordmark opacity ${r.op}`);
    await ctx.close();
  }

  // paused: tudo congela e retoma
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await page.waitForTimeout(2500);
    const antes = await infinitas(page);
    await page.click("[data-pause]"); await page.waitForTimeout(100);
    const f0 = await page.evaluate(() => [document.querySelector("#wave feTurbulence").getAttribute("baseFrequency"), getComputedStyle(document.querySelector(".hero__nigiri")).transform]);
    await page.waitForTimeout(800);
    const f1 = await page.evaluate(() => [document.querySelector("#wave feTurbulence").getAttribute("baseFrequency"), getComputedStyle(document.querySelector(".hero__nigiri")).transform]);
    const pausadas = await infinitas(page);
    const tlPausada = await page.evaluate(() => gsap.globalTimeline.paused());
    ok(pausadas.every(([, st]) => st === "paused") && f0.join() === f1.join() && tlPausada,
      `paused: ${pausadas.length} loops CSS pausados, nigiri e baseFrequency congelados`);
    await page.click("[data-pause]"); await page.waitForTimeout(800);
    const f2 = await page.evaluate(() => [document.querySelector("#wave feTurbulence").getAttribute("baseFrequency"), getComputedStyle(document.querySelector(".hero__nigiri")).transform]);
    const depois = await infinitas(page);
    ok(depois.every(([, st]) => st === "running") && depois.length === antes.length && f2[0] !== f1[0] && f2[1] !== f1[1],
      `ao sair do pause: ${depois.length} loops CSS rodando, ondulação e nigiri retomam`);
    // fora da tela (data-loop no #ato-1) e aba escondida
    await page.evaluate(() => motion.scrollTo("#ato-3", { imediato: true })); await page.waitForTimeout(500);
    const fora = (await infinitas(page)).filter(([nome]) => /^hero-/.test(nome)); // os do ACT II podem estar na margem
    const ondaFora = await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && t !== window.motion?.debug.ato2?.onda && t !== window.motion?.debug.ato4?.onda).every((t) => t.paused()));
    ok(fora.every(([, st]) => st === "paused") && ondaFora, `hero fora da tela: loops CSS e ondulação GSAP pausados`);
    await ctx.close();
  }

  // quality: camadas animadas
  for (const [q, esperado] of [["high", { fumaca: 3, bolhas: 14, onda: 2 }], ["low", { fumaca: 1, bolhas: 6, onda: 0 }]]) {
    const { ctx, page } = await abrir(atual.url, { query: `?quality=${q}` });
    await esperarMotion(page);
    const r = await page.evaluate(() => {
      const nomes = document.getAnimations().map((a) => a.animationName);
      return {
        fumaca: nomes.filter((n) => /^hero-smoke/.test(n)).length,
        bolhas: nomes.filter((n) => n === "hero-bubble-rise").length,
        onda: gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && t !== window.motion?.debug.ato2?.onda && t !== window.motion?.debug.ato4?.onda).length,
        blur: [...document.styleSheets].length && getComputedStyle(document.querySelector(".hero__wordmark-text")).animationName,
      };
    });
    ok(r.fumaca === esperado.fumaca && r.bolhas === esperado.bolhas && r.onda === esperado.onda,
      `?quality=${q}: ${r.fumaca} camada(s) de fumaça, ${r.bolhas} bolhas, ${r.onda} ondulações GSAP; entrada "${r.blur}"`);
    await ctx.close();
  }
}

await browser.close();
atual.s.close(); ref.s.close();
await rm(REF_DIR, { recursive: true, force: true });

const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
writeFileSync(`${OUT}/medidas.json`, JSON.stringify(medidas, null, 2));
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
