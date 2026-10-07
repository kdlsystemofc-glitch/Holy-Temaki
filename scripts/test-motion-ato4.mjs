// Testa e mede o motion do ACT IV (#ato-4) — DESIGN.md §5 Reserva, §5.0.
// PRIORIDADE: o formulário funciona durante qualquer animação.
//   1. Quadros da entrada (0, 300, 900, 1500, 2400 ms) e estado final × estático aprovado
//   2. Sem cintilação do card (quadros consecutivos no fim da entrada)
//   3. Formulário durante a animação: enviar, digitar no contador, Tab, erro × envio válido,
//      reflexo espelhando
//   4. Contraste: pior quadro da varredura do botão e as legendas
//   5. Navegação: pular pelo menu/trilho e sair; ⏭ ⏮ rápidos — nunca preso escondido
//   6. Um feTurbulence animado por vez
//   7. Vídeos; 8. Custo; 9. Modos e qualidade
// Uso: npm run test:motion
import { mkdir, rm, rename, readdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { servir, extrairCommit, comparar, poseEstatica, medir, comTrace, GPU_ARGS } from "./lib-motion.mjs";

const REF_COMMIT = "54ca0c2"; // "motion ato 3 pronto": ACT IV estático aprovado
const OUT = "screenshots/motion";
const LIMIAR_CANAL = 24, MAX_PIXELS = 0.005, MIN_CONTRASTE = 4.5;

const ref = await extrairCommit(REF_COMMIT);
const atual = await servir("site");
const srvRef = await servir(ref.raiz);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const erros = [], requests = new Set(), medidas = {};
const pad = (n) => String(n).padStart(2, "0");

async function abrir(url, { width = 1440, height = 810, query = "", contexto = {}, nav = browser, capturarOpen = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  if (capturarOpen) await page.addInitScript(() => { window.__aberto = []; window.open = (u) => { window.__aberto.push(u); return null; }; });
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
// leva o ACT IV à tela e espera a entrada começar
const dispararEntrada = async (page) => {
  await page.evaluate(() => void motion.scrollTo("#ato-4", { imediato: true }));
  await page.waitForFunction(() => motion.debug.ato4?.entrada?.progress() > 0, null, { timeout: 5000 });
};
// ACT IV no estado final: nada escondido, nada fora do lugar, formulário intacto
const estadoFinal = (page) => page.evaluate(() => {
  const ato = document.getElementById("ato-4");
  const cs = (el) => getComputedStyle(el);
  const p = [];
  if (cs(ato.querySelector(".act-label")).opacity !== "1") p.push("rótulo escondido");
  if (cs(ato.querySelector(".reserve__slot")).transform !== "none") p.push(`card deslocado ${cs(ato.querySelector(".reserve__slot")).transform}`);
  if (cs(ato.querySelector(".reserve__reflection")).opacity !== "0.62") p.push(`reflexo com opacity ${cs(ato.querySelector(".reserve__reflection")).opacity}`);
  if (ato.querySelector(".num-contador")) p.push("contador ainda montado");
  if (ato.querySelector(".num.is-contando")) p.push("campo ainda transparente");
  return p;
});
const reflexoOk = (page) => page.evaluate(() => [...document.querySelectorAll(".reserve__reflection [data-mirror]")].every((s) => {
  if (s.dataset.mirror === "wa-label") return true;
  const src = document.getElementById(s.dataset.mirror);
  return s.textContent === (src.tagName === "SELECT" ? src.selectedOptions[0]?.text : src.value);
}));

// Contraste por pixel: captura com texto e com o texto transparente; conta o miolo das letras
// (ver abaixo); razão WCAG entre o texto e o fundo daquele mesmo pixel.
async function contraste(page, sel, cssEsconder, cores) {
  const clip = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
  const a = await page.screenshot({ clip });
  const tag = await page.addStyleTag({ content: cssEsconder });
  await page.waitForTimeout(30);
  const b = await page.screenshot({ clip });
  await tag.evaluate((t) => t.remove());
  await page.waitForTimeout(30);
  return page.evaluate(async ([sa, sb, cs]) => {
    const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([carregar(sa), carregar(sb)]);
    const px = (img) => { const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, img.width, img.height).data; };
    const da = px(ia), db = px(ib);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    let min = Infinity, n = 0;
    for (let i = 0; i < da.length; i += 4) {
      const dif = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      // miolo da letra: perto de uma das cores de texto E do lado certo do fundo (letra clara
      // mais clara que o fundo; escura, mais escura). Sem a 2ª condição, a borda cinza de uma letra
      // escura sobre fundo claro passava por "letra clara" (medido: 194,194,195 × #D8D9DB)
      const la = L(da, i), lb = L(db, i);
      const perto = cs.some(([r, g, b]) => {
        if (Math.abs(da[i] - r) >= 30 || Math.abs(da[i + 1] - g) >= 30 || Math.abs(da[i + 2] - b) >= 30) return false;
        const clara = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.18;
        return clara ? la > lb : la < lb;
      });
      if (dif <= 60 || !perto) continue;
      n++;
      const c = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      if (c < min) min = c;
    }
    return { min: n ? +min.toFixed(2) : null, pixels: n };
  }, [`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`, cores]);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const TEXTO_CLARO = hex("#D8D9DB"), TEXTO_ESCURO = hex("#040507"); // --text-base, --ink-900

// ═══ 1–2. ENTRADA, ESTADO FINAL, CINTILAÇÃO ═══
for (const [w, h] of [[1440, 810], [390, 844]]) {
  console.log(`\n— Entrada do ACT IV (${w}) —`);
  const r = await abrir(srvRef.url, { width: w, height: h });
  await esperarMotion(r.page);
  await r.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }); });
  await r.page.mouse.move(w - 2, 2);
  await r.page.waitForTimeout(600);
  const pngRef = await r.page.locator("#ato-4").screenshot({ path: `${OUT}/ato4-${w}-estatico-aprovado.png` });
  await r.ctx.close();

  const { ctx, page } = await abrir(atual.url, { width: w, height: h, query: w >= 768 ? "?quality=high" : "" });
  await esperarMotion(page);
  await page.mouse.move(w - 2, 2);
  await dispararEntrada(page);
  await page.evaluate(() => { motion.debug.ato4.entrada.pause(); motion.debug.ato4.rotulo?.pause(); });
  for (const t of [0, 300, 900, 1500, 2400]) {
    await page.evaluate((ms) => {
      const e = motion.debug.ato4.entrada;
      e.time(Math.min(ms / 1000, e.duration()));
      motion.debug.ato4.rotulo?.time(Math.min(ms / 1000, motion.debug.ato4.rotulo.duration()));
      for (const a of document.getAnimations()) if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = ms; }
    }, t);
    await page.waitForTimeout(60);
    await page.screenshot({ path: `${OUT}/ato4-${w}-entrada-${String(t).padStart(4, "0")}ms.png` });
  }
  // cintilação: card em quadros consecutivos de 30 ms no fim da entrada e logo depois dela
  const clipCard = await page.evaluate(() => { const r = document.getElementById("reserva").getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y - 30), width: r.width, height: r.height + 60 }; });
  const quadros = [];
  for (const t of [780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140]) {
    await page.evaluate((ms) => void motion.debug.ato4.entrada.time(Math.min(ms / 1000, motion.debug.ato4.entrada.duration())), t);
    await page.waitForTimeout(40);
    quadros.push(await page.screenshot({ clip: clipCard }));
  }
  await page.evaluate(() => void motion.debug.ato4.entrada.progress(1)); // fim: limpa estilos
  await page.waitForTimeout(80);
  quadros.push(await page.screenshot({ clip: clipCard }));
  const saltos = [];
  for (let i = 1; i < quadros.length; i++) saltos.push((await comparar(page, quadros[i - 1], quadros[i], 12)).fracao);
  const ultimo = saltos.at(-1), maior = Math.max(...saltos);
  medidas[`cintilacao-${w}`] = saltos;
  ok(ultimo <= 0.005 && maior <= 0.05,
    `${w}: card sem cintilação — quadros de 30 ms mudam no máx. ${(maior * 100).toFixed(2)} % dos pixels; fim da entrada → estilos limpos ${(ultimo * 100).toFixed(3)} %`);

  // estado final × estático
  await page.evaluate(() => void motion.debug.ato4.rotulo?.progress(1));
  await page.click("[data-pause]");
  await page.mouse.move(w - 2, 2);
  await page.evaluate(() => document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(300);
  await poseEstatica(page);
  await page.waitForTimeout(150);
  const prob = await estadoFinal(page);
  ok(prob.length === 0, `${w}: estado final sem nada escondido ou deslocado ${JSON.stringify(prob)}`);
  const pngFase0 = await page.locator("#ato-4").screenshot();
  const d0 = await comparar(page, pngRef, pngFase0, LIMIAR_CANAL);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
  await page.waitForTimeout(150);
  const pngFinal = await page.locator("#ato-4").screenshot({ path: `${OUT}/ato4-${w}-final.png` });
  const d = await comparar(page, pngRef, pngFinal, LIMIAR_CANAL);
  medidas[`dif-${w}`] = { repouso: d, fase0: d0 };
  console.log(`  loops na fase 0 (com camada): ${(d0.fracao * 100).toFixed(3)} % dos pixels diferem`);
  ok(d.fracao <= MAX_PIXELS,
    `${w}: estado final (repouso) × estático aprovado — ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (> ${LIMIAR_CANAL}/255), média ${d.media.toFixed(2)}/255 (${d.tamanhos}); limite ${MAX_PIXELS * 100} %`);
  await ctx.close();
}

