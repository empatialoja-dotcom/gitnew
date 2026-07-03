// Barba Negra Barbershop — página Cancelar Agendamento

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("ano").textContent = new Date().getFullYear();

// Menu mobile
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

// Header — transparente no topo, ganha fundo ao rolar, some ao descer e volta ao subir
const header = document.getElementById("siteHeader");
let lastScroll = window.scrollY;
window.addEventListener("scroll", () => {
  const current = window.scrollY;
  header.classList.toggle("header--scrolled", current > 40);
  if (current > lastScroll && current > 120) {
    header.classList.add("header--hidden");
  } else {
    header.classList.remove("header--hidden");
  }
  lastScroll = current;
}, { passive: true });

// Reveal on scroll
const revealObserver = prefersReducedMotion
  ? null
  : new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
document.querySelectorAll("[data-reveal]").forEach((el) => {
  if (prefersReducedMotion) el.classList.add("in-view");
  else revealObserver.observe(el);
});

// Botões magnéticos
if (!prefersReducedMotion) {
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0, 0)";
    });
  });
}

// ============================================================
// Cancelar agendamento — telefone -> busca -> confirma -> cancela
// ============================================================

(() => {
  const buscaForm = document.getElementById("buscaForm");
  const buscaErro = document.getElementById("buscaErro");
  const buscaBtn = document.getElementById("buscaBtn");
  const resultado = document.getElementById("cancelarResultado");
  const detalhes = document.getElementById("cancelarDetalhes");
  const manterBtn = document.getElementById("manterBtn");
  const cancelarBtn = document.getElementById("cancelarBtn");
  const sucesso = document.getElementById("cancelarSucesso");
  if (!buscaForm) return;

  let agendamentoAtual = null; // { id, telefone }

  function normalizarTelefone(v) {
    return (v || "").replace(/\D/g, "");
  }

  function mostrarErro(msg) {
    buscaErro.textContent = msg;
    buscaErro.classList.add("is-visible");
  }
  function limparErro() {
    buscaErro.textContent = "";
    buscaErro.classList.remove("is-visible");
  }

  if (!window.sbClient) {
    buscaForm.querySelector("button").disabled = true;
    mostrarErro("Sistema indisponível no momento. Fale no WhatsApp pra cancelar.");
  }

  buscaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparErro();
    if (!window.sbClient) return;

    const telefone = document.getElementById("telefoneBusca").value.trim();
    if (normalizarTelefone(telefone).length < 8) {
      mostrarErro("Informe um telefone válido.");
      return;
    }

    buscaBtn.disabled = true;
    buscaBtn.textContent = "Buscando...";

    const { data, error } = await window.sbClient.rpc("buscar_agendamento_por_telefone", {
      p_telefone: telefone,
    });

    buscaBtn.disabled = false;
    buscaBtn.textContent = "Buscar agendamento";

    if (error || !data || data.length === 0) {
      mostrarErro("Não encontramos nenhum agendamento futuro com esse telefone.");
      return;
    }

    const ag = data[0];
    agendamentoAtual = { id: ag.id, telefone };

    detalhes.innerHTML = `
      <div><dt>Nome</dt><dd>${ag.cliente_nome}</dd></div>
      <div><dt>Barbeiro</dt><dd>${ag.barbeiro_nome}</dd></div>
      <div><dt>Serviço</dt><dd>${ag.servico_nome}</dd></div>
      <div><dt>Data</dt><dd>${new Date(ag.data + "T00:00:00").toLocaleDateString("pt-BR")}</dd></div>
      <div><dt>Horário</dt><dd>${ag.horario.slice(0, 5)}</dd></div>
    `;

    buscaForm.classList.add("is-hidden");
    resultado.classList.add("is-visible");
  });

  manterBtn.addEventListener("click", () => {
    resultado.classList.remove("is-visible");
    buscaForm.classList.remove("is-hidden");
    buscaForm.reset();
    agendamentoAtual = null;
  });

  cancelarBtn.addEventListener("click", async () => {
    if (!agendamentoAtual) return;
    cancelarBtn.disabled = true;
    cancelarBtn.textContent = "Cancelando...";

    const { data, error } = await window.sbClient.rpc("cancelar_agendamento", {
      p_id: agendamentoAtual.id,
      p_telefone: agendamentoAtual.telefone,
    });

    cancelarBtn.disabled = false;
    cancelarBtn.textContent = "Cancelar agendamento";

    if (error || !data) {
      mostrarErro("Não deu pra cancelar agora. Tente de novo em instantes.");
      return;
    }

    resultado.classList.remove("is-visible");
    sucesso.classList.add("is-visible");
  });
})();
