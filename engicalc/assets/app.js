/* ============================================================
   EngiCalc – gemeinsame Hilfsfunktionen
   ============================================================ */

// Zahl formatieren (deutsches Format, sinnvolle Stellenanzahl)
function fmt(x, digits) {
  if (!isFinite(x)) return "–";
  if (digits === undefined) {
    const a = Math.abs(x);
    if (a === 0) digits = 0;
    else if (a >= 1000) digits = 0;
    else if (a >= 100) digits = 1;
    else if (a >= 1) digits = 2;
    else if (a >= 0.01) digits = 4;
    else digits = 6;
  }
  return x.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Wert eines Inputs als Zahl lesen (Komma erlaubt)
function val(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  return parseFloat(String(el.value).replace(",", "."));
}

// Ergebnis in Element schreiben
function out(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "rvalue" + (cls ? " " + cls : "");
}

// Rechner auf-/zuklappen
function toggleCalc(head) {
  head.parentElement.classList.toggle("open");
}

// Beim Laden: ersten Rechner öffnen, Anker öffnen
document.addEventListener("DOMContentLoaded", () => {
  const hash = location.hash.replace("#", "");
  let opened = false;
  if (hash) {
    const target = document.getElementById(hash);
    if (target && target.classList.contains("calc")) {
      target.classList.add("open");
      opened = true;
      setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }
  if (!opened) {
    const first = document.querySelector(".calc");
    if (first) first.classList.add("open");
  }
  // Live-Berechnung: bei jeder Eingabe zugehörige calc()-Funktion ausführen
  document.querySelectorAll(".calc").forEach(calc => {
    const fn = calc.dataset.calc;
    if (fn && typeof window[fn] === "function") {
      calc.querySelectorAll("input, select").forEach(inp => {
        inp.addEventListener("input", () => window[fn]());
        inp.addEventListener("change", () => window[fn]());
      });
      window[fn]();
    }
  });
});
