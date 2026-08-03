"use strict";
/* =====================================================================
   GeminiLive – gemeinsame Sprach-Engine für alle Senior-Seiten
   (index.html, test.html, voice-vergleich.html)

   Echte Sprach-zu-Sprach-Verbindung über die Google Gemini Live API:
   Mikrofon (PCM16, 16 kHz) → WebSocket → Gemini → Audio (PCM16, 24 kHz).

   Schlüssel-Handhabung:
   – Ist ein eigener API-Schlüssel vorhanden (Parameter oder localStorage),
     wird wie bisher direkt mit ihm verbunden (v1beta, ?key=…).
   – Ohne Schlüssel holt sich die Engine automatisch ein kurzlebiges
     Token vom eigenen Token-Server (api.tkai.tech) und verbindet über
     den v1alpha-Endpunkt (?access_token=…). Der echte API-Schlüssel
     bleibt so ausschließlich auf dem Server.

   Verwendung:
     await GeminiLive.verbinde({
       apiKey, modell, stimme, systemPrompt,
       onNutzerText(t),      // Transkript-Häppchen dessen, was der Nutzer sagt
       onKiText(t),          // Transkript-Häppchen der KI-Antwort
       onRundeEnde(),        // KI-Antwort (Turn) abgeschlossen
       onUnterbrochen(),     // Nutzer hat die KI unterbrochen
       onSprechenStart(),    // KI-Stimme beginnt hörbar zu sprechen
       onSprechenEnde(),     // KI-Stimme ist fertig (Wiedergabe leer)
       onFehler(text),       // Verbindungs-/API-Fehler
       onEnde()              // Verbindung wurde (auch serverseitig) beendet
     });
     GeminiLive.sendeText("…")   – Text-Anstoß (z. B. Begrüßung auslösen)
     GeminiLive.trenne()         – alles beenden und aufräumen
     GeminiLive.pegel()          – Lautstärke der KI-Stimme 0..1 (Avatar-Mund)
     GeminiLive.micPegel()       – Mikrofon-Lautstärke 0..1 (Denk-Anzeige)
   ===================================================================== */
