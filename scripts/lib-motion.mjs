// Utilitários dos testes de motion por seção (test-motion-ato2.mjs e seguintes):
// servidor estático, extração de um commit de referência, comparação de pixels, medição de
// quadros (rAF + Long Animation Frames) e quadros do compositor pelo trace do Chromium.
import { createServer } from "node:http";
import { readFile, rm, mkdir } from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };

export async function servir(raiz) {
  const ROOT = resolve(raiz);
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = normalize(join(ROOT, p));
    try { res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }); res.end(await readFile(f)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  return { fechar: () => s.close(), url: `http://127.0.0.1:${s.address().port}/` };
}

// site/ de um commit, extraído numa pasta temporária (com LF, como no git e em produção)
export async function extrairCommit(commit) {
  const dir = join(tmpdir(), `asami-ref-${commit}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const arq of execSync(`git ls-tree -r --name-only ${commit} site`, { encoding: "utf8" }).split("\n").filter(Boolean)) {
    const destino = join(dir, arq);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, execSync(`git show ${commit}:${arq}`, { maxBuffer: 64 << 20 }));
  }
  return { raiz: join(dir, "site"), apagar: () => rm(dir, { recursive: true, force: true }) };
}

// Diferença de pixels no canvas do navegador: fração com algum canal > limiar
export function comparar(pagina, pngA, pngB, limiar = 24) {
  return pagina.evaluate(async ([a, b, lim]) => {
    const carregar = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = (img) => { const c = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let n = 0, soma = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      soma += d; if (d > lim) n++;
    }
    return { fracao: n / (w * h), media: soma / (w * h), tamanhos: `${ia.width}×${ia.height} / ${ib.width}×${ib.height}` };
  }, [`data:image/png;base64,${pngA.toString("base64")}`, `data:image/png;base64,${pngB.toString("base64")}`, limiar]);
}

// Pixels "preto de plate" (todos os canais ≤ 3) dentro de retângulos da captura. O fundo mais
// escuro do site é --ink-900 (#040507) e a mescla em screen nunca escurece; os plates têm o
// preto esmagado a 0 (build_assets.py). Então pixel ≤ 3 = plate sem mescla = retângulo preto.
export function pretosDePlate(pagina, png, retangulos) {
  return pagina.evaluate(async ([src, rets]) => {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const c = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    let n = 0, total = 0;
    for (const { x, y, w, h } of rets) {
      const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(img.width, Math.ceil(x + w)), y1 = Math.min(img.height, Math.ceil(y + h));
      if (x1 <= x0 || y1 <= y0) continue;
      const d = c.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      for (let i = 0; i < d.length; i += 4) { total++; if (d[i] <= 3 && d[i + 1] <= 3 && d[i + 2] <= 3) n++; }
    }
    return { n, total, fracao: total ? n / total : 0 };
  }, [`data:image/png;base64,${png.toString("base64")}`, retangulos]);
}

// Todas as animações na pose estática: entradas terminadas, loops CSS na fase 0, loops GSAP na fase 0
export const poseEstatica = (page) => page.evaluate(() => {
  for (const a of document.getAnimations()) {
    if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = a.effect.getTiming().delay; }
    else a.finish();
  }
  window.gsap?.globalTimeline.getChildren(true, true, false).forEach((t) => (t.vars.repeat === -1 ? t.pause().progress(0) : t.progress(1)));
});

// Quadros (rAF) e Long Animation Frames durante `ms`, com atribuição dos longos
export const medir = (page, ms) => page.evaluate(async (dur) => {
  const loaf = [];
  const longos = [];
  const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => {
    loaf.push(e.duration);
    if (e.duration > 50) longos.push(`${Math.round(e.duration)} ms ${(e.scripts || []).filter((x) => x.duration > 5).map((x) => `${(x.sourceURL || "").split("/").pop()} ${Math.round(x.duration)} ms`).join(" · ") || "sem script"}`);
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
    fps: +(q.length / (dur / 1000)).toFixed(1), p95: +pct(0.95).toFixed(1), max: +q.at(-1).toFixed(1),
    loaf50: loaf.filter((d) => d > 50).length, loafMax: +Math.max(0, ...loaf).toFixed(0), longos,
  };
}, ms);

// Quadros do compositor (PipelineReporter) durante fn(): apresentados × descartados
export async function comTrace(navegador, page, fn) {
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
  r.compositor = { quadros: est.length, descartados: est.filter((x) => x === "STATE_DROPPED").length };
  return r;
}

export const GPU_ARGS = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"];
