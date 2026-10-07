// Testa a infraestrutura de motion (DESIGN.md §5, D26–D30): modos full/reduced/paused, Lenis,
// âncoras, ⏮ ⏭, menu, trilho/progresso, utilitários data-*, qualidade, falha do motion,
// sem JS e file://. O site ainda não anima nenhuma seção, então o teste injeta (só no
// navegador de teste) elementos de exemplo com data-reveal, data-loop e data-parallax.
// Uso: npm run test:motion
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve("site");
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

// ── elementos de exemplo, injetados só aqui ──
const FIXTURES = {
  css: `<style>
    @keyframes fx-spin { to { transform: rotate(1turn); } }
    .fx-spin { display: block; width: 8px; height: 8px; animation: fx-spin 2s linear infinite; }
  </style>`,
  // loop CSS + loop GSAP no rodapé (fora da tela no topo); reveal no rodapé; parallax no ACT II
  rodape: `<div id="fx-reveal" data-reveal="up" style="height:40px">fx</div>
    <div id="fx-loop" data-loop><i class="fx-spin"></i><b id="fx-gsap" style="display:block;width:8px;height:8px"></b></div>`,
  ato2: `<div id="fx-par" data-parallax="0.2" style="height:8px;width:8px"></div>`,
  // sem checar m.base de propósito: em "reduced" o próprio motion.loop tem de recusar
  js: `void window.motion?.register((m) => {
    const t = gsap.to("#fx-gsap", { rotation: 360, repeat: -1, duration: 2, ease: "none" });
    window.__fxTween = m.loop(document.getElementById("fx-loop"), t);
  });`,
};
const comFixtures = (html) => html
  .replace("</head>", FIXTURES.css + "</head>")
  .replace(/(<footer[^>]*>)/, `$1${FIXTURES.rodape}`)
  .replace(/(<section[^>]*id="ato-2"[^>]*>)/, `$1${FIXTURES.ato2}`);

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const requests = new Set();
const erros = [];

async function abrir({ width = 1440, height = 810, query = "", fixtures = true, contexto = {}, bloquear = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  if (bloquear) await ctx.route(bloquear, (r) => r.abort());
  if (fixtures) {
    await ctx.route(/\/(index\.html)?(\?.*)?$/, async (r) => {
      const resp = await r.fetch();
      r.fulfill({ response: resp, body: comFixtures(await resp.text()) });
    });
  }
  const page = await ctx.newPage();
  const errosPagina = [];
  page.on("request", (r) => requests.add(r.url()));
  page.on("console", (m) => { if (m.type() === "error") errosPagina.push(m.text()); });
  page.on("pageerror", (e) => errosPagina.push(e.message));
  await page.goto(URL_ + query, { waitUntil: "networkidle" });
  // o motion carrega depois do load (D29): espera o núcleo decidir
  if (contexto.javaScriptEnabled !== false) {
    await page.waitForFunction(() => ["true", "failed"].includes(document.documentElement.dataset.motionReady), null, { timeout: 10000 });
    if (fixtures) { await page.evaluate(FIXTURES.js); await page.waitForTimeout(150); } // 1º aviso do IntersectionObserver
  }
  return { ctx, page, errosPagina };
}
const fechar = async ({ ctx, errosPagina }, rotulo, esperarErros = false) => {
  if (!esperarErros) erros.push(...errosPagina.map((e) => `[${rotulo}] ${e}`));
  await ctx.close();
};

const topoDe = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
// "assentou" = 5 leituras iguais (~400 ms): sem GPU, durante a entrada do hero (blur), a
// rolagem suave pode levar ~350 ms para começar, e 2 leituras iguais dariam falso "parou"
const assentar = async (page, sel) => {
  let antes = null, iguais = 0;
  for (let i = 0; i < 100; i++) {
    const t = await topoDe(page, sel);
    iguais = t === antes ? iguais + 1 : 0;
    if (iguais >= 5) return t;
    antes = t; await page.waitForTimeout(80);
  }
  return antes;
};
// volta ao topo: com o Lenis ativo, pelo Lenis — um scrollTo nativo durante a cauda da
// rolagem pela roda seria desfeito por ele no quadro seguinte (comportamento do Lenis)
const aoTopo = async (page) => {
  await page.evaluate(() => (window.motion?.lenis ? motion.lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0)));
  await page.waitForTimeout(300);
};
const ativo = (page) => page.evaluate(() => document.querySelector(".rail__tick[aria-current]")?.getAttribute("href"));
const scrollY_ = (page) => page.evaluate(() => Math.round(scrollY));
const rodando = (page) => page.evaluate(() =>
  document.getAnimations().filter((a) => a.playState === "running" && a.effect.getComputedTiming().iterations === Infinity).length);
