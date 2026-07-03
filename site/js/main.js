// Barba Negra Barbershop — comportamento e animações do site

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
const revealEls = document.querySelectorAll("[data-reveal]");
let revealObserver = null;
if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add("in-view"));
} else {
  revealObserver = new IntersectionObserver(
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
  revealEls.forEach((el) => revealObserver.observe(el));
}

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

// Agendamento — seleção de barbeiro (destaque automático -> hover -> clique)
const listaBarbeiros = document.querySelector(".barbeiros-lista");
const cardsBarbeiro = document.querySelectorAll(".barbeiro-card");
const agendaFormEl = document.getElementById("agendaForm");
const barbeiroHidden = document.getElementById("barbeiro");
const agendamentoGrid = document.querySelector(".agendamento-grid");

if (listaBarbeiros && cardsBarbeiro.length) {
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

  // Loop automático só roda enquanto a seção estiver visível — some ao rolar pra longe
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

  // Primeiro movimento do mouse na área encerra o loop automático de vez —
  // a partir daí o hover assume o controle do destaque.
  listaBarbeiros.addEventListener(
    "mouseenter",
    () => {
      pararAutoLoop();
    },
    { once: true }
  );

  listaBarbeiros.addEventListener("mouseleave", () => {
    if (!barbeiroSelecionado) aplicarFoco(null);
  });

  function selecionarBarbeiro(card) {
    pararAutoLoop();
    barbeiroSelecionado = true;
    aplicarFoco(card);
    agendamentoGrid.classList.add("is-selecionado");

    const nome = card.querySelector("strong").textContent.trim();
    barbeiroHidden.value = nome;

    if (!agendaFormEl.classList.contains("is-visible")) {
      agendaFormEl.classList.add("is-visible");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          agendaFormEl.classList.add("is-shown");
        });
      });
    }
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

// Calendário custom do campo Data
const dataInput = document.getElementById("data");
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
let dataSelecionada = null;

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
    if (data < hoje) btn.disabled = true;
    if (data.getTime() === hoje.getTime()) btn.classList.add("is-today");
    if (dataSelecionada && data.getTime() === dataSelecionada.getTime()) btn.classList.add("is-selected");
    btn.addEventListener("click", () => {
      dataSelecionada = data;
      const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
        data.getDate()
      ).padStart(2, "0")}`;
      dataInput.value = iso;
      dataLabel.textContent = data.toLocaleDateString("pt-BR");
      dataLabel.classList.remove("placeholder");
      fecharCalendario();
    });
    calDays.appendChild(btn);
  }
}

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

// Agendamento -> WhatsApp
document.getElementById("agendaForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value.trim();
  const barbeiro = document.getElementById("barbeiro").value || "sem preferência";
  const servico = document.getElementById("servico").value;
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;

  if (!data) {
    abrirCalendario();
    dataDisplay.focus();
    return;
  }

  const dataFormatada = data
    ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR")
    : "";

  const texto =
    `Olá! Quero agendar um horário na Barba Negra.\n\n` +
    `Nome: ${nome}\n` +
    `Barbeiro: ${barbeiro}\n` +
    `Serviço: ${servico}\n` +
    `Data: ${dataFormatada}\n` +
    `Horário: ${hora}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
    "_blank"
  );
});

// Lightbox (compartilhado por galeria e vídeos do curso)
const lightbox = document.getElementById("lightbox");
const lightboxContent = document.getElementById("lightboxContent");
const lightboxClose = document.getElementById("lightboxClose");

function abrirLightbox(item) {
  lightboxContent.innerHTML =
    item.tipo === "video"
      ? `<video src="${item.src}" controls autoplay></video>`
      : `<img src="${item.src}" alt="${item.alt || ""}">`;
  lightbox.classList.add("open");
}

function fecharLightbox() {
  lightbox.classList.remove("open");
  lightboxContent.innerHTML = "";
}

lightboxClose.addEventListener("click", fecharLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) fecharLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharLightbox();
});

// Galeria
// Pra adicionar fotos: colocar o arquivo em site/img/galeria/ e acrescentar uma linha aqui.
const galeriaItems = [
  { tipo: "img", src: "img/galeria/corte-01.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-02.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-03.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-04.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-05.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-06.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-07.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/corte-08.jpg", alt: "Corte na Barba Negra" },
  { tipo: "img", src: "img/galeria/cortes-grupo.jpg", alt: "Cortes Barba Negra" },
];

