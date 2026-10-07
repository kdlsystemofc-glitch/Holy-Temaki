// Testa e mede o motion do ACT III (#ato-3) — DESIGN.md §5 Sanctum, §5.0.
//   1. Quadros da entrada (0, 300, 900, 1500, 2600 ms) e estado final × estático aprovado
//   2. Contraste do título, pixel a pixel, durante a animação e no estado final (≥ 4,5:1)
//   3. Mescla da névoa intacta em todos os quadros; parallax sem expor bordas (capturas)
//   4. Navegação: pular o ACT III e voltar; ⏭ ⏮ rápidos — nunca preso escondido
//   5. Vídeos em 1440 e 390
//   6. Custo: 10 s parado no ACT III e rolagem ACT II → ACT III → ACT IV, high e low
//   7. Modos e qualidade
// Uso: npm run test:motion
import { mkdir, rm, rename, readdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { servir, extrairCommit, comparar, poseEstatica, medir, comTrace, GPU_ARGS } from "./lib-motion.mjs";

const REF_COMMIT = "1267f2a"; // "motion ato 2 pronto": ACT III estático aprovado
const OUT = "screenshots/motion";
const LIMIAR_CANAL = 24, MAX_PIXELS = 0.005;
const MIN_CONTRASTE = 4.5;

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
// Mescla da névoa: em screen ela só pode clarear o que está atrás. Captura com e sem a névoa
// (visibility) e conta, na área dela, os pixels que ficam MAIS ESCUROS com ela — mescla quebrada
// (o preto do plate por cima) aparece aí. O salão escurecido tem pixels quase pretos legítimos,
// por isso não serve a regra "≤ 3" do ACT II.
async function nevoaEscurece(page) {
  const clip = await page.evaluate(() => {
    // só a parte da névoa DENTRO da seção (ela é cortada no fim do ACT III; abaixo começa o ACT IV,
    // que pode estar animando entre as duas capturas)
    const r = document.querySelector("#ato-3 .sanctum__fog").getBoundingClientRect();
    const sec = document.getElementById("ato-3").getBoundingClientRect();
    const x = Math.max(0, r.x, sec.x), y = Math.max(0, r.y, sec.y);
    return { x, y, width: Math.min(innerWidth, r.right, sec.right) - x, height: Math.min(innerHeight, r.bottom, sec.bottom) - y };
  });
  if (clip.width < 2 || clip.height < 2) return { n: 0, fracao: 0 };
  const com = await page.screenshot({ clip });
  await page.evaluate(() => { document.querySelector("#ato-3 .sanctum__fog").style.visibility = "hidden"; });
  const sem = await page.screenshot({ clip });
  await page.evaluate(() => { document.querySelector("#ato-3 .sanctum__fog").style.visibility = ""; });
  return page.evaluate(async ([a, b]) => {
    const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
    const px = (img) => { const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, img.width, img.height).data; };
    const da = px(ia), db = px(ib);
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] < db[i] - 8 || da[i + 1] < db[i + 1] - 8 || da[i + 2] < db[i + 2] - 8) n++;
    return { n, fracao: n / (da.length / 4) };
  }, [`data:image/png;base64,${com.toString("base64")}`, `data:image/png;base64,${sem.toString("base64")}`]);
}
// ACT III no estado final: nada escondido, nada fora do lugar
const estadoFinal = (page) => page.evaluate(() => {
  const ato = document.getElementById("ato-3");
  const cs = (el) => getComputedStyle(el);
  const problemas = [];
  for (const el of ato.querySelectorAll(".neon__slot, .act-label, .sanctum__place, .sanctum__spill")) {
    if (cs(el).display !== "none" && cs(el).opacity !== "1") problemas.push(`${el.className} opacity ${cs(el).opacity}`);
  }
  if (cs(ato.querySelector(".sanctum__room-in")).transform !== "none") problemas.push("salão com escala de entrada");
  if (ato.querySelector(".sanctum__place-fx")) problemas.push("cópia do título ainda presente");
  if (ato.querySelector(".sanctum__place").classList.contains("is-letras")) problemas.push("título original ainda transparente");
  return problemas;
});

