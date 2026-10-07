// Testa o formulário de reserva (ACT IV): envio, mensagem do wa.me, erros, sem JS e a11y.
// Uso: npm run test:form
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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
const browser = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) falhas++; };

const pad = (n) => String(n).padStart(2, "0");
const daqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d; };

async function abrir(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  if (opts.javaScriptEnabled !== false) {
    // captura o window.open em vez de abrir aba
    await page.addInitScript(() => { window.__aberto = []; window.open = (u) => { window.__aberto.push(u); return null; }; });
  }
  await page.goto(URL_, { waitUntil: "networkidle" });
  return { ctx, page };
}

async function preencher(page, { data, hh, mm, adultos, criancas }) {
  if (data) {
    await page.selectOption("#res-mes", `${data.getFullYear()}-${pad(data.getMonth() + 1)}`);
    await page.selectOption("#res-dia", String(data.getDate()));
  }
  for (const [id, v] of [["#res-hh", hh], ["#res-mm", mm], ["#res-adultos", adultos], ["#res-criancas", criancas]]) {
    if (v !== undefined) await page.fill(id, v);
  }
}

const enviar = async (page) => { await page.click("#reserva button[type=submit]"); await page.waitForTimeout(100); };
const aberto = (page) => page.evaluate(() => window.__aberto);
const erro = (page) => page.evaluate(() => { const e = document.getElementById("res-erro"); return e.hidden ? "" : e.innerText; });

// ── 1. envio válido ──
{
  const { ctx, page } = await abrir();
  const d = daqui(3);
  await preencher(page, { data: d, hh: "20", mm: "30", adultos: "2", criancas: "1" });
  await enviar(page);
  const [u] = await aberto(page);
  console.log("\nURL gerada:\n  " + u);
  console.log("Mensagem decodificada:\n  " + decodeURIComponent(u.split("?text=")[1]) + "\n");
  ok(u?.startsWith("https://wa.me/551126697175?text="), "abre wa.me com o número da constante");
  ok(decodeURIComponent(u.split("?text=")[1]) ===
    `Olá! Gostaria de reservar uma mesa para o dia ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às 20:30, 2 adultos e 1 criança.`,
    "texto exato, plural de adultos e singular de criança");
  ok(!u.includes(" ") && u.includes("%C3%A1"), "texto com URL-encode (espaços e acentos)");

  // singular de adulto, plural de zero crianças
  await page.evaluate(() => { window.__aberto = []; });
  await preencher(page, { adultos: "1", criancas: "0" });
  await enviar(page);
  const [u2] = await aberto(page);
  ok(decodeURIComponent(u2.split("?text=")[1]).endsWith("1 adulto e 0 crianças."), "1 adulto / 0 crianças");
  await ctx.close();
}

// ── 2. erros ──
{
  const { ctx, page } = await abrir();
  const casos = [
    ["0 adultos", { data: daqui(2), hh: "20", mm: "00", adultos: "0", criancas: "0" }, /pelo menos 1 adulto/, "#res-adultos"],
    ["horário após o fechamento (23:30)", { data: daqui(2), hh: "23", mm: "30", adultos: "2" }, /fecha às 23:00/, "#res-hh"],
    ["horário inválido (25:00)", { data: daqui(2), hh: "25", mm: "00", adultos: "2" }, /horário válido/, "#res-hh"],
    ["horário de hoje que já passou (00:01)", { data: daqui(0), hh: "00", mm: "01", adultos: "2" }, /já passou/, "#res-hh"],
  ];
  for (const [nome, dados, re, campo] of casos) {
    await page.evaluate(() => { window.__aberto = []; });
    await preencher(page, dados);
    await enviar(page);
    const msg = await erro(page);
    const foco = await page.evaluate(() => "#" + document.activeElement.id);
    const inval = await page.getAttribute(campo, "aria-invalid");
    ok(re.test(msg) && (await aberto(page)).length === 0 && foco === campo && inval === "true",
      `${nome} → "${msg.split("\n")[0]}" (foco em ${foco}, aria-invalid)`);
  }

  // data passada: o select não oferece; forçamos uma opção de ontem (manipulação do DOM)
  await page.evaluate(() => { window.__aberto = []; });
  const ontem = daqui(-1);
  await page.evaluate(([v, d]) => {
    const mes = document.getElementById("res-mes"), dia = document.getElementById("res-dia");
    if (![...mes.options].some((o) => o.value === v)) mes.add(new Option("x", v));
    mes.value = v; dia.add(new Option("x", d)); dia.value = d;
  }, [`${ontem.getFullYear()}-${pad(ontem.getMonth() + 1)}`, String(ontem.getDate())]);
  await preencher(page, { hh: "20", mm: "00", adultos: "2" });
  await enviar(page);
  ok(/Escolha uma data entre hoje/.test(await erro(page)) && (await aberto(page)).length === 0,
    `data passada (${pad(ontem.getDate())}/${pad(ontem.getMonth() + 1)}) → "${(await erro(page)).split("\n")[0]}"`);

  // o select só oferece hoje … hoje+60
  const faixa = await page.evaluate(() => [...document.getElementById("res-mes").options].map((o) => o.value));
  ok(faixa.length >= 2 && faixa.length <= 4, `meses oferecidos: ${faixa.join(", ")}`);
  await ctx.close();
}

// ── 3. sem JavaScript: link simples para o wa.me ──
{
  const { ctx, page } = await abrir({ javaScriptEnabled: false });
  const a = await page.$("#reserva a.btn-wa");
  ok(!!a && (await a.getAttribute("href")) === "https://wa.me/551126697175",
    `sem JS: <a href="${a && await a.getAttribute("href")}"> "${a && (await a.innerText()).trim()}"`);
  await ctx.close();
}

// ── 4. acessibilidade básica ──
{
  const { ctx, page } = await abrir();
  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    const refl = document.querySelector(".reserve__reflection");
    const campos = [...document.querySelectorAll("#reserva select, #reserva input")];
    return {
      dup,
      reflInert: refl.inert && refl.getAttribute("aria-hidden") === "true",
      reflCampos: refl.querySelectorAll("input, select, button, a, [tabindex]").length,
      semLabel: campos.filter((c) => !document.querySelector(`label[for="${c.id}"]`)).map((c) => c.id),
    };
  });
  ok(r.dup.length === 0, `ids únicos na página${r.dup.length ? ": duplicados " + r.dup : ""}`);
  ok(r.reflInert && r.reflCampos === 0, "reflexo: inert + aria-hidden, sem campos nem focáveis");
  ok(r.semLabel.length === 0, "todo campo tem <label for>");

  // ordem de tabulação dentro do formulário
  await page.focus("#res-dia");
  const ordem = ["res-dia"];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); ordem.push(await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim().slice(0, 22))); }
  console.log("  ordem do Tab: " + ordem.join(" → "));
  ok(ordem.join() === "res-dia,res-mes,res-hh,res-mm,res-adultos,res-criancas,Reservar pelo WhatsApp", "Tab percorre os 6 campos e chega ao botão");

  const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineColor}`; });
  ok(/solid rgb\(253, 212, 160\)/.test(outline), `foco visível âmbar no botão (${outline})`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
