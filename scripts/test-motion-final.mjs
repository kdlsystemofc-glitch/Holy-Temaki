// Motion, etapa final — menu overlay, player, rodapé e coerência global (DESIGN.md §5.0, §5).
//   1. Menu: 20 ciclos abre/fecha (teclado e mouse), foco preso, Esc, foco devolvido, rolagem
//      travada só aberto, itens clicáveis desde o 1º quadro, contraste durante a entrada
//   2. Player: ▶ e aria-label ao pausar
//   3. Rodapé: estado final × estático aprovado; #rodape e fim da página nunca escondidos; links
//   4. Coerência: loops simultâneos por posição (1440 high, 390 low), ⏸ global, reduced global,
//      estilos esquecidos, ouvintes
//   5. Vídeos da página inteira; 6. Custo da página inteira
// Uso: npm run test:motion
import { mkdir, rm, rename, readdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { servir, extrairCommit, comparar, poseEstatica, medir, comTrace, GPU_ARGS } from "./lib-motion.mjs";

const REF_COMMIT = "75b53d5"; // "motion ato 4 pronto": rodapé e menu estáticos aprovados
const OUT = "screenshots/motion";
const LIMIAR_CANAL = 24, MAX_PIXELS = 0.005, MIN_CONTRASTE = 4.5;
// Orçamento de loops simultâneos (proposto nesta etapa, DESIGN.md §5.0): contam animações
// infinitas rodando (CSS + GSAP). Todas são só transform/opacity no compositor, exceto as de
// feTurbulence (1 no máximo, D34).
// Medido: o pico honesto é a emenda hero + ACT II com as duas seções de fato na tela (18 + 14 CSS
// + 1 ondulação); no celular, o hero low (14). Uma seção inteira fora da tela nunca conta.
const ORCAMENTO = { high: 36, low: 16 };

const ref = await extrairCommit(REF_COMMIT);
const atual = await servir("site");
const srvRef = await servir(ref.raiz);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const erros = [], requests = new Set(), medidas = {};

async function abrir(url, { width = 1440, height = 810, query = "", contexto = {}, nav = browser, init = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width, height }, ...contexto });
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
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
const estadoMenu = (page) => page.evaluate(() => {
  const m = document.getElementById("menu"), t = document.querySelector("[aria-controls=menu]");
  return {
    aberto: m.classList.contains("is-open"), vis: getComputedStyle(m).visibility, op: getComputedStyle(m).opacity,
    exp: t.getAttribute("aria-expanded"), trava: document.documentElement.classList.contains("menu-open"),
    overflow: getComputedStyle(document.documentElement).overflow, inerte: document.getElementById("conteudo").inert,
    foco: document.activeElement?.className || document.activeElement?.tagName,
  };
});

