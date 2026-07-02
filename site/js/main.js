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

// Agendamento -> WhatsApp
document.getElementById("agendaForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value.trim();
  const barbeiro = document.getElementById("barbeiro").value || "sem preferência";
  const servico = document.getElementById("servico").value;
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;

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

// Produtos -> WhatsApp
document.querySelectorAll(".whats-produto").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const produto = btn.dataset.produto;
    const texto = `Olá! Tenho interesse no produto: ${produto}. Pode me passar mais informações?`;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  });
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

// Avaliações — marquee
const marqueeTrack = document.getElementById("marqueeTrack");
const avaliacoes = [
  "img/avaliacoes/avaliacao-01.png",
  "img/avaliacoes/avaliacao-02.png",
  "img/avaliacoes/avaliacao-03.png",
];
const marqueeHtml = avaliacoes
  .map((src) => `<div class="avaliacao-card"><img src="${src}" alt="Avaliação de cliente" loading="lazy"></div>`)
  .join("");
// Duplica a lista pra criar o loop contínuo do marquee
marqueeTrack.innerHTML = marqueeHtml + marqueeHtml;
