// Barba Negra Barbershop — Painel do barbeiro (login + agenda própria)

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

// ============================================================
// Painel do barbeiro
// ============================================================

(() => {
  const loginForm = document.getElementById("loginForm");
  const loginErro = document.getElementById("loginErro");
  const loginBtn = document.getElementById("loginBtn");
  const dashPainel = document.getElementById("dashPainel");
  const dashSaudacao = document.getElementById("dashSaudacao");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!loginForm || !dashPainel) return;

  if (!window.sbClient) {
    loginForm.querySelector("button").disabled = true;
    loginErro.textContent = "Painel indisponível no momento.";
    loginErro.classList.add("is-visible");
    return;
  }

  // Catálogo de serviços — mesmo do agendamento público (site/js/agendamento.js).
  const SERVICOS = [
    { id: "cabelo", nome: "Cabelo", minutos: 15, slots: 1 },
    { id: "cabelo-sobrancelha", nome: "Cabelo + Sobrancelha", minutos: 15, slots: 1 },
    { id: "cabelo-barba", nome: "Cabelo + Barba", minutos: 30, slots: 2 },
    { id: "cabelo-barba-sobrancelha", nome: "Cabelo + Barba + Sobrancelha", minutos: 30, slots: 2 },
  ];

  let barbeiroAtual = null; // { id, nome }
  let agendamentoEmEdicao = null; // { id, servico, data, horario }

  function formatarHora(h) {
    return h.slice(0, 5);
  }
  function dataISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // ---------- Autenticação ----------

  async function aoLogar(userId) {
    const { data: barbeiro, error } = await window.sbClient
      .from("barbeiros")
      .select("id, nome")
      .eq("id", userId)
      .single();

    if (error || !barbeiro) return;

    barbeiroAtual = barbeiro;
    dashSaudacao.textContent = `Olá, ${barbeiro.nome.split(" ")[0]}.`;
    loginForm.classList.add("is-hidden");
    dashPainel.classList.add("is-visible");
    carregarHoje();
  }

  (async function tentarSessaoExistente() {
    const { data } = await window.sbClient.auth.getSession();
    if (data && data.session) await aoLogar(data.session.user.id);
  })();

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginErro.textContent = "";
    loginErro.classList.remove("is-visible");

    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Entrando...";
    const { data, error } = await window.sbClient.auth.signInWithPassword({ email, password: senha });
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";

    if (error || !data.user) {
      loginErro.textContent = "Email ou senha incorretos.";
      loginErro.classList.add("is-visible");
      return;
    }

    await aoLogar(data.user.id);
  });

  logoutBtn.addEventListener("click", async () => {
    await window.sbClient.auth.signOut();
    barbeiroAtual = null;
    dashPainel.classList.remove("is-visible");
    loginForm.classList.remove("is-hidden");
    loginForm.reset();
    dashSaudacao.textContent = "Entre com seu usuário pra ver sua agenda.";
  });

  // ---------- Abas ----------

  const abas = document.querySelectorAll(".dash-aba");
  const views = {
    hoje: document.getElementById("viewHoje"),
    semana: document.getElementById("viewSemana"),
    bloqueios: document.getElementById("viewBloqueios"),
    produtos: document.getElementById("viewProdutos"),
  };

  abas.forEach((aba) => {
    aba.addEventListener("click", () => {
      abas.forEach((a) => a.classList.remove("is-focus"));
      aba.classList.add("is-focus");
      Object.values(views).forEach((v) => v.classList.add("is-hidden"));
      views[aba.dataset.view].classList.remove("is-hidden");

      if (aba.dataset.view === "hoje") carregarHoje();
      if (aba.dataset.view === "semana") carregarSemana();
      if (aba.dataset.view === "bloqueios") carregarBloqueios();
      if (aba.dataset.view === "produtos") carregarProdutos();
    });
  });

  // ---------- Listagem de agendamentos ----------

  async function carregarHoje() {
    const lista = document.getElementById("listaHoje");
    lista.innerHTML = `<p class="horario-msg">Carregando...</p>`;
    const { data, error } = await window.sbClient
      .from("agendamentos")
      .select("*")
      .eq("barbeiro_id", barbeiroAtual.id)
      .eq("data", dataISO(new Date()))
      .order("horario", { ascending: true });
    renderLista(lista, data, error, "Nenhum agendamento hoje.");
  }

  async function carregarSemana() {
    const lista = document.getElementById("listaSemana");
    lista.innerHTML = `<p class="horario-msg">Carregando...</p>`;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    const { data, error } = await window.sbClient
      .from("agendamentos")
      .select("*")
      .eq("barbeiro_id", barbeiroAtual.id)
      .gte("data", dataISO(inicio))
      .lt("data", dataISO(fim))
      .order("data", { ascending: true })
      .order("horario", { ascending: true });
    renderLista(lista, data, error, "Nenhum agendamento nos próximos 7 dias.", true);
  }

  function renderLista(container, data, error, msgVazio, agruparPorDia) {
    if (error) {
      container.innerHTML = `<p class="horario-msg">Erro ao carregar a agenda.</p>`;
      return;
    }
    if (!data || data.length === 0) {
      container.innerHTML = `<p class="horario-msg">${msgVazio}</p>`;
      return;
    }

    container.innerHTML = "";

    if (!agruparPorDia) {
      data.forEach((ag) => container.appendChild(criarLinhaAgendamento(ag)));
      return;
    }

    const porDia = new Map();
    data.forEach((ag) => {
      if (!porDia.has(ag.data)) porDia.set(ag.data, []);
      porDia.get(ag.data).push(ag);
    });
    porDia.forEach((itens, dia) => {
      const grupo = document.createElement("div");
      grupo.className = "dash-dia-grupo";
      const titulo = document.createElement("h4");
      const label = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      titulo.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      grupo.appendChild(titulo);
      itens.forEach((ag) => grupo.appendChild(criarLinhaAgendamento(ag)));
      container.appendChild(grupo);
    });
  }

  function criarLinhaAgendamento(ag) {
    const linha = document.createElement("div");
    linha.className = "dash-linha";
    linha.innerHTML = `
      <div class="dash-linha-info">
        <strong>${formatarHora(ag.horario)}</strong>
        <span>${ag.cliente_nome} · ${ag.servico_nome}</span>
        <span class="dash-linha-tel">${ag.cliente_telefone}</span>
      </div>
      <div class="dash-linha-acoes">
        <button type="button" class="btn btn-outline" data-acao="editar">Editar</button>
        <button type="button" class="btn btn-primary" data-acao="cancelar">Cancelar</button>
      </div>
    `;
    linha.querySelector('[data-acao="editar"]').addEventListener("click", () => abrirEdicao(ag));
    linha.querySelector('[data-acao="cancelar"]').addEventListener("click", () => cancelarAgendamento(ag, linha));
    return linha;
  }

  async function cancelarAgendamento(ag, linha) {
    if (!window.confirm(`Cancelar o agendamento de ${ag.cliente_nome} às ${formatarHora(ag.horario)}?`)) return;
    const { error } = await window.sbClient.from("agendamentos").delete().eq("id", ag.id);
    if (!error) linha.remove();
  }

  // ---------- Edição ----------

  const dashEditar = document.getElementById("dashEditar");
  const editServicoGrid = document.getElementById("editServicoGrid");
  const editData = document.getElementById("editData");
  const editHorarioGrid = document.getElementById("editHorarioGrid");
  const editErro = document.getElementById("editErro");
  const editFecharBtn = document.getElementById("editFecharBtn");
  const editSalvarBtn = document.getElementById("editSalvarBtn");

  function renderServicosEdicao(servicoIdAtual) {
    editServicoGrid.innerHTML = "";
    SERVICOS.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "servico-card" + (s.id === servicoIdAtual ? " is-focus" : "");
      btn.innerHTML = `<strong>${s.nome}</strong><span>${s.minutos} min</span>`;
      btn.addEventListener("click", () => {
        agendamentoEmEdicao.servico = s;
        editServicoGrid.querySelectorAll(".servico-card").forEach((c) => c.classList.remove("is-focus"));
        btn.classList.add("is-focus");
        atualizarHorariosEdicao();
      });
      editServicoGrid.appendChild(btn);
    });
  }

  function abrirEdicao(ag) {
    const servico = SERVICOS.find((s) => s.id === ag.servico_id) || SERVICOS[0];
    agendamentoEmEdicao = { id: ag.id, servico, data: ag.data, horario: ag.horario };
    editErro.textContent = "";
    editErro.classList.remove("is-visible");
    renderServicosEdicao(servico.id);
    editData.value = ag.data;
    atualizarHorariosEdicao();
    dashEditar.classList.add("is-visible");
  }

  function fecharEdicao() {
    dashEditar.classList.remove("is-visible");
    agendamentoEmEdicao = null;
  }

  editData.addEventListener("change", () => {
    if (!agendamentoEmEdicao) return;
    agendamentoEmEdicao.data = editData.value;
    atualizarHorariosEdicao();
  });

  async function atualizarHorariosEdicao() {
    editHorarioGrid.innerHTML = `<p class="horario-msg">Carregando...</p>`;
    const { data, error } = await window.sbClient.rpc("horarios_disponiveis", {
      p_barbeiro_id: barbeiroAtual.id,
      p_data: agendamentoEmEdicao.data,
      p_slots_necessarios: agendamentoEmEdicao.servico.slots,
      p_excluir_id: agendamentoEmEdicao.id,
    });

    if (error) {
      editHorarioGrid.innerHTML = `<p class="horario-msg">Erro ao carregar horários.</p>`;
      return;
    }
    if (!data || data.length === 0) {
      editHorarioGrid.innerHTML = `<p class="horario-msg">Sem horários livres nesse dia pra esse serviço.</p>`;
      return;
    }

    editHorarioGrid.innerHTML = "";
    data.forEach((linha) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "horario-pill" + (linha.horario === agendamentoEmEdicao.horario ? " is-focus" : "");
      btn.textContent = formatarHora(linha.horario);
      btn.addEventListener("click", () => {
        agendamentoEmEdicao.horario = linha.horario;
        editHorarioGrid.querySelectorAll(".horario-pill").forEach((b) => b.classList.remove("is-focus"));
        btn.classList.add("is-focus");
      });
      editHorarioGrid.appendChild(btn);
    });
  }

  editFecharBtn.addEventListener("click", fecharEdicao);

  editSalvarBtn.addEventListener("click", async () => {
    if (!agendamentoEmEdicao) return;
    editErro.textContent = "";
    editErro.classList.remove("is-visible");

    editSalvarBtn.disabled = true;
    editSalvarBtn.textContent = "Salvando...";

    const { error } = await window.sbClient.rpc("atualizar_agendamento", {
      p_id: agendamentoEmEdicao.id,
      p_data: agendamentoEmEdicao.data,
      p_horario: agendamentoEmEdicao.horario,
      p_slots: agendamentoEmEdicao.servico.slots,
      p_servico_id: agendamentoEmEdicao.servico.id,
      p_servico_nome: agendamentoEmEdicao.servico.nome,
    });

    editSalvarBtn.disabled = false;
    editSalvarBtn.textContent = "Salvar";

    if (error) {
      editErro.textContent = String(error.message).includes("horario_indisponivel")
        ? "Esse horário não está mais livre. Escolha outro."
        : "Não deu pra salvar agora. Tente de novo.";
      editErro.classList.add("is-visible");
      if (String(error.message).includes("horario_indisponivel")) atualizarHorariosEdicao();
      return;
    }

    fecharEdicao();
    // Recarrega a view atual pra refletir a mudança
    const abaAtiva = document.querySelector(".dash-aba.is-focus");
    if (abaAtiva && abaAtiva.dataset.view === "semana") carregarSemana();
    else carregarHoje();
  });

  // ---------- Bloqueios ----------

  async function carregarBloqueios() {
    const lista = document.getElementById("listaBloqueios");
    lista.innerHTML = `<p class="horario-msg">Carregando...</p>`;
    const { data, error } = await window.sbClient
      .from("bloqueios")
      .select("*")
      .eq("barbeiro_id", barbeiroAtual.id)
      .gte("data", dataISO(new Date()))
      .order("data", { ascending: true })
      .order("horario_inicio", { ascending: true });

    if (error) {
      lista.innerHTML = `<p class="horario-msg">Erro ao carregar bloqueios.</p>`;
      return;
    }
    if (!data || data.length === 0) {
      lista.innerHTML = `<p class="horario-msg">Nenhum horário bloqueado.</p>`;
      return;
    }

    lista.innerHTML = "";
    data.forEach((b) => {
      const linha = document.createElement("div");
      linha.className = "dash-linha";
      linha.innerHTML = `
        <div class="dash-linha-info">
          <strong>${new Date(b.data + "T00:00:00").toLocaleDateString("pt-BR")}</strong>
          <span>${formatarHora(b.horario_inicio)} – ${formatarHora(b.horario_fim)}${b.motivo ? " · " + b.motivo : ""}</span>
        </div>
        <div class="dash-linha-acoes">
          <button type="button" class="btn btn-outline" data-acao="remover">Remover</button>
        </div>
      `;
      linha.querySelector('[data-acao="remover"]').addEventListener("click", async () => {
        const { error: erroRemover } = await window.sbClient.from("bloqueios").delete().eq("id", b.id);
        if (!erroRemover) linha.remove();
      });
      lista.appendChild(linha);
    });
  }

  const bloqueioForm = document.getElementById("bloqueioForm");
  bloqueioForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = document.getElementById("bloqData").value;
    const inicio = document.getElementById("bloqInicio").value;
    const fim = document.getElementById("bloqFim").value;
    const motivo = document.getElementById("bloqMotivo").value.trim();

    if (!data || !inicio || !fim || fim <= inicio) return;

    const { error } = await window.sbClient.from("bloqueios").insert({
      barbeiro_id: barbeiroAtual.id,
      data,
      horario_inicio: inicio,
      horario_fim: fim,
      motivo: motivo || null,
    });

    if (!error) {
      bloqueioForm.reset();
      carregarBloqueios();
    }
  });

  // ---------- Produtos ----------

  const listaProdutos = document.getElementById("listaProdutos");
  const novoProdutoBtn = document.getElementById("novoProdutoBtn");
  const dashProdutoModal = document.getElementById("dashProdutoModal");
  const produtoModalTitulo = document.getElementById("produtoModalTitulo");
  const produtoForm = document.getElementById("produtoForm");
  const produtoImagemInput = document.getElementById("produtoImagem");
  const produtoUploadArea = document.getElementById("produtoUploadArea");
  const produtoImagemPreview = document.getElementById("produtoImagemPreview");
  const produtoUploadTexto = document.getElementById("produtoUploadTexto");
  const produtoNomeInput = document.getElementById("produtoNome");
  const produtoPrecoInput = document.getElementById("produtoPreco");
  const produtoDescricaoInput = document.getElementById("produtoDescricao");
  const produtoStatusInput = document.getElementById("produtoStatus");
  const produtoErro = document.getElementById("produtoErro");
  const produtoCancelarBtn = document.getElementById("produtoCancelarBtn");
  const produtoSalvarBtn = document.getElementById("produtoSalvarBtn");

  let produtoEmEdicao = null; // { id, imagem_url, ... } | null
  let produtoArquivoSelecionado = null;

  function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function carregarProdutos() {
    listaProdutos.innerHTML = `<p class="horario-msg">Carregando...</p>`;
    const { data, error } = await window.sbClient
      .from("produtos")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      listaProdutos.innerHTML = `<p class="horario-msg">Erro ao carregar os produtos.</p>`;
      return;
    }
    if (!data || data.length === 0) {
      listaProdutos.innerHTML = `<p class="horario-msg">Nenhum produto cadastrado ainda.</p>`;
      return;
    }

    listaProdutos.innerHTML = "";
    data.forEach((p) => listaProdutos.appendChild(criarCardProduto(p)));
  }

  function criarCardProduto(p) {
    const card = document.createElement("article");
    card.className = "dash-produto-card";

    const media = p.imagem_url
      ? `<div class="dash-produto-media"><img src="${p.imagem_url}" alt="${p.nome}" /></div>`
      : `<div class="dash-produto-media is-vazia">Sem foto</div>`;
    const disponivel = p.status === "disponivel";

    card.innerHTML = `
      ${media}
      <div class="dash-produto-info">
        <strong>${p.nome}</strong>
        <span class="dash-produto-preco">${formatarPreco(p.preco)}</span>
        <span class="dash-produto-badge${disponivel ? " is-disponivel" : ""}">${disponivel ? "Disponível" : "Indisponível"}</span>
        <div class="dash-produto-acoes">
          <button type="button" class="btn btn-outline" data-acao="editar">Editar</button>
          <button type="button" class="btn btn-primary" data-acao="excluir">Excluir</button>
        </div>
      </div>
    `;
    card.querySelector('[data-acao="editar"]').addEventListener("click", () => abrirModalProduto(p));
    card.querySelector('[data-acao="excluir"]').addEventListener("click", () => excluirProduto(p, card));
    return card;
  }

  // Extrai o caminho do objeto dentro do bucket a partir da public URL,
  // pra remover a imagem do Storage junto quando o produto é excluído.
  function caminhoDoStorage(url) {
    const marcador = "/produtos-imagens/";
    const i = url.indexOf(marcador);
    return i === -1 ? null : url.slice(i + marcador.length);
  }

  async function excluirProduto(p, card) {
    if (!window.confirm(`Excluir o produto "${p.nome}"? Essa ação não pode ser desfeita.`)) return;

    const { error } = await window.sbClient.from("produtos").delete().eq("id", p.id);
    if (error) return;

    if (p.imagem_url) {
      const caminho = caminhoDoStorage(p.imagem_url);
      if (caminho) await window.sbClient.storage.from("produtos-imagens").remove([caminho]);
    }
    card.remove();
  }

  function resetarFormProduto() {
    produtoForm.reset();
    produtoArquivoSelecionado = null;
    produtoImagemPreview.src = "";
    produtoImagemPreview.classList.add("is-hidden");
    produtoUploadTexto.classList.remove("is-hidden");
    produtoErro.textContent = "";
    produtoErro.classList.remove("is-visible");
    produtoStatusInput.value = "disponivel";
  }

  function abrirModalProduto(produto) {
    resetarFormProduto();
    produtoEmEdicao = produto || null;
    produtoModalTitulo.textContent = produto ? "Editar produto" : "Novo produto";

    if (produto) {
      produtoNomeInput.value = produto.nome;
      produtoPrecoInput.value = produto.preco;
      produtoDescricaoInput.value = produto.descricao || "";
      produtoStatusInput.value = produto.status;
      if (produto.imagem_url) {
        produtoImagemPreview.src = produto.imagem_url;
        produtoImagemPreview.classList.remove("is-hidden");
        produtoUploadTexto.classList.add("is-hidden");
      }
    }

    dashProdutoModal.classList.add("is-visible");
  }

  function fecharModalProduto() {
    dashProdutoModal.classList.remove("is-visible");
    produtoEmEdicao = null;
  }

  novoProdutoBtn.addEventListener("click", () => abrirModalProduto(null));
  produtoCancelarBtn.addEventListener("click", fecharModalProduto);
  produtoUploadArea.addEventListener("click", () => produtoImagemInput.click());

  produtoImagemInput.addEventListener("change", () => {
    const arquivo = produtoImagemInput.files[0];
    if (!arquivo) return;
    produtoArquivoSelecionado = arquivo;
    const leitor = new FileReader();
    leitor.onload = () => {
      produtoImagemPreview.src = leitor.result;
      produtoImagemPreview.classList.remove("is-hidden");
      produtoUploadTexto.classList.add("is-hidden");
    };
    leitor.readAsDataURL(arquivo);
  });

  produtoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    produtoErro.textContent = "";
    produtoErro.classList.remove("is-visible");

    const nome = produtoNomeInput.value.trim();
    const preco = Number(produtoPrecoInput.value);
    const descricao = produtoDescricaoInput.value.trim();
    const status = produtoStatusInput.value;

    if (!nome || !(preco >= 0) || !descricao) return;

    produtoSalvarBtn.disabled = true;
    produtoSalvarBtn.textContent = "Salvando...";

    try {
      let imagemUrl = produtoEmEdicao ? produtoEmEdicao.imagem_url : null;

      if (produtoArquivoSelecionado) {
        const extensao = produtoArquivoSelecionado.name.split(".").pop();
        const caminho = `${crypto.randomUUID()}.${extensao}`;
        const { error: erroUpload } = await window.sbClient.storage
          .from("produtos-imagens")
          .upload(caminho, produtoArquivoSelecionado);
        if (erroUpload) throw erroUpload;

        const { data: pub } = window.sbClient.storage.from("produtos-imagens").getPublicUrl(caminho);
        imagemUrl = pub.publicUrl;
      }

      const registro = { nome, preco, descricao, status, imagem_url: imagemUrl };

      const { error } = produtoEmEdicao
        ? await window.sbClient.from("produtos").update(registro).eq("id", produtoEmEdicao.id)
        : await window.sbClient.from("produtos").insert(registro);

      if (error) throw error;

      fecharModalProduto();
      carregarProdutos();
    } catch (err) {
      produtoErro.textContent = "Não deu pra salvar agora. Tente de novo.";
      produtoErro.classList.add("is-visible");
    } finally {
      produtoSalvarBtn.disabled = false;
      produtoSalvarBtn.textContent = "Salvar";
    }
  });
})();