const estado = (page) => page.evaluate(() => ({
  modo: window.motion?.mode, base: window.motion?.base, lenis: !!window.motion?.lenis,
  classeLenis: document.documentElement.classList.contains("lenis"),
  jsMotion: document.documentElement.classList.contains("js-motion"),
  pronto: document.documentElement.dataset.motionReady,
  timelinePausada: window.gsap?.globalTimeline.paused(),
}));

// Bateria comum aos 3 modos: rolagem, âncoras, ⏮ ⏭, menu, trilho e progresso
async function bateria(page, rotulo) {
  // rolagem pela roda
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 600); await page.waitForTimeout(900);
  ok(await scrollY_(page) > 200, `${rotulo}: a roda do mouse rola a página (scrollY=${await scrollY_(page)})`);
  await aoTopo(page);

  // âncoras: trilho
  await page.click(".rail__tick[href='#ato-3']");
  const t3 = await assentar(page, "#ato-3");
  ok(Math.abs(t3) < 4, `${rotulo}: traço III leva ao #ato-3 com offset zero (top=${t3}px)`);
  // trilho e progresso atualizam
  await page.waitForTimeout(150);
  const prog = await page.evaluate(() => Number(getComputedStyle(document.querySelector(".progress")).getPropertyValue("--progress")));
  ok(await ativo(page) === "#ato-3" && prog > 0.2 && prog < 0.95, `${rotulo}: trilho ativo em ${await ativo(page)}, --progress=${prog}`);

  // ⏮ ⏭
  await page.click("[data-act=next]");
  const t4 = await assentar(page, "#ato-4");
  ok(Math.abs(t4) < 4 && await ativo(page) === "#ato-4", `${rotulo}: ⏭ → #ato-4 (top=${t4}px)`);
  await page.click("[data-act=prev]");
  const t3b = await assentar(page, "#ato-3");
  ok(Math.abs(t3b) < 4 && await ativo(page) === "#ato-3", `${rotulo}: ⏮ → #ato-3 (top=${t3b}px)`);

  // menu: trava e destrava
  await page.click(".menu-toggle"); await page.waitForTimeout(300);
  const y0 = await scrollY_(page);
  await page.mouse.wheel(0, 700); await page.waitForTimeout(500);
  const parado = await scrollY_(page) === y0;
  const lenisParado = await page.evaluate(() => (window.motion?.lenis ? window.motion.lenis.isStopped : null));
  ok(parado && lenisParado !== false, `${rotulo}: menu aberto trava a rolagem${lenisParado === null ? "" : ` (lenis.isStopped=${lenisParado})`}`);
  await page.click(".menu__link[href='#ato-2']");
  const t2 = await assentar(page, "#ato-2");
  ok(Math.abs(t2) < 4, `${rotulo}: item Rodízio fecha o menu e chega ao #ato-2 (top=${t2}px)`);
  const y1 = await scrollY_(page);
  await page.mouse.wheel(0, 500); await page.waitForTimeout(900);
  ok(await scrollY_(page) > y1 + 100, `${rotulo}: menu fechado destrava a rolagem (${y1} → ${await scrollY_(page)})`);
  await aoTopo(page);
}

