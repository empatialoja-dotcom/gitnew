// Barba Negra Barbershop — Agendamento integrado (Supabase), substitui o
// fluxo antigo que abria o WhatsApp. Reaproveita a seleção de barbeiro e o
// calendário custom já existentes; adiciona seleção de serviço, grade de
// horários livres e confirmação direto no site.

(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const secao = document.getElementById("agendamento");
  const agendamentoGrid = document.querySelector(".agendamento-grid");
  const listaBarbeiros = document.querySelector(".barbeiros-lista");
  const cardsBarbeiro = document.querySelectorAll(".barbeiro-card");
  const agendaFormEl = document.getElementById("agendaForm");
  if (!secao || !agendamentoGrid || !agendaFormEl) return;

  // Catálogo fixo de serviços — duração/slots refletem direto na agenda.
  // Pra mudar preço/nome/duração, só editar aqui (o horário de
  // funcionamento e a checagem de conflito ficam no banco, em
  // supabase/schema.sql).
  const SERVICOS = [
    { id: "cabelo", nome: "Cabelo", minutos: 15, slots: 1 },
    { id: "cabelo-sobrancelha", nome: "Cabelo + Sobrancelha", minutos: 15, slots: 1 },
    { id: "cabelo-barba", nome: "Cabelo + Barba", minutos: 30, slots: 2 },
    { id: "cabelo-barba-sobrancelha", nome: "Cabelo + Barba + Sobrancelha", minutos: 30, slots: 2 },
  ];

  const estado = {
    barbeiroId: null,
    barbeiroNome: null,
    servico: null,
    data: null, // Date (meia-noite local)
    horario: null, // "HH:MM:SS" cru, como veio do banco
  };

  const barbeirosPorSlug = new Map();

  function normalizarTelefone(v) {
    return (v || "").replace(/\D/g, "");
  }

  function formatarHora(horaCrua) {
    return horaCrua.slice(0, 5);
  }

  // ---------- Modo indisponível (sem credenciais Supabase configuradas
  // ainda, ou tabela de barbeiros vazia) — degrada pro WhatsApp em vez de
  // deixar um formulário quebrado no ar. ----------
  function ativarModoIndisponivel() {
    agendamentoGrid.innerHTML = `
      <div class="agenda-indisponivel">
        <p>O agendamento online está sendo finalizado. Enquanto isso, marque
        direto pelo WhatsApp.</p>
        <a class="btn btn-primary magnetic" href="https://wa.me/554599432724?text=${encodeURIComponent(
          "Olá! Quero agendar um horário na Barba Negra."
        )}" target="_blank" rel="noopener">Marcar pelo WhatsApp</a>
      </div>
    `;
  }

  if (!window.sbClient) {
    ativarModoIndisponivel();
    return;
  }

  // ============================================================
  // 1. Barbeiros — busca ids reais e mantém a seleção visual atual
  //    (destaque automático -> hover -> clique) já implementada.
  // ============================================================

  async function carregarBarbeiros() {
    const { data, error } = await window.sbClient
      .from("barbeiros")
      .select("id, nome, slug")
      .order("ordem", { ascending: true });

    if (error || !data || data.length === 0) {
      ativarModoIndisponivel();
      return false;
    }

    data.forEach((b) => barbeirosPorSlug.set(b.slug, b));
    return true;
  }

  function iniciarSelecaoBarbeiro() {
    if (!listaBarbeiros || !cardsBarbeiro.length) return;

    let barbeiroSelecionado = false;
    let autoLoopTimer = null;
    let indiceAuto = 0;

    cardsBarbeiro.forEach((card) => {
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
    });

    function aplicarFoco(card) {
      cardsBarbeiro.forEach((c) => c.classList.toggle("is-focus", c === card));
      listaBarbeiros.classList.toggle("has-focus", !!card);
    }

    function pararAutoLoop() {
      if (autoLoopTimer) {
        clearInterval(autoLoopTimer);
        autoLoopTimer = null;
      }
    }

    function avancarAuto() {
      aplicarFoco(cardsBarbeiro[indiceAuto]);
      indiceAuto = (indiceAuto + 1) % cardsBarbeiro.length;
    }

    function iniciarAutoLoop() {
      if (prefersReducedMotion || barbeiroSelecionado || autoLoopTimer) return;
      avancarAuto();
      autoLoopTimer = setInterval(avancarAuto, 2600);
    }

    const autoLoopObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) iniciarAutoLoop();
          else pararAutoLoop();
        });
      },
      { threshold: 0.3 }
    );
    autoLoopObserver.observe(listaBarbeiros);

    listaBarbeiros.addEventListener("mouseenter", () => pararAutoLoop(), { once: true });
    listaBarbeiros.addEventListener("mouseleave", () => {
      if (!barbeiroSelecionado) aplicarFoco(null);
    });

    function selecionarBarbeiro(card) {
      pararAutoLoop();
      barbeiroSelecionado = true;
      aplicarFoco(card);
      agendamentoGrid.classList.add("is-selecionado");

      const slug = card.dataset.slug;
      const barbeiro = barbeirosPorSlug.get(slug);
      estado.barbeiroId = barbeiro ? barbeiro.id : null;
      estado.barbeiroNome = card.querySelector("strong").textContent.trim();

      if (!agendaFormEl.classList.contains("is-visible")) {
        agendaFormEl.classList.add("is-visible");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => agendaFormEl.classList.add("is-shown"));
        });
      }

      atualizarDisponibilidade();
    }

    cardsBarbeiro.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        if (!barbeiroSelecionado) aplicarFoco(card);
      });
      card.addEventListener("click", () => selecionarBarbeiro(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selecionarBarbeiro(card);
        }
      });
    });
  }

  // ============================================================
  // 2. Serviço
  // ============================================================

  const servicoGrid = document.getElementById("servicoGrid");

  function renderServicos() {
    if (!servicoGrid) return;
    servicoGrid.innerHTML = "";
    SERVICOS.forEach((servico) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "servico-card";
      card.innerHTML = `<strong>${servico.nome}</strong><span>${servico.minutos} min</span>`;
      card.addEventListener("click", () => {
        estado.servico = servico;
        servicoGrid.querySelectorAll(".servico-card").forEach((c) => c.classList.remove("is-focus"));
        card.classList.add("is-focus");
        atualizarDisponibilidade();
      });
      servicoGrid.appendChild(card);
    });
  }

  // ============================================================
  // 3. Calendário (mesmo widget de antes — só muda o que roda ao
  //    escolher uma data, e bloqueia domingo)
  // ============================================================

  const dataDisplay = document.getElementById("dataDisplay");
  const dataLabel = document.getElementById("dataLabel");
  const datePicker = document.getElementById("datePicker");
  const calendarEl = document.getElementById("calendar");
  const calDays = document.getElementById("calDays");
  const calMonthLabel = document.getElementById("calMonthLabel");
  const calPrev = document.getElementById("calPrev");
  const calNext = document.getElementById("calNext");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let mesCalendario = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  function abrirCalendario() {
    calendarEl.classList.add("open");
    dataDisplay.setAttribute("aria-expanded", "true");
  }
  function fecharCalendario() {
    calendarEl.classList.remove("open");
    dataDisplay.setAttribute("aria-expanded", "false");
  }

  function renderCalendario() {
    const label = mesCalendario.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    calMonthLabel.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    calPrev.disabled =
      mesCalendario.getFullYear() === hoje.getFullYear() && mesCalendario.getMonth() === hoje.getMonth();

    const primeiroDiaSemana = mesCalendario.getDay();
    const diasNoMes = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0).getDate();

    calDays.innerHTML = "";
    for (let i = 0; i < primeiroDiaSemana; i++) {
      const vazio = document.createElement("span");
      vazio.className = "calendar-day is-empty";
      calDays.appendChild(vazio);
    }
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), dia);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      btn.textContent = String(dia);
      if (data < hoje || data.getDay() === 0) btn.disabled = true; // passado ou domingo (fechado)
      if (data.getTime() === hoje.getTime()) btn.classList.add("is-today");
      if (estado.data && data.getTime() === estado.data.getTime()) btn.classList.add("is-selected");
      btn.addEventListener("click", () => {
        estado.data = data;
        dataLabel.textContent = data.toLocaleDateString("pt-BR");
        dataLabel.classList.remove("placeholder");
        fecharCalendario();
        renderCalendario();
        atualizarDisponibilidade();
      });
      calDays.appendChild(btn);
    }
  }

  if (dataDisplay) {
    dataDisplay.addEventListener("click", (e) => {
      e.stopPropagation();
      calendarEl.classList.contains("open") ? fecharCalendario() : abrirCalendario();
    });
    calPrev.addEventListener("click", () => {
      mesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1, 1);
      renderCalendario();
    });
    calNext.addEventListener("click", () => {
      mesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 1);
      renderCalendario();
    });
    document.addEventListener("click", (e) => {
      if (!datePicker.contains(e.target)) fecharCalendario();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") fecharCalendario();
    });
    renderCalendario();
  }

  // ============================================================
  // 4. Horários disponíveis
  // ============================================================

  const horarioGrid = document.getElementById("horarioGrid");

  function dataParaISO(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
      data.getDate()
    ).padStart(2, "0")}`;
  }

  async function atualizarDisponibilidade() {
    if (!horarioGrid) return;
    estado.horario = null;

    if (!estado.barbeiroId || !estado.servico || !estado.data) {
      horarioGrid.innerHTML = `<p class="horario-msg">Escolha o barbeiro, o serviço e a data pra ver os horários livres.</p>`;
      return;
    }

    horarioGrid.innerHTML = `<p class="horario-msg">Carregando horários...</p>`;

    const { data, error } = await window.sbClient.rpc("horarios_disponiveis", {
      p_barbeiro_id: estado.barbeiroId,
      p_data: dataParaISO(estado.data),
      p_slots_necessarios: estado.servico.slots,
    });

    if (error) {
      horarioGrid.innerHTML = `<p class="horario-msg">Não deu pra carregar os horários agora. Tente de novo em instantes.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      horarioGrid.innerHTML = `<p class="horario-msg">Sem horários livres nesse dia pra esse serviço. Tente outra data.</p>`;
      return;
    }

    horarioGrid.innerHTML = "";
    data.forEach((linha) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "horario-pill";
      btn.textContent = formatarHora(linha.horario);
      btn.addEventListener("click", () => {
        estado.horario = linha.horario;
        horarioGrid.querySelectorAll(".horario-pill").forEach((b) => b.classList.remove("is-focus"));
        btn.classList.add("is-focus");
      });
      horarioGrid.appendChild(btn);
    });
  }

  // ============================================================
  // 5. Confirmar agendamento
  // ============================================================

  const agendaErro = document.getElementById("agendaErro");
  const agendaSucesso = document.getElementById("agendaSucesso");
  const agendaResumo = document.getElementById("agendaResumo");
  const submitBtn = document.getElementById("agendaSubmitBtn");

  function mostrarErro(msg) {
    if (!agendaErro) return;
    agendaErro.textContent = msg;
    agendaErro.classList.add("is-visible");
  }
  function limparErro() {
    if (!agendaErro) return;
    agendaErro.classList.remove("is-visible");
    agendaErro.textContent = "";
  }

  agendaFormEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparErro();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (!estado.barbeiroId) return mostrarErro("Escolha um barbeiro.");
    if (!estado.servico) return mostrarErro("Escolha um serviço.");
    if (!estado.data) return mostrarErro("Escolha uma data.");
    if (!estado.horario) return mostrarErro("Escolha um horário.");
    if (!nome) return mostrarErro("Informe seu nome.");
    if (normalizarTelefone(telefone).length < 8) return mostrarErro("Informe um telefone válido.");

    submitBtn.disabled = true;
    submitBtn.textContent = "Confirmando...";

    const { error } = await window.sbClient.rpc("criar_agendamento", {
      p_barbeiro_id: estado.barbeiroId,
      p_data: dataParaISO(estado.data),
      p_horario: estado.horario,
      p_slots: estado.servico.slots,
      p_servico_id: estado.servico.id,
      p_servico_nome: estado.servico.nome,
      p_cliente_nome: nome,
      p_cliente_telefone: telefone,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar agendamento";

    if (error) {
      if (String(error.message).includes("horario_indisponivel")) {
        mostrarErro("Esse horário acabou de ser ocupado. Escolha outro.");
        atualizarDisponibilidade();
      } else {
        mostrarErro("Não deu pra confirmar agora. Tente de novo em instantes.");
      }
      return;
    }

    agendaFormEl.classList.remove("is-shown");
    setTimeout(() => {
      agendaFormEl.classList.add("is-hidden-sucesso");
      if (agendaResumo) {
        agendaResumo.textContent =
          `${estado.barbeiroNome} · ${estado.servico.nome} · ` +
          `${estado.data.toLocaleDateString("pt-BR")} às ${formatarHora(estado.horario)}`;
      }
      if (agendaSucesso) agendaSucesso.classList.add("is-visible");
    }, 350);
  });

  // ============================================================
  // Início
  // ============================================================

  renderServicos();
  carregarBarbeiros().then((ok) => {
    if (ok) iniciarSelecaoBarbeiro();
  });
})();
