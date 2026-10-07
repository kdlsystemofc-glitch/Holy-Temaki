// Imagem de prévia ao compartilhar (og:image, D53): 1200×630, JPEG, do hero aprovado.
// Uso: npm run og   → site/assets/og-asami.jpg
//
// É o próprio hero renderizado (reduced = pose estática) numa tela de 1200×630, a mesma
// composição de paisagem do site (--h-hero = 630 px). Sai o que vira texto pequeno demais numa
// miniatura (cabeçalho, rótulo do ato, HUD, trilho/player). Fica o nigiri, a fumaça e o
// wordmark, que numa prévia de ~500 px ainda tem ~120 px de altura. Não aparece no site: o
// wordmark aqui é pixel só porque a prévia de link é uma imagem.
import { chromium } from "playwright";
import { statSync } from "node:fs";
import { servir } from "./lib-motion.mjs";
import { OG_IMAGEM } from "./seo.mjs";

const srv = await servir("site");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: OG_IMAGEM.largura, height: OG_IMAGEM.altura }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: ".site-header, .hero__label, .hero__bar, .act-nav, .rail, .progress, .player, .skip-link { opacity: 0 !important; }" });
await page.mouse.move(OG_IMAGEM.largura - 2, 2);
await page.waitForTimeout(800);
const destino = `site/${OG_IMAGEM.caminho}`;
await page.screenshot({ path: destino, type: "jpeg", quality: 86, clip: { x: 0, y: 0, width: OG_IMAGEM.largura, height: OG_IMAGEM.altura } });
console.log(`${destino}: ${OG_IMAGEM.largura}×${OG_IMAGEM.altura}, ${(statSync(destino).size / 1024).toFixed(0)} KB`);
await browser.close(); srv.fechar();
