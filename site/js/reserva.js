// Reserva pelo WhatsApp (D9) — sem backend: o formulário só compõe a mensagem.

// Número de WhatsApp: constante WHATSAPP em js/config.js (compartilhada com o menu).

// CLIENTE.md: "Aberto · Fecha 23:00". O horário de abertura NÃO consta lá (DESIGN.md §8.2),
// então a validação só limita pelo fechamento.
const FECHA = { h: 22, m: 45 };
const JANELA_DIAS = 60;

const form = document.getElementById("reserva");

if (form) {
  const $ = (id) => document.getElementById(id);
  const dia = $("res-dia"), mes = $("res-mes");
  const hh = $("res-hh"), mm = $("res-mm");
  const adultos = $("res-adultos"), criancas = $("res-criancas");
  const erro = $("res-erro");

  const pad = (n) => String(n).padStart(2, "0");
  const waBase = waLink();
  const rotulo = `Reservar pelo WhatsApp // ${TELEFONE}`;

  // ── progressive enhancement: o link vira botão de envio ──
  const link = form.querySelector("[data-wa]");
  const botao = document.createElement("button");
  botao.type = "submit";
  botao.className = link.className;
  botao.textContent = rotulo;
  botao.dataset.rotulo = rotulo; // 2ª camada de texto da varredura do hover (css/reserve.css)
  link.replaceWith(botao);
  form.action = waBase;
  form.noValidate = true; // validação própria, mensagens em PT-BR

  // ── datas: hoje até hoje + 60 dias ──
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + JANELA_DIAS);

  const meses = [];
  for (let d = new Date(hoje.getFullYear(), hoje.getMonth(), 1); d <= limite; d.setMonth(d.getMonth() + 1)) {
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() });
  }
  mes.replaceChildren(...meses.map(({ ano, mes: m }) =>
    new Option(pad(m + 1), `${ano}-${pad(m + 1)}`)));

  const diasDoMes = () => {
    const [ano, m] = mes.value.split("-").map(Number);
    const ultimo = new Date(ano, m, 0).getDate();
    const dias = [];
    for (let d = 1; d <= ultimo; d++) {
      const data = new Date(ano, m - 1, d);
      if (data >= hoje && data <= limite) dias.push(d);
    }
    const atual = Number(dia.value);
    dia.replaceChildren(...dias.map((d) => new Option(pad(d), String(d))));
    dia.value = dias.includes(atual) ? String(atual) : String(dias[0]);
  };
  mes.addEventListener("change", diasDoMes);

  // valor inicial: hoje, ou amanhã se o horário padrão (20:00) já passou
  const inicio = new Date();
  if (inicio.getHours() * 60 + inicio.getMinutes() >= 20 * 60) inicio.setDate(inicio.getDate() + 1);
  mes.value = `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}`;
  dia.value = String(inicio.getDate());
  diasDoMes();
  dia.value = String(inicio.getDate());

  // ── campos numéricos: só dígitos ──
  for (const el of [hh, mm, adultos, criancas]) {
    el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, "").slice(0, 2); });
    // o zero à esquerda não dispara "input": o reflexo é atualizado aqui (antes ficava "1" × "01")
    el.addEventListener("blur", () => { if (el.value !== "") { el.value = pad(Number(el.value)); espelhar(); } });
  }

  // ── reflexo: a réplica mostra os mesmos valores ──
  const espelhar = () => {
    document.querySelectorAll("[data-mirror]").forEach((span) => {
      const src = span.dataset.mirror === "wa-label" ? null : $(span.dataset.mirror);
      if (span.dataset.mirror === "wa-label") span.textContent = rotulo;
      else if (src) span.textContent = src.tagName === "SELECT" ? src.selectedOptions[0]?.text ?? "" : src.value;
    });
  };
  form.addEventListener("input", espelhar);
  form.addEventListener("change", espelhar);
  espelhar();

  // ── validação ──
  const inteiro = (el) => (/^\d{1,2}$/.test(el.value) ? Number(el.value) : NaN);

  const validar = () => {
    const erros = [];
    const [ano, m] = (mes.value || "").split("-").map(Number);
    const data = new Date(ano, m - 1, Number(dia.value));
    const h = inteiro(hh), min = inteiro(mm);
    const a = inteiro(adultos), c = criancas.value === "" ? 0 : inteiro(criancas);

    if (!dia.value || !mes.value || Number.isNaN(data.getTime()) || data < hoje || data > limite) {
      erros.push([dia, `Escolha uma data entre hoje e os próximos ${JANELA_DIAS} dias.`]);
    }
    if (Number.isNaN(h) || h > 23 || Number.isNaN(min) || min > 59) {
      erros.push([Number.isNaN(h) || h > 23 ? hh : mm, "Informe um horário válido, no formato HH:MM."]);
    } else if (h * 60 + min >= FECHA.h * 60 + FECHA.m) {
      erros.push([hh, `O restaurante fecha às ${pad(FECHA.h)}:${pad(FECHA.m)}. Escolha um horário anterior.`]);
    } else if (data.getTime() === hoje.getTime()) {
      const agora = new Date();
      if (h * 60 + min <= agora.getHours() * 60 + agora.getMinutes()) {
        erros.push([hh, "Esse horário de hoje já passou. Escolha um horário mais tarde ou outro dia."]);
      }
    }
    if (Number.isNaN(a) || a < 1) erros.push([adultos, "Informe pelo menos 1 adulto."]);
    if (Number.isNaN(c)) erros.push([criancas, "Informe o número de crianças (0 se não houver)."]);

    for (const el of [dia, mes, hh, mm, adultos, criancas]) el.removeAttribute("aria-invalid");
    for (const [el] of erros) el.setAttribute("aria-invalid", "true");

    if (erros.length) {
      erro.replaceChildren(...erros.map(([, msg]) => Object.assign(document.createElement("span"), { textContent: msg })));
      erro.hidden = false;
      erros[0][0].focus();
      return null;
    }
    erro.hidden = true;
    erro.replaceChildren();
    return { data, h, min, a, c };
  };

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = validar();
    if (!r) return;
    const msg =
      `Olá! Gostaria de reservar uma mesa para o dia ${pad(r.data.getDate())}/${pad(r.data.getMonth() + 1)} ` +
      `às ${pad(r.h)}:${pad(r.min)}, ${plural(r.a, "adulto", "adultos")} e ${plural(r.c, "criança", "crianças")}.`;
    window.open(waLink(msg), "_blank", "noopener");
    // depois de abrir: a ondulação de confirmação (js/motion/reserva.js) nunca atrasa o WhatsApp
    form.dispatchEvent(new CustomEvent("reserva:enviada", { detail: { botao } }));
  });
}
