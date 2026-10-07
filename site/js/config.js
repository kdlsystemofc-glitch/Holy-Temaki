// Configuração compartilhada (formulário de reserva, menu, rodapé).

// ⚠️ CONFIRMAR COM O CLIENTE: este é o telefone do CLIENTE.md, que parece ser FIXO.
// O wa.me só funciona se o número tiver WhatsApp. Trocar aqui atualiza o botão de reserva,
// a mensagem, o item "Cardápio" do menu e o telefone do rodapé. (Sem JS, valem os href do HTML.)
const WHATSAPP = { ddi: "55", ddd: "11", numero: "968425330" };

const TELEFONE = `(${WHATSAPP.ddd}) ${WHATSAPP.numero.slice(0, -4)}-${WHATSAPP.numero.slice(-4)}`;

/** Link wa.me, com texto pré-preenchido opcional (URL-encoded). */
const waLink = (texto) =>
  `https://wa.me/${WHATSAPP.ddi}${WHATSAPP.ddd}${WHATSAPP.numero}` +
  (texto ? `?text=${encodeURIComponent(texto)}` : "");

// o rodapé mostra o mesmo número
document.querySelectorAll("[data-tel]").forEach((a) => {
  a.href = `tel:+${WHATSAPP.ddi}${WHATSAPP.ddd}${WHATSAPP.numero}`;
  (a.querySelector(".site-footer__sub") || a).textContent = TELEFONE; // o span leva o sublinhado do hover
});