// ═══ 1. MENU ═══
{
  console.log("\n— Menu —");
  const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
  await esperarMotion(page);

  // 20 ciclos rápidos, alternando mouse e teclado, sem esperar as transições
  await page.focus("[aria-controls=menu]");
  for (let i = 0; i < 20; i++) {
    if (i % 2) { await page.keyboard.press("Enter"); await page.waitForTimeout(40); await page.keyboard.press("Escape"); }
    else { await page.click("[aria-controls=menu]"); await page.waitForTimeout(40); await page.click("[aria-controls=menu]"); }
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(400);
  const fechado = await estadoMenu(page);
  ok(!fechado.aberto && fechado.vis === "hidden" && fechado.exp === "false" && !fechado.trava && fechado.overflow !== "hidden" && !fechado.inerte,
    `20 ciclos abre/fecha (mouse e teclado): termina fechado e coerente (${JSON.stringify(fechado)})`);
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 400); await page.mouse.wheel(0, 400); await page.waitForTimeout(700);
  ok(await page.evaluate(() => scrollY) > y0 + 100, "depois dos 20 ciclos a rolagem funciona (nada travado)");
  await page.evaluate(() => void motion.lenis?.scrollTo(0, { immediate: true, force: true })); await page.waitForTimeout(300);

  // terminar aberto no meio da transição: aberto e utilizável
  await page.click("[aria-controls=menu]"); await page.waitForTimeout(30);
  await page.click("[aria-controls=menu]"); await page.waitForTimeout(30);
  await page.click("[aria-controls=menu]"); await page.waitForTimeout(20);
  const aberto = await estadoMenu(page);
  ok(aberto.aberto && aberto.vis === "visible" && aberto.exp === "true" && aberto.trava && aberto.inerte && /menu__link/.test(aberto.foco),
    `abrir no meio de uma transição: aberto, travado, foco no 1º item (${aberto.foco})`);
  // foco preso e Esc
  const ordem = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); ordem.push(await page.evaluate(() => document.activeElement.getAttribute("href") || document.activeElement.getAttribute("aria-controls"))); }
  ok(ordem.every((x) => x && (x.startsWith("#ato") || x.startsWith("https://wa.me") || x === "menu")), `foco preso no menu (${ordem.join(" → ")})`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(20);
  const esc = await estadoMenu(page);
  ok(!esc.aberto && esc.exp === "false" && /menu-toggle/.test(esc.foco), "Esc fecha e devolve o foco ao hambúrguer na hora");
  await page.waitForTimeout(260);
  ok((await estadoMenu(page)).vis === "hidden", "fechado: visibility hidden depois do fade (leitor de tela não lê o menu)");

  // itens clicáveis no 1º quadro; a rolagem começa sem esperar a animação
  await page.click("[aria-controls=menu]");
  const t0 = Date.now();
  await page.click(".menu__link[href='#ato-3']", { timeout: 200 });
  const clique = Date.now() - t0;
  const logo = await page.evaluate(() => ({ aberto: document.getElementById("menu").classList.contains("is-open"), y: scrollY }));
  await page.waitForTimeout(400);
  const depois = await page.evaluate(() => scrollY);
  ok(clique < 200 && !logo.aberto && depois > logo.y + 50, `item clicável no 1º quadro (${clique} ms): fecha e a rolagem já começa (${logo.y} → ${depois})`);

  // névoa só com o menu aberto
  await page.evaluate(() => void motion.lenis?.scrollTo(0, { immediate: true, force: true })); await page.waitForTimeout(1500);
  const nevoaFechado = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "menu-nevoa").length);
  await page.click("[aria-controls=menu]"); await page.waitForTimeout(100);
  const nevoaAberto = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "menu-nevoa" && a.playState === "running").length);
  ok(nevoaFechado === 0 && nevoaAberto === 1, `névoa do menu: ${nevoaFechado} animação fechado, ${nevoaAberto} aberto`);

  // contraste dos itens durante a entrada: congela transições/animações do menu e percorre
  await page.click("[aria-controls=menu]"); await page.waitForTimeout(400);
  await page.click("[aria-controls=menu]");
  await page.evaluate(() => { for (const a of document.getAnimations()) if (a.effect?.target?.closest?.("#menu")) a.pause(); });
  let pior = Infinity, piorT = 0;
  for (const t of [100, 200, 320, 400, 500, 600, 700]) {
    await page.evaluate((ms) => { for (const a of document.getAnimations()) if (a.effect?.target?.closest?.("#menu")) a.currentTime = ms; }, t);
    await page.waitForTimeout(40);
    const clip = await page.evaluate(() => { const r = document.querySelector(".menu__list").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const a = await page.screenshot({ clip });
    const tag = await page.addStyleTag({ content: ".menu__link, .menu__link * { color: transparent !important; transition: none !important; }" });
    await page.waitForTimeout(30);
    const b = await page.screenshot({ clip });
    await tag.evaluate((x) => x.remove());
    const c = await page.evaluate(async ([sa, sb]) => {
      const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([carregar(sa), carregar(sb)]);
      const px = (img) => { const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, img.width, img.height).data; };
      const da = px(ia), db = px(ib);
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      let min = Infinity, n = 0;
      for (let i = 0; i < da.length; i += 4) {
        // miolo das letras do item (--text-base #D8D9DB), mais claro que o fundo
        const perto = Math.abs(da[i] - 0xD8) < 30 && Math.abs(da[i + 1] - 0xD9) < 30 && Math.abs(da[i + 2] - 0xDB) < 30;
        const dif = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        const la = L(da, i), lb = L(db, i);
        if (!perto || dif <= 60 || la <= lb) continue;
        n++;
        const c = (la + 0.05) / (lb + 0.05);
        if (c < min) min = c;
      }
      return { min: n ? min : null, n };
    }, [`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`]);
    if (c.min !== null && c.min < pior) { pior = c.min; piorT = t; }
  }
  medidas.contrasteMenu = { pior: +pior.toFixed(2), em: piorT };
  ok(pior >= MIN_CONTRASTE, `contraste dos itens durante a entrada ≥ ${MIN_CONTRASTE}:1 (pior ${pior.toFixed(2)}:1 aos ${piorT} ms)`);
  await page.evaluate(() => { for (const a of document.getAnimations()) if (a.effect?.target?.closest?.("#menu") && a.effect.getComputedTiming().iterations !== Infinity) a.finish(); else a.play(); });
  await page.keyboard.press("Escape");
  await ctx.close();

  // reduced: só o fade de 200 ms (sem itens em sequência, sem névoa)
  {
    const r = await abrir(atual.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(r.page);
    await r.page.click("[aria-controls=menu]"); await r.page.waitForTimeout(30);
    const anim = await r.page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.("#menu") || a.effect?.target?.id === "menu")
      .map((a) => `${a.animationName || a.transitionProperty}:${Math.round(a.effect.getComputedTiming().duration)}`));
    const longas = anim.filter((x) => !/^(opacity|visibility):200$|:0$/.test(x));
    ok(longas.length === 0 && anim.some((x) => x === "opacity:200"), `reduced: menu só com fade de 200 ms (${anim.join(", ")})`);
    await r.ctx.close();
  }
}

