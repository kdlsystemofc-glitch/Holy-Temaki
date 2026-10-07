// Testa e mede o motion do ACT II (#ato-2) — DESIGN.md §5 Rodízio, §5.0.
//   1. Quadros da entrada (0, 300, 800, 1400, 2000 ms) e estado final × estático aprovado
//   2. Sem retângulos pretos (mescla screen) em nenhum quadro
//   3. Navegação: pular para o #ato-4 (trilho, menu, ⏭ ⏮ rápidos) e voltar — nunca preso escondido
//   4. Um feTurbulence animado por vez (hero × ACT II)
//   5. Vídeos em 1440 e 390
//   6. Custo: 10 s parado no ACT II e rolagem hero → ACT II → ACT III, high e low
//   7. Modos e qualidade; hover
// Uso: npm run test:motion
import { mkdir, rm, rename, readdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { servir, extrairCommit, comparar, pretosDePlate, poseEstatica, medir, comTrace, GPU_ARGS } from "./lib-motion.mjs";

const REF_COMMIT = "382ecc4"; // "motion hero pronto": ACT II estático aprovado
const OUT = "screenshots/motion";
const LIMIAR_CANAL = 24, MAX_PIXELS = 0.005; // mesma tolerância do hero
const MAX_PRETOS = 0.001; // fração de pixels ≤ 3 nas tábuas (o estático aprovado mede 0)

const ref = await extrairCommit(REF_COMMIT);
const atual = await servir("site");
const srvRef = await servir(ref.raiz);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const erros = [], requests = new Set(), medidas = {};

async function abrir(url, { width = 1440, height = 810, query = "", contexto = {}, nav = browser } = {}) {
  const ctx = await nav.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("request", (r) => requests.add(r.url()));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") erros.push(`[${width}${query}] ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => erros.push(`[${width}${query}] ${e.message}`));
  await page.goto(url + query, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const esperarMotion = (page) =>
  page.waitForFunction(() => ["true", "failed"].includes(document.documentElement.dataset.motionReady), null, { timeout: 10000 })
    .then(() => page.waitForTimeout(300));
const topoDe = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
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
const retangulosTabuas = (page) => page.evaluate(() =>
  [...document.querySelectorAll("#ato-2 .rodizio__boards .board")].map((b) => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
// ACT II no estado final: nada escondido, nada fora do lugar
const estadoFinal = (page) => page.evaluate(() => {
  const ato = document.getElementById("ato-2");
  const cs = (el) => getComputedStyle(el);
  const svg = [...ato.querySelectorAll(".callouts")].find((s) => cs(s).display !== "none");
  const problemas = [];
  for (const el of ato.querySelectorAll(".board, .act-label, .callout-label, .callouts circle")) {
    if (cs(el).opacity !== "1") problemas.push(`${el.className.baseVal ?? el.className} opacity ${cs(el).opacity}`);
  }
  for (const el of ato.querySelectorAll(".rodizio__boards .board")) if (cs(el).transform !== "none") problemas.push(`tábua transform ${cs(el).transform}`);
  for (const p of svg?.querySelectorAll("path") ?? []) if (p.style.strokeDashoffset && parseFloat(p.style.strokeDashoffset) !== 0) problemas.push(`linha dashoffset ${p.style.strokeDashoffset}`);
  return problemas;
});

// ═══ 1–2. ENTRADA, ESTADO FINAL, MESCLA ═══
for (const [w, h] of [[1440, 810], [390, 844]]) {
  console.log(`\n— Entrada do ACT II (${w}) —`);
  // referência: o ACT II estático aprovado, capturado em pausa (sem parallax nem loops)
  const r = await abrir(srvRef.url, { width: w, height: h });
  await esperarMotion(r.page);
  await r.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-2").scrollIntoView({ behavior: "instant" }); });
  await r.page.waitForTimeout(500);
  const pngRef = await r.page.locator("#ato-2").screenshot({ path: `${OUT}/ato2-${w}-estatico-aprovado.png` });
  const pretosRef = await pretosDePlate(r.page, await r.page.screenshot(), await retangulosTabuas(r.page));
  await r.ctx.close();

  // qualidade real de cada tela: 1440 → high (forçado, a máquina de teste pode ter ≤ 4 núcleos),
  // 390 → low automático (é o que um celular recebe)
  const { ctx, page } = await abrir(atual.url, { width: w, height: h, query: w >= 768 ? "?quality=high" : "" });
  await esperarMotion(page);
  // leva o ACT II à tela: a entrada dispara; congela e percorre os quadros-chave
  await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true }));
  await page.waitForFunction(() => motion.debug.ato2?.entrada?.isActive() || motion.debug.ato2?.entrada?.progress() > 0, null, { timeout: 5000 });
  await page.evaluate(() => { motion.debug.ato2.entrada.pause(); motion.debug.ato2.rotulo?.pause(); });
  let piorPretos = 0;
  for (const t of [0, 300, 800, 1400, 2000]) {
    await page.evaluate((ms) => {
      motion.debug.ato2.entrada.time(ms / 1000);
      motion.debug.ato2.rotulo?.time(Math.min(ms / 1000, motion.debug.ato2.rotulo.duration()));
      for (const a of document.getAnimations()) if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = ms; }
    }, t);
    await page.waitForTimeout(60);
    const png = await page.screenshot({ path: `${OUT}/ato2-${w}-entrada-${String(t).padStart(4, "0")}ms.png` });
    const p = await pretosDePlate(page, png, await retangulosTabuas(page));
    piorPretos = Math.max(piorPretos, p.fracao);
    console.log(`  ${String(t).padStart(4)} ms: ${p.n} pixels "preto de plate" em ${p.total} nas tábuas`);
  }
  ok(piorPretos <= MAX_PRETOS && pretosRef.fracao <= MAX_PRETOS,
    `${w}: sem retângulos pretos nos quadros-chave (pior ${(piorPretos * 100).toFixed(3)} %; estático aprovado ${(pretosRef.fracao * 100).toFixed(3)} %)`);

  // estado final: conclui a entrada, pausa (parallax em repouso), loops na fase 0
  await page.evaluate(() => { motion.debug.ato2.entrada.progress(1); motion.debug.ato2.rotulo?.progress(1); });
  await page.click("[data-pause]");
  await page.mouse.move(w - 2, 2); // o cursor parado no ⏸ ficaria sobre a tábua (hover = scale 1.02)
  await page.evaluate(() => document.getElementById("ato-2").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(300);
  await poseEstatica(page);
  await page.waitForTimeout(150);
  ok((await estadoFinal(page)).length === 0, `${w}: estado final sem nada escondido ou deslocado ${JSON.stringify(await estadoFinal(page))}`);
  // (a) loops parados na fase 0: relatado. Um elemento em animação vira camada do compositor, e
  // camadas são alinhadas ao pixel inteiro — a tábua esquerda no retrato (left -2 %, top 47,1 %)
  // se desloca ~1 px por isso. (b) loops cancelados = pose de repouso sem camada: asserção.
  const pngFase0 = await page.locator("#ato-2").screenshot({ path: `${OUT}/ato2-${w}-final-fase0.png` });
  const d0 = await comparar(page, pngRef, pngFase0, LIMIAR_CANAL);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
  await page.waitForTimeout(150);
  const pngFinal = await page.locator("#ato-2").screenshot({ path: `${OUT}/ato2-${w}-final.png` });
  const d = await comparar(page, pngRef, pngFinal, LIMIAR_CANAL);
  medidas[`dif-${w}`] = { repouso: d, fase0: d0 };
  console.log(`  loops na fase 0 (com camada): ${(d0.fracao * 100).toFixed(3)} % dos pixels diferem, média ${d0.media.toFixed(2)}/255`);
  ok(d.fracao <= MAX_PIXELS,
    `${w}: estado final (repouso) × estático aprovado — ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (> ${LIMIAR_CANAL}/255), média ${d.media.toFixed(2)}/255 (${d.tamanhos}); limite ${MAX_PIXELS * 100} %`);
  await ctx.close();
}

// ═══ 3. NAVEGAÇÃO: NUNCA PRESO ESCONDIDO ═══
{
  console.log("\n— Navegação (pular o ACT II e voltar) —");
  const cenarios = [
    ["trilho → #ato-4, volta rolando", async (page) => {
      await page.click(".rail__tick[href='#ato-4']"); await assentar(page, "#ato-4");
      await page.mouse.move(700, 400);
      for (let i = 0; i < 60 && (await topoDe(page, "#ato-2")) < -100; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(140); }
    }],
    ["menu → Reservas, volta pelo trilho", async (page) => {
      await page.click(".menu-toggle"); await page.waitForTimeout(250);
      await page.click(".menu__link[href='#ato-4']"); await assentar(page, "#ato-4");
      await page.click(".rail__tick[href='#ato-2']");
    }],
    ["⏭ ⏭ ⏭ ⏮ ⏮ rápidos", async (page) => {
      for (const d of ["next", "next", "next", "prev", "prev"]) { await page.click(`[data-act=${d}]`, { force: true }); await page.waitForTimeout(150); }
    }],
  ];
  for (const [nome, passos] of cenarios) {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await passos(page);
    const topo = await assentar(page, "#ato-2");
    await page.waitForTimeout(2200); // tempo de sobra para qualquer entrada terminar
    const prob = await estadoFinal(page);
    const alt = await page.evaluate(() => innerHeight);
    ok(topo > -alt * 0.5 && topo < alt * 0.5 && prob.length === 0, `${nome}: ACT II visível (top ${topo}px) e no estado final${prob.length ? " — " + prob.join("; ") : ""}`);
    await ctx.close();
  }
}

// ═══ 4. UM feTurbulence POR VEZ ═══
{
  console.log("\n— Um feTurbulence animado por vez —");
  const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
  await esperarMotion(page);
  const rodando = () => page.evaluate(() => {
    const loops = gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1);
    const onda = motion.debug.ato2?.onda;
    return { hero: loops.filter((t) => t !== onda && !t.paused()).length, ato2: onda && !onda.paused() ? 1 : 0 };
  });
  const alturaHero = await page.evaluate(() => document.getElementById("ato-1").offsetHeight);
  const vistos = [];
  for (const y of [0, alturaHero * 0.35, alturaHero * 0.55, alturaHero * 0.75, alturaHero, alturaHero * 1.4]) {
    await page.evaluate((v) => motion.lenis.scrollTo(v, { immediate: true, force: true }), y);
    await page.waitForTimeout(400);
    const r = await rodando();
    vistos.push(`${Math.round(y)}px: hero ${r.hero ? "on" : "off"}, ACT II ${r.ato2 ? "on" : "off"}`);
    ok(!(r.hero && r.ato2), `scroll ${Math.round(y)}px: nunca os dois ao mesmo tempo (hero ${r.hero}, ACT II ${r.ato2})`);
  }
  console.log("  " + vistos.join(" · "));
  await ctx.close();
}

// ═══ 5. VÍDEOS ═══
{
  console.log("\n— Vídeos —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const dir = join(OUT, `video-ato2-${w}`);
    await rm(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
    const page = await ctx.newPage();
    await page.goto(atual.url, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 10000 });
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 80); await page.waitForTimeout(110); } // hero → ACT II
    await page.evaluate(() => motion.scrollTo("#ato-2"));
    await page.waitForTimeout(4500); // entrada + loops
    if (w >= 768) { const b = page.locator("#ato-2 .rodizio__boards .board--right"); await b.hover({ force: true }); await page.waitForTimeout(900); }
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(110); } // → ACT III
    await page.waitForTimeout(800);
    await ctx.close();
    const [arq] = await readdir(dir);
    await rename(join(dir, arq), join(OUT, `ato2-${w}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`  ${OUT}/ato2-${w}.webm`);
  }
}

// ═══ 6. CUSTO ═══
{
  console.log("\n— Custo (10 s parado no ACT II / rolagem hero → ACT II → ACT III) —");
  const gpu = await chromium.launch({ args: GPU_ARGS });
  // Orçamento: até 2 quadros longos isolados e até 5 % de quadros descartados — ou, na rolagem,
  // até 2 pontos acima do controle medido na mesma execução (mesmo critério do ACT III e do ACT
  // IV: o ambiente tem rajadas do tamanho do próprio orçamento até no site aprovado)
  let controleRol = 0;
  const pctD = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
  const noOrcamento = (m, rol = false) => m.loaf50 <= 2 && (pctD(m) <= 0.05 || (rol && pctD(m) <= controleRol + 0.02));
  const casos = [
    ["high — controle: site aprovado, sem o motion do ACT II", "?quality=high", 1440, 810, srvRef.url],
    ["high", "?quality=high", 1440, 810],
    ["low", "?quality=low", 1440, 810],
    ["low (390, celular)", "", 390, 844],
  ];
  for (const [rotulo, query, w, h, urlCaso] of casos) {
    const controle = !!urlCaso;
    const { ctx, page } = await abrir(urlCaso || atual.url, { width: w, height: h, query, nav: gpu });
    await esperarMotion(page);
    const fase = async (fn, rol = false) => {
      const a = await comTrace(gpu, page, fn);
      if (controle || noOrcamento(a, rol)) return a;
      const b = await comTrace(gpu, page, fn);
      b.repetida = `1ª: ${a.compositor.descartados}/${a.compositor.quadros} descartados, ${a.loaf50} longos`;
      return b;
    };
    await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true }));
    await page.waitForTimeout(2600); // entrada terminada
    const parado = await fase(() => medir(page, 10000));
    await page.mouse.move(w / 2, h / 2);
    const rol = await fase(async () => {
      await page.evaluate(() => motion.scrollTo("#ato-1", { imediato: true }));
      const m = medir(page, 10000);
      const passos = Math.round((await page.evaluate(() => document.getElementById("ato-3").offsetTop)) / 90);
      for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(Math.floor(9000 / passos)); }
      return m;
    }, true);
    if (controle) controleRol = pctD(rol);
    medidas[`custo-${rotulo}`] = { parado, rolando: rol };
    const linha = (m) => `rAF ${m.fps} fps (p95 ${m.p95} ms, máx ${m.max} ms) · compositor ${m.compositor.quadros - m.compositor.descartados}/${m.compositor.quadros} apresentados, ${m.compositor.descartados} descartados · LoAF > 50 ms: ${m.loaf50} (máx ${m.loafMax} ms)${m.repetida ? ` [repetida; ${m.repetida}]` : ""}${m.longos.length ? "\n      " + m.longos.join("\n      ") : ""}`;
    console.log(`  ${rotulo}\n    parado:  ${linha(parado)}\n    rolando: ${linha(rol)}`);
    const pct = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
    if (controle) { await ctx.close(); continue; }
    ok(noOrcamento(parado) && noOrcamento(rol, true),
      `${rotulo}: dentro do orçamento (longos ${parado.loaf50}/${rol.loaf50}, descartados ${(pct(parado) * 100).toFixed(1)} % / ${(pct(rol) * 100).toFixed(1)} %; controle rolando ${(controleRol * 100).toFixed(1)} %)`);
    await ctx.close();
  }
  await gpu.close();
}

// ═══ 7. MODOS, QUALIDADE, HOVER ═══
{
  console.log("\n— Modos, qualidade e hover —");
  const loopsAto2 = (page) => page.evaluate(() => document.getAnimations()
    .filter((a) => /^rodizio-/.test(a.animationName)).map((a) => [a.animationName, a.playState]));

  // reduced: estático, sem loops nem parallax, nada escondido
  {
    const { ctx, page } = await abrir(atual.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(page);
    await page.evaluate(() => document.getElementById("ato-2").scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(400);
    const loops = (await loopsAto2(page)).filter(([, st]) => st === "running");
    const r = await page.evaluate(() => ({
      y: gsap.getProperty("#ato-2 .rodizio__boards", "y"),
      flutua: document.getElementById("ato-2").classList.contains("is-flutuando"),
      onda: !!motion.debug.ato2?.onda,
    }));
    const prob = await estadoFinal(page);
    ok(loops.length === 0 && r.y === 0 && !r.flutua && !r.onda && prob.length === 0,
      `reduced: ${loops.length} loops, parallax y=${r.y}, sem flutuação/ondulação, estático ${prob.length ? prob.join("; ") : "ok"}`);
    await ctx.close();
  }

  // paused: congela e retoma
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true }));
    await page.waitForTimeout(2600);
    const antes = await loopsAto2(page);
    await page.click("[data-pause]"); await page.waitForTimeout(150);
    const lerOnda = () => page.evaluate(() => [document.querySelector("#ripple-ato2 feDisplacementMap").getAttribute("scale"), motion.debug.ato2.onda.paused()]);
    const o1 = await lerOnda(); await page.waitForTimeout(700); const o2 = await lerOnda();
    const pausados = await loopsAto2(page);
    ok(pausados.length === antes.length && pausados.every(([, st]) => st === "paused") && o1[0] === o2[0],
      `paused: ${pausados.length} loops CSS do ACT II pausados, ondulação congelada (scale ${o1[0]})`);
    await page.click("[data-pause]"); await page.waitForTimeout(900);
    const depois = await loopsAto2(page); const o3 = await lerOnda();
    ok(depois.every(([, st]) => st === "running") && o3[0] !== o2[0], `ao sair do pause: loops rodando e ondulação retoma (scale ${o2[0]} → ${o3[0]})`);

    // hover (a página de teste tem hover: hover)
    const b = page.locator("#ato-2 .rodizio__boards .board--right");
    await b.hover({ force: true }); await page.waitForTimeout(400);
    const hv = await page.evaluate(() => ({
      scale: getComputedStyle(document.querySelector("#ato-2 .rodizio__boards .board--right")).scale,
      linha: getComputedStyle(document.querySelector('#ato-2 .callouts--wide path[data-callout="sashimi"]')).stroke,
      outra: getComputedStyle(document.querySelector('#ato-2 .callouts--wide path[data-callout="esquerda"]')).stroke,
    }));
    ok(hv.scale === "1.02" && hv.linha === "rgb(255, 254, 255)" && hv.outra !== hv.linha,
      `hover na tábua direita: scale ${hv.scale}, linha dela ${hv.linha}, linha da esquerda ${hv.outra}`);
    await ctx.close();
  }

  // quality
  for (const [q, esperado] of [["high", { vapor: 2, faiscas: 12, onda: true }], ["low", { vapor: 1, faiscas: 5, onda: false }]]) {
    const { ctx, page } = await abrir(atual.url, { query: `?quality=${q}` });
    await esperarMotion(page);
    const r = await page.evaluate(() => {
      const n = document.getAnimations().map((a) => a.animationName);
      return { vapor: n.filter((x) => x === "rodizio-steam").length, faiscas: n.filter((x) => x === "rodizio-ember").length, onda: !!motion.debug.ato2?.onda };
    });
    ok(r.vapor === esperado.vapor && r.faiscas === esperado.faiscas && r.onda === esperado.onda,
      `?quality=${q}: ${r.vapor} camada(s) de vapor, ${r.faiscas} faíscas, ondulação ${r.onda ? "sim" : "não"}`);
    await ctx.close();
  }
}

await browser.close();
atual.fechar(); srvRef.fechar();
await ref.apagar();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros nem avisos${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
writeFileSync(`${OUT}/medidas-ato2.json`, JSON.stringify(medidas, null, 2));
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