// ═══ 1. FULL ═══
{
  console.log("\n— Modo full (1440) —");
  const s = await abrir();
  const { page } = s;
  const e0 = await estado(page);
  ok(e0.modo === "full" && e0.base === "full" && e0.lenis && e0.classeLenis && e0.jsMotion && e0.pronto === "true",
    `motion pronto: mode=${e0.modo}, Lenis ativo (html.lenis), html.js-motion`);
  await page.waitForTimeout(1200); // --t-enter 800 ms a partir da 1ª pintura
  ok(await page.evaluate(() => !document.documentElement.classList.contains("motion-enter")), "véu de entrada termina e a classe motion-enter sai");

  // loops: fora da tela pausados; na tela, rodando
  const fora = await page.evaluate(() => ({
    off: document.getElementById("fx-loop").hasAttribute("data-offscreen"),
    css: document.querySelector(".fx-spin").getAnimations()[0]?.playState,
    gsap: window.__fxTween?.paused(),
  }));
  ok(fora.off && fora.css === "paused" && fora.gsap === true, `loop fora da tela: data-offscreen, CSS ${fora.css}, GSAP pausado=${fora.gsap}`);

  // reveal: escondido antes, revelado ao chegar
  const antes = await page.evaluate(() => getComputedStyle(document.getElementById("fx-reveal")).opacity);
  await page.evaluate(() => motion.scrollTo("#rodape", { imediato: true }));
  await page.waitForTimeout(1300);
  const depois = await page.evaluate(() => {
    const el = document.getElementById("fx-reveal");
    return { op: getComputedStyle(el).opacity, rev: el.hasAttribute("data-revealed"), wc: el.style.willChange, tf: getComputedStyle(el).transform };
  });
  ok(antes === "0" && depois.op === "1" && depois.rev && depois.wc === "" && depois.tf === "none",
    `data-reveal="up": opacity ${antes} → ${depois.op}, data-revealed, will-change limpo, transform ${depois.tf}`);
  const dentro = await page.evaluate(() => ({
    css: document.querySelector(".fx-spin").getAnimations()[0]?.playState, gsap: window.__fxTween?.paused(),
  }));
  ok(dentro.css === "running" && dentro.gsap === false, `loop na tela: CSS ${dentro.css}, GSAP pausado=${dentro.gsap}`);

  // parallax: zero com o ato em repouso (topo), deslocado fora dele
  await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true })); await page.waitForTimeout(400);
  const parRepouso = await page.evaluate(() => gsap.getProperty("#fx-par", "y"));
  await page.evaluate(() => motion.scrollTo("#ato-1", { imediato: true })); await page.waitForTimeout(400);
  const parFora = await page.evaluate(() => gsap.getProperty("#fx-par", "y"));
  ok(Math.abs(parRepouso) < 1 && parFora < -20, `data-parallax="0.2": y=${Math.round(parRepouso)} com o ato no topo, ${Math.round(parFora)} fora do repouso`);

  // foco por teclado num campo fora da tela: do ⏭ (último controle antes do conteúdo), um Tab
  // leva ao 1º campo do formulário, ~2 telas abaixo
  await aoTopo(page);
  await page.focus("[data-act=next]");
  await page.keyboard.press("Tab"); await page.waitForTimeout(900);
  const tab = await page.evaluate(() => {
    const el = document.activeElement, r = el.getBoundingClientRect();
    return { alvo: `${el.tagName}#${el.id}`, visivel: r.top >= 0 && r.bottom <= innerHeight, y: Math.round(scrollY), sync: Math.round(motion.lenis.targetScroll) === Math.round(scrollY) };
  });
  ok(tab.alvo === "SELECT#res-dia" && tab.visivel && tab.sync,
    `Tab até um campo fora da tela rola até ele (${tab.alvo}, scrollY=${tab.y}, Lenis sincronizado=${tab.sync})`);
  await aoTopo(page);

  await bateria(page, "full");

  // cliques rápidos: 3 × ⏭ sem esperar chegam ao #ato-4 (não voltam a um ato atravessado)
  await aoTopo(page);
  for (let i = 0; i < 3; i++) { await page.click("[data-act=next]"); await page.waitForTimeout(120); }
  const rapido = await assentar(page, "#ato-4");
  ok(Math.abs(rapido) < 4 && await ativo(page) === "#ato-4", `3 × ⏭ rápidos chegam ao #ato-4 (top=${rapido}px)`);
  // ⏸ no meio de uma rolagem: termina no destino, não para entre atos
  await page.click("[data-act=prev]"); await page.waitForTimeout(250);
  await page.click("[data-pause]"); await page.waitForTimeout(200);
  const meio = await topoDe(page, "#ato-3");
  ok(Math.abs(meio) < 4, `⏸ durante o ⏮ termina a rolagem no #ato-3 (top=${meio}px)`);
  await page.click("[data-pause]");
  await fechar(s, "full");
}