// ═══ 3. FORMULÁRIO DURANTE A ANIMAÇÃO ═══
{
  console.log("\n— Formulário durante a animação —");
  const daqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d; };
  const esperado = (d, hh, mm, a, c) =>
    `Olá! Gostaria de reservar uma mesa para o dia ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${hh}:${mm}, ${a} ${a === 1 ? "adulto" : "adultos"} e ${c} ${c === 1 ? "criança" : "crianças"}.`;

  // a) preencher e enviar com a entrada e o contador rodando
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high", capturarOpen: true });
    await esperarMotion(page);
    await dispararEntrada(page);
    await page.waitForFunction(() => document.querySelector(".num-contador"), null, { timeout: 3000 }); // contador no ar
    const d = daqui(4);
    await page.selectOption("#res-mes", `${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    await page.selectOption("#res-dia", String(d.getDate()));
    for (const [id, v] of [["#res-hh", "19"], ["#res-mm", "45"], ["#res-adultos", "3"], ["#res-criancas", "1"]]) await page.fill(id, v);
    await page.click("#reserva button[type=submit]");
    await page.waitForTimeout(150);
    const [u] = await page.evaluate(() => window.__aberto);
    const msg = u && decodeURIComponent(u.split("?text=")[1]);
    ok(msg === esperado(d, "19", "45", 3, 1), `enviar com a entrada e o contador rodando: wa.me exato ("${msg}")`);
    const r = await page.evaluate(() => ({ prog: motion.debug.ato4.entrada.progress(), contador: !!document.querySelector(".num-contador"), confirmacoes: motion.debug.ato4.confirmacoes || 0 }));
    ok(r.prog === 1 && !r.contador, "a interação concluiu a entrada e cancelou o contador na hora");
    ok(r.confirmacoes === 1, `envio válido dispara a ondulação (${r.confirmacoes}) e o link abriu`);
    ok(await reflexoOk(page), "reflexo espelha os valores digitados (durante e depois da entrada)");
    await ctx.close();
  }

  // b) digitar no meio do contador
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await dispararEntrada(page);
    await page.waitForFunction(() => document.querySelector(".num-contador"), null, { timeout: 3000 });
    await page.click("#res-hh");
    await page.keyboard.press("Control+A");
    await page.keyboard.type("21");
    const durante = await page.evaluate(() => ({ v: document.getElementById("res-hh").value, contador: !!document.querySelector(".num-contador"), classe: document.getElementById("res-hh").classList.contains("is-contando") }));
    await page.waitForTimeout(1000);
    const depois = await page.evaluate(() => document.getElementById("res-hh").value);
    ok(durante.v === "21" && depois === "21" && !durante.contador && !durante.classe,
      `digitar no meio do contador: valor "${depois}" permanece, contador cancelado na hora`);
    ok(await reflexoOk(page), "reflexo espelha o valor digitado no meio do contador");
    await ctx.close();
  }

  // c) Tab até um campo antes do fim da entrada
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await dispararEntrada(page);
    await page.focus("[data-act=next]");
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement, b = el.getBoundingClientRect();
      return { id: el.id, visivel: b.top >= 0 && b.bottom <= innerHeight && getComputedStyle(el).visibility === "visible", prog: motion.debug.ato4.entrada.progress(), outline: getComputedStyle(el).outlineStyle };
    });
    ok(r.id === "res-dia" && r.visivel && r.prog === 1 && r.outline === "solid",
      `Tab antes do fim da entrada: #${r.id} focado, visível, contorno âmbar na hora, entrada concluída (${r.prog})`);
    await ctx.close();
  }

  // d) erro de validação: nenhuma ondulação
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high", capturarOpen: true });
    await esperarMotion(page);
    await dispararEntrada(page);
    await page.fill("#res-hh", "25");
    await page.click("#reserva button[type=submit]");
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({ abertos: window.__aberto.length, erro: !document.getElementById("res-erro").hidden, confirmacoes: motion.debug.ato4.confirmacoes || 0, ondas: document.querySelectorAll(".reserve__onda").length }));
    ok(r.abertos === 0 && r.erro && r.confirmacoes === 0 && r.ondas === 0, "erro de validação: mensagem de erro, nenhuma ondulação, nada aberto");
    await page.fill("#res-hh", "20");
    await page.click("#reserva button[type=submit]");
    await page.waitForTimeout(100);
    const r2 = await page.evaluate(() => ({ abertos: window.__aberto.length, ondas: document.querySelectorAll(".reserve__onda").length, confirmacoes: motion.debug.ato4.confirmacoes || 0 }));
    ok(r2.abertos === 1 && r2.confirmacoes === 1 && r2.ondas === 1, "corrigido e enviado: link aberto e a ondulação no ar (depois do window.open)");
    await page.waitForTimeout(800);
    ok(await page.evaluate(() => document.querySelectorAll(".reserve__onda").length) === 0, "a ondulação some sozinha depois de 600 ms");
    await ctx.close();
  }
}

