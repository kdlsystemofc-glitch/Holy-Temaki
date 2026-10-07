// Navegação entre atos (D17, D13): trilho ativo, progresso de scroll, player ⏮ ⏸ ⏭.

const atos = [...document.querySelectorAll("main > section[id^='ato-']")];
const ticks = [...document.querySelectorAll(".rail__tick")];
const progress = document.querySelector(".progress");
const [prev, next] = ["prev", "next"].map((d) => document.querySelector(`[data-act="${d}"]`));
const pause = document.querySelector("[data-pause]");
const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");

let atual = 0;
// ato pedido por ⏮ ⏭ ainda a caminho: o próximo clique conta a partir dele, não do ato que a
// rolagem está atravessando (senão cliques rápidos voltavam para um ato intermediário)
let destino = null;

// ── trilho: o ato que cruza o meio da viewport fica ativo ──
const ativar = (i) => {
  atual = i;
  ticks.forEach((t, j) => (j === i ? t.setAttribute("aria-current", "location") : t.removeAttribute("aria-current")));
  prev?.setAttribute("aria-disabled", String(i === 0));
  next?.setAttribute("aria-disabled", String(i === atos.length - 1));
};

const observador = new IntersectionObserver(
  (entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const i = atos.indexOf(e.target);
      ativar(i);
      if (i === destino) destino = null;
    }
  },
  { rootMargin: "-50% 0px -50% 0px" }, // linha no meio da tela
);
atos.forEach((a) => observador.observe(a));
ativar(0);

// ── progresso + convivência com o rodapé ──
const rodape = document.getElementById("rodape");
const raiz = document.documentElement;
let pendente = false;
const medir = () => {
  pendente = false;
  const max = raiz.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  progress?.style.setProperty("--progress", p.toFixed(4));

  if (rodape) {
    const topo = rodape.getBoundingClientRect().top;
    // o player sobe o quanto o rodapé ocupa da tela (desktop; ver nav.css)
    raiz.style.setProperty("--nav-lift", `${Math.max(0, Math.round(innerHeight - topo))}px`);
    // trilho/progresso ocupam ~40–63 % da altura: saem quando o rodapé chega nessa faixa
    raiz.toggleAttribute("data-at-footer", topo < innerHeight * 0.66);
  }
};
addEventListener("scroll", () => { if (!pendente) { pendente = true; requestAnimationFrame(medir); } }, { passive: true });
addEventListener("resize", medir);
medir();

// ── ⏮ ⏭: ato vizinho. Com o motion ativo, pelo motion.scrollTo (Lenis no modo "full");
// sem ele, rolagem nativa, suave só sem prefers-reduced-motion ──
const irPara = (i) => {
  if (i < 0 || i >= atos.length) return;
  destino = i;
  if (!window.motion?.scrollTo(atos[i])) atos[i].scrollIntoView({ behavior: reduzido.matches ? "auto" : "smooth", block: "start" });
  ativar(i); // reflete já; o observador confirma ao chegar
};
prev?.addEventListener("click", () => irPara((destino ?? atual) - 1));
next?.addEventListener("click", () => irPara((destino ?? atual) + 1));
// âncoras de ato (trilho, menu, RESERVAR, logo) também contam como destino pedido
document.addEventListener("click", (e) => {
  const i = atos.findIndex((a) => e.target.closest?.(`a[href="#${a.id}"]`));
  if (i >= 0) destino = i;
});

// O motion chega depois do load (D29); se ele se instalou no meio de uma navegação (o
// ScrollTrigger reescreve a posição de rolagem ao se registrar), retoma até o destino
document.addEventListener("motion:pronto", () => {
  if (destino !== null && Math.abs(atos[destino].getBoundingClientRect().top) > 2) window.motion.scrollTo(atos[destino]);
});

// o visitante assumiu a rolagem: vale de novo o ato em que ele está
const soltar = () => { destino = null; };
addEventListener("wheel", soltar, { passive: true });
addEventListener("touchstart", soltar, { passive: true });
addEventListener("keydown", (e) => { if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) soltar(); });

// ── ⏸: alterna html[data-motion="paused"]. Quem reage é js/motion/core.js (modo "paused":
// timeline global e animações CSS congeladas, Lenis desligado). Ver DESIGN.md §5, D26.
pause?.addEventListener("click", () => {
  const pausado = pause.getAttribute("aria-pressed") !== "true";
  pause.setAttribute("aria-pressed", String(pausado));
  pause.setAttribute("aria-label", pausado ? "Retomar animações" : "Pausar animações"); // ícone ▶ via CSS
  if (pausado) document.documentElement.dataset.motion = "paused";
  else delete document.documentElement.dataset.motion;
});
