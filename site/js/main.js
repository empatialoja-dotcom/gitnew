// Barba Negra Barbershop — comportamento e animações do site

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