// ═══ 4. CONTRASTE: VARREDURA DO BOTÃO E LEGENDAS ═══
{
  console.log("\n— Contraste —");
  const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
  await esperarMotion(page);
  await page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }); });
  await page.waitForTimeout(400);
  await page.hover("#reserva button[type=submit]");
  await page.waitForTimeout(40);
  // as transições do ::before e do ::after: congela e percorre a varredura
  const nTrans = await page.evaluate(() => {
    const t = document.getAnimations().filter((a) => a.effect?.pseudoElement && a.effect.target?.matches?.(".btn-wa"));
    t.forEach((a) => a.pause());
    return t.length;
  });
  let pior = Infinity;
  const esconder = ".btn-wa, .btn-wa::after { color: transparent !important; }";
  for (const f of [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1]) {
    await page.evaluate((fr) => {
      for (const a of document.getAnimations()) if (a.effect?.pseudoElement && a.effect.target?.matches?.(".btn-wa")) a.currentTime = fr * a.effect.getComputedTiming().duration;
    }, f);
    await page.waitForTimeout(40);
    if (f === 0.5) await page.screenshot({ path: `${OUT}/ato4-botao-varredura-50.png`, clip: await page.evaluate(() => { const r = document.querySelector("#reserva button").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
    const c = await contraste(page, "#reserva button[type=submit]", esconder, [TEXTO_CLARO, TEXTO_ESCURO]);
    if (c.min !== null) pior = Math.min(pior, c.min);
    console.log(`  varredura ${String(Math.round(f * 100)).padStart(3)} %: contraste mínimo ${c.min} (${c.pixels} px)`);
  }
  medidas.contrasteBotao = pior;
  // referência: os dois estados do botão no site aprovado (repouso e hover instantâneo)
  const rr = await abrir(srvRef.url, { query: "?quality=high" });
  await esperarMotion(rr.page);
  await rr.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }); });
  await rr.page.waitForTimeout(300);
  const refRepouso = await contraste(rr.page, "#reserva button[type=submit]", ".btn-wa { color: transparent !important; }", [TEXTO_CLARO, TEXTO_ESCURO]);
  await rr.page.hover("#reserva button[type=submit]"); await rr.page.waitForTimeout(100);
  const refHover = await contraste(rr.page, "#reserva button[type=submit]", ".btn-wa { color: transparent !important; }", [TEXTO_CLARO, TEXTO_ESCURO]);
  await rr.ctx.close();
  console.log(`  referência (site aprovado): repouso ${refRepouso.min}:1, hover ${refHover.min}:1`);
  ok(nTrans === 2 && pior >= MIN_CONTRASTE, `botão: contraste ≥ ${MIN_CONTRASTE}:1 em todos os quadros da varredura (pior ${pior}:1; ${nTrans} transições)`);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  const cor = async (sel) => hex(await page.evaluate((s) => {
    const [r, g, b] = getComputedStyle(document.querySelector(s)).color.match(/\d+/g).map(Number);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }, sel));
  // Texto pequeno (legendas em --fs-label): o "miolo" quase nunca atinge a cor exata, então a
  // métrica por pixel subestima. Vale o contraste nominal WCAG (cor do texto × fundo real medido
  // atrás dele, mediana) — e a métrica por pixel não pode piorar em relação ao estático aprovado.
  const nominal = (sel) => page.evaluate(async ([s, esconder]) => {
    const el = document.querySelector(s);
    const [r, g, b] = getComputedStyle(el).color.match(/\d+/g).map(Number);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const Lc = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return { Lc, rect: el.getBoundingClientRect().toJSON() };
  }, [sel]);
  const fundo = async (sel, esconder) => {
    const { Lc, rect } = await nominal(sel);
    const tag = await page.addStyleTag({ content: esconder });
    await page.waitForTimeout(30);
    const png = await page.screenshot({ clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
    await tag.evaluate((t) => t.remove());
    return page.evaluate(async ([src, lc]) => {
      const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true });
      c.drawImage(img, 0, 0);
      const d = c.getImageData(0, 0, img.width, img.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const ls = [];
      for (let i = 0; i < d.length; i += 4) ls.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
      ls.sort((x, y) => x - y);
      const lb = ls[Math.floor(ls.length / 2)];
      return +((Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05)).toFixed(2);
    }, [`data:image/png;base64,${png.toString("base64")}`, Lc]);
  };
  const SEL_LEG = ".field-group--time .field-group__legend", ESC_LEG = ".field-group__legend { color: transparent !important; }";
  const SEL_NOTA = "#reserva .reserve__note", ESC_NOTA = ".reserve__note { color: transparent !important; }";
  const leg = await contraste(page, SEL_LEG, ESC_LEG, [await cor(SEL_LEG)]);
  const nota = await contraste(page, SEL_NOTA, ESC_NOTA, [await cor(SEL_NOTA)]);
  const legNom = await fundo(SEL_LEG, ESC_LEG), notaNom = await fundo(SEL_NOTA, ESC_NOTA);
  const rr2 = await abrir(srvRef.url, { query: "?quality=high" });
  await esperarMotion(rr2.page);
  await rr2.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }); });
  await rr2.page.waitForTimeout(300);
  const corRef = async (sel) => hex(await rr2.page.evaluate((s) => "#" + getComputedStyle(document.querySelector(s)).color.match(/\d+/g).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join(""), sel));
  const legRef = await contraste(rr2.page, SEL_LEG, ESC_LEG, [await corRef(SEL_LEG)]);
  const notaRef = await contraste(rr2.page, SEL_NOTA, ESC_NOTA, [await corRef(SEL_NOTA)]);
  await rr2.ctx.close();
  medidas.contrasteLegenda = { nominal: legNom, pixel: leg.min, pixelEstatico: legRef.min };
  medidas.contrasteNota = { nominal: notaNom, pixel: nota.min, pixelEstatico: notaRef.min };
  ok(legNom >= MIN_CONTRASTE && notaNom >= MIN_CONTRASTE && leg.min >= legRef.min - 0.1 && nota.min >= notaRef.min - 0.1,
    `legendas e nota: contraste nominal ${legNom}:1 e ${notaNom}:1; por pixel ${leg.min} e ${nota.min} (estático aprovado: ${legRef.min} e ${notaRef.min})`);
  await ctx.close();
}

