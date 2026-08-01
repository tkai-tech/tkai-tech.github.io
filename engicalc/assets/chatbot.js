/* ============================================================
   EngiCalc – Lokaler KI-Assistent "EngiBot"
   Wissensbasierter Chatbot: Formeln, Begriffe, Navigation.
   Läuft komplett lokal im Browser, kein API-Key nötig.
   ============================================================ */

(function () {
  // ---------- Wissensbasis ----------
  // Jeder Eintrag: Schlüsselwörter, Antwort (HTML), optionale Vorschläge
  const KB = [
    {
      keys: ["druckverlust", "rohrreibung", "darcy", "weisbach", "lambda rohr"],
      answer: `Der <b>Druckverlust</b> in einer Rohrleitung entsteht durch Reibung an der Rohrwand und durch Einbauten.
        <span class="formula">Δp = λ · (L/d) · (ρ/2) · v²</span>
        Dabei ist λ die Rohrreibungszahl (abhängig von Reynolds-Zahl und Rauheit), L die Rohrlänge, d der Innendurchmesser, ρ die Dichte und v die Strömungsgeschwindigkeit.
        <br>→ <a href="stroemung.html#druckverlust">Zum Druckverlust-Rechner</a>`,
      suggest: ["Was ist die Reynolds-Zahl?", "Was sind Zeta-Werte?"]
    },
    {
      keys: ["reynolds", "laminar", "turbulent"],
      answer: `Die <b>Reynolds-Zahl</b> beschreibt das Verhältnis von Trägheits- zu Zähigkeitskräften und entscheidet über die Strömungsform:
        <span class="formula">Re = v · d / ν</span>
        <ul><li>Re &lt; 2320: laminare Strömung</li><li>Re &gt; 2320: Übergang zu turbulenter Strömung</li></ul>
        ν ist die kinematische Viskosität (Wasser 20 °C: ca. 1,0·10⁻⁶ m²/s).
        <br>→ <a href="stroemung.html#reynolds">Zum Reynolds-Rechner</a>`,
      suggest: ["Wie berechne ich den Druckverlust?"]
    },
    {
      keys: ["bernoulli", "energiegleichung", "staudruck"],
      answer: `Die <b>Bernoulli-Gleichung</b> beschreibt die Energieerhaltung entlang eines Stromfadens (reibungsfrei, inkompressibel):
        <span class="formula">p + ρ·g·h + ρ/2·v² = konstant</span>
        Sie verknüpft statischen Druck, geodätische Höhe und Geschwindigkeit. Mit ihr lassen sich z. B. Düsen, Venturirohre und Ausflussvorgänge berechnen.
        <br>→ <a href="stroemung.html#bernoulli">Zum Bernoulli-Rechner</a>`
    },
    {
      keys: ["kv", "kvs", "ventil", "armatur", "durchflusskoeffizient"],
      answer: `Der <b>Kv-Wert</b> (Durchflusskoeffizient) gibt an, wie viel m³/h Wasser bei 1 bar Druckverlust durch eine Armatur strömen:
        <span class="formula">Kv = Q · √(ρ/1000 / Δp)</span>
        (Q in m³/h, Δp in bar). Der Kvs-Wert ist der Kv-Wert bei voller Öffnung. Auslegungsregel: Kvs ≈ 1,1–1,3 · Kv,max.
        <br>→ <a href="stroemung.html#kvwert">Zum Kv-Wert-Rechner</a>`
    },
    {
      keys: ["ausfluss", "torricelli", "behälter", "leerlauf"],
      answer: `Die <b>Ausflussgeschwindigkeit</b> aus einem Behälter folgt aus Torricelli:
        <span class="formula">v = √(2·g·h)</span>
        Der reale Volumenstrom wird mit der Ausflusszahl μ (Reibung + Strahleinschnürung) korrigiert: Q = μ · A · v.
        <br>→ <a href="stroemung.html#ausfluss">Zum Ausfluss-Rechner</a>`
    },
    {
      keys: ["zeta", "widerstandsbeiwert", "einzelwiderstand", "formstück"],
      answer: `<b>Zeta-Werte (ζ)</b> sind Widerstandsbeiwerte für Einbauten wie Bögen, Ventile oder Querschnittsänderungen:
        <span class="formula">Δp = ζ · (ρ/2) · v²</span>
        Typische Werte: 90°-Bogen ≈ 0,3–0,5 · T-Stück ≈ 1,3 · Rückschlagklappe ≈ 2–3 · Eckventil ≈ 3–5.
        Sie werden zum Rohrreibungsanteil addiert. → <a href="stroemung.html#druckverlust">Druckverlust-Rechner</a>`
    },
    {
      keys: ["wärmeleitung", "isolierung", "dämmung", "wärmeverlust rohr"],
      answer: `Die <b>Wärmeleitung</b> durch eine ebene Wand berechnet sich zu:
        <span class="formula">Q̇ = λ/s · A · ΔT</span>
        Bei Rohrisolierungen wird die Zylindergeometrie berücksichtigt (logarithmischer Ansatz). λ ist die Wärmeleitfähigkeit (Mineralwolle ≈ 0,04 W/mK, Stahl ≈ 50 W/mK).
        <br>→ <a href="waerme.html#waermeleitung">Zum Isolierungs-Rechner</a>`
    },
    {
      keys: ["wärmedurchgang", "u-wert", "k-wert", "wärmeübergangskoeffizient"],
      answer: `Der <b>Wärmedurchgangskoeffizient U</b> (früher k-Wert) fasst Wärmeübergang innen, Leitung durch die Wand und Übergang außen zusammen:
        <span class="formula">1/U = 1/αᵢ + s/λ + 1/αₐ</span>
        Der Wärmestrom ist dann Q̇ = U · A · ΔT. Typische α-Werte: ruhende Luft ≈ 8, bewegte Luft ≈ 25, Wasser ≈ 500–4000 W/m²K.
        <br>→ <a href="waerme.html#uwert">Zum U-Wert-Rechner</a>`
    },
    {
      keys: ["wärmetauscher", "lmtd", "mittlere temperaturdifferenz", "gegenstrom", "gleichstrom"],
      answer: `Ein <b>Wärmetauscher</b> wird über die mittlere logarithmische Temperaturdifferenz (LMTD) ausgelegt:
        <span class="formula">Q̇ = U · A · ΔT<sub>log</sub></span>
        <span class="formula">ΔT<sub>log</sub> = (ΔT₁ − ΔT₂) / ln(ΔT₁/ΔT₂)</span>
        Gegenstrom erreicht bei gleicher Fläche mehr Leistung als Gleichstrom.
        <br>→ <a href="waerme.html#waermetauscher">Zum Wärmetauscher-Rechner</a>`
    },
    {
      keys: ["strahlung", "stefan", "boltzmann", "emissionsgrad", "abstrahlung"],
      answer: `Die <b>Wärmestrahlung</b> eines Körpers folgt dem Stefan-Boltzmann-Gesetz:
        <span class="formula">Q̇ = ε · σ · A · (T₁⁴ − T₂⁴)</span>
        σ = 5,67·10⁻⁸ W/m²K⁴. Der Emissionsgrad ε liegt zwischen 0 (Spiegel) und 1 (schwarzer Körper); oxidierter Stahl ≈ 0,8, blankes Aluminium ≈ 0,05.
        <br>→ <a href="waerme.html#strahlung">Zum Strahlungs-Rechner</a>`
    },
    {
      keys: ["aufheizen", "erwärmen", "abkühlen", "wärmemenge", "spezifische wärmekapazität"],
      answer: `Die <b>Wärmemenge</b> zum Erwärmen eines Stoffes:
        <span class="formula">Q = m · c · ΔT</span>
        c ist die spezifische Wärmekapazität (Wasser: 4,19 kJ/kgK, Stahl: 0,47 kJ/kgK). Mit der Zeit ergibt sich die nötige Heizleistung P = Q/t.
        <br>→ <a href="waerme.html#aufheizen">Zum Aufheiz-Rechner</a>`
    },
    {
      keys: ["biegung", "durchbiegung", "träger", "balken", "biegeträger"],
      answer: `Die <b>Durchbiegung eines Trägers</b> hängt von Lastfall, E-Modul und Flächenträgheitsmoment ab. Beispiel Einzellast mittig, beidseitig aufliegend:
        <span class="formula">f = F·L³ / (48·E·I)</span>
        Biegespannung: σ = M/W mit dem Widerstandsmoment W.
        <br>→ <a href="festigkeit.html#biegetraeger">Zum Biegeträger-Rechner</a>`,
      suggest: ["Was ist das Flächenträgheitsmoment?"]
    },
    {
      keys: ["flächenträgheitsmoment", "widerstandsmoment", "trägheitsmoment querschnitt"],
      answer: `Das <b>Flächenträgheitsmoment I</b> beschreibt die Steifigkeit eines Querschnitts gegen Biegung, das <b>Widerstandsmoment W</b> die Beanspruchbarkeit:
        <span class="formula">Rechteck: I = b·h³/12, W = b·h²/6</span>
        <span class="formula">Kreis: I = π·d⁴/64, W = π·d³/32</span>
        <br>→ <a href="festigkeit.html#querschnitt">Zum Querschnittswerte-Rechner</a>`
    },
    {
      keys: ["knickung", "euler", "knicken", "knicklast"],
      answer: `<b>Knickung</b> ist das seitliche Ausweichen schlanker Druckstäbe. Die kritische Last nach Euler:
        <span class="formula">F<sub>k</sub> = π² · E · I / L<sub>k</sub>²</span>
        L<sub>k</sub> ist die Knicklänge (abhängig vom Einspannfall: 0,5·L bis 2·L). Gültig für schlanke Stäbe (λ > ca. 100 bei Stahl).
        <br>→ <a href="festigkeit.html#knickung">Zum Knickungs-Rechner</a>`
    },
    {
      keys: ["spannung", "zugspannung", "biegespannung", "torsion", "vergleichsspannung", "mises"],
      answer: `Die wichtigsten <b>Spannungsarten</b>:
        <ul><li>Zug/Druck: σ = F/A</li><li>Biegung: σ = M<sub>b</sub>/W</li><li>Torsion: τ = M<sub>t</sub>/W<sub>p</sub></li></ul>
        Bei kombinierter Belastung nutzt man die Vergleichsspannung (GEH / von Mises):
        <span class="formula">σ<sub>v</sub> = √(σ² + 3·τ²)</span>
        → <a href="festigkeit.html#spannungen">Zum Spannungs-Rechner</a>`
    },
    {
      keys: ["schraube", "vorspannkraft", "anziehmoment", "anzugsmoment", "schraubenverbindung"],
      answer: `Bei einer <b>Schraubenverbindung</b> erzeugt das Anziehmoment die Vorspannkraft. Näherung:
        <span class="formula">M<sub>A</sub> ≈ 0,17 · F<sub>V</sub> · d</span>
        (für μ ≈ 0,12). Die zulässige Vorspannkraft folgt aus Festigkeitsklasse und Spannungsquerschnitt, üblich: Ausnutzung 90 % von R<sub>p0,2</sub>.
        <br>→ <a href="maschinenelemente.html#schraube">Zum Schrauben-Rechner</a>`
    },
    {
      keys: ["pressverbindung", "querpressverband", "übermaß", "aufschrumpfen"],
      answer: `Eine <b>Pressverbindung</b> überträgt Drehmoment durch Reibung zwischen Welle und Nabe. Der Fugendruck p erzeugt die Rutschkraft:
        <span class="formula">M<sub>max</sub> = p · π · d² /2 · L · μ</span>
        Das nötige Übermaß folgt aus den elastischen Aufweitungen von Welle und Nabe (Lamé-Gleichungen).
        <br>→ <a href="maschinenelemente.html#pressverbindung">Zum Pressverbindungs-Rechner</a>`
    },
    {
      keys: ["passfeder", "welle nabe", "flächenpressung passfeder"],
      answer: `Die <b>Passfeder</b> überträgt Drehmoment formschlüssig. Maßgebend ist die Flächenpressung an der Nabennut:
        <span class="formula">p = 2·M<sub>t</sub> / (d · h′ · l<sub>tr</sub>) ≤ p<sub>zul</sub></span>
        h' ist die tragende Höhe (≈ 0,45·h), l<sub>tr</sub> die tragende Länge. p<sub>zul</sub>: Stahl-Nabe ≈ 100–150 N/mm².
        <br>→ <a href="maschinenelemente.html#passfeder">Zum Passfeder-Rechner</a>`
    },
    {
      keys: ["schweißnaht", "schweissnaht", "kehlnaht", "schweißverbindung"],
      answer: `Bei <b>Schweißnahtverbindungen</b> wird die Spannung auf den Nahtquerschnitt bezogen:
        <span class="formula">σ<sub>w</sub> = F / (a · l<sub>w</sub>) ≤ σ<sub>w,zul</sub></span>
        a = Nahtdicke, l<sub>w</sub> = wirksame Nahtlänge. Die zulässige Spannung hängt von Nahtgüte, Belastungsart und Werkstoff ab.
        <br>→ <a href="maschinenelemente.html#schweissnaht">Zum Schweißnaht-Rechner</a>`
    },
    {
      keys: ["pumpe", "pumpenleistung", "förderhöhe", "wellenleistung"],
      answer: `Die <b>hydraulische Leistung</b> einer Pumpe:
        <span class="formula">P<sub>hyd</sub> = ρ · g · Q · H</span>
        Die Wellenleistung ist P<sub>W</sub> = P<sub>hyd</sub> / η. Typische Wirkungsgrade: Kreiselpumpe 0,6–0,85.
        <br>→ <a href="pumpen.html#leistung">Zum Pumpenleistungs-Rechner</a>`,
      suggest: ["Was ist der NPSH-Wert?"]
    },
    {
      keys: ["npsh", "kavitation", "haltedruck"],
      answer: `Der <b>NPSH-Wert</b> (Net Positive Suction Head) beschreibt den Abstand zum Verdampfungsdruck am Pumpeneintritt:
        <span class="formula">NPSH<sub>vorh</sub> = (p<sub>e</sub> − p<sub>D</sub>)/(ρ·g) + z<sub>e</sub> − h<sub>v</sub></span>
        Kavitationsfrei, wenn NPSH<sub>vorh</sub> &gt; NPSH<sub>erf</sub> + 0,5 m. Kavitation zerstört Laufräder durch implodierende Dampfblasen.
        <br>→ <a href="pumpen.html#npsh">Zum NPSH-Rechner</a>`
    },
    {
      keys: ["schallpegel", "dezibel", "db", "pegeladdition", "lärm"],
      answer: `<b>Schallpegel</b> werden logarithmisch addiert – zwei gleich laute Quellen ergeben +3 dB:
        <span class="formula">L<sub>ges</sub> = 10 · lg( Σ 10<sup>Lᵢ/10</sup> )</span>
        Faustwerte: +10 dB wird als doppelt so laut empfunden. TA-Lärm-Richtwerte: Wohngebiet nachts 40 dB(A).
        <br>→ <a href="akustik.html#pegeladdition">Zum Pegeladditions-Rechner</a>`
    },
    {
      keys: ["entfernung schall", "abstandsdämpfung", "pegelabnahme", "schallausbreitung"],
      answer: `Bei einer Punktschallquelle nimmt der Pegel mit der Entfernung ab (Kugelausbreitung):
        <span class="formula">L₂ = L₁ − 20 · lg(r₂/r₁)</span>
        Pro Verdopplung des Abstands: −6 dB. Bei Linienquellen (Straße): −3 dB je Verdopplung.
        <br>→ <a href="akustik.html#entfernung">Zum Entfernungs-Rechner</a>`
    },
    {
      keys: ["schallleistung", "schalldruck", "schallleistungspegel"],
      answer: `<b>Schallleistungspegel L<sub>W</sub></b> ist die Quelleneigenschaft, <b>Schalldruckpegel L<sub>p</sub></b> das, was am Ort ankommt. Für Freifeld-Kugelausbreitung gilt:
        <span class="formula">L<sub>p</sub> = L<sub>W</sub> − 10·lg(4·π·r²)</span>
        <br>→ <a href="akustik.html#schallleistung">Zum Schallleistungs-Rechner</a>`
    },
    {
      keys: ["viskosität", "zähigkeit"],
      answer: `Die <b>Viskosität</b> beschreibt die Zähflüssigkeit eines Fluids.
        <ul><li>Dynamische Viskosität η in Pa·s</li><li>Kinematische Viskosität ν = η/ρ in m²/s</li></ul>
        Wasser 20 °C: ν ≈ 1,0·10⁻⁶ m²/s · Luft 20 °C: ν ≈ 15,3·10⁻⁶ m²/s · Hydrauliköl: ≈ 46·10⁻⁶ m²/s (ISO VG 46).`
    },
    {
      keys: ["dichte", "stoffwerte", "wasser eigenschaften"],
      answer: `Wichtige <b>Stoffwerte</b> (bei 20 °C):
        <ul><li>Wasser: ρ = 998 kg/m³, c = 4,19 kJ/kgK, λ = 0,60 W/mK</li>
        <li>Luft: ρ = 1,20 kg/m³, c = 1,005 kJ/kgK</li>
        <li>Stahl: ρ = 7850 kg/m³, c = 0,47 kJ/kgK, λ ≈ 50 W/mK, E = 210.000 N/mm²</li>
        <li>Aluminium: ρ = 2700 kg/m³, E = 70.000 N/mm²</li></ul>`
    },
    {
      keys: ["e-modul", "elastizitätsmodul", "werkstoffkennwert", "streckgrenze", "zugfestigkeit"],
      answer: `Wichtige <b>Werkstoffkennwerte</b>:
        <ul><li>E-Modul Stahl: 210.000 N/mm², Alu: 70.000 N/mm²</li>
        <li>S235: R<sub>e</sub> = 235 N/mm², R<sub>m</sub> = 360 N/mm²</li>
        <li>S355: R<sub>e</sub> = 355 N/mm², R<sub>m</sub> = 510 N/mm²</li>
        <li>Schraube 8.8: R<sub>p0,2</sub> = 640 N/mm², R<sub>m</sub> = 800 N/mm²</li></ul>
        Zulässige Spannung: σ<sub>zul</sub> = R<sub>e</sub> / Sicherheit (statisch meist S = 1,5).`
    },
    {
      keys: ["hilfe", "was kannst du", "funktionen", "themen", "übersicht"],
      answer: `Ich bin <b>EngiBot</b> und helfe dir bei Ingenieursfragen. Ich kann:
        <ul><li>Formeln erklären (z. B. „Wie berechne ich den Druckverlust?")</li>
        <li>Begriffe definieren (z. B. „Was ist Kavitation?")</li>
        <li>Zum passenden Rechner führen</li>
        <li>Stoffwerte und Kennwerte nennen</li></ul>
        Themen: <a href="stroemung.html">Strömung</a> · <a href="waerme.html">Wärme</a> · <a href="festigkeit.html">Festigkeit</a> · <a href="maschinenelemente.html">Maschinenelemente</a> · <a href="pumpen.html">Pumpen</a> · <a href="akustik.html">Akustik</a>`,
      suggest: ["Wie berechne ich den Druckverlust?", "Was ist der NPSH-Wert?", "Formel für Durchbiegung?"]
    }
  ];

  const FALLBACK = `Dazu habe ich leider noch kein Wissen hinterlegt. Versuche es mit anderen Stichworten
    oder schau in den Themenbereichen:
    <ul><li><a href="stroemung.html">Strömungstechnik</a></li><li><a href="waerme.html">Wärmetechnik</a></li>
    <li><a href="festigkeit.html">Festigkeit</a></li><li><a href="maschinenelemente.html">Maschinenelemente</a></li>
    <li><a href="pumpen.html">Pumpentechnik</a></li><li><a href="akustik.html">Akustik</a></li></ul>
    Tipp: Frage z. B. <i>„Wie berechne ich den Druckverlust?"</i>`;

  const GREETINGS = ["hallo", "hi", "hey", "guten tag", "moin", "servus"];

  // ---------- Matching ----------
  function normalize(s) {
    return s.toLowerCase()
      .replace(/[äÄ]/g, "ä").replace(/ß/g, "ss")
      .replace(/[^a-zäöüß0-9\s-]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function findAnswer(q) {
    const nq = normalize(q);
    if (GREETINGS.some(g => nq === g || nq.startsWith(g + " "))) {
      return { answer: `Hallo! Ich bin EngiBot, dein Assistent für Technik-Fragen. Frag mich nach Formeln, Begriffen oder Rechnern.`,
               suggest: ["Was kannst du?", "Wie berechne ich den Druckverlust?", "Was ist die Reynolds-Zahl?"] };
    }
    let best = null, bestScore = 0;
    for (const entry of KB) {
      let score = 0;
      for (const k of entry.keys) {
        const nk = normalize(k);
        if (nq.includes(nk)) score += nk.length; // längere Treffer wiegen mehr
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    if (best) return best;
    // Zweiter Versuch: Einzelwort-Überlappung
    const words = nq.split(" ").filter(w => w.length > 3);
    for (const entry of KB) {
      for (const k of entry.keys) {
        for (const w of words) {
          if (normalize(k).includes(w)) return entry;
        }
      }
    }
    return { answer: FALLBACK };
  }

  // ---------- UI ----------
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildUI() {
    const fab = el("button", "", "");
    fab.innerHTML = "<svg class=\"lucide lucide-bot\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M12 8V4H8\" /> <rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\" /> <path d=\"M2 14h2\" /> <path d=\"M20 14h2\" /> <path d=\"M15 13v2\" /> <path d=\"M9 13v2\" /> </svg>";
    fab.id = "chat-fab";
    fab.title = "EngiBot – KI-Assistent";
    fab.setAttribute("aria-label", "Chat öffnen");

    const panel = el("div");
    panel.id = "chat-panel";
    panel.innerHTML = `
      <div class="chat-header">
        <div class="bot-avatar"><svg class="lucide lucide-bot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" > <path d="M12 8V4H8" /> <rect width="16" height="12" x="4" y="8" rx="2" /> <path d="M2 14h2" /> <path d="M20 14h2" /> <path d="M15 13v2" /> <path d="M9 13v2" /> </svg></div>
        <div><h3>EngiBot</h3><div class="status">● online – lokaler Assistent</div></div>
        <button class="chat-close" aria-label="Schließen"><svg class="lucide lucide-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" > <path d="M18 6 6 18" /> <path d="m6 6 12 12" /> </svg></button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-suggestions" id="chat-suggestions"></div>
      <div class="chat-input-row">
        <input type="text" id="chat-input" placeholder="Frage stellen, z. B. Druckverlust…" autocomplete="off">
        <button id="chat-send" aria-label="Senden"><svg class="lucide lucide-send-horizontal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" > <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" /> <path d="M6 12h16" /> </svg></button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const messages = panel.querySelector("#chat-messages");
    const suggBox = panel.querySelector("#chat-suggestions");
    const input = panel.querySelector("#chat-input");

    function addMsg(text, who) {
      const m = el("div", "msg " + who, text);
      messages.appendChild(m);
      messages.scrollTop = messages.scrollHeight;
    }

    function showSuggestions(list) {
      suggBox.innerHTML = "";
      (list || []).forEach(s => {
        const b = el("button", "", s);
        b.addEventListener("click", () => { input.value = s; send(); });
        suggBox.appendChild(b);
      });
    }

    function send() {
      const q = input.value.trim();
      if (!q) return;
      addMsg(q.replace(/</g, "&lt;"), "user");
      input.value = "";
      showSuggestions([]);
      setTimeout(() => {
        const res = findAnswer(q);
        addMsg(res.answer, "bot");
        showSuggestions(res.suggest);
      }, 350);
    }

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && !messages.children.length) {
        addMsg(`Hallo! Ich bin <b>EngiBot</b>, dein lokaler Technik-Assistent.<br>
          Frag mich nach Formeln, Begriffen oder lass dich zum passenden Rechner führen.`, "bot");
        showSuggestions(["Was kannst du?", "Wie berechne ich den Druckverlust?", "Formel für Durchbiegung?"]);
        input.focus();
      }
    });
    panel.querySelector(".chat-close").addEventListener("click", () => panel.classList.remove("open"));
    panel.querySelector("#chat-send").addEventListener("click", send);
    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
