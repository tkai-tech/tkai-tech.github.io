// tkai.tech: Einblenden, Rechenblatt im Hero, Kontaktformular (ohne Bibliothek)
(function () {
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Rechenblatt: reihum eine Zeile hervorheben
  var zeilen = document.querySelectorAll(".rechenblatt .zeile");
  if (zeilen.length) {
    var i = 0;
    zeilen[0].classList.add("aktiv");
    if (!ruhig) {
      setInterval(function () {
        zeilen[i].classList.remove("aktiv");
        i = (i + 1) % zeilen.length;
        zeilen[i].classList.add("aktiv");
      }, 4000);
    }
  }

  // Kontaktformular: an api.tkai.tech, dort geht es als Mail an hallo@tkai.tech
  var form = document.getElementById("kontakt-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".status");
      var knopf = form.querySelector("button");
      var daten = {};
      new FormData(form).forEach(function (v, k) { daten[k] = v; });
      status.className = "status";
      if (!/^\S+@\S+\.\S+$/.test(daten.email) || !daten.nachricht.trim()) {
        status.classList.add("fehler");
        status.textContent = "Bitte E-Mail-Adresse und Nachricht angeben.";
        return;
      }
      knopf.disabled = true;
      fetch("https://api.tkai.tech/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten)
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.classList.add("ok");
        status.textContent = "Danke, Ihre Nachricht ist angekommen.";
      }).catch(function () {
        status.classList.add("fehler");
        status.textContent = "Das hat nicht geklappt. Bitte schreiben Sie direkt an hallo@tkai.tech.";
      }).then(function () { knopf.disabled = false; });
    });
  }

  // Einblenden beim Scrollen
  if (ruhig || !("IntersectionObserver" in window)) return;
  var els = document.querySelectorAll(
    ".hero .container > *, .page-hero .badge, .page-hero h1, .page-hero .lead, .page-hero .btn, .teil, .section-title, .section-sub, .card, .step, .thema, .fakten li, .rahmen, .kontakt-form, .feature-list li, .contact-box"
  );
  els.forEach(function (el) { el.classList.add("reveal"); });
  document.querySelectorAll(".grid, .steps, .themen, .fakten, .feature-list").forEach(function (gruppe) {
    Array.prototype.forEach.call(gruppe.children, function (kind, n) {
      kind.style.transitionDelay = Math.min(n * 80, 400) + "ms";
    });
  });
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach(function (el) { io.observe(el); });
})();