// ═══ 5. NAVEGAÇÃO ═══
{
  console.log("\n— Navegação (chegar ao ACT IV e sair) —");
  const cenarios = [
    ["menu → Reservas, sai rolando até o rodapé", async (page) => {
      await page.click(".menu-toggle"); await page.waitForTimeout(250);
      await page.click(".menu__link[href='#ato-4']"); await assentar(page, "#ato-4");
      await page.mouse.move(700, 300);
      for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(120); } // até o rodapé
      await page.waitForTimeout(600);
      for (let i = 0; i < 60 && (await topoDe(page, "#ato-4")) < -100; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(140); }
    }],
    ["trilho → #ato-4 direto do topo", async (page) => { await page.click(".rail__tick[href='#ato-4']"); }],
    ["⏭ ⏭ ⏭ ⏮ ⏭ rápidos", async (page) => {
      for (const d of ["next", "next", "next", "prev", "next"]) { await page.click(`[data-act=${d}]`, { force: true }); await page.waitForTimeout(150); }
    }],
  ];
  for (const [nome, passos] of cenarios) {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await passos(page);
    const topo = await assentar(page, "#ato-4");
    await page.waitForTimeout(2000);
    const prob = await estadoFinal(page);
    const alt = await page.evaluate(() => innerHeight);
    ok(topo > -alt && topo < alt * 0.5 && prob.length === 0, `${nome}: ACT IV visível (top ${topo}px) e no estado final${prob.length ? " — " + prob.join("; ") : ""}`);
    await ctx.close();
  }
}