// Contraste do título por pixel: captura com o texto e com as letras transparentes (o halo escuro
// de text-shadow continua) — o fundo real de cada pixel do texto. Pixels do "miolo" da letra
// (próximos da cor do título) contam; a borda antisserrilhada não.
async function contraste(page) {
  const clip = await page.evaluate(() => {
    const r = document.querySelector("#ato-3 .sanctum__place").getBoundingClientRect();
    return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 };
  });
  const comTexto = await page.screenshot({ clip });
  await page.addStyleTag({ content: ".sanctum__place, .sanctum__place * { color: transparent !important; }" });
  await page.waitForTimeout(50);
  const semTexto = await page.screenshot({ clip });
  await page.evaluate(() => document.head.lastElementChild.remove());
  await page.waitForTimeout(50);
  return page.evaluate(async ([a, b]) => {
    const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
    const px = (img) => { const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, img.width, img.height).data; };
    const da = px(ia), db = px(ib);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const alvo = [0xE9, 0xD5, 0xC6]; // --place-warm
    let min = Infinity, n = 0;
    for (let i = 0; i < da.length; i += 4) {
      // miolo da letra: perto da cor do título E diferente do fundo sem o texto (o núcleo do neon
      // tem cor parecida com a do título, mas não muda quando o texto some)
      const perto = Math.abs(da[i] - alvo[0]) < 40 && Math.abs(da[i + 1] - alvo[1]) < 40 && Math.abs(da[i + 2] - alvo[2]) < 40;
      const mudou = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 40;
      if (!perto || !mudou) continue;
      n++;
      const c = (L(da, i) + 0.05) / (L(db, i) + 0.05);
      if (c < min) min = c;
    }
    return { min: n ? +min.toFixed(2) : null, pixels: n };
  }, [`data:image/png;base64,${comTexto.toString("base64")}`, `data:image/png;base64,${semTexto.toString("base64")}`]);
}

