// Barba Negra Barbershop — Galeria: grid tradicional de 3 colunas com entrada em
// cascata por linha, parallax sutil por linha e lightbox premium (GSAP + ScrollTrigger)

(() => {
  const section = document.getElementById("galeria");
  const grid = document.getElementById("galeriaGrid");
  if (!section || !grid) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const temGsap = typeof gsap !== "undefined";
  const temScrollTrigger = temGsap && typeof ScrollTrigger !== "undefined";
  if (temScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // Pra adicionar fotos: colocar o arquivo em site/img/galeria/ e acrescentar uma linha aqui.
  const itens = [
    { src: "img/galeria/corte-01.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-02.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-03.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-04.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-05.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-06.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-07.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/corte-08.jpg", alt: "Corte na Barba Negra" },
    { src: "img/galeria/cortes-grupo.jpg", alt: "Cortes Barba Negra" },
  ];

  const COLUNAS = 3; // grid tradicional — sempre 3 no desktop, ver breakpoints no CSS
  const PARALLAX_BREAKPOINT = 1024; // abaixo disso o grid vira 2/1 colunas — parallax por linha desliga
  const DIRECAO_LINHA = [-1, 1, -1]; // esquerda, direita, esquerda...

  let figsEmOrdem = [];
  let parallaxAtivo = false;

  if (itens.length === 0) {
    grid.innerHTML = `<div class="galeria-vazia">Fotos da barbearia em breve.</div>`;
    return;
  }

  itens.forEach((item, i) => {
    const fig = document.createElement("div");
    fig.className = "galeria-item";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || "Barba Negra Barbershop";
    img.loading = "lazy";
    fig.appendChild(img);

    fig.addEventListener("mouseenter", () => {
      grid.classList.add("has-hover");
      fig.classList.add("is-focus");
      if (temGsap) gsap.to(fig, { y: -8, duration: 0.5, ease: "power2.out" });
    });
    fig.addEventListener("mouseleave", () => {
      grid.classList.remove("has-hover");
      fig.classList.remove("is-focus");
      if (temGsap) gsap.to(fig, { y: 0, duration: 0.5, ease: "power2.out" });
    });
    fig.addEventListener("click", () => abrirLightbox(i));

    grid.appendChild(fig);
    figsEmOrdem.push(fig);
  });

  if (prefersReducedMotion || !temGsap) {
    // Sem motion/gsap: grid já nasce visível via CSS, nada a animar.
  } else {
    animarEntrada();
    if (temScrollTrigger) atualizarParallax();
  }

  function animarEntrada() {
    gsap.set(figsEmOrdem, { opacity: 0, y: 30, scale: 0.95 });

    const linhas = [];
    for (let i = 0; i < figsEmOrdem.length; i += COLUNAS) {
      linhas.push(figsEmOrdem.slice(i, i + COLUNAS));
    }

    function tocarCascata() {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      linhas.forEach((linha, i) => {
        tl.to(linha, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1 }, i * 0.22);
      });
    }

    if (!temScrollTrigger) {
      tocarCascata();
      return;
    }

    ScrollTrigger.create({
      trigger: grid,
      start: "top 85%",
      once: true,
      // Pequeno atraso pra deixar o título e o subtítulo da seção (reveal
      // genérico do main.js) aparecerem primeiro, antes das fotos.
      onEnter: () => gsap.delayedCall(1, tocarCascata),
    });
  }

  function atualizarParallax() {
    const deveAtivar = window.innerWidth > PARALLAX_BREAKPOINT;
    if (deveAtivar === parallaxAtivo) return;
    parallaxAtivo = deveAtivar;

    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === section) st.kill();
    });
    gsap.set(figsEmOrdem, { x: 0 });

    if (!deveAtivar) return;

    const amt = 16; // sutil — só pra dar vida, não pra chamar atenção
    for (let linha = 0; linha * COLUNAS < figsEmOrdem.length; linha++) {
      const itensLinha = figsEmOrdem.slice(linha * COLUNAS, linha * COLUNAS + COLUNAS);
      const dir = DIRECAO_LINHA[linha % DIRECAO_LINHA.length];
      gsap.fromTo(
        itensLinha,
        { x: (-dir * amt) / 2 },
        {
          x: (dir * amt) / 2,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        }
      );
    }
  }

  if (temScrollTrigger) {
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        atualizarParallax();
        ScrollTrigger.refresh();
      }, 200);
    });
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  // ---------- Lightbox: tela cheia, fundo preto, imagem centralizada ----------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");
  if (!lightbox || !lightboxImg) return;

  let indiceAtual = -1;

  function abrirLightbox(indice) {
    indiceAtual = indice;
    const img = figsEmOrdem[indice].querySelector("img");
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("open");

    if (temGsap && !prefersReducedMotion) {
      gsap.fromTo(
        lightboxImg,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }
      );
    }
  }

  function fecharLightbox() {
    if (temGsap && !prefersReducedMotion) {
      gsap.to(lightboxImg, {
        opacity: 0,
        scale: 0.96,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          lightbox.classList.remove("open");
          gsap.set(lightboxImg, { clearProps: "opacity,scale,x" });
        },
      });
    } else {
      lightbox.classList.remove("open");
    }
    indiceAtual = -1;
  }

  function navegar(delta) {
    if (indiceAtual < 0 || !figsEmOrdem.length) return;
    const novo = (indiceAtual + delta + figsEmOrdem.length) % figsEmOrdem.length;
    indiceAtual = novo;
    const img = figsEmOrdem[novo].querySelector("img");

    if (!temGsap || prefersReducedMotion) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      return;
    }

    gsap.to(lightboxImg, {
      opacity: 0,
      x: delta > 0 ? -14 : 14,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        gsap.fromTo(
          lightboxImg,
          { opacity: 0, x: delta > 0 ? 14 : -14 },
          { opacity: 1, x: 0, duration: 0.32, ease: "power2.out" }
        );
      },
    });
  }

  lightboxClose.addEventListener("click", fecharLightbox);
  lightboxPrev.addEventListener("click", (e) => { e.stopPropagation(); navegar(-1); });
  lightboxNext.addEventListener("click", (e) => { e.stopPropagation(); navegar(1); });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.id === "lightboxStage") fecharLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") fecharLightbox();
    if (e.key === "ArrowLeft") navegar(-1);
    if (e.key === "ArrowRight") navegar(1);
  });
})();