// ═══ 6. UM feTurbulence POR VEZ ═══
{
  console.log("\n— Um feTurbulence animado por vez —");
  const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
  await esperarMotion(page);
  const alturas = await page.evaluate(() => ["ato-1", "ato-2", "ato-3", "ato-4"].map((id) => document.getElementById(id).offsetTop));
  const vistos = [];
  let violacoes = 0;
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= max; y += Math.round(max / 14)) {
    await page.evaluate((v) => motion.lenis.scrollTo(v, { immediate: true, force: true }), y);
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const d = motion.debug;
      const loops = gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && !t.paused());
      const de = (t) => (t === d.ato2?.onda ? "ACT II" : t === d.ato4?.onda ? "ACT IV" : "hero");
      return [...new Set(loops.map(de))];
    });
    if (r.length > 1) violacoes++;
    vistos.push(`${y}px: ${r.join("+") || "—"}`);
  }
  console.log("  " + vistos.join(" · "));
  ok(violacoes === 0, `nunca duas seções com feTurbulence animado ao mesmo tempo (${violacoes} violações em ${vistos.length} posições)`);
  void alturas;
  await ctx.close();
}

// ═══ 7. VÍDEOS ═══
{
  console.log("\n— Vídeos —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const dir = join(OUT, `video-ato4-${w}`);
    await rm(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(atual.url, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 10000 });
    await page.evaluate(() => void motion.scrollTo("#ato-3", { imediato: true }));
    await page.waitForTimeout(600);
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 70); await page.waitForTimeout(110); }
    await page.evaluate(() => void motion.scrollTo("#ato-4"));
    await page.waitForTimeout(2600); // entrada + contador
    if (w >= 768) { await page.hover("#reserva button[type=submit]"); await page.waitForTimeout(700); }
    await page.click("#reserva button[type=submit]"); // envio válido: ondulação
    await page.waitForTimeout(1500);
    await ctx.close();
    const [arq] = await readdir(dir);
    await rename(join(dir, arq), join(OUT, `ato4-${w}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`  ${OUT}/ato4-${w}.webm`);
  }
}

// ═══ 8. CUSTO ═══
{
  console.log("\n— Custo (10 s parado no ACT IV / rolagem ACT III → ACT IV) —");
  const gpu = await chromium.launch({ args: GPU_ARGS });
  let controleRol = 0;
  const pctD = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
  const noOrcamento = (m, rol = false) => m.loaf50 <= 2 && (pctD(m) <= 0.05 || (rol && pctD(m) <= controleRol + 0.02));
  const casos = [
    ["high — controle: site aprovado, sem o motion do ACT IV", "?quality=high", 1440, 810, srvRef.url],
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
    await page.evaluate(() => void motion.scrollTo("#ato-4", { imediato: true }));
    await page.mouse.move(w - 2, 2);
    await page.waitForTimeout(2600);
    const parado = await fase(() => medir(page, 10000));
    await page.mouse.move(w / 2, 100);
    const rol = await fase(async () => {
      await page.evaluate(() => void motion.scrollTo("#ato-3", { imediato: true }));
      const m = medir(page, 10000);
      const dist = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - document.getElementById("ato-3").offsetTop);
      const passos = Math.max(10, Math.round(dist / 90));
      for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(Math.floor(9000 / passos)); }
      return m;
    }, true);
    if (controle) controleRol = pctD(rol);
    medidas[`custo-${rotulo}`] = { parado, rolando: rol };
    const linha = (m) => `rAF ${m.fps} fps (p95 ${m.p95} ms, máx ${m.max} ms) · compositor ${m.compositor.quadros - m.compositor.descartados}/${m.compositor.quadros} apresentados, ${m.compositor.descartados} descartados · LoAF > 50 ms: ${m.loaf50} (máx ${m.loafMax} ms)${m.repetida ? ` [repetida; ${m.repetida}]` : ""}${m.longos.length ? "\n      " + m.longos.join("\n      ") : ""}`;
    console.log(`  ${rotulo}\n    parado:  ${linha(parado)}\n    rolando: ${linha(rol)}`);
    if (controle) { await ctx.close(); continue; }
    ok(noOrcamento(parado) && noOrcamento(rol, true),
      `${rotulo}: dentro do orçamento (longos ${parado.loaf50}/${rol.loaf50}, descartados ${(pctD(parado) * 100).toFixed(1)} % / ${(pctD(rol) * 100).toFixed(1)} %; controle rolando ${(controleRol * 100).toFixed(1)} %)`);
    await ctx.close();
  }
  await gpu.close();
}

// ═══ 9. MODOS E QUALIDADE ═══
{
  console.log("\n— Modos e qualidade —");
  const loopsAto4 = (page) => page.evaluate(() => document.getAnimations()
    .filter((a) => a.animationName === "bruma-deriva").map((a) => a.playState));

  // reduced: idêntico ao estático, sem loops nem parallax, sem contador nem ondulação
  {
    const r = await abrir(srvRef.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(r.page);
    await r.page.evaluate(() => document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }));
    await r.page.mouse.move(1438, 2); await r.page.waitForTimeout(400);
    const pngRef = await r.page.locator("#ato-4").screenshot();
    await r.ctx.close();
    const { ctx, page } = await abrir(atual.url, { contexto: { reducedMotion: "reduce" }, capturarOpen: true });
    await esperarMotion(page);
    await page.evaluate(() => document.getElementById("ato-4").scrollIntoView({ behavior: "instant" }));
    await page.mouse.move(1438, 2); await page.waitForTimeout(400);
    const loops = (await loopsAto4(page)).filter((st) => st === "running");
    const d = await comparar(page, pngRef, await page.locator("#ato-4").screenshot());
    const prob = await estadoFinal(page);
    await page.click("#reserva button[type=submit]"); await page.waitForTimeout(100);
    const ondas = await page.evaluate(() => [document.querySelectorAll(".reserve__onda").length, window.__aberto.length]);
    ok(loops.length === 0 && prob.length === 0 && d.fracao <= MAX_PIXELS && ondas[0] === 0 && ondas[1] === 1,
      `reduced: ${loops.length} loops, idêntico ao estático (${(d.fracao * 100).toFixed(3)} %), envio abre o link sem ondulação`);
    await ctx.close();
  }

  // paused: congela e retoma
  {
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
    await esperarMotion(page);
    await page.evaluate(() => void motion.scrollTo("#ato-4", { imediato: true }));
    await page.waitForTimeout(2500);
    await page.click("[data-pause]"); await page.waitForTimeout(150);
    const ler = () => page.evaluate(() => [document.querySelector("#water feDisplacementMap").getAttribute("scale"), motion.debug.ato4.onda?.paused()]);
    const a1 = await ler(); await page.waitForTimeout(700); const a2 = await ler();
    const pausados = await loopsAto4(page);
    ok(pausados.every((st) => st === "paused") && a1[0] === a2[0], `paused: deriva pausada, água congelada (scale ${a1[0]})`);
    await page.click("[data-pause]"); await page.waitForTimeout(900);
    const a3 = await ler();
    ok((await loopsAto4(page)).every((st) => st === "running") && a3[0] !== a2[0], `ao sair do pause: deriva e água retomam (scale ${a2[0]} → ${a3[0]})`);
    await ctx.close();
  }

  // quality
  for (const [q, esperado] of [["high", { onda: true, deriva: 1 }], ["low", { onda: false, deriva: 0 }]]) {
    const { ctx, page } = await abrir(atual.url, { query: `?quality=${q}` });
    await esperarMotion(page);
    const r = await page.evaluate(() => ({ onda: !!motion.debug.ato4?.onda, deriva: document.getAnimations().filter((a) => a.animationName === "bruma-deriva").length }));
    ok(r.onda === esperado.onda && r.deriva === esperado.deriva, `?quality=${q}: ondulação da água ${r.onda ? "sim" : "não"}, deriva da bruma ${r.deriva}`);
    await ctx.close();
  }
}

await browser.close();
atual.fechar(); srvRef.fechar();
await ref.apagar();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros nem avisos${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
writeFileSync(`${OUT}/medidas-ato4.json`, JSON.stringify(medidas, null, 2));
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
