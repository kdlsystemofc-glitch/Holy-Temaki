// Motion do ACT II (#ato-2) — DESIGN.md §5 Rodízio, §5.0. Loops, hover e a estrutura estão em
// css/rodizio-motion.css; o parallax é declarativo (data-parallax). Aqui:
//   · entrada do rótulo e do palco (tábuas, sombras, reflexo, linhas-guia e rótulos), uma vez,
//     quando 35 % do elemento aparece;
//   · a flutuação das tábuas só começa depois dela (.is-flutuando);
//   · a ondulação do reflexo (#ripple-ato2), só "full" + "high" + ≥ 768 px, no grupo exclusivo
//     "turbulencia" com o hero (D34) e congelada durante a rolagem (D32).
// Só é escondido o que ainda está abaixo da tela quando o motion se instala: ele chega depois do
// load (D29), e o que o visitante já está vendo nunca some. Sem JS ou em "reduced": estático.
(() => {
  const { motion, gsap } = window;
  const ato = document.getElementById("ato-2");
  if (!motion || !ato) return;

  const um = (sel) => ato.querySelector(sel);
  const todos = (sel) => [...ato.querySelectorAll(sel)];
  const rotulo = um(".rodizio__head .act-label");
  const palco = um(".rodizio__stage");
  const turb = document.querySelector("#ripple-ato2 feTurbulence");
  const desloc = document.querySelector("#ripple-ato2 feDisplacementMap");
  // Comprimento da linha em pixels de tela. As linhas usam vector-effect: non-scaling-stroke,
  // e com ele o tracejado é medido na tela — pathLength="1" não normaliza nada (testado: o
  // dasharray de 1 virava um pontilhado de 1 px). Linhas retas: 40 amostras bastam (+2 px de folga).
  const naTela = (path) => {
    const ctm = path.getScreenCTM();
    const total = path.getTotalLength();
    let soma = 0, antes = null;
    for (let i = 0; i <= 40; i++) {
      const q = path.getPointAtLength((total * i) / 40);
      const t = new DOMPoint(q.x, q.y).matrixTransform(ctm);
      if (antes) soma += Math.hypot(t.x - antes.x, t.y - antes.y);
      antes = t;
    }
    return Math.ceil(soma) + 2;
  };

  motion.register((m) => {
    const dbg = (m.debug.ato2 = {}); // gancho de teste (test-motion-ato2.mjs)
    if (m.base !== "full") return;
    const limpezas = [];

    // ── 1 · rótulo: translateY(16px) + fade, 600 ms ──
    if (rotulo && m.abaixo(rotulo)) {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(rotulo, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: m.dur("--t-mid"), ease: m.ease });
      dbg.rotulo = m.entrada(rotulo, tl, () => gsap.set(rotulo, { clearProps: "transform,opacity" }));
    }

    // ── 2 · palco: tábuas sobem (1200 ms, 180 ms entre elas) e as linhas-guia se desenham ──
    const flutuar = () => ato.classList.add("is-flutuando");
    const svg = todos(".callouts").find((s) => getComputedStyle(s).display !== "none");
    if (palco && m.abaixo(palco)) {
      const tabuas = todos(".rodizio__boards .board");
      // sombras e reflexo entram pelo container: os dois têm filter (blur) — animar um filho obriga
      // a refazer o filtro a cada quadro (medido: 145 quadros descartados numa rolagem); a
      // opacidade do próprio elemento filtrado é aplicada na composição, sobre o resultado em cache
      const coadjuvantes = [um(".rodizio__shadows"), um(".rodizio__reflection-wrap")].filter(Boolean);
      const linhas = svg ? [...svg.querySelectorAll("path")] : [];
      const pontos = svg ? [...svg.querySelectorAll("circle")] : [];
      const rotulos = todos(".callout-label");
      const tudo = [...tabuas, ...coadjuvantes, ...linhas, ...pontos, ...rotulos];
      const tl = gsap.timeline({ paused: true });
      const DUR = m.dur("--t-slow"); // 1200 ms
      tabuas.forEach((t, i) => {
        // 3D testado (rotateX com perspective no próprio elemento em screen): a mescla se mantém —
        // ver test:motion, "sem retângulos pretos" em cada quadro-chave. Sem fade, como na tabela
        // do §5: com opacity 0 desde a montagem o Chrome não rasteriza as tábuas (imagens grandes
        // em screen), e o 1º quadro da entrada rasterizava tudo de uma vez (~400 ms, medido)
        tl.fromTo(t, { y: 40, rotationX: 6, transformPerspective: 900 },
          { y: 0, rotationX: 0, duration: DUR, ease: m.ease }, i * 0.18);
      });
      tl.fromTo(coadjuvantes, { opacity: 0 }, { opacity: 1, duration: DUR, ease: m.ease }, 0.09);
      // callouts na ordem do olhar: esquerda, preço, sashimi, colchete; 120 ms entre eles.
      // Linha desenhada de 100 % → 0 em 700 ms (dashoffset = comprimento na tela → 0); o rótulo
      // entra 200 ms depois de a linha terminar.
      const ordem = ["esquerda", "preco", "sashimi", "colchete"];
      let k = 0;
      for (const nome of ordem) {
        const seusCaminhos = linhas.filter((l) => l.dataset.callout === nome);
        if (!seusCaminhos.length) continue;
        const t0 = 0.4 + k * 0.12;
        seusCaminhos.forEach((l) => {
          const c = naTela(l);
          tl.fromTo(l, { strokeDasharray: c, strokeDashoffset: c }, { strokeDashoffset: 0, duration: 0.7, ease: m.ease }, t0);
        });
        const seusPontos = pontos.filter((p) => p.dataset.callout === nome);
        if (seusPontos.length) tl.fromTo(seusPontos, { opacity: 0 }, { opacity: 1, duration: m.dur("--t-fast"), ease: m.ease }, t0);
        const seuRotulo = rotulos.filter((r) => r.dataset.callout === nome);
        if (seuRotulo.length) tl.fromTo(seuRotulo, { opacity: 0 }, { opacity: 1, duration: m.dur("--t-fast"), ease: m.ease }, t0 + 0.7 + 0.2);
        k++;
      }
      // clearProps "all" nas linhas/pontos: em SVG o GSAP também escreve transform-origin inline
      dbg.entrada = m.entrada(palco, tl, () => {
        gsap.set([...tabuas, ...coadjuvantes, ...rotulos], { clearProps: "transform,opacity" });
        gsap.set([...linhas, ...pontos], { clearProps: "all" });
        // em SVG o GSAP ainda deixa transform-origin e data-svg-origin: saem à mão
        for (const el of [...linhas, ...pontos]) { el.style.removeProperty("transform-origin"); el.removeAttribute("data-svg-origin"); if (!el.getAttribute("style")) el.removeAttribute("style"); }
        flutuar();
      });
    } else {
      flutuar(); // já estava à vista quando o motion chegou: sem entrada, flutuação já
    }
    limpezas.push(() => ato.classList.remove("is-flutuando"));

    // ── 9 · ondulação do reflexo ──
    if (m.quality === "high" && turb && desloc && matchMedia("(min-width: 48rem) and (min-aspect-ratio: 1/1)").matches) {
      const reflexo = um(".rodizio__reflection");
      const [bx, by] = turb.getAttribute("baseFrequency").split(/\s+/).map(Number);
      const fase = { p: 0 };
      const escrever = () => {
        if (m.rolando) return;
        desloc.setAttribute("scale", (14 * fase.p).toFixed(2));
        turb.setAttribute("baseFrequency", `${(bx * (1 + 0.1 * fase.p)).toFixed(5)} ${(by * (1 + 0.16 * fase.p)).toFixed(5)}`);
      };
      ato.classList.add("rodizio--ondula");
      // ciclo de 12 s (6 + 6), defasado 3 s do hero; fase 0 = deslocamento 0 = estático
      const onda = gsap.to(fase, { p: 1, duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 3, onUpdate: escrever });
      m.loop(reflexo, onda, { grupo: "turbulencia" });
      dbg.onda = onda;
      limpezas.push(() => {
        ato.classList.remove("rodizio--ondula");
        desloc.setAttribute("scale", "0");
        turb.setAttribute("baseFrequency", `${bx} ${by}`);
      });
    }

    return () => limpezas.forEach((f) => f());
  });
})();