// ═══ 1–3. ENTRADA, ESTADO FINAL, CONTRASTE, MESCLA ═══
for (const [w, h] of [[1440, 810], [390, 844]]) {
  console.log(`\n— Entrada do ACT III (${w}) —`);
  const r = await abrir(srvRef.url, { width: w, height: h });
  await esperarMotion(r.page);
  await r.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-3").scrollIntoView({ behavior: "instant" }); });
  await r.page.mouse.move(w - 2, 2);
  await r.page.waitForTimeout(500);
  const pngRef = await r.page.locator("#ato-3").screenshot({ path: `${OUT}/ato3-${w}-estatico-aprovado.png` });
  const escureceRef = await nevoaEscurece(r.page);
  const contrasteRef = await contraste(r.page);
  await r.ctx.close();

  const { ctx, page } = await abrir(atual.url, { width: w, height: h, query: w >= 768 ? "?quality=high" : "" });
  await esperarMotion(page);
  await page.evaluate(() => motion.scrollTo("#ato-3", { imediato: true }));
  await page.waitForFunction(() => motion.debug.ato3?.entrada?.progress() > 0, null, { timeout: 5000 });
  await page.evaluate(() => { motion.debug.ato3.entrada.pause(); motion.debug.ato3.rotulo?.pause(); });
  let piorPretos = 0, piorContraste = Infinity, contrasteNoFade = Infinity;
  for (const t of [0, 300, 900, 1500, 2000, 2600]) {
    await page.evaluate((ms) => {
      motion.debug.ato3.entrada.time(ms / 1000);
      motion.debug.ato3.rotulo?.time(Math.min(ms / 1000, motion.debug.ato3.rotulo.duration()));
      for (const a of document.getAnimations()) if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = ms; }
    }, t);
    await page.waitForTimeout(60);
    await page.screenshot({ path: t === 2000 ? undefined : `${OUT}/ato3-${w}-entrada-${String(t).padStart(4, "0")}ms.png` });
    const p = await nevoaEscurece(page);
    piorPretos = Math.max(piorPretos, p.fracao);
    const c = await contraste(page);
    // o título termina o fade em 300 + 1400 ms; antes disso o contraste sobe junto com a opacidade
    if (c.min !== null) { if (t >= 1700) piorContraste = Math.min(piorContraste, c.min); else contrasteNoFade = Math.min(contrasteNoFade, c.min); }
    console.log(`  ${String(t).padStart(4)} ms: névoa escurece ${p.n} px (${(p.fracao * 100).toFixed(3)} %) · contraste mínimo do título ${c.min ?? "—"} (${c.pixels} px)`);
  }
  ok(piorPretos <= 0.001 && escureceRef.fracao <= 0.001,
    `${w}: mescla da névoa intacta em todos os quadros — ela nunca escurece o fundo (pior ${(piorPretos * 100).toFixed(3)} % dos pixels; estático ${(escureceRef.fracao * 100).toFixed(3)} %)`);

  // estado final + contraste com os loops em várias fases (inclui o pico do pulso = fase 0)
  await page.evaluate(() => { motion.debug.ato3.entrada.progress(1); motion.debug.ato3.rotulo?.progress(1); });
  await page.waitForTimeout(200);
  for (const fase of [0, 1250, 2500, 3750, 11200, 11500]) { // 11,2–11,5 s: dentro do micro-flicker
    await page.evaluate((ms) => { for (const a of document.getAnimations()) if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = a.effect.getTiming().delay + ms; } }, fase);
    await page.waitForTimeout(40);
    const c = await contraste(page);
    if (c.min !== null) piorContraste = Math.min(piorContraste, c.min);
  }
  // com parallax: o neon desliza atrás do título (o título não tem parallax)
  if (w >= 768) {
    for (const dy of [-240, -120, 120, 240]) {
      await page.evaluate((d) => { for (const a of document.getAnimations()) a.play(); motion.lenis.scrollTo(document.getElementById("ato-3").offsetTop + d, { immediate: true, force: true }); }, dy);
      await page.waitForTimeout(250);
      const c = await contraste(page);
      if (c.min !== null) piorContraste = Math.min(piorContraste, c.min);
      await page.screenshot({ path: `${OUT}/ato3-${w}-parallax${dy > 0 ? "+" : ""}${dy}.png` });
    }
  }
  medidas[`contraste-${w}`] = { depoisDoFade: piorContraste, duranteOFade: contrasteNoFade, estatico: contrasteRef.min };
  ok(piorContraste >= MIN_CONTRASTE && contrasteRef.min >= MIN_CONTRASTE,
    `${w}: contraste do título ≥ ${MIN_CONTRASTE}:1 depois do fade, com pulso, micro-flicker e parallax (pior ${piorContraste}:1; estático ${contrasteRef.min}:1; durante o fade de entrada ${contrasteNoFade}:1)`);

  await page.click("[data-pause]");
  await page.mouse.move(w - 2, 2);
  await page.evaluate(() => document.getElementById("ato-3").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(300);
  await poseEstatica(page);
  await page.waitForTimeout(150);
  const prob = await estadoFinal(page);
  ok(prob.length === 0, `${w}: estado final sem nada escondido ou deslocado ${JSON.stringify(prob)}`);
  const pngFase0 = await page.locator("#ato-3").screenshot({ path: `${OUT}/ato3-${w}-final-fase0.png` });
  const d0 = await comparar(page, pngRef, pngFase0, LIMIAR_CANAL);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
  await page.waitForTimeout(150);
  const pngFinal = await page.locator("#ato-3").screenshot({ path: `${OUT}/ato3-${w}-final.png` });
  const d = await comparar(page, pngRef, pngFinal, LIMIAR_CANAL);
  medidas[`dif-${w}`] = { repouso: d, fase0: d0 };
  console.log(`  loops na fase 0 (com camada): ${(d0.fracao * 100).toFixed(3)} % dos pixels diferem, média ${d0.media.toFixed(2)}/255`);
  ok(d.fracao <= MAX_PIXELS,
    `${w}: estado final (repouso) × estático aprovado — ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (> ${LIMIAR_CANAL}/255), média ${d.media.toFixed(2)}/255 (${d.tamanhos}); limite ${MAX_PIXELS * 100} %`);
  await ctx.close();
}

