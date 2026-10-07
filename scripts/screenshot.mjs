// Sobe um servidor estático de site/ e tira screenshots de página inteira.
// Uso:
//   npm run shots                     -> 1440 e 390
//   npm run shots -- 1440 1024 768 390
//   npm run shots -- --sel "#ato-1"   -> só o elemento (comparação por seção)
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve("site");
const OUT = resolve("screenshots");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json",
};

const args = process.argv.slice(2);
const selIdx = args.indexOf("--sel");
const selector = selIdx >= 0 ? args.splice(selIdx, 2)[1] : null;
const widths = args.map(Number).filter(Boolean);
if (!widths.length) widths.push(1440, 390);

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("404");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const tag = selector ? "-" + selector.replace(/[^a-z0-9]+/gi, "") : "";

try {
  for (const w of widths) {
    // altura de viewport realista: 16:9 no desktop, 844 (iPhone) abaixo de 768
    const height = w < 768 ? 844 : Math.round(w * 0.5625);
    const page = await browser.newPage({ viewport: { width: w, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => errors.push(`falhou: ${r.url()}`));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const path = join(OUT, `${w}${tag}.png`);
    if (selector) await page.locator(selector).screenshot({ path });
    else await page.screenshot({ path, fullPage: true });
    console.log(`${w}px -> ${path}`);
    for (const e of errors) console.warn(`  ! ${e}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
