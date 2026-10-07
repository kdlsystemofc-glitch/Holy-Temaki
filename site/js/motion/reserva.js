// Motion do ACT IV (#ato-4) — DESIGN.md §5 Reserva, §5.0.
// PRIORIDADE: nada aqui atrapalha preencher e enviar o formulário.
//   · nenhum inert, pointer-events: none ou atraso nos campos; qualquer foco, clique ou digitação
//     no formulário conclui a entrada e cancela o contador na hora;
//   · o contador é uma camada visual aria-hidden por cima do campo: não mexe no value, no que o
//     leitor de tela lê nem no que o reflexo espelha (js/reserva.js continua dono dos dados);
//   · a confirmação só toca depois do window.open (evento "reserva:enviada") — nunca o atrasa.
// Também: entrada do rótulo, do card e do reflexo; ondulação da água (#water, deslocamento que
// parte de 0 = estático; grupo exclusivo "turbulencia", D34; congela na rolagem, D32); a deriva
// da bruma pausa na rolagem (classe no elemento, D39). Sem JS ou em "reduced": estático.
(() => {
  const { motion, gsap } = window;
  const ato = document.getElementById("ato-4");
  const form = document.getElementById("reserva");
  if (!motion || !ato || !form) return;

  const um = (sel) => ato.querySelector(sel);
  const rotulo = um(".act-label");
  const slot = um(".reserve__slot");
  const reflexo = um(".reserve__reflection");
  const campos = ["res-hh", "res-mm", "res-adultos", "res-criancas"].map((id) => document.getElementById(id)).filter(Boolean);
  const turbOnda = document.querySelector("#water feTurbulence[result='onda']");
  const desloc = document.querySelector("#water feDisplacementMap");

  // ── contador: cada dígito rola por uma faixa de 10 algarismos até o valor do campo ──
  const montarContador = () => {
    const camadas = campos.map((input) => {
      const valor = input.value;
      if (!/^\d{1,2}$/.test(valor)) return null;
      const camada = document.createElement("span");
      camada.className = "num-contador";
      camada.setAttribute("aria-hidden", "true");
      const faixas = [...valor].map((d) => {
        const alvo = Number(d);
        const janela = document.createElement("span");
        janela.className = "num-contador__janela";
        const faixa = document.createElement("span");
        faixa.className = "num-contador__faixa";
        // (alvo+1) … alvo: 10 algarismos, termina no dígito do campo
        for (let i = 1; i <= 10; i++) faixa.append(Object.assign(document.createElement("span"), { textContent: String((alvo + i) % 10) }));
        janela.append(faixa);
        camada.append(janela);
        return faixa;
      });
      return { input, camada, faixas };
    }).filter(Boolean);
    return camadas;
  };

  motion.register((m) => {
    const dbg = (m.debug.ato4 = {}); // gancho de teste (test-motion-ato4.mjs)
    if (m.base !== "full") return;
    const limpezas = [];

    // ── 3 · rótulo: translateY(16px) + fade, 600 ms ──
    let tlRotulo = null;
    if (rotulo && m.abaixo(rotulo)) {
      tlRotulo = gsap.timeline({ paused: true });
      tlRotulo.fromTo(rotulo, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: m.dur("--t-mid"), ease: m.ease });
      dbg.rotulo = m.entrada(rotulo, tlRotulo, () => gsap.set(rotulo, { clearProps: "transform,opacity" }));
    }

    // ── 4–6 · card, reflexo e contador ──
    let tl = null;
    let contador = [];
    const desmontarContador = () => {
      for (const c of contador) { c.camada.remove(); c.input.classList.remove("is-contando"); }
      contador = [];
    };
    if (slot && m.abaixo(slot)) {
      tl = gsap.timeline({ paused: true });
      // card: translateY(24px) → repouso, 900 ms. Só transform no wrapper externo: opacity num
      // ancestral do backdrop-filter faz dele a "raiz do backdrop" — o blur do card deixa de ver a
      // água durante o fade e volta de uma vez no fim (medido com opacity .99: 2,8 % dos pixels do
      // card mudam > 6/255, contra 0,46 % com translate). Ver D40.
      tl.fromTo(slot, { y: 24, willChange: "transform" }, { y: 0, duration: 0.9, ease: m.ease }, 0);
      // Fade no próprio card (o elemento com backdrop-filter) foi testado na etapa final e
      // revertido: no fim da entrada a camada criada pelo fade é desfeita e o card com blur é
      // redesenhado — 0,514 % dos pixels mudam entre quadros de 30 ms, acima do limite de 0,5 %
      // reflexo: 250 ms depois, opacity 0 → valor estático (lido do CSS)
      if (reflexo) {
        const final = parseFloat(getComputedStyle(reflexo).opacity) || 1;
        tl.fromTo(reflexo, { opacity: 0 }, { opacity: final, duration: 0.9, ease: m.ease }, 0.25);
      }
      // contador: dígitos rolam por 500 ms com steps(), a partir de 300 ms
      contador = montarContador();
      tl.call(() => { for (const c of contador) { c.input.parentElement.append(c.camada); c.input.classList.add("is-contando"); } }, null, 0.3);
      for (const c of contador) for (const f of c.faixas) tl.fromTo(f, { yPercent: 0 }, { yPercent: -90, duration: 0.5, ease: "steps(9)" }, 0.3);
      tl.call(desmontarContador, null, 0.8);
      dbg.entrada = m.entrada(slot, tl, () => {
        desmontarContador();
        gsap.set([slot, reflexo].filter(Boolean), { clearProps: "transform,opacity,willChange" });
      });
    }
    limpezas.push(desmontarContador);

    // o cliente mexeu no formulário: entrada concluída e contador cancelado, na hora
    const interagiu = () => {
      desmontarContador();
      if (tl && tl.progress() < 1) tl.progress(1);
      if (tlRotulo && tlRotulo.progress() < 1) tlRotulo.progress(1);
    };
    for (const ev of ["focusin", "pointerdown", "input", "keydown"]) form.addEventListener(ev, interagiu, { capture: true });
    limpezas.push(() => { for (const ev of ["focusin", "pointerdown", "input", "keydown"]) form.removeEventListener(ev, interagiu, { capture: true }); });

    // ── 2 · deriva da bruma pausa durante a rolagem (D39) ──
    const bruma = um(".reserve__mist");
    let parada = 0;
    const aoRolar = () => {
      if (!parada) bruma.classList.add("is-parada");
      clearTimeout(parada);
      parada = setTimeout(() => { parada = 0; bruma.classList.remove("is-parada"); }, 200);
    };
    if (bruma && m.quality === "high") {
      addEventListener("scroll", aoRolar, { passive: true });
      limpezas.push(() => { removeEventListener("scroll", aoRolar); clearTimeout(parada); bruma.classList.remove("is-parada"); });
    }

    // ── 1 · água: deslocamento 0 → 16 e ruído 0,008 → 0,014, ciclo de 9 s (4,5 + 4,5) ──
    const agua = um(".reserve__water");
    if (m.quality === "high" && turbOnda && desloc && agua && matchMedia("(min-width: 48rem)").matches) {
      const fase = { p: 0 };
      const escrever = () => {
        if (m.rolando) return;
        desloc.setAttribute("scale", (16 * fase.p).toFixed(2));
        turbOnda.setAttribute("baseFrequency", (0.008 + 0.006 * fase.p).toFixed(5));
      };
      const onda = gsap.to(fase, { p: 1, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: escrever });
      m.loop(agua, onda, { grupo: "turbulencia" });
      dbg.onda = onda;
      limpezas.push(() => { desloc.setAttribute("scale", "0"); turbOnda.setAttribute("baseFrequency", "0.008"); });
    }

    // ── 9 · confirmação: só depois de um envio válido (o WhatsApp já foi aberto) ──
    const confirmar = (e) => {
      if (m.mode !== "full") return; // pausado: nada se move
      const botao = e.detail?.botao;
      if (!botao) return;
      const a = ato.getBoundingClientRect(), b = botao.getBoundingClientRect();
      const onda = document.createElement("span");
      onda.className = "reserve__onda";
      onda.setAttribute("aria-hidden", "true");
      onda.style.left = `${b.left + b.width / 2 - a.left}px`;
      onda.style.top = `${b.top + b.height / 2 - a.top}px`;
      ato.insertBefore(onda, um(".reserve__layout"));
      const raio = Math.max(b.width, 320) / 20; // o círculo tem 40 px
      gsap.fromTo(onda, { scale: 1, opacity: 0.8 }, {
        scale: raio, opacity: 0, duration: m.dur("--t-mid"), ease: m.ease, onComplete: () => onda.remove(),
      });
      dbg.confirmacoes = (dbg.confirmacoes || 0) + 1;
    };
    form.addEventListener("reserva:enviada", confirmar);
    limpezas.push(() => form.removeEventListener("reserva:enviada", confirmar));

    return () => limpezas.forEach((f) => f());
  });
})();
