// Testa menu (teclado, foco preso, Esc, itens), trilho/player/progresso, rodapé e sanidade
// geral (overflow, console, requests). Também tira os screenshots do rodapé e do menu.
// Uso: npm run test:nav
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
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
await mkdir("screenshots", { recursive: true });

const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };
const requests = new Set();
const erros = [];

async function abrir(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 810 }, ...opts });
  // wa.me nunca é carregado de verdade
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("request", (r) => requests.add(r.url()));
  page.on("console", (m) => { if (m.type() === "error") erros.push(`[${width}] ${m.text()}`); });
  page.on("pageerror", (e) => erros.push(`[${width}] ${e.message}`));
  await page.goto(URL_, { waitUntil: "networkidle" });
  return { ctx, page };
}

const ativo = (page) => page.evaluate(() => document.querySelector(".rail__tick[aria-current]")?.getAttribute("href"));
const foco = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a.getAttribute("href") || a.getAttribute("aria-controls") && `toggle(${a.getAttribute("aria-expanded")})` || a.tagName;
});
const esperarAtivo = async (page, alvo) => {
  for (let i = 0; i < 40; i++) { if ((await ativo(page)) === alvo) return true; await page.waitForTimeout(100); }
  return false;
};
// espera a rolagem suave assentar e devolve o topo da seção. Primeiro espera ela COMEÇAR (até
// 1,5 s): sem GPU, durante a entrada do hero, a rolagem leva 200–550 ms para sair do lugar
// (medido); depois, "assentou" = 5 leituras iguais (~400 ms)
const assentar = async (page, sel) => {
  const inicio = await topoDe(page, sel);
  for (let i = 0; i < 19 && Math.abs((await topoDe(page, sel)) - inicio) < 1 && Math.abs(inicio) > 2; i++) await page.waitForTimeout(80);
  let antes = null, iguais = 0;
  for (let i = 0; i < 80; i++) {
    const t = await topoDe(page, sel);
    iguais = t === antes ? iguais + 1 : 0;
    if (iguais >= 5) return t;
    antes = t; await page.waitForTimeout(80);
  }
  return antes;
};
const topoDe = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);

// ═══ 1. MENU só por teclado (1440) ═══
{
  console.log("\n— Menu (teclado) —");
  const { ctx, page } = await abrir(1440);
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // hambúrguer
  const t = await page.evaluate(() => { const b = document.activeElement; return { tag: b.tagName, ctrl: b.getAttribute("aria-controls"), exp: b.getAttribute("aria-expanded") }; });
  ok(t.tag === "BUTTON" && t.ctrl === "menu" && t.exp === "false", `hambúrguer é <button aria-controls="menu" aria-expanded="false">`);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const estado = await page.evaluate(() => ({
    visivel: getComputedStyle(document.getElementById("menu")).visibility === "visible",
    exp: document.querySelector("[aria-controls=menu]").getAttribute("aria-expanded"),
    travado: getComputedStyle(document.documentElement).overflow === "hidden",
    inerte: document.getElementById("conteudo").inert,
  }));
  ok(estado.visivel && estado.exp === "true", "Enter abre o overlay, aria-expanded=true");
  ok(await foco(page) === "#ato-2", "foco vai para o 1º item (Rodízio)");
  ok(estado.travado && estado.inerte, "página travada (overflow hidden) e conteúdo inert");
  await page.screenshot({ path: "screenshots/1440-menu.png" });

  // rolagem travada de fato
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800); await page.waitForTimeout(200);
  ok(await page.evaluate(() => scrollY) === y0, "roda do mouse não rola a página com o menu aberto");

  // foco preso: Tab percorre itens e volta ao X
  const ordem = [await foco(page)];
  for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); ordem.push(await foco(page)); }
  console.log("  Tab: " + ordem.join(" → "));
  ok(ordem[3].startsWith("https://wa.me/") && ordem[4] === "toggle(true)" && ordem[5] === "#ato-2", "foco preso: itens → X → 1º item");
  await page.keyboard.press("Shift+Tab");
  ok(await foco(page) === "toggle(true)", "Shift+Tab volta ao X");

  // Esc fecha e devolve o foco
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  ok(await foco(page) === "toggle(false)" && !(await page.evaluate(() => document.getElementById("conteudo").inert)),
    "Esc fecha, foco volta ao hambúrguer, página liberada");

  // Enter num item (teclado): vai à seção
  await page.keyboard.press("Enter"); await page.waitForTimeout(250);
  await page.keyboard.press("Tab"); // Ambiente
  ok(await foco(page) === "#ato-3", "Tab → Ambiente");
  await page.keyboard.press("Enter");
  const t3 = await assentar(page, "#ato-3");
  ok(!(await page.evaluate(() => document.getElementById("menu").classList.contains("is-open"))) &&
     Math.abs(t3) < 4, `Enter em Ambiente fecha o menu e leva ao #ato-3 (top=${t3}px)`);
  await ctx.close();
}

