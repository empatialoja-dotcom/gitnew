// Barba Negra Barbershop — experiência interativa da seção Curso (GSAP + ScrollTrigger)

(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  const cursoSection = document.getElementById("curso");
  if (!cursoSection) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger);

  // Com prefers-reduced-motion, o conteúdo já é renderizado visível por padrão
  // (nenhum CSS esconde .curso-seq/.aprende-card de base) — então basta não
  // rodar nada e sair, sem precisar "desfazer" nenhum estado.
  if (prefersReducedMotion) return;

  // ---------- 1. Entrada sequencial (título -> subtítulo -> foto -> texto) ----------
  function sequenceReveal(container, start) {
    if (!container) return;
    const els = gsap.utils.toArray(container.querySelectorAll(".curso-seq"));
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 24, scale: 0.97 });
    ScrollTrigger.create({
      trigger: container,
      start: start || "top 78%",
      once: true,
      onEnter: () => {
        gsap.to(els, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.16,
        });
      },
    });
  }

  sequenceReveal(document.querySelector(".curso-hook"));
  sequenceReveal(document.querySelector(".curso-prof"), "top 80%");
  document.querySelectorAll(".curso-bloco").forEach((el) => sequenceReveal(el, "top 85%"));

  // ---------- 2. Cards "O que você vai aprender" — fade + scale + leve rotação ----------
  const aprendeCards = gsap.utils.toArray(".aprende-card");
  aprendeCards.forEach((card, i) => {
    gsap.set(card, { opacity: 0, y: 26, scale: 0.93, rotate: i % 2 === 0 ? -2 : 2 });
  });
  if (aprendeCards.length) {
    ScrollTrigger.batch(aprendeCards, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.09,
        }),
    });
  }

  // Cards "Como funciona" — fade + leve deslocamento, sem rotação
  const formatoCards = gsap.utils.toArray(".formato-card");
  formatoCards.forEach((card) => gsap.set(card, { opacity: 0, y: 22 }));
  if (formatoCards.length) {
    ScrollTrigger.batch(formatoCards, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08 }),
    });
  }

  // ---------- 3. Números em destaque (contagem) ----------
  function formatarMoeda(v) {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  document.querySelectorAll(".num-count").forEach((el) => {
    const alvo = parseFloat(el.dataset.countTo);
    const isMoeda = el.dataset.countFormat === "moeda";
    el.textContent = isMoeda ? formatarMoeda(0) : "0";
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => {
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: alvo,
          duration: 1.3,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = isMoeda ? formatarMoeda(proxy.v) : String(Math.round(proxy.v));
          },
        });
      },
    });
  });

  // ---------- 4. Foto do Denis — parallax no scroll + zoom/glow/tilt no hover ----------
  const profMedia = document.getElementById("cursoProfMedia");
  const profInner = document.getElementById("cursoProfInner");
  const profImg = document.getElementById("cursoProfImg");

  if (profMedia && profInner && profImg) {
    gsap.set(profInner, { scale: 1.15 });
    gsap.fromTo(
      profInner,
      { y: -22 },
      {
        y: 22,
        ease: "none",
        scrollTrigger: {
          trigger: profMedia,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.4,
        },
      }
    );

    profMedia.addEventListener("mousemove", (e) => {
      const rect = profMedia.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(profImg, {
        x: relX * 14,
        y: relY * 14,
        scale: 1.045,
        duration: 0.5,
        ease: "power2.out",
      });
    });
    profMedia.addEventListener("mouseleave", () => {
      gsap.to(profImg, { x: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.out" });
    });
  }

  // ---------- 5. Linha de progresso vertical ----------
  const trackFill = document.getElementById("cursoTrackFill");
  if (trackFill) {
    gsap.fromTo(
      trackFill,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: cursoSection,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      }
    );
  }

  // ---------- 6. CTA final — foco, glow pulsante e partículas ----------
  const ctaBloco = document.querySelector(".curso-cta");
  const cursoContent = document.querySelector(".curso-content");
  const ctaBtn = document.querySelector(".curso-cta-btn");
  const particlesEl = document.getElementById("cursoCtaParticles");

  function spawnParticles() {
    if (!particlesEl || particlesEl.dataset.spawned) return;
    particlesEl.dataset.spawned = "1";
    const total = 14;
    for (let i = 0; i < total; i++) {
      const p = document.createElement("span");
      const size = 2 + Math.random() * 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      particlesEl.appendChild(p);
      gsap.to(p, {
        opacity: 0.2 + Math.random() * 0.25,
        y: -20 - Math.random() * 30,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }

  if (ctaBloco) {
    ScrollTrigger.create({
      trigger: ctaBloco,
      start: "top 75%",
      once: true,
      onEnter: () => {
        if (ctaBtn) ctaBtn.classList.add("is-pulsing");
        spawnParticles();
      },
    });

    if (cursoContent) {
      ScrollTrigger.create({
        trigger: ctaBloco,
        start: "top 55%",
        end: "bottom bottom",
        onEnter: () => cursoContent.classList.add("cta-focus"),
        onLeaveBack: () => cursoContent.classList.remove("cta-focus"),
      });
    }
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