// ═══ 2. REDUCED ═══
{
  console.log("\n— Modo reduced (prefers-reduced-motion) —");
  const s = await abrir({ contexto: { reducedMotion: "reduce" } });
  const { page } = s;
  const e = await estado(page);
  ok(e.modo === "reduced" && !e.lenis && !e.classeLenis && !e.jsMotion, `mode=${e.modo}, sem Lenis, sem html.js-motion`);
  ok(await rodando(page) === 0, `nenhuma animação contínua rodando (getAnimations: ${await rodando(page)})`);
  ok(await page.evaluate(() => window.__fxTween === null), "motion.loop recusa o loop GSAP (devolve null)");
  ok(await page.evaluate(() => getComputedStyle(document.body, "::before").content === "none"), "sem véu de entrada");
  await page.evaluate(() => motion.scrollTo("#ato-1", { imediato: true }));
  await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(300);
  ok(Math.round(await page.evaluate(() => gsap.getProperty("#fx-par", "y"))) === 0, "parallax desligado");
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  const op0 = await page.evaluate(() => getComputedStyle(document.getElementById("fx-reveal")).opacity);
  await page.evaluate(() => document.getElementById("rodape").scrollIntoView()); await page.waitForTimeout(800);
  const op1 = await page.evaluate(() => getComputedStyle(document.getElementById("fx-reveal")).opacity);
  ok(op0 === "0" && op1 === "1", `reveal vira fade de 200 ms (opacity ${op0} → ${op1})`);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  await bateria(page, "reduced");
  await fechar(s, "reduced");
}

// ═══ 3. PAUSED ═══
{
  console.log("\n— Modo paused (⏸) —");
  const s = await abrir();
  const { page } = s;
  await page.evaluate(() => document.getElementById("rodape").scrollIntoView()); await page.waitForTimeout(600);
  const r0 = await page.evaluate(() => gsap.getProperty("#fx-gsap", "rotation"));
  await aoTopo(page);
  await page.click("[data-pause]"); await page.waitForTimeout(150);
  const e = await estado(page);
  ok(e.modo === "paused" && !e.lenis && !e.classeLenis && e.timelinePausada,
    `mode=${e.modo}, Lenis ${e.lenis ? "ligado" : "desligado"} (html.lenis=${e.classeLenis}), globalTimeline.paused()=${e.timelinePausada}`);
  ok(await rodando(page) === 0, `nenhuma animação CSS rodando (getAnimations: ${await rodando(page)})`);
  await page.evaluate(() => document.getElementById("rodape").scrollIntoView()); await page.waitForTimeout(300);
  const g1 = await page.evaluate(() => gsap.getProperty("#fx-gsap", "rotation"));
  await page.waitForTimeout(500);
  const g2 = await page.evaluate(() => gsap.getProperty("#fx-gsap", "rotation"));
  ok(g1 === g2 && await rodando(page) === 0, `loop GSAP congelado na tela (rotation ${Math.round(g1)} = ${Math.round(g2)})`);
  const yPausa = Math.round(await page.evaluate(() => gsap.getProperty("#fx-par", "y")));
  ok(yPausa === 0, `parallax desligado (y=${yPausa})`);
  await aoTopo(page);
  await bateria(page, "paused");

  await page.evaluate(() => document.getElementById("rodape").scrollIntoView()); await page.waitForTimeout(300);
  await page.click("[data-pause]"); await page.waitForTimeout(600);
  const e2 = await estado(page);
  const g3 = await page.evaluate(() => gsap.getProperty("#fx-gsap", "rotation"));
  ok(e2.modo === "full" && e2.lenis && !e2.timelinePausada && await rodando(page) > 0 && g3 !== g2,
    `ao sair do pause: mode=${e2.modo}, Lenis de volta, animações retomam (CSS ${await rodando(page)} rodando, GSAP ${Math.round(g2)} → ${Math.round(g3)})`);
  void r0;
  await fechar(s, "paused");
}