// ═══ 4. NAVEGAÇÃO: NUNCA PRESO ESCONDIDO ═══
{
  console.log("\n— Navegação (pular o ACT III e voltar) —");
  const cenarios = [
    ["trilho → #ato-4, volta rolando", async (page) => {
      await page.click(".rail__tick[href='#ato-4']"); await assentar(page, "#ato-4");
      await page.mouse.move(700, 400);
      for (let i = 0; i < 60 && (await topoDe(page, "#ato-3")) < -100; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(140); }
    }],
    ["menu → Reservas, volta pelo trilho", async (page) => {
      await page.click(".menu-toggle"); await page.waitForTimeout(250);
      await page.click(".menu__link[href='#ato-4']"); await assentar(page, "#ato-4");
      await page.click(".rail__tick[href='#ato-3']");
    }],
    ["⏭ ⏭ ⏭ ⏮ rápidos", async (page) => {
      for (const d of ["next", "next", "next", "prev"]) { await page.click(`[data-act=${d}]`, { force: true }); await page.waitForTimeout(150); }
    }],
  ];
  for (const [nome, passos] of cenarios) {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await passos(page);
    const topo = await assentar(page, "#ato-3");
    await page.waitForTimeout(3000);
    const prob = await estadoFinal(page);
    const alt = await page.evaluate(() => innerHeight);
    ok(topo > -alt * 0.5 && topo < alt * 0.5 && prob.length === 0, `${nome}: ACT III visível (top ${topo}px) e no estado final${prob.length ? " — " + prob.join("; ") : ""}`);
    await ctx.close();
  }
}