// ═══ 2. PLAYER ═══
{
  console.log("\n— Player —");
  const { ctx, page } = await abrir(atual.url);
  await esperarMotion(page);
  const ler = () => page.evaluate(() => {
    const b = document.querySelector("[data-pause]");
    return { press: b.getAttribute("aria-pressed"), label: b.getAttribute("aria-label"), play: getComputedStyle(b.querySelector(".player__icon-play")).display, pause: getComputedStyle(b.querySelector(".player__icon-pause")).display };
  });
  const a = await ler(); await page.click("[data-pause]"); const b = await ler(); await page.click("[data-pause]"); const c = await ler();
  ok(a.label === "Pausar animações" && a.play === "none" && b.press === "true" && b.label === "Retomar animações" && b.pause === "none" && b.play !== "none" && c.label === "Pausar animações" && c.press === "false",
    `⏸ → ▶ com aria-pressed e aria-label "${b.label}", e volta ("${c.label}")`);
  await ctx.close();
}

// ═══ 3. RODAPÉ ═══
{
  console.log("\n— Rodapé —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const r = await abrir(srvRef.url, { width: w, height: h });
    await esperarMotion(r.page);
    await r.page.evaluate(() => { document.documentElement.dataset.motion = "paused"; document.getElementById("rodape").scrollIntoView({ behavior: "instant" }); });
    await r.page.mouse.move(w - 2, 2); await r.page.waitForTimeout(500);
    const pngRef = await r.page.locator("#rodape").screenshot();
    await r.ctx.close();
    const { ctx, page } = await abrir(atual.url, { width: w, height: h, query: w >= 768 ? "?quality=high" : "" });
    await esperarMotion(page);
    await page.mouse.move(w - 2, 2);
    await page.evaluate(() => void motion.scrollTo("#rodape", { imediato: true }));
    await page.waitForTimeout(1200); // entrada de 600 ms
    await page.click("[data-pause]"); await page.mouse.move(w - 2, 2);
    await page.evaluate(() => document.getElementById("rodape").scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(300);
    await poseEstatica(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.effect.getComputedTiming().iterations === Infinity && a.cancel()));
    await page.waitForTimeout(150);
    const png = await page.locator("#rodape").screenshot({ path: `${OUT}/rodape-${w}-final.png` });
    const d = await comparar(page, pngRef, png, LIMIAR_CANAL);
    medidas[`rodape-${w}`] = d;
    ok(d.fracao <= MAX_PIXELS, `${w}: rodapé final × estático aprovado — ${(d.fracao * 100).toFixed(3)} % dos pixels diferem (limite ${MAX_PIXELS * 100} %)`);
    await ctx.close();
  }
  // chegar direto por #rodape e pelo fim da página
  {
    const { ctx, page } = await abrir(atual.url, { query: "#rodape" });
    await esperarMotion(page);
    await page.waitForTimeout(600);
    const op = await page.evaluate(() => getComputedStyle(document.querySelector("#rodape .site-footer__grid")).opacity);
    ok(op === "1", `aberto em #rodape: rodapé visível (opacity ${op})`);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(atual.url);
    await esperarMotion(page);
    await page.evaluate(() => motion.lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true }));
    await page.waitForTimeout(1200);
    const op = await page.evaluate(() => getComputedStyle(document.querySelector("#rodape .site-footer__grid")).opacity);
    ok(op === "1", `fim da página: rodapé visível (opacity ${op})`);
    // sublinhado que cresce (hover) e contorno âmbar (teclado)
    await page.hover("#rodape a[data-tel]"); await page.waitForTimeout(400);
    const sub = await page.evaluate(() => getComputedStyle(document.querySelector("#rodape a[data-tel] .site-footer__sub"), "::after").transform);
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    await page.focus("#rodape a[data-tel]"); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => { const a = document.activeElement; return [a.matches("[data-tel]"), getComputedStyle(a).outlineStyle, getComputedStyle(a.querySelector(".site-footer__sub"), "::after").transform]; });
    const tel = await page.evaluate(() => document.querySelector("#rodape a[data-tel]").textContent);
    ok(sub === "none" && foco[0] && foco[1] === "solid" && tel === "(11) 2669-7175",
      `links: sublinhado cresce no hover (${sub}); no Tab contorno ${foco[1]} + sublinhado (${foco[2]}); telefone "${tel}"`);
    await ctx.close();
  }
}