const galeriaGrid = document.getElementById("galeriaGrid");

if (galeriaItems.length === 0) {
  galeriaGrid.innerHTML = `<div class="galeria-vazia">Fotos e vídeos da barbearia em breve.</div>`;
} else {
  galeriaItems.forEach((item, i) => {
    const el = document.createElement("img");
    el.src = item.src;
    el.alt = item.alt || "Barba Negra Barbershop";
    el.loading = "lazy";
    el.className = "reveal";
    el.dataset.reveal = "";
    if (i % 4 !== 0) el.dataset.delay = String(i % 4);
    el.addEventListener("click", () => abrirLightbox(item));
    galeriaGrid.appendChild(el);
    if (!prefersReducedMotion) revealObserver.observe(el);
    else el.classList.add("in-view");
  });
}

// Vídeos do curso — carregam e tocam só quando entram na tela
const cursoVideos = document.querySelectorAll(".curso-video");
const videoObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  },
  { threshold: 0.4 }
);
cursoVideos.forEach((video) => {
  videoObserver.observe(video);
  video.addEventListener("click", () => {
    abrirLightbox({ tipo: "video", src: video.dataset.src });
  });
});

// Avaliações — carrossel infinito contínuo
const marqueeTrack = document.getElementById("marqueeTrack");
const marqueeWrap = document.querySelector(".marquee");
const avaliacoes = [
  "img/avaliacoes/avaliacao-01.png",
  "img/avaliacoes/avaliacao-02.png",
  "img/avaliacoes/avaliacao-03.png",
  "img/avaliacoes/avaliacao-04.png",
  "img/avaliacoes/avaliacao-05.png",
  "img/avaliacoes/avaliacao-06.png",
  "img/avaliacoes/avaliacao-07.png",
  "img/avaliacoes/avaliacao-08.png",
  "img/avaliacoes/avaliacao-09.png",
  "img/avaliacoes/avaliacao-10.png",
  "img/avaliacoes/avaliacao-11.png",
];
const marqueeHtml = avaliacoes
  .map((src) => `<div class="avaliacao-card"><img src="${src}" alt="Avaliação de cliente" loading="lazy"></div>`)
  .join("");
// Duplica a lista — o carrossel roda por um ciclo exato e reinicia sem salto,
// porque o segundo conjunto é pixel-a-pixel idêntico ao primeiro.
marqueeTrack.innerHTML = marqueeHtml + marqueeHtml;

if (prefersReducedMotion) {
  marqueeTrack.style.transform = "translate3d(0, 0, 0)";
} else {
  const MARQUEE_SPEED = 45; // px/s em velocidade de cruzeiro
  const MARQUEE_EASE = 0.055; // suavização da aceleração/desaceleração por frame

  let cicloPx = 0; // comprimento exato de um ciclo (1a metade + gap de conexão)
  let posicao = 0;
  let velocidade = 0;
  let velocidadeAlvo = MARQUEE_SPEED;
  let ultimoFrame = null;

  function medirCiclo() {
    const primeiroItem = marqueeTrack.children[0];
    const primeiroDaCopia = marqueeTrack.children[avaliacoes.length];
    if (primeiroItem && primeiroDaCopia) {
      cicloPx = primeiroDaCopia.offsetLeft - primeiroItem.offsetLeft;
    }
  }
  medirCiclo();
  window.addEventListener("resize", medirCiclo);

  marqueeWrap.addEventListener("mouseenter", () => { velocidadeAlvo = 0; });
  marqueeWrap.addEventListener("mouseleave", () => { velocidadeAlvo = MARQUEE_SPEED; });

  function passoMarquee(agora) {
    if (ultimoFrame === null) ultimoFrame = agora;
    const dt = Math.min(agora - ultimoFrame, 50);
    ultimoFrame = agora;

    velocidade += (velocidadeAlvo - velocidade) * MARQUEE_EASE;
    posicao -= (velocidade * dt) / 1000;

    if (cicloPx > 0 && posicao <= -cicloPx) posicao += cicloPx;

    marqueeTrack.style.transform = `translate3d(${posicao}px, 0, 0)`;
    requestAnimationFrame(passoMarquee);
  }
  requestAnimationFrame(passoMarquee);
}
