// Motion — núcleo e fonte única de verdade do modo de animação (DESIGN.md §5, D26–D30).
// Script clássico (não ES module) para o site abrir por file://. Depende de js/vendor/
// gsap.min.js + ScrollTrigger.min.js (obrigatórios) e lenis.min.js (opcional).
//
// API (window.motion):
//   motion.mode             "full" | "reduced" | "paused"   (paused > reduced > full)
//   motion.base             "full" | "reduced"              o que as animações registradas montaram
//   motion.quality          "high" | "low"                  html[data-quality], fixo por carga
//   motion.on("mode", fn)   fn(mode, anterior) a cada troca; devolve a função que desinscreve
//   motion.register(setup)  setup(motion) roda dentro de um gsap.context e pode devolver uma
//                           função de limpeza. É desfeito e refeito quando motion.base muda.
//                           A pausa NÃO refaz nada: congela a timeline global e, ao sair, tudo
//                           continua de onde parou. Devolve a função que desregistra.
//   motion.loop(el, anim, { grupo })  animação contínua: pausada com `el` fora da tela;
//                           recusada em "reduced" (mata a animação e devolve null). Num `grupo`
//                           (ex.: "turbulencia") só roda a do elemento mais visível (D34)
//   motion.rolando          true enquanto a página rola (até 200 ms depois do último scroll)
//   motion.abaixo(el)       true se `el` ainda não chegou a --reveal-at (35 %) de visibilidade
//   motion.entrada(gatilho, tl, fim)  entrada de seção (D35): a timeline pausada `tl` toca uma
//                           vez quando 35 % do gatilho aparece; em "paused" conclui na hora (e as
//                           em andamento também, ao pausar); `fim()` roda ao terminar. Chamar
//                           dentro de motion.register (o ScrollTrigger é desfeito junto)
//   motion.debug            gancho de inspeção para os testes (cada módulo expõe o que precisar)
//   motion.scrollTo(alvo)   rola até um elemento/seletor (Lenis se ativo, senão nativo)
//   motion.scan()           relê data-reveal / data-parallax / data-loop (conteúdo novo)
//   motion.ease, motion.easeSoft, motion.dur("--t-mid")   tokens de tokens.css já convertidos
//   motion.lenis            instância do Lenis ou null
(() => {
  const raiz = document.documentElement;
  const { gsap, ScrollTrigger, Lenis } = window;

  const falhar = (erro) => {
    raiz.classList.remove("js-motion", "motion-enter");
    raiz.dataset.motionReady = "failed";
    console.warn("[motion] desligado, conteúdo estático:", erro);
  };
  // o carregador do <head> desistiu (rede lenta): o conteúdo já está todo à mostra e fica assim
  if (raiz.dataset.motionReady === "failed") return;
  if (!gsap || !ScrollTrigger) return falhar("GSAP/ScrollTrigger não carregou");

  try {
    gsap.registerPlugin(ScrollTrigger);

    // ── tokens (DESIGN.md §5) ─────────────────────────────────
    const estilo = getComputedStyle(raiz);
    const token = (nome) => estilo.getPropertyValue(nome).trim();
    const dur = (nome) => { const v = token(nome); return v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v); };
    // cubic-bezier(x1, y1, x2, y2) → função de easing do GSAP (sem o plugin CustomEase)
    const bezier = (valor) => {
      const m = /cubic-bezier\(([^)]+)\)/.exec(valor);
      if (!m) return "power3.out";
      const [x1, y1, x2, y2] = m[1].split(",").map(Number);
      const curva = (a, b) => (t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
      const X = curva(x1, x2), Y = curva(y1, y2);
      return (x) => {
        if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
        let lo = 0, hi = 1, t = x;
        for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
        return Y(t);
      };
    };

    // ── modos ─────────────────────────────────────────────────
    const mqReduzido = matchMedia("(prefers-reduced-motion: reduce)");
    const calcularModo = () => (raiz.dataset.motion === "paused" ? "paused" : mqReduzido.matches ? "reduced" : "full");
    const calcularBase = () => (mqReduzido.matches ? "reduced" : "full");

    const n = navigator;
    const quality = raiz.dataset.quality ||
      (raiz.dataset.quality = n.hardwareConcurrency <= 4 || n.deviceMemory <= 4 || n.connection?.saveData || innerWidth < 768 ? "low" : "high");

    let modo = calcularModo();
    let base = null;
    const ouvintes = new Set();
    const registros = [];
    let emMontagem = null; // registro cujo setup está rodando (para motion.loop achar o dono)
    let rolando = false;
    let fimRolagem = 0;
    addEventListener("scroll", () => {
      rolando = true;
      clearTimeout(fimRolagem);
      fimRolagem = setTimeout(() => { rolando = false; }, 200);
    }, { passive: true });
    let iniciado = false;  // ver "início" no fim: nada é montado antes de a rolagem parar

    const api = {
      get mode() { return modo; },
      get base() { return base; },
      quality,
      lenis: null,
      get rolando() { return rolando; },
      debug: {},
      ease: bezier(token("--ease-out")),
      easeSoft: bezier(token("--ease-soft")),
      dur,
      on(evento, fn) {
        if (evento !== "mode") throw new Error(`[motion] evento desconhecido: ${evento}`);
        ouvintes.add(fn);
        return () => ouvintes.delete(fn);
      },
      register(setup) {
        const r = { setup, ctx: null, limpar: null, extras: [] };
        registros.push(r);
        if (iniciado) montar(r);
        return () => { desmontar(r); registros.splice(registros.indexOf(r), 1); };
      },
      loop(el, anim, { grupo = null } = {}) {
        if (base === "reduced") { anim.kill(); return null; }
        loops.add(el, anim, grupo);
        emMontagem?.extras.push(() => loops.remove(el, anim));
        return anim;
      },
      scrollTo(alvo, { imediato = false } = {}) {
        const el = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
        if (!el) return false;
        if (lenis) rolar(el, { immediate: imediato });
        else el.scrollIntoView({ behavior: imediato || mqReduzido.matches ? "auto" : "smooth", block: "start" });
        return true;
      },
      scan() { desmontar(declarativos); montar(declarativos); },
      abaixo(el) {
        const f = parseFloat(token("--reveal-at")) || 0.35;
        return el.getBoundingClientRect().top + Math.min(el.offsetHeight, innerHeight) * f > innerHeight;
      },
      entrada(gatilho, tl, fim) {
        const f = parseFloat(token("--reveal-at")) || 0.35;
        const tocar = () => {
          tl.eventCallback("onComplete", () => { emAndamento.delete(tl); fim?.(); });
          if (modo === "paused") { tl.progress(1); return; }
          emAndamento.add(tl);
          tl.play();
        };
        ScrollTrigger.create({
          trigger: gatilho, once: true,
          start: () => `top+=${Math.min(gatilho.offsetHeight, innerHeight) * f} bottom`,
          onEnter: tocar,
        });
        return tl;
      },
    };

    function montar(r) {
      emMontagem = r;
      try {
        r.ctx = gsap.context(() => {
          const limpar = r.setup(api);
          r.limpar = typeof limpar === "function" ? limpar : null;
        });
      } catch (e) {
        console.error("[motion] falha num setup registrado:", e);
      } finally {
        emMontagem = null;
      }
    }
    function desmontar(r) {
      r.extras.splice(0).forEach((f) => f());
      try { r.limpar?.(); } finally { r.ctx?.revert(); r.ctx = r.limpar = null; }
    }

    // ── Lenis: só no modo full ────────────────────────────────
    let lenis = null;
    let destino = null; // alvo da rolagem suave em andamento (lenis.targetScroll acompanha o passo)
    const rolar = (el, opcoes = {}) => {
      destino = el;
      // duração fixa (tokens), não o lerp: o lerp tem uma cauda sub-pixel longa em que uma
      // rolagem nativa (script, foco) seria desfeita pelo Lenis no quadro seguinte
      lenis.scrollTo(el, {
        offset: 0, force: true, duration: dur("--t-slow"), easing: api.easeSoft, ...opcoes,
        onComplete: () => { destino = null; opcoes.onComplete?.(); },
      });
    };
    const raf = (t) => lenis?.raf(t * 1000);
    const ligarLenis = () => {
      if (lenis || !Lenis) return;
      lenis = api.lenis = new Lenis({ autoRaf: false, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      if (raiz.classList.contains("menu-open")) lenis.stop();
    };
    const desligarLenis = () => {
      if (!lenis) return;
      // rolagem suave em andamento (⏮ ⏭, âncora): termina no destino, sem parar entre atos
      const pendente = lenis.isSmooth ? destino : null;
      destino = null;
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      // Lenis 1.3.26: destroy() não cancela o timer de 400 ms da rolagem nativa, que depois
      // devolve as classes .lenis ao <html>
      clearTimeout(lenis._resetVelocityTimeout);
      lenis.destroy();
      lenis = api.lenis = null;
      pendente?.scrollIntoView({ behavior: "instant", block: "start" });
    };

    // âncoras da página com o Lenis ativo: rolagem suave com offset zero (.section já tem
    // scroll-margin 0). Sem Lenis, o navegador cuida (scroll-behavior de reset.css).
    document.addEventListener("click", (e) => {
      if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href^="#"]');
      const id = a?.getAttribute("href").slice(1);
      const alvo = id && id !== "menu" && document.getElementById(id);
      if (!alvo) return;
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
      rolar(alvo, {
        // ativado por teclado (detail 0): o foco acompanha, como na âncora nativa + skip link
        onComplete: () => {
          if (e.detail !== 0) return;
          if (!alvo.hasAttribute("tabindex")) {
            alvo.setAttribute("tabindex", "-1");
            alvo.addEventListener("blur", () => alvo.removeAttribute("tabindex"), { once: true });
          }
          alvo.focus({ preventScroll: true });
        },
      });
    });

    // ── loops: pausados fora da tela ──────────────────────────
    // Loops: pausados fora da tela (com 10 % de margem). Num grupo exclusivo, só roda o do elemento mais visível
    // (D34: um feTurbulence animado por vez — hero e ACT II se tocam na emenda).
    const loops = (() => {
      const anims = new Map();  // el → Set({ anim, grupo })
      const visivel = new Map(); // el → fração visível (0 = fora da tela, com margem de 10 %)
      const decidir = () => {
        const lider = new Map(); // grupo → [el, fração]
        for (const [el, itens] of anims) {
          const f = visivel.get(el) ?? 0;
          for (const { grupo } of itens) if (grupo && f > (lider.get(grupo)?.[1] ?? 0)) lider.set(grupo, [el, f]);
        }
        for (const [el, itens] of anims) {
          for (const { anim, grupo } of itens) {
            const roda = grupo ? lider.get(grupo)?.[0] === el : (visivel.get(el) ?? 0) > 0;
            if (roda) anim.resume(); else anim.pause();
          }
        }
      };
      const io = new IntersectionObserver((entradas) => {
        for (const { target, isIntersecting, intersectionRatio } of entradas) {
          // só encostar na borda da tela (área 0) conta como "intersecting" para o observador: não
          // para os loops — senão o ACT II rodaria com o hero ocupando a tela inteira
          const naTela = isIntersecting && intersectionRatio > 0;
          target.toggleAttribute("data-offscreen", !naTela); // loops CSS (motion.css)
          visivel.set(target, naTela ? intersectionRatio : 0);
        }
        decidir();
      // margem de 10 %: o loop já está rodando quando a seção aparece — com margem 0 as camadas de
      // dezenas de animações eram criadas no meio da rolagem, na tela (medido: +2,5 pontos de
      // quadros descartados na página inteira)
      }, { rootMargin: "10% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
      return {
        observar: (el) => io.observe(el),
        add(el, anim, grupo) {
          if (!anims.has(el)) { anims.set(el, new Set()); io.observe(el); }
          anims.get(el).add({ anim, grupo });
          // ainda sem medida do observador: começa pausada; com medida (data-loop), decide já
          decidir();
        },
        remove(el, anim) {
          const itens = anims.get(el);
          if (!itens) return;
          for (const it of itens) if (it.anim === anim) itens.delete(it);
          if (!itens.size) { anims.delete(el); if (!el.hasAttribute("data-loop")) { io.unobserve(el); visivel.delete(el); } }
          decidir();
        },
      };
    })();

    // ── utilitários declarativos: data-reveal, data-parallax, data-loop ──
    // Escritas de estado vão direto no style: gsap.set entra na timeline global, e com ela
    // pausada (modo "paused") o valor não seria aplicado.
    const limparEstilo = (el, ...props) => props.forEach((p) => el.style.removeProperty(p));
    const emAndamento = new Set(); // tweens de revelação, concluídos na hora ao pausar
    const concluir = (el) => {
      el.setAttribute("data-revealed", "");
      limparEstilo(el, "opacity", "transform", "will-change");
    };
    const revelar = (el) => {
      if (el.hasAttribute("data-revealed")) return;
      if (modo === "paused") return concluir(el);
      const cheio = base === "full";
      const t = gsap.to(el, {
        opacity: 1,
        ...(cheio && { y: 0, scale: 1 }),
        duration: cheio ? dur("--t-mid") : dur("--t-fade"),
        ease: cheio ? api.ease : "none",
        delay: cheio ? (Number(el.dataset.revealDelay) || 0) / 1000 : 0,
        onStart: () => { if (cheio) el.style.willChange = "transform, opacity"; },
        onComplete: () => { emAndamento.delete(t); concluir(el); },
      });
      emAndamento.add(t);
    };

    const declarativos = {
      extras: [],
      setup() {
        const fracao = parseFloat(token("--reveal-at")) || 0.35;
        const escondidos = []; // "reduced": opacity 0 posta por aqui, desfeita na limpeza
        const limpezas = [() => escondidos.forEach((el) => { if (!el.hasAttribute("data-revealed")) limparEstilo(el, "opacity"); })];
        const limpar = () => limpezas.forEach((f) => f());
        for (const el of document.querySelectorAll("[data-reveal]:not([data-revealed])")) {
          const r = el.getBoundingClientRect();
          if (r.bottom <= 0) { concluir(el); continue; } // já ficou para trás (link direto a um ato)
          if (base === "reduced") {
            // sem estado escondido pré-pintura em "reduced": só some quem ainda está abaixo da tela
            if (r.top < innerHeight) { concluir(el); continue; }
            el.style.opacity = "0";
            escondidos.push(el);
          }
          ScrollTrigger.create({
            trigger: el,
            start: () => `top+=${Math.min(el.offsetHeight, innerHeight) * fracao} bottom`,
            once: true,
            onEnter: () => revelar(el),
          });
        }

        for (const el of document.querySelectorAll("[data-loop]")) loops.observar(el);

        // parallax: y = fator × (scroll − repouso); repouso = ato alinhado ao topo da tela,
        // então cada ato parado (⏮ ⏭, âncora) mostra o layout estático exato
        if (base !== "full" || quality === "low") return limpar;
        const itens = [...document.querySelectorAll("[data-parallax]")].map((el) => {
          const fator = parseFloat(el.dataset.parallax) || 0;
          const ato = el.closest("section, .section") || el;
          const y = gsap.quickSetter(el, "y", "px");
          let repouso = 0; // scroll em que o topo do ato encosta no topo da tela
          const posicionar = (st) => y(fator * (gsap.utils.clamp(st.start, st.end, st.scroll()) - repouso));
          const st = ScrollTrigger.create({
            trigger: ato,
            start: "top bottom",
            end: "bottom top",
            onRefresh: (self) => { repouso = self.end - ato.offsetHeight; posicionar(self); },
            onUpdate: posicionar,
            onToggle: (self) => { el.style.willChange = self.isActive ? "transform" : ""; },
          });
          repouso = st.end - ato.offsetHeight;
          posicionar(st);
          return { el, st, y, posicionar };
        });
        // setter direto: um gsap.set entraria na timeline global, que está pausada
        const alternar = (m) => {
          for (const { el, st, y, posicionar } of itens) {
            // pausado: sem transform nenhum (nem translate(0,0)), para o elemento sair da camada
            // do compositor e voltar a ser desenhado exatamente como no estático
            if (m === "paused") { st.disable(false); y(0); limparEstilo(el, "transform", "will-change", "translate", "rotate", "scale"); }
            else { st.enable(); posicionar(st); }
          }
        };
        if (modo === "paused") alternar(modo);
        limpezas.push(api.on("mode", alternar), () => itens.forEach(({ el }) => limparEstilo(el, "transform", "will-change", "translate", "rotate", "scale")));
        return limpar;
      },
    };

    // ── aplicar o modo (carga + toda mudança) ─────────────────
    // idempotente: pode rodar a qualquer momento e só muda o que difere
    const aplicar = () => {
      if (!iniciado) return;
      const anterior = modo;
      modo = calcularModo();
      const novaBase = calcularBase();
      if (novaBase !== base) {
        registros.forEach(desmontar);
        base = novaBase;
        raiz.classList.toggle("js-motion", base === "full"); // "reduced": nada escondido pré-pintura
        registros.forEach(montar);
      }
      if (modo === "paused") {
        gsap.globalTimeline.pause();
        emAndamento.forEach((t) => t.progress(1)); // nada fica meio revelado
      } else if (!document.hidden) {
        gsap.globalTimeline.resume();
      }
      if (modo === "full") ligarLenis(); else desligarLenis();
      if (anterior !== modo) ouvintes.forEach((fn) => fn(modo, anterior));
    };

    // prefers-reduced-motion em tempo real, ⏸ (data-motion) e menu (class menu-open)
    mqReduzido.addEventListener("change", aplicar);
    let menuAberto = false;
    new MutationObserver(() => {
      if (calcularModo() !== modo) aplicar();
      const aberto = raiz.classList.contains("menu-open");
      if (aberto !== menuAberto) { menuAberto = aberto; if (aberto) lenis?.stop(); else lenis?.start(); }
    }).observe(raiz, { attributes: true, attributeFilter: ["class", "data-motion"] });

    // aba escondida: tudo pausa (CSS via data-page-hidden, GSAP via timeline global)
    const visibilidade = () => {
      raiz.toggleAttribute("data-page-hidden", document.hidden);
      if (document.hidden) gsap.globalTimeline.pause();
      else if (modo !== "paused") gsap.globalTimeline.resume();
    };
    document.addEventListener("visibilitychange", visibilidade);
    visibilidade();

    registros.push(declarativos);
    window.motion = api;

    // ── início ──
    // O motion chega depois do load, muitas vezes disparado por um gesto (D29). Criar
    // ScrollTriggers faz um refresh que reescreve a posição de rolagem, e isso interrompe uma
    // rolagem suave em andamento (⏭ clicado antes do motion chegar parava no topo). Por isso
    // tudo é montado só quando a rolagem fica 150 ms parada. Enquanto isso: ready="pending".
    raiz.dataset.motionReady = "pending";
    let espera = 0;
    const adiar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        removeEventListener("scroll", adiar);
        iniciado = true;
        modo = null; // força a 1ª aplicação completa (e o aviso aos ouvintes)
        aplicar();
        document.fonts?.ready.then(() => ScrollTrigger.refresh()); // fontes mudam a altura dos atos
        raiz.dataset.motionReady = "true";
        document.dispatchEvent(new Event("motion:pronto")); // js/nav.js retoma uma navegação interrompida
      }, 150);
    };
    addEventListener("scroll", adiar, { passive: true });
    adiar();
  } catch (e) {
    falhar(e);
  }
})();
