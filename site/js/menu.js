// Overlay de menu (D11). Sem JS: o hambúrguer é um link para #menu e o overlay abre por
// :target. Com JS: vira <button aria-expanded aria-controls>, foco preso no overlay (+ o X),
// Esc fecha, foco volta ao botão, página travada e inerte enquanto aberto.

const menu = document.getElementById("menu");
const linkToggle = document.querySelector("[data-menu-toggle]");

if (menu && linkToggle) {
  // ── o link vira botão ──
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = linkToggle.className;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "menu");
  toggle.append(...linkToggle.childNodes);
  linkToggle.replaceWith(toggle);
  const rotulo = toggle.querySelector("[data-menu-label]");

  // Cardápio: mesma constante de número do formulário (js/config.js)
  const cardapio = menu.querySelector("[data-wa-menu]");
  if (cardapio) cardapio.href = waLink("Olá! Gostaria de ver o cardápio.");

  // tudo o que fica fora do diálogo enquanto ele está aberto
  const fora = () => [
    document.querySelector(".skip-link"),
    document.querySelector(".site-header .logo"),
    document.querySelector(".act-nav"),
    document.getElementById("conteudo"),
    document.querySelector(".site-footer"),
  ].filter(Boolean);

  const focaveis = () => [toggle, ...menu.querySelectorAll("a[href]:not(.menu__close)")];
  let aberto = false;

  const abrir = () => {
    if (aberto) return;
    aberto = true;
    const raiz = document.documentElement;
    raiz.style.setProperty("--scrollbar", `${innerWidth - raiz.clientWidth}px`);
    menu.classList.add("is-open");
    document.documentElement.classList.add("menu-open");
    fora().forEach((el) => { el.inert = true; });
    toggle.setAttribute("aria-expanded", "true");
    rotulo.textContent = "Fechar menu";
    menu.querySelector(".menu__link")?.focus();
  };

  const fechar = ({ devolverFoco = true } = {}) => {
    if (!aberto) return;
    aberto = false;
    menu.classList.remove("is-open");
    document.documentElement.classList.remove("menu-open");
    fora().forEach((el) => { el.inert = false; });
    toggle.setAttribute("aria-expanded", "false");
    rotulo.textContent = "Abrir menu";
    if (devolverFoco) toggle.focus();
  };

  toggle.addEventListener("click", () => (aberto ? fechar() : abrir()));

  // item clicado: fecha e deixa o link seguir (âncora rola até a seção; Cardápio abre o WhatsApp)
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a[href]")) fechar({ devolverFoco: false });
  });

  document.addEventListener("keydown", (e) => {
    if (!aberto) return;
    if (e.key === "Escape") {
      e.preventDefault();
      fechar();
      return;
    }
    if (e.key !== "Tab") return;
    // foco preso: X → itens → X
    const lista = focaveis();
    const i = lista.indexOf(document.activeElement);
    const prox = e.shiftKey ? (i <= 0 ? lista.length - 1 : i - 1) : (i === lista.length - 1 ? 0 : i + 1);
    e.preventDefault();
    lista[prox].focus();
  });

  // se a página foi aberta em /#menu com JS ligado, limpa o hash sem abrir
  if (location.hash === "#menu") history.replaceState(null, "", location.pathname + location.search);
}
