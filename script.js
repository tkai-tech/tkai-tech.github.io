// tkai.tech — dezente Scroll-Animationen (kein Framework nötig)
(function () {
  // Nutzer mit reduzierter Bewegung: keine Animationen
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var els = document.querySelectorAll(
    ".hero h1, .hero p, .hero .btn, .page-hero .badge, .page-hero h1, .page-hero .lead, .page-hero .btn, .section-title, .section-sub, .card, .step, .feature-list li, .contact-box"
  );
  els.forEach(function (el) { el.classList.add("reveal"); });

  // Gestaffeltes Einblenden innerhalb von Rastern und Listen
  document.querySelectorAll(".grid, .steps, .feature-list").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.transitionDelay = Math.min(i * 70, 350) + "ms";
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  els.forEach(function (el) { io.observe(el); });
})();