const GeminiLive = {
  STANDARD_MODELL: "gemini-3.1-flash-live-preview",
  STANDARD_STIMME: "Kore",
  TOKEN_URL: "https://api.tkai.tech/api/senior/token",

  ws: null,
  aktiv: false,
  cb: {},

  // Mikrofon
  micStream: null, micCtx: null, micNode: null, micSource: null,
  _micPegel: 0,

  // Wiedergabe
  ctx: null, sammel: null, analyser: null, naechsteZeit: 0, quellen: [],
  _sprachMeldung: false,

  /* ---------- Hilfen: gespeicherten Schlüssel/Modell finden ----------
     (voice-vergleich.html legt beides unter senior_test_* im localStorage ab) */
  gespeicherterSchluessel() {
    try { return (localStorage.getItem("senior_test_keyGemini") || "").trim(); } catch (e) { return ""; }
  },
  gespeichertesModell() {
    try { return (localStorage.getItem("senior_test_modellGemini") || "").trim(); } catch (e) { return ""; }
  },

  /* ---------- Kurzzeit-Token vom eigenen Server holen ---------- */
  _holeToken() {
    return fetch(this.TOKEN_URL, { method: "POST" })
      .then(r => {
        if (!r.ok) throw new Error("Token-Server antwortete mit " + r.status);
        return r.json();
      })
      .then(d => {
        if (!d.token) throw new Error("Token-Server lieferte kein Token.");
        return d.token;
      });
  },

  /* ============================ Verbinden ============================ */
  verbinde(opts) {
    const self = this;
    this.cb = opts || {};
    const eigenerKey = ((opts && opts.apiKey) || this.gespeicherterSchluessel()).trim();
    const modell = (opts && opts.modell) || this.gespeichertesModell() || this.STANDARD_MODELL;
    const stimme = (opts && opts.stimme) || this.STANDARD_STIMME;

    // Mit eigenem Schlüssel: direkter Weg (wie bisher).
    // Ohne Schlüssel: kurzlebiges Token vom eigenen Server, v1alpha-Endpunkt.
    const urlVersprechen = eigenerKey
      ? Promise.resolve(
          "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" +
          encodeURIComponent(eigenerKey))
      : this._holeToken().then(token =>
          "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=" +
          encodeURIComponent(token))
        .catch(e => {
          throw new Error("Der Sprachdienst ist gerade nicht erreichbar – bitte später erneut versuchen. (" + e.message + ")");
        });

    return urlVersprechen.then(wsUrl => new Promise((resolve, reject) => {
      let bereit = false;
      self.ws = new WebSocket(wsUrl);

      self.ws.onopen = () => {
        self.ws.send(JSON.stringify({
          setup: {
            model: "models/" + modell,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: stimme } } }
            },
            systemInstruction: { parts: [{ text: (opts && opts.systemPrompt) || "" }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        }));
      };

      self.ws.onmessage = async ev => {
        const text = ev.data instanceof Blob ? await ev.data.text() : ev.data;
        let m; try { m = JSON.parse(text); } catch (e) { return; }

        if (m.setupComplete !== undefined && !bereit) {
          bereit = true;
          self._wiedergabeInit();
          self._mikrofonStart()
            .then(() => { self.aktiv = true; resolve(); })
            .catch(reject);
          return;
        }

        const sc = m.serverContent;
        if (!sc) return;
        if (sc.interrupted) {
          self._wiedergabeLeeren();
          if (self.cb.onUnterbrochen) self.cb.onUnterbrochen();
        }
        if (sc.inputTranscription && sc.inputTranscription.text && self.cb.onNutzerText)
          self.cb.onNutzerText(sc.inputTranscription.text);
        if (sc.outputTranscription && sc.outputTranscription.text && self.cb.onKiText)
          self.cb.onKiText(sc.outputTranscription.text);
        if (sc.modelTurn && sc.modelTurn.parts)
          for (const p of sc.modelTurn.parts)
            if (p.inlineData && p.inlineData.data) self._spiele(p.inlineData.data);
        if (sc.turnComplete && self.cb.onRundeEnde) self.cb.onRundeEnde();
      };

      self.ws.onerror = () => {
        if (!bereit) reject(new Error("Verbindung zu Gemini fehlgeschlagen – bitte Internetverbindung prüfen."));
        else if (self.cb.onFehler) self.cb.onFehler("Die Verbindung zum Sprachdienst ist gestört.");
      };
      self.ws.onclose = ev => {
        if (!bereit) { reject(new Error("Gemini hat die Verbindung abgelehnt (Code " + ev.code + (ev.reason ? " – " + ev.reason : "") + ").")); return; }
        const warAktiv = self.aktiv;
        self._aufraeumen();
        if (warAktiv && self.cb.onEnde) self.cb.onEnde();
      };
    }));
  },

  sendeText(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ realtimeInput: { text: text } }));
  },

  trenne() {
    this.aktiv = false;
    if (this.ws) { try { this.ws.onclose = null; this.ws.close(); } catch (e) {} this.ws = null; }
    this._aufraeumen();
  },

  _aufraeumen() {
    this.aktiv = false;
    this._mikrofonStopp();
    this._wiedergabeLeeren();
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} this.ctx = null; }
  },

  /* ============================ Mikrofon ============================ */
  async _mikrofonStart() {
    const self = this;
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });
    this.micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    this.micSource = this.micCtx.createMediaStreamSource(this.micStream);
    this.micNode = this.micCtx.createScriptProcessor(4096, 1, 1);
    this.micNode.onaudioprocess = e => {
      const f32 = e.inputBuffer.getChannelData(0);
      let s = 0;
      for (let i = 0; i < f32.length; i += 8) s = Math.max(s, Math.abs(f32[i]));
      self._micPegel = s;
      if (!self.ws || self.ws.readyState !== WebSocket.OPEN) return;
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        const w = Math.max(-1, Math.min(1, f32[i]));
        i16[i] = w < 0 ? w * 32768 : w * 32767;
      }
      let bin = "";
      const bytes = new Uint8Array(i16.buffer);
      for (let i = 0; i < bytes.length; i += 8192)
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      self.ws.send(JSON.stringify({
        realtimeInput: { audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" } }
      }));
    };
    this.micSource.connect(this.micNode);
    this.micNode.connect(this.micCtx.destination);
  },

  _mikrofonStopp() {
    try { if (this.micNode) { this.micNode.disconnect(); this.micNode.onaudioprocess = null; } } catch (e) {}
    try { if (this.micSource) this.micSource.disconnect(); } catch (e) {}
    try { if (this.micCtx) this.micCtx.close(); } catch (e) {}
    try { if (this.micStream) this.micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    this.micNode = this.micSource = this.micCtx = this.micStream = null;
    this._micPegel = 0;
  },

  micPegel() { return this._micPegel; },

  /* ============================ Wiedergabe ============================ */
  _wiedergabeInit() {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      this.sammel = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.sammel.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.naechsteZeit = 0;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },

  _spiele(b64) {
    this._wiedergabeInit();
    const roh = atob(b64);
    const bytes = new Uint8Array(roh.length);
    for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const buf = this.ctx.createBuffer(1, pcm.length, 24000);
    const kanal = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) kanal[i] = pcm[i] / 32768;
    const quelle = this.ctx.createBufferSource();
    quelle.buffer = buf;
    quelle.connect(this.sammel);
    const start = Math.max(this.ctx.currentTime + 0.05, this.naechsteZeit);
    quelle.start(start);
    this.naechsteZeit = start + buf.duration;
    this.quellen.push(quelle);
    if (!this._sprachMeldung) {
      this._sprachMeldung = true;
      if (this.cb.onSprechenStart) this.cb.onSprechenStart();
    }
    const self = this;
    quelle.onended = () => {
      self.quellen = self.quellen.filter(q => q !== quelle);
      if (!self.quellen.length && self._sprachMeldung) {
        self._sprachMeldung = false;
        if (self.cb.onSprechenEnde) self.cb.onSprechenEnde();
      }
    };
  },

  _wiedergabeLeeren() {
    this.quellen.forEach(q => { try { q.stop(); } catch (e) {} });
    this.quellen = [];
    this.naechsteZeit = 0;
    if (this._sprachMeldung) {
      this._sprachMeldung = false;
      if (this.cb.onSprechenEnde) this.cb.onSprechenEnde();
    }
  },

  pegel() {
    if (!this.analyser || !this.quellen.length) return 0;
    const d = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(d);
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s / d.length);
  },

  sprichtGerade() { return this.quellen.length > 0; }
};
