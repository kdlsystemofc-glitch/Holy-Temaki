// Lighthouse mobile (throttling simulado), N execuções, mediana por nota.
// Uso: npm run lh [-- --runs 3 --out screenshots/lighthouse/nome --root pasta-do-site]
// Sobe o próprio servidor estático de site/. Chromium: CHROME_PATH ou o do Playwright.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = Number(arg("runs", 3));
const OUT = arg("out", "screenshots/lighthouse/mobile");

const ROOT = resolve(arg("root", "site")); // --root: outra cópia do site (ex.: um commit antigo, para comparar)
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  try { const b = await readFile(f); res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(b); }
  catch { res.writeHead(404).end("404"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

process.env.CHROME_PATH ||= chromium.executablePath();
mkdirSync(resolve(OUT, ".."), { recursive: true });

const runs = [];
for (let i = 1; i <= RUNS; i++) {
  const path = `${OUT}-${i}`;
  try {
    // assíncrono: execFileSync travaria o event loop e o servidor acima não responderia
    await promisify(execFile)("npx", ["--yes", "lighthouse@13.5.0", url, "--form-factor=mobile", "--quiet",
      "--output=json", "--output=html", `--output-path=${path}`, "--chrome-flags=--headless=new"],
      { shell: true, maxBuffer: 64 << 20 });
  } catch { /* no Windows o Lighthouse falha ao apagar a pasta temporária, depois de gravar o relatório */ }
  const r = JSON.parse(readFileSync(`${path}.report.json`, "utf8"));
  const c = r.categories, a = r.audits;
  runs.push({
    perf: c.performance.score * 100, a11y: c.accessibility.score * 100,
    bp: c["best-practices"].score * 100, seo: c.seo.score * 100,
    fcp: a["first-contentful-paint"].numericValue, lcp: a["largest-contentful-paint"].numericValue,
    tbt: a["total-blocking-time"].numericValue, cls: a["cumulative-layout-shift"].numericValue,
    si: a["speed-index"].numericValue,
    lcpEl: a["lcp-breakdown-insight"]?.details?.items?.find((i) => i.type === "node")?.selector?.split(" > ").pop() ?? "?",
    js: r.audits["network-requests"].details.items.filter((q) => q.resourceType === "Script").reduce((t, q) => t + q.transferSize, 0),
  });
  const x = runs.at(-1);
  console.log(`execução ${i}: desempenho ${x.perf} · FCP ${(x.fcp / 1000).toFixed(1)}s · LCP ${(x.lcp / 1000).toFixed(1)}s · TBT ${Math.round(x.tbt)}ms · CLS ${x.cls.toFixed(3)} · LCP em ${x.lcpEl} · JS ${(x.js / 1024).toFixed(1)} KB transferidos`);
}
server.close();

const med = (k) => { const v = runs.map((r) => r[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log(`\nMediana de ${RUNS}: desempenho ${med("perf")} · acessibilidade ${med("a11y")} · boas práticas ${med("bp")} · SEO ${med("seo")}`);
console.log(`FCP ${(med("fcp") / 1000).toFixed(1)}s · LCP ${(med("lcp") / 1000).toFixed(1)}s · TBT ${Math.round(med("tbt"))}ms · CLS ${med("cls").toFixed(3)} · SI ${(med("si") / 1000).toFixed(1)}s`);