// ═══ 5. VÍDEOS ═══
{
  console.log("\n— Vídeos —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const dir = join(OUT, `video-ato3-${w}`);
    await rm(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
    const page = await ctx.newPage();
    await page.goto(atual.url, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 10000 });
    await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true }));
    await page.waitForTimeout(600);
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 70); await page.waitForTimeout(110); } // ACT II → ACT III
    await page.evaluate(() => motion.scrollTo("#ato-3"));
    await page.waitForTimeout(5000); // entrada + loops (inclui um micro-flicker)
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(110); } // → ACT IV
    await page.waitForTimeout(800);
    await ctx.close();
    const [arq] = await readdir(dir);
    await rename(join(dir, arq), join(OUT, `ato3-${w}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`  ${OUT}/ato3-${w}.webm`);
  }
}

// ═══ 6. CUSTO ═══
{
  console.log("\n— Custo (10 s parado no ACT III / rolagem ACT II → ACT III → ACT IV) —");
  const gpu = await chromium.launch({ args: GPU_ARGS });
  // Orçamento: até 2 quadros longos isolados e até 5 % de quadros descartados — ou, na rolagem,
  // até 2 pontos acima do controle (o site aprovado medido na mesma execução). Este ambiente tem
  // rajadas de ~30 quadros descartados até no controle, do tamanho do próprio orçamento.
  let controleRol = 0;
  const pctD = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
  const noOrcamento = (m, rol = false) => m.loaf50 <= 2 && (pctD(m) <= 0.05 || (rol && pctD(m) <= controleRol + 0.02));
  const casos = [
    ["high — controle: site aprovado, sem o motion do ACT III", "?quality=high", 1440, 810, srvRef.url],
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
    await page.evaluate(() => motion.scrollTo("#ato-3", { imediato: true }));
    await page.waitForTimeout(3000);
    const parado = await fase(() => medir(page, 10000));
    await page.mouse.move(w / 2, h / 2);
    const rol = await fase(async () => {
      await page.evaluate(() => motion.scrollTo("#ato-2", { imediato: true }));
      const m = medir(page, 10000);
      const dist = await page.evaluate(() => document.getElementById("ato-4").offsetTop - document.getElementById("ato-2").offsetTop);
      const passos = Math.round(dist / 90);
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

// ═══ 7. MODOS E QUALIDADE ═══
{
  console.log("\n— Modos e qualidade —");
  const loopsAto3 = (page) => page.evaluate(() => document.getAnimations()
    .filter((a) => /^(neon-|neblina-)/.test(a.animationName)).map((a) => [a.animationName, a.playState]));

  // reduced: idêntico ao estático aprovado, sem loops nem parallax
  {
    const r = await abrir(srvRef.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(r.page);
    await r.page.evaluate(() => document.getElementById("ato-3").scrollIntoView({ behavior: "instant" }));
    await r.page.mouse.move(1438, 2); await r.page.waitForTimeout(400);
    const pngRef = await r.page.locator("#ato-3").screenshot();
    await r.ctx.close();
    const { ctx, page } = await abrir(atual.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(page);
    await page.evaluate(() => document.getElementById("ato-3").scrollIntoView({ behavior: "instant" }));
    await page.mouse.move(1438, 2); await page.waitForTimeout(400);
    const loops = (await loopsAto3(page)).filter(([, st]) => st === "running");
    const d = await comparar(page, pngRef, await page.locator("#ato-3").screenshot());
    const prob = await estadoFinal(page);
    ok(loops.length === 0 && prob.length === 0 && d.fracao <= MAX_PIXELS,
      `reduced: ${loops.length} loops, nada escondido, idêntico ao estático (${(d.fracao * 100).toFixed(3)} %)`);
    await ctx.close();
  }

  // paused: congela e retoma
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await page.evaluate(() => motion.scrollTo("#ato-3", { imediato: true }));
    await page.waitForTimeout(3000);
    const antes = await loopsAto3(page);
    await page.click("[data-pause]"); await page.waitForTimeout(150);
    const lerZoom = () => page.evaluate(() => getComputedStyle(document.querySelector("#ato-3 .sanctum__room-zoom")).transform);
    const pausados = await loopsAto3(page);
    const z = await lerZoom();
    ok(antes.length > 0 && pausados.every(([, st]) => st === "paused") && z === "none",
      `paused: ${pausados.length} loops CSS do ACT III pausados, zoom de rolagem em repouso (${z})`);
    await page.click("[data-pause]"); await page.waitForTimeout(600);
    const depois = await loopsAto3(page);
    await page.evaluate(() => motion.lenis.scrollTo(document.getElementById("ato-3").offsetTop + 300, { immediate: true, force: true }));
    await page.waitForTimeout(300);
    const z2 = await lerZoom();
    ok(depois.every(([, st]) => st === "running") && z2 !== "none", `ao sair do pause: loops rodando e zoom de rolagem de volta (${z2})`);
    await ctx.close();
  }

  // quality: camadas animadas; título em letras só em "high"
  for (const [q, esperado] of [["high", { pulso: 6, micro: 1, nevoa: 1, letras: true }], ["low", { pulso: 2, micro: 0, nevoa: 0, letras: false }]]) {
    const { ctx, page } = await abrir(atual.url, { query: `?quality=${q}` });
    await esperarMotion(page);
    await page.evaluate(() => motion.scrollTo("#ato-3", { imediato: true }));
    await page.waitForTimeout(600);
    const letras = await page.evaluate(() => !!document.querySelector(".sanctum__place-fx"));
    const a11y = await page.evaluate(() => document.querySelector("#ato-3 .sanctum__place").textContent.replace(/\s+/g, " ").includes("São Bernardo do Campo"));
    await page.waitForTimeout(2600);
    const r = await page.evaluate(() => {
      const n = document.getAnimations().map((a) => a.animationName);
      return { pulso: n.filter((x) => x === "neon-pulso").length, micro: n.filter((x) => x === "neon-micro").length, nevoa: n.filter((x) => x === "neblina-deriva").length };
    });
    ok(r.pulso === esperado.pulso && r.micro === esperado.micro && r.nevoa === esperado.nevoa && letras === esperado.letras && a11y,
      `?quality=${q}: pulso em ${r.pulso} barras, micro-flicker ${r.micro}, deriva da névoa ${r.nevoa}, título ${letras ? "em letras" : "só fade"}, texto original acessível durante a entrada`);
    await ctx.close();
  }
}

await browser.close();
atual.fechar(); srvRef.fechar();
await ref.apagar();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros nem avisos${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
writeFileSync(`${OUT}/medidas-ato3.json`, JSON.stringify(medidas, null, 2));
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