// ═══ 4. COERÊNCIA GLOBAL ═══
const rodando = (page) => page.evaluate(() => {
  const css = document.getAnimations().filter((a) => a.playState === "running" && a.effect.getComputedTiming().iterations === Infinity);
  const gs = window.gsap && !gsap.globalTimeline.paused() ? gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.vars.repeat === -1 && !t.paused()) : [];
  return { css: css.length, gsap: gs.length, nomes: [...new Set(css.map((a) => a.animationName))].join(",") };
});
{
  console.log("\n— Loops simultâneos por posição (passos de 25 % da tela) —");
  for (const [rot, w, h, q] of [["1440 high", 1440, 810, "?quality=high"], ["390 low", 390, 844, ""]]) {
    const { ctx, page } = await abrir(atual.url, { width: w, height: h, query: q });
    await esperarMotion(page);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const linhas = [];
    let pico = 0;
    for (let y = 0; y <= max + 1; y += Math.round(h * 0.25)) {
      await page.evaluate((v) => motion.lenis.scrollTo(v, { immediate: true, force: true }), Math.min(y, max));
      await page.waitForTimeout(260);
      const r = await rodando(page);
      pico = Math.max(pico, r.css + r.gsap);
      linhas.push(`${String(Math.min(y, max)).padStart(5)}px: ${String(r.css + r.gsap).padStart(2)} (${r.css} CSS + ${r.gsap} GSAP)`);
    }
    console.log(linhas.map((l) => "  " + l).join("\n"));
    const orc = q ? ORCAMENTO.high : ORCAMENTO.low;
    medidas[`loops-${rot}`] = { pico, orcamento: orc };
    ok(pico <= orc, `${rot}: pico de ${pico} loops simultâneos (orçamento ${orc})`);
    await ctx.close();
  }
}
{
  console.log("\n— ⏸ e reduced na página inteira; limpeza —");
  // ⏸: nada rodando em nenhuma posição; ao retomar, volta
  const { ctx, page } = await abrir(atual.url, { query: "?quality=high" });
  await esperarMotion(page);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  // visita a página toda antes (entradas feitas)
  for (let y = 0; y <= max; y += 400) { await page.evaluate((v) => motion.lenis.scrollTo(v, { immediate: true, force: true }), y); await page.waitForTimeout(250); }
  await page.waitForTimeout(2600);
  await page.click("[data-pause]");
  let algum = 0;
  for (let y = 0; y <= max; y += 405) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({
      css: document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.transitionProperty),
      gsap: gsap.globalTimeline.paused(),
    }));
    if (r.css.length || !r.gsap) { algum++; console.log(`  ${y}px: ${r.css.join(",")} gsap pausado=${r.gsap}`); }
  }
  ok(algum === 0, `⏸: nenhuma animação CSS rodando e timeline GSAP pausada em todas as posições (${algum} com algo rodando)`);
  // limpeza: nada esquecido no estilo inline depois das entradas (em ⏸, sem parallax)
  const sobras = await page.evaluate(() => [...document.querySelectorAll("main *, footer *, .act-nav *")].filter((el) => {
    const s = el.getAttribute("style") || "";
    return /will-change|filter|transform|translate|rotate|scale|opacity/.test(s.replace(/--[\w-]+:[^;]+;?/g, ""));
  }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(" ")[0]} {${el.getAttribute("style")}}`));
  ok(sobras.length === 0, `nenhum will-change/filter/transform/opacity esquecido inline depois das entradas${sobras.length ? ":\n    " + sobras.join("\n    ") : ""}`);
  await page.click("[data-pause]"); await page.evaluate(() => motion.scrollTo("#ato-1", { imediato: true })); await page.waitForTimeout(600);
  const volta = await rodando(page);
  ok(volta.css + volta.gsap > 0, `ao retomar, os loops voltam (${volta.css} CSS + ${volta.gsap} GSAP no hero)`);
  await ctx.close();

  // reduced: página inteira sem loops, parallax nem entradas
  {
    const r = await abrir(atual.url, { contexto: { reducedMotion: "reduce" } });
    await esperarMotion(r.page);
    const maxR = await r.page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    let problemas = [];
    for (let y = 0; y <= maxR; y += 405) {
      await r.page.evaluate((v) => scrollTo(0, v), y);
      await r.page.waitForTimeout(150);
      const p = await r.page.evaluate(() => {
        const out = [];
        // permitido em reduced: fades de opacity/visibility de até 200 ms (§5.0)
        const vivas = document.getAnimations().filter((a) => a.playState === "running" && a.effect.getComputedTiming().duration > 1
          && !(/^(opacity|visibility)$/.test(a.transitionProperty) && a.effect.getComputedTiming().duration <= 200));
        for (const a of vivas) if (!a.effect.target?.closest?.("#menu")) out.push(`animação ${a.animationName || a.transitionProperty}`);
        for (const el of document.querySelectorAll("[data-parallax]")) if (getComputedStyle(el).transform !== "none") out.push(`parallax em ${el.className}`);
        if (window.gsap && gsap.globalTimeline.getChildren(true, true, false).some((t) => t.isActive())) out.push("tween GSAP ativo");
        for (const el of document.querySelectorAll("main *, footer *")) { const o = getComputedStyle(el).opacity; if (o !== "1" && el.getAttribute("style")?.includes("opacity")) out.push(`opacity inline ${o}`); }
        return out;
      });
      problemas.push(...p.map((x) => `${y}px: ${x}`));
    }
    problemas = [...new Set(problemas)];
    ok(problemas.length === 0, `reduced: página inteira sem loop, parallax ou entrada animada${problemas.length ? ":\n    " + problemas.slice(0, 10).join("\n    ") : ""}`);
    await r.ctx.close();
  }

  // ouvintes: full → reduced → full → reduced devolve o mesmo número de listeners de scroll
  {
    const init = () => {
      window.__ouvintes = 0;
      const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (t, f, o) { if (t === "scroll" && this === window) window.__ouvintes++; return add.call(this, t, f, o); };
      EventTarget.prototype.removeEventListener = function (t, f, o) { if (t === "scroll" && this === window) window.__ouvintes--; return rem.call(this, t, f, o); };
    };
    const { ctx, page } = await abrir(atual.url, { query: "?quality=high", init });
    await esperarMotion(page);
    const n0 = await page.evaluate(() => window.__ouvintes);
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(300);
    const n1 = await page.evaluate(() => window.__ouvintes);
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForTimeout(300);
    const n2 = await page.evaluate(() => window.__ouvintes);
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(300);
    const n3 = await page.evaluate(() => window.__ouvintes);
    ok(n2 === n0 && n3 === n1 && n1 < n0, `ouvintes de scroll removidos ao desfazer: full ${n0} → reduced ${n1} → full ${n2} → reduced ${n3}`);
    await ctx.close();
  }
}

// ═══ 5. VÍDEOS DA PÁGINA INTEIRA ═══
{
  console.log("\n— Vídeos da página inteira —");
  for (const [w, h] of [[1440, 810], [390, 844]]) {
    const dir = join(OUT, `video-pagina-${w}`);
    await rm(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(atual.url, { waitUntil: "load" });
    await page.waitForTimeout(3200); // entrada do hero
    await page.mouse.move(w / 2, h / 2);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y < max; y += 70) { await page.mouse.wheel(0, 70); await page.waitForTimeout(90); }
    await page.waitForTimeout(1500);
    // o hambúrguer só existe no topo (o cabeçalho não é fixo): volta pelo ⏮ antes de abrir o menu
    await page.evaluate(() => void motion.scrollTo("#ato-1")); await page.waitForTimeout(1800);
    await page.click("[aria-controls=menu]"); await page.waitForTimeout(1200);
    await page.click(".menu__link[href='#ato-2']"); await page.waitForTimeout(2500);
    await ctx.close();
    const [arq] = await readdir(dir);
    await rename(join(dir, arq), join(OUT, `pagina-${w}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`  ${OUT}/pagina-${w}.webm`);
  }
}

