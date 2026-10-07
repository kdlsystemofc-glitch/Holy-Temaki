// Motion do rodapé (#rodape) — DESIGN.md §5 Rodapé, §5.0.
// Entrada: translateY(16px) + fade, 600 ms (--t-mid, --ease-out), uma vez, a 35 % de
// visibilidade (motion.entrada). Só se o rodapé ainda estiver abaixo da tela quando o motion se
// instala (D35): chegar por #rodape ou pelo fim da página nunca o deixa escondido. O sublinhado
// dos links é interface (css/footer.css). Sem JS ou em "reduced": estático.
(() => {
  const { motion, gsap } = window;
  const rodape = document.getElementById("rodape");
  const grade = rodape?.querySelector(".site-footer__grid");
  if (!motion || !grade) return;

  motion.register((m) => {
    const dbg = (m.debug.rodape = {}); // gancho de teste
    if (m.base !== "full" || !m.abaixo(rodape)) return;
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(grade, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: m.dur("--t-mid"), ease: m.ease });
    dbg.entrada = m.entrada(rodape, tl, () => gsap.set(grade, { clearProps: "transform,opacity" }));
  });
})();
