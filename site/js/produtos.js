// Barba Negra Barbershop — página Produtos

const WHATSAPP_NUMBER = "554599432724";
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
function observarReveal(el) {
  if (prefersReducedMotion) {
    el.classList.add("in-view");
    return;
  }
  revealObserver.observe(el);
}
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
document.querySelectorAll("[data-reveal]").forEach(observarReveal);

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

// Catálogo — carregado do Supabase (tabela "produtos"). Cadastro, edição
// e remoção ficam no painel do barbeiro (dashboard.html, aba Produtos).
const produtosGrid = document.getElementById("produtosGrid");

function formatarPreco(preco) {
  return Number(preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function criarCardProduto(produto, i) {
  const card = document.createElement("article");
  card.className = "produto-card reveal";
  card.dataset.reveal = "";
  if (i % 4 !== 0) card.dataset.delay = String(i % 4);

  card.innerHTML = `
    <div class="produto-media">
      <img src="${produto.imagem_url || ""}" alt="${produto.nome} — Barba Negra" loading="lazy" />
    </div>
    <div class="produto-info">
      <h3>${produto.nome}</h3>
      <span class="produto-preco">${formatarPreco(produto.preco)}</span>
      <p>${produto.descricao || ""}</p>
      <button type="button" class="btn btn-outline whats-produto" data-produto="${produto.nome}">Quero este produto</button>
    </div>
  `;

  return card;
}

async function carregarProdutos() {
  if (!window.sbClient) {
    produtosGrid.innerHTML = `<div class="galeria-vazia">Loja indisponível no momento.</div>`;
    return;
  }

  const { data, error } = await window.sbClient
    .from("produtos")
    .select("*")
    .eq("status", "disponivel")
    .order("created_at", { ascending: true });

  if (error) {
    produtosGrid.innerHTML = `<div class="galeria-vazia">Não deu pra carregar os produtos agora. Tenta de novo mais tarde.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    produtosGrid.innerHTML = `<div class="galeria-vazia">Nenhum produto disponível no momento.</div>`;
    return;
  }

  produtosGrid.innerHTML = "";
  data.forEach((produto, i) => {
    const card = criarCardProduto(produto, i);
    produtosGrid.appendChild(card);
    observarReveal(card);
  });
}

carregarProdutos();

// Produtos -> WhatsApp
produtosGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".whats-produto");
  if (!btn) return;
  const produto = btn.dataset.produto;
  const texto = `Olá! Tenho interesse no produto ${produto}. Gostaria de mais informações.`;
  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
    "_blank"
  );
});