// ═══ 4. TROCA EM TEMPO REAL ═══
{
  console.log("\n— Troca de modo em tempo real —");
  const s = await abrir();
  const { page } = s;
  const vistos = [];
  await page.exposeFunction("__registrar", (m) => vistos.push(m));
  await page.evaluate(() => motion.on("mode", (m) => window.__registrar(m)));
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(200);
  const a = await estado(page);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForTimeout(200);
  const b = await estado(page);
  ok(a.modo === "reduced" && !a.lenis && b.modo === "full" && b.lenis && vistos.join() === "reduced,full",
    `matchMedia change: full → reduced (Lenis off) → full (Lenis on); motion.on("mode") viu ${vistos.join(" → ")}`);
  await fechar(s, "tempo real");
}

// ═══ 5. QUALIDADE ═══
{
  console.log("\n— Qualidade —");
  for (const q of ["low", "high"]) {
    const s = await abrir({ query: `?quality=${q}` });
    const r = await s.page.evaluate(() => [document.documentElement.dataset.quality, motion.quality]);
    ok(r[0] === q && r[1] === q, `?quality=${q} → html[data-quality="${r[0]}"], motion.quality=${r[1]}`);
    if (q === "low") {
      await s.page.evaluate(() => motion.scrollTo("#ato-1", { imediato: true })); await s.page.waitForTimeout(300);
      ok(Math.round(await s.page.evaluate(() => gsap.getProperty("#fx-par", "y"))) === 0, "quality low: parallax desligado");
    }
    await fechar(s, `quality ${q}`);
  }
  const s = await abrir({ width: 390, height: 844 });
  ok(await s.page.evaluate(() => document.documentElement.dataset.quality) === "low", "tela < 768 px → low automático");
  await fechar(s, "quality 390");
}

// ═══ 6. FALHA DO MOTION ═══
{
  console.log("\n— Falha do motion (gsap bloqueado) —");
  const s = await abrir({ bloquear: /gsap\.min\.js$/ });
  const r = await s.page.evaluate(() => ({
    jsMotion: document.documentElement.classList.contains("js-motion"),
    enter: document.documentElement.classList.contains("motion-enter"),
    pronto: document.documentElement.dataset.motionReady,
    op: getComputedStyle(document.getElementById("fx-reveal")).opacity,
  }));
  ok(!r.jsMotion && !r.enter && r.op === "1", `sem GSAP: js-motion removida (ready=${r.pronto}), conteúdo visível (opacity ${r.op})`);
  await s.page.click("[data-act=next]");
  ok(Math.abs(await assentar(s.page, "#ato-2")) < 4, "sem GSAP: ⏭ continua funcionando (rolagem nativa)");
  await fechar(s, "falha", true);
}

