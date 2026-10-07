// Copia os builds minificados (UMD/IIFE, scripts clássicos) de node_modules para site/js/vendor.
// Uso: npm run vendor  (depois de npm install / atualizar versões em package.json)
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const DEST = "site/js/vendor";
const ARQUIVOS = [
  ["node_modules/gsap/dist/gsap.min.js", "gsap.min.js"],
  ["node_modules/gsap/dist/ScrollTrigger.min.js", "ScrollTrigger.min.js"],
  ["node_modules/lenis/dist/lenis.min.js", "lenis.min.js"],
  // MIT exige manter o aviso de copyright junto do código (o build minificado não traz)
  ["node_modules/lenis/LICENSE", "lenis.LICENSE.txt"],
];

mkdirSync(DEST, { recursive: true });
for (const [de, para] of ARQUIVOS) {
  copyFileSync(de, `${DEST}/${para}`);
  const b = readFileSync(de);
  console.log(`${para.padEnd(22)} ${(statSync(de).size / 1024).toFixed(1).padStart(6)} KB  ${(gzipSync(b).length / 1024).toFixed(1).padStart(5)} KB gzip`);
}
for (const n of ["gsap", "lenis"]) {
  const p = JSON.parse(readFileSync(`node_modules/${n}/package.json`, "utf8"));
  console.log(`${n} ${p.version} — licença: ${p.license}`);
}