// ═══ 6. CUSTO DA PÁGINA INTEIRA ═══
{
  console.log("\n— Custo: página inteira, do topo ao fim e de volta —");
  const gpu = await chromium.launch({ args: GPU_ARGS });
  const pctD = (m) => m.compositor.descartados / Math.max(1, m.compositor.quadros);
  let controle = 0, controleLongos = 0;
  for (const [rotulo, query, w, h, urlCaso] of [
    ["high — controle: site antes desta etapa", "?quality=high", 1440, 810, srvRef.url],
    ["high", "?quality=high", 1440, 810],
    ["low", "?quality=low", 1440, 810],
    ["low (390, celular)", "", 390, 844],
  ]) {
    const { ctx, page } = await abrir(urlCaso || atual.url, { width: w, height: h, query, nav: gpu });
    await esperarMotion(page);
    await page.mouse.move(w / 2, h / 2);
    const volta = async () => {
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const passos = Math.round(max / 110);
      const m = medir(page, 26000);
      for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, 110); await page.waitForTimeout(Math.floor(12000 / passos)); }
      for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, -110); await page.waitForTimeout(Math.floor(12000 / passos)); }
      return m;
    };
    const r = await comTrace(gpu, page, volta);
    if (urlCaso) { controle = pctD(r); controleLongos = r.loaf50; }
    medidas[`custo-pagina-${rotulo}`] = r;
    console.log(`  ${rotulo}: rAF ${r.fps} fps (p95 ${r.p95} ms) · ${r.compositor.descartados}/${r.compositor.quadros} quadros descartados (${(pctD(r) * 100).toFixed(1)} %) · LoAF > 50 ms: ${r.loaf50} (máx ${r.loafMax} ms)`);
    // relativo ao controle medido na mesma execução (o site sem esta etapa também tem picos de
    // raster na 1ª visita a cada seção): até 2 pontos e 2 quadros longos acima dele
    if (!urlCaso) ok((r.loaf50 <= 4 || r.loaf50 <= controleLongos + 2) && (pctD(r) <= 0.05 || pctD(r) <= controle + 0.02),
      `${rotulo}: página inteira dentro do orçamento (${r.loaf50} quadros longos em 26 s, controle ${controleLongos}; descartados ${(pctD(r) * 100).toFixed(1)} %, controle ${(controle * 100).toFixed(1)} %)`);
    await ctx.close();
  }
  await gpu.close();
}

await browser.close();
atual.fechar(); srvRef.fechar();
await ref.apagar();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros nem avisos${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
writeFileSync(`${OUT}/medidas-final.json`, JSON.stringify(medidas, null, 2));
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