// ═══ 7. SEM JS ═══
{
  console.log("\n— Sem JavaScript —");
  const s = await abrir({ contexto: { javaScriptEnabled: false } });
  const { page } = s;
  const r = await page.evaluate(() => {
    const escondidos = [...document.querySelectorAll("main *, footer *")].filter((el) => {
      if (el.closest("[aria-hidden=true], .svg-defs, .visually-hidden")) return false;
      const cs = getComputedStyle(el);
      return el.textContent.trim() && cs.visibility !== "hidden" && Number(cs.opacity) === 0;
    }).map((el) => el.tagName + (el.id ? "#" + el.id : ""));
    return {
      classes: document.documentElement.className,
      veu: getComputedStyle(document.body, "::before").content,
      escondidos,
      waForm: document.querySelector("#ato-4 a[href^='https://wa.me/']")?.getAttribute("href")?.slice(0, 30),
    };
  });
  ok(!/js-motion|motion-enter/.test(r.classes) && r.veu === "none" && r.escondidos.length === 0,
    `conteúdo 100 % visível (nenhum texto com opacity 0${r.escondidos.length ? ": " + r.escondidos.join(", ") : ""}), sem véu`);
  ok(!!r.waForm, `formulário: fallback é link para ${r.waForm}…`);
  await page.click(".rail__tick[href='#ato-4']");
  const t4 = await assentar(page, "#ato-4");
  ok(Math.abs(t4) < 4, `âncoras nativas funcionam (traço IV → #ato-4, top=${t4}px)`);
  await fechar(s, "sem JS");
}

// ═══ 8. FILE:// ═══
{
  console.log("\n— Aberto por duplo clique (file://) —");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  const errosFile = [];
  page.on("pageerror", (e) => errosFile.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errosFile.push(m.text()); });
  await page.goto(pathToFileURL(resolve("site/index.html")).href, { waitUntil: "load" });
  await page.waitForFunction(() => ["true", "failed"].includes(document.documentElement.dataset.motionReady), null, { timeout: 10000 });
  const e = await estado(page);
  ok(e.pronto === "true" && e.modo === "full" && e.lenis && errosFile.length === 0,
    `file://: motion pronto (mode=${e.modo}, Lenis=${e.lenis}), ${errosFile.length} erro(s)${errosFile.length ? ": " + errosFile.join(" | ") : ""}`);
  await ctx.close();
}

// ═══ 8b. CARREGAMENTO TARDIO (D29) ═══
{
  console.log("\n— Carregamento do motion (fora do caminho do LCP) —");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  const pedidos = [];
  page.on("request", (r) => { if (/vendor|motion\/core/.test(r.url())) pedidos.push(r.url().split("/").pop()); });
  await page.goto(URL_, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  const antes = pedidos.length;
  const lcp = await page.evaluate(() => ({
    preload: !!document.querySelector('link[rel=preload][as=image][href*="plate-nigiri"]'),
    prioridade: document.querySelector(".hero__nigiri")?.getAttribute("fetchpriority"),
  }));
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 200);
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 10000 });
  ok(antes === 0 && pedidos.join() === "gsap.min.js,ScrollTrigger.min.js,lenis.min.js,core.js",
    `nada de motion pedido até 1 s depois do load (${antes}); a 1ª interação carrega ${pedidos.join(", ")}`);
  ok(lcp.preload && lcp.prioridade === "high", `nigiri continua com preload e fetchpriority="${lcp.prioridade}"`);
  await ctx.close();
}

// ═══ 9. SANIDADE (sem fixtures) ═══
{
  console.log("\n— Sanidade —");
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const s = await abrir({ width: w, height: h, fixtures: false });
    const r = await s.page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      fora: [...document.querySelectorAll("[data-reveal], [data-parallax], [data-loop]")].filter((el) => !el.closest("#ato-1, #ato-2, #ato-3, #ato-4")).length,
      nigiri: getComputedStyle(document.querySelector(".hero__nigiri")).opacity,
    }));
    ok(r.sw <= r.cw, `${w}px: sem rolagem horizontal (${r.sw} ≤ ${r.cw})`);
    ok(r.fora === 0 && r.nigiri === "1", `${w}px: motion só nos atos (${r.fora} data-* fora deles), nigiri visível`);
    await fechar(s, `sanidade ${w}`);
  }
}

await browser.close();
server.close();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
