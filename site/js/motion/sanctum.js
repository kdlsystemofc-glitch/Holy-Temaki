// Motion do ACT III (#ato-3) — DESIGN.md §5 Sanctum, §5.0. Loops em css/sanctum-motion.css;
// parallax declarativo (data-parallax). Aqui:
//   · entrada da seção, uma vez, a 35 % de visibilidade: salão 1,08 → 1 (2400 ms), neon em
//     cascata (90 ms entre barras, flicker de 3 passos), luz rebatida depois da 3ª barra, título;
//   · rótulo como no ACT II;
//   · zoom lento do salão acompanhando a rolagem (1 → 1,03), em wrapper próprio;
//   · os loops começam depois da entrada (.is-aceso).
// Só é escondido o que ainda está abaixo da tela quando o motion se instala (D35). Sem JS ou em
// "reduced": estático — neon aceso, título visível.
(() => {
  const { motion, gsap, ScrollTrigger } = window;
  const ato = document.getElementById("ato-3");
  if (!motion || !ato) return;

  const um = (sel) => ato.querySelector(sel);
  const todos = (sel) => [...ato.querySelectorAll(sel)];
  const visivel = (el) => getComputedStyle(el).display !== "none";
  const rotulo = um(".sanctum__head .act-label");
  const titulo = um(".sanctum__place");
  const ESPALHA = 0.12; // em: espaçamento de partida (o estático aprovado tem --ls-display: 0)

  // ── título em letras, sem animar letter-spacing (D38) ──
  // Mede onde o texto original desenha cada letra (Range, com kerning) e cria uma cópia
  // aria-hidden com as letras nesses pontos. Cada letra parte deslocada como se o espaçamento
  // fosse +0,12em a partir do centro da sua linha e converge por translateX. Enquanto isso o
  // original fica transparente (.is-letras), mas segue no layout e na árvore de acessibilidade;
  // ao terminar, a cópia sai e o original — um nó só, nunca desmontado — volta.
  const montarLetras = () => {
    const base = titulo.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(titulo).fontSize);
    const letras = [];
    const range = document.createRange();
    const andar = document.createTreeWalker(titulo, NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) {
      for (let i = 0; i < no.length; i++) {
        range.setStart(no, i); range.setEnd(no, i + 1);
        const r = range.getClientRects()[0];
        if (r) letras.push({ ch: no.data[i], x: r.left - base.left, y: r.top - base.top });
      }
    }
    const linhas = new Map(); // retrato: duas linhas, cada uma centrada
    for (const l of letras) {
      const k = Math.round(l.y / (em * 0.5));
      if (!linhas.has(k)) linhas.set(k, []);
      linhas.get(k).push(l);
    }
    const fx = document.createElement("span");
    fx.className = "sanctum__place-fx";
    fx.setAttribute("aria-hidden", "true");
    const itens = [];
    for (const linha of linhas.values()) {
      linha.sort((a, b) => a.x - b.x);
      linha.forEach((l, j) => {
        if (!l.ch.trim()) return; // espaço: só ocupa posição na conta do espaçamento
        const s = document.createElement("span");
        s.textContent = l.ch;
        fx.append(s);
        itens.push({ s, l, dx: (j - (linha.length - 1) / 2) * ESPALHA * em });
      });
    }
    titulo.append(fx);
    // 1ª colocação na posição medida; a caixa da letra solta não coincide com a do trecho,
    // então mede de novo e corrige a diferença
    for (const it of itens) gsap.set(it.s, { x: it.l.x, y: it.l.y });
    for (const it of itens) {
      range.selectNodeContents(it.s);
      const r = range.getClientRects()[0];
      it.x = 2 * it.l.x - (r.left - base.left);
      it.y = 2 * it.l.y - (r.top - base.top);
      gsap.set(it.s, { x: it.x, y: it.y });
    }
    return { fx, itens };
  };

  motion.register((m) => {
    const dbg = (m.debug.ato3 = {}); // gancho de teste (test-motion-ato3.mjs)
    if (m.base !== "full") return;
    const limpezas = [];

    // ── 7 · rótulo: translateY(16px) + fade, 600 ms ──
    if (rotulo && m.abaixo(rotulo)) {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(rotulo, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: m.dur("--t-mid"), ease: m.ease });
      dbg.rotulo = m.entrada(rotulo, tl, () => gsap.set(rotulo, { clearProps: "transform,opacity" }));
    }

    // ── entrada da seção ──
    const acender = () => ato.classList.add("is-aceso");
    if (m.abaixo(ato)) {
      const salao = um(".sanctum__room-in");
      const slots = todos(".neon__slot").filter(visivel);
      const luzes = todos(".sanctum__spill").filter(visivel);
      const soFade = m.quality === "low";
      const T0 = 0.3, TD = 1.4;
      const tl = gsap.timeline({ paused: true });
      let letras = null;

      const construir = () => {
        tl.clear();
        // 3 · salão: scale(1.08) → 1, 2400 ms --ease-out
        tl.fromTo(salao, { scale: 1.08, willChange: "transform" }, { scale: 1, duration: m.dur("--t-cine"), ease: m.ease }, 0);
        // 1 · neon: da esquerda para a direita, 90 ms entre barras; flicker .2 → 1 → .7 → 1
        slots.forEach((slot, k) => tl.fromTo(slot, { opacity: 0 }, {
          keyframes: [{ opacity: 0.2, duration: 0.05 }, { opacity: 1, duration: 0.05 }, { opacity: 0.7, duration: 0.05 }, { opacity: 1, duration: 0.05 }],
          ease: "none",
        }, k * 0.09));
        // 6 · luz rebatida: depois que a 3ª barra acende, 1200 ms
        if (luzes.length) tl.fromTo(luzes, { opacity: 0 }, { opacity: 1, duration: m.dur("--t-slow"), ease: m.ease }, 2 * 0.09 + 0.2);
        // 5 · título: fade + espaçamento por transform; em "low", só fade
        if (soFade) {
          tl.fromTo(titulo, { opacity: 0 }, { opacity: 1, duration: TD, ease: m.ease }, T0);
        } else {
          letras?.fx.remove();
          letras = montarLetras();
          titulo.classList.add("is-letras");
          tl.fromTo(letras.fx, { opacity: 0 }, { opacity: 1, duration: TD, ease: m.ease }, T0);
          for (const it of letras.itens) tl.fromTo(it.s, { x: it.x + it.dx }, { x: it.x, duration: TD, ease: m.ease }, T0);
        }
        tl.progress(0); // aplica os estados de partida (tudo "apagado") já
      };
      construir();

      // fontes e layout podem mudar antes do disparo (refresh do ScrollTrigger): mede de novo
      const refazer = () => { if (!soFade && tl.progress() === 0 && !tl.isActive()) construir(); };
      ScrollTrigger.addEventListener("refresh", refazer);

      const restaurarTitulo = () => {
        letras?.fx.remove();
        letras = null;
        titulo.classList.remove("is-letras");
        gsap.set(titulo, { clearProps: "opacity" });
      };
      limpezas.push(() => ScrollTrigger.removeEventListener("refresh", refazer), restaurarTitulo);
      dbg.entrada = m.entrada(ato, tl, () => {
        gsap.set([salao, ...slots, ...luzes], { clearProps: "transform,opacity,willChange" });
        restaurarTitulo();
        acender();
      });
    } else {
      acender(); // já estava à vista quando o motion chegou: sem entrada, loops já
    }
    limpezas.push(() => ato.classList.remove("is-aceso"));

    // ── 3b · zoom lento do salão acompanhando a rolagem: 1 no repouso (ato no topo da tela) →
    // 1,03 quando ele sai por cima. Wrapper próprio; parado (⏸) volta a 1, como o parallax ──
    const zoom = um(".sanctum__room-zoom");
    // escrita direta: o quickSetter do GSAP não aceita o atalho "scale" (não grava nada)
    const escala = (v) => { zoom.style.transform = `scale(${v.toFixed(4)})`; };
    const st = ScrollTrigger.create({
      trigger: ato, start: "top top", end: "bottom top",
      onUpdate: (self) => escala(1 + 0.03 * self.progress),
      onToggle: (self) => { zoom.style.willChange = self.isActive ? "transform" : ""; },
    });
    const alternar = (modo) => {
      if (modo === "paused") { st.disable(false); zoom.style.removeProperty("transform"); zoom.style.willChange = ""; }
      else { st.enable(); escala(1 + 0.03 * st.progress); }
    };
    if (m.mode === "paused") alternar("paused");
    limpezas.push(m.on("mode", alternar), () => zoom.style.removeProperty("transform"));

    // ── 4 · deriva da névoa pausa durante a rolagem (D32): classe no próprio elemento — um
    // atributo no <html> invalidaria o estilo da página inteira a cada gesto (medido: pior) ──
    const nevoa = um(".sanctum__fog");
    let parada = 0;
    const aoRolar = () => {
      if (!parada) nevoa.classList.add("is-parada");
      clearTimeout(parada);
      parada = setTimeout(() => { parada = 0; nevoa.classList.remove("is-parada"); }, 200);
    };
    if (m.quality === "high") {
      addEventListener("scroll", aoRolar, { passive: true });
      limpezas.push(() => { removeEventListener("scroll", aoRolar); clearTimeout(parada); nevoa.classList.remove("is-parada"); });
    }

    return () => limpezas.forEach((f) => f());
  });
})();