// ═══ 2. MENU: clique em cada item ═══
{
  console.log("\n— Menu (clique) —");
  const { ctx, page } = await abrir(1440);
  for (const [nome, alvo] of [["Rodízio", "#ato-2"], ["Ambiente", "#ato-3"], ["Reservas", "#ato-4"]]) {
    await page.click(".menu-toggle"); await page.waitForTimeout(250);
    await page.click(`.menu__link[href="${alvo}"]`);
    const top = await assentar(page, alvo);
    const fechado = !(await page.evaluate(() => document.getElementById("menu").classList.contains("is-open")));
    ok(fechado && Math.abs(top) < 4 && await ativo(page) === alvo, `${nome}: fecha, rola até ${alvo} (top=${top}px), trilho ativo em ${await ativo(page)}`);
  }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.click(".menu-toggle"); await page.waitForTimeout(250);
  const href = await page.getAttribute("[data-wa-menu]", "href");
  const [popup] = await Promise.all([ctx.waitForEvent("page"), page.click("[data-wa-menu]")]);
  await page.waitForTimeout(200);
  console.log("  Cardápio → " + href + "\n             " + decodeURIComponent(href.split("?text=")[1]));
  ok(href === "https://wa.me/551126697175?text=" + encodeURIComponent("Olá! Gostaria de ver o cardápio.") &&
     !(await page.evaluate(() => document.getElementById("menu").classList.contains("is-open"))) && !!popup,
    "Cardápio: wa.me com a constante + texto, abre em nova aba e fecha o menu");
  await ctx.close();
}

// ═══ 3. PLAYER, TRILHO, PROGRESSO ═══
{
  console.log("\n— Player / trilho / progresso —");
  const { ctx, page } = await abrir(1440);
  ok(await ativo(page) === "#ato-1", "início: trilho ativo em #ato-1");
  ok(await page.getAttribute("[data-act=prev]", "aria-disabled") === "true", "⏮ marcado aria-disabled no 1º ato");
  for (const alvo of ["#ato-2", "#ato-3", "#ato-4"]) {
    await page.click("[data-act=next]");
    const top = await assentar(page, alvo);
    ok(await esperarAtivo(page, alvo) && Math.abs(top) < 4, `⏭ → ${alvo} (top=${top}px, trilho ativo)`);
  }
  ok(await page.getAttribute("[data-act=next]", "aria-disabled") === "true", "⏭ marcado aria-disabled no último ato");
  await page.click("[data-act=next]", { force: true }); await page.waitForTimeout(500);
  ok(await ativo(page) === "#ato-4", "⏭ no último ato não sai do lugar");
  for (const alvo of ["#ato-3", "#ato-2", "#ato-1"]) {
    await page.click("[data-act=prev]");
    ok(await esperarAtivo(page, alvo), `⏮ → ${alvo} (trilho ativo)`);
  }

  // ⏸ alterna o gancho de motion
  await page.click("[data-pause]");
  const p1 = await page.evaluate(() => [document.documentElement.dataset.motion, document.querySelector("[data-pause]").getAttribute("aria-pressed")]);
  await page.click("[data-pause]");
  const p2 = await page.evaluate(() => [document.documentElement.dataset.motion ?? null, document.querySelector("[data-pause]").getAttribute("aria-pressed")]);
  ok(p1[0] === "paused" && p1[1] === "true" && p2[0] === null && p2[1] === "false", `⏸: html[data-motion]=${p1[0]} / aria-pressed=${p1[1]} → removido / ${p2[1]}`);

  // trilho por link e scroll manual
  await page.click(".rail__tick[href='#ato-3']");
  ok(await esperarAtivo(page, "#ato-3"), "clique no traço III leva ao #ato-3 e o ativa");
  const label = await page.getAttribute(".rail__tick[href='#ato-3']", "aria-label");
  ok(label === "Ato III · Ambiente", `traço com aria-label="${label}"`);

  // progresso: 0 no topo, 1 no fim
  await assentar(page, "#ato-3");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await page.waitForTimeout(300);
  const p0 = await page.evaluate(() => getComputedStyle(document.querySelector(".progress")).getPropertyValue("--progress"));
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })); await page.waitForTimeout(300);
  const pf = await page.evaluate(() => getComputedStyle(document.querySelector(".progress")).getPropertyValue("--progress"));
  ok(Number(p0) === 0 && Number(pf) === 1, `--progress: ${p0} no topo → ${pf} no fim`);
  const fim = await page.evaluate(() => {
    const pl = document.querySelector(".player").getBoundingClientRect();
    const rod = document.getElementById("rodape").getBoundingClientRect();
    return { rail: getComputedStyle(document.querySelector(".rail")).visibility, playerAcima: pl.bottom <= rod.top, vis: getComputedStyle(document.querySelector(".player")).visibility };
  });
  ok(fim.rail === "hidden" && fim.vis === "visible" && fim.playerAcima, "no fim da página: trilho sai, player continua visível e acima do rodapé");
  await ctx.close();
}

// ═══ 4. SEM JAVASCRIPT ═══
{
  console.log("\n— Sem JavaScript —");
  const { ctx, page } = await abrir(1440, { javaScriptEnabled: false });
  const t = await page.evaluate(() => { const a = document.querySelector(".menu-toggle"); return [a.tagName, a.getAttribute("href")]; });
  ok(t[0] === "A" && t[1] === "#menu", "hambúrguer é <a href=\"#menu\">");
  await page.click(".menu-toggle"); await page.waitForTimeout(200);
  const vis = await page.evaluate(() => getComputedStyle(document.getElementById("menu")).visibility);
  const links = await page.$$eval(".menu__link", (as) => as.map((a) => a.getAttribute("href").slice(0, 16)));
  ok(vis === "visible" && links.length === 4, `overlay abre por :target com ${links.length} links: ${links.join(", ")}`);
  await page.screenshot({ path: "screenshots/1440-menu-sem-js.png" });
  await page.click(".menu__link[href='#ato-4']"); await page.waitForTimeout(300);
  await page.waitForTimeout(300); // visibility: hidden só depois do fade de saída (200 ms)
  ok(await page.evaluate(() => getComputedStyle(document.getElementById("menu")).visibility) === "hidden", "sem JS: clicar num item fecha o overlay (sai do :target)");
  const trilho = await page.$$eval(".rail__tick", (as) => as.map((a) => a.getAttribute("href")));
  ok(trilho.join() === "#ato-1,#ato-2,#ato-3,#ato-4", "sem JS: trilho continua com links reais");
  await ctx.close();
}

// ═══ 5. SCREENSHOTS, RODAPÉ e SANIDADE ═══
{
  console.log("\n— Rodapé / screenshots / sanidade —");
  for (const w of [1440, 390]) {
    const { ctx, page } = await abrir(w);
    await page.locator("#rodape").scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    await page.locator("#rodape").screenshot({ path: `screenshots/${w}-rodape.png` });
    const r = await page.evaluate(() => {
      const f = document.getElementById("rodape").getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        fim: Math.round(f.bottom + scrollY) === document.documentElement.scrollHeight,
        texto: document.getElementById("rodape").innerText.replace(/\s+/g, " ").trim() };
    });
    ok(r.sw <= r.cw, `${w}px: sem rolagem horizontal (${r.sw} ≤ ${r.cw})`);
    ok(r.fim, `${w}px: a página termina no rodapé`);
    if (w === 1440) console.log("  rodapé: " + r.texto);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
    await page.click(".menu-toggle"); await page.waitForTimeout(300);
    await page.screenshot({ path: `screenshots/${w}-menu.png` });
    const menuOverflow = await page.evaluate(() => document.getElementById("menu").scrollWidth <= document.getElementById("menu").clientWidth);
    ok(menuOverflow, `${w}px: menu sem rolagem horizontal`);
    await ctx.close();
  }
}

await browser.close();
server.close();
const proibidos = [...requests].filter((u) => /\/(design|IMAGENS)\//i.test(u));
ok(proibidos.length === 0, `nenhuma request a /design ou /IMAGENS (${requests.size} requests únicas)`);
ok(erros.length === 0, `console sem erros${erros.length ? ":\n    " + erros.join("\n    ") : ""}`);
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
