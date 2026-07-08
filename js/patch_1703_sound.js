/* STELLARION 1.7.03 — Retour sonore léger.
   Constat de l'audit : une seule référence audio dans tout le jeu, donc
   aucun retour sonore aux actions. Honnêteté sur le périmètre : ce patch
   NE contient PAS de musique d'ambiance (ça demanderait un vrai morceau
   composé/licencié, pas quelque chose à générer ici) — il ajoute des
   sons d'interface courts, synthétisés (Web Audio, aucun fichier audio
   nécessaire), volontairement limités à des évènements peu fréquents et
   significatifs pour ne pas devenir agaçant : confirmation de succès,
   erreur, avertissement (branchés sur stToast du patch 1700 — pas sur
   CHAQUE clic du jeu), et un clic doux sur les actions importantes
   (boutons dorés, confirmation, tutoriel). Activé par défaut, volume
   bas, et togglable via un petit bouton persistant (préférence
   sauvegardée en localStorage). */
(function () {
  "use strict";
  if (window.__stellarionSound1703) return;
  window.__stellarionSound1703 = true;

  var MUTE_KEY = "st_sound_muted";
  function isMuted() { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; } }
  function setMuted(v) { try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch (e) {} }

  var ctx = null;
  function audioCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) {}
    return ctx;
  }

  function tone(freq, durMs, opts) {
    if (isMuted()) return;
    var ac = audioCtx();
    if (!ac) return;
    if (ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
    opts = opts || {};
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + durMs / 1000);
    var peak = (opts.volume == null ? 0.06 : opts.volume);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.02);
  }

  var SOUNDS = {
    success: function () { tone(660, 90, { volume: .05 }); setTimeout(function () { tone(880, 110, { volume: .05 }); }, 90); },
    error: function () { tone(220, 160, { type: "triangle", volume: .06, slideTo: 160 }); },
    warning: function () { tone(440, 110, { type: "triangle", volume: .05 }); },
    click: function () { tone(720, 35, { volume: .03 }); }
  };
  window.__stellarionPlaySound1703 = function (name) { try { if (SOUNDS[name]) SOUNDS[name](); } catch (e) {} };

  // --- Branchement sur stToast (patch 1700) : un son seulement pour les
  // évènements marquants (succès/erreur/avertissement), jamais pour "info"
  // qui est de loin la catégorie la plus fréquente.
  function wireToast() {
    var orig = window.stToast;
    if (typeof orig !== "function" || orig.__st1703) return;
    var wrapped = function (message, type, durationMs) {
      var out = orig.apply(this, arguments);
      var t = type || (function () {
        try { return /❌|erreur|impossible|échec|échoué|refus/i.test(String(message)) ? "error" : /✅|créé|reussi|réussi|succès|confirmé/i.test(String(message)) ? "success" : "info"; }
        catch (e) { return "info"; }
      })();
      if (t === "success" || t === "error" || t === "warning") window.__stellarionPlaySound1703(t);
      return out;
    };
    wrapped.__st1703 = true;
    window.stToast = wrapped;
  }

  // --- Clic doux sur les actions importantes uniquement (pas tous les
  // boutons du jeu : un blip sur chaque clic d'une liste de 40 membres
  // d'alliance serait vite insupportable).
  var IMPORTANT_SEL = ".btn-gold, .st-confirm-ok, .st-confirm-cancel, .st-onboard-next, .st-onboard-goto, #auth-submit";
  document.addEventListener("click", function (ev) {
    try {
      if (ev.target && ev.target.closest && ev.target.closest(IMPORTANT_SEL)) window.__stellarionPlaySound1703("click");
    } catch (e) {}
  }, true);

  // --- Bouton mute/unmute, discret, empilé avec le bouton tutoriel.
  function injectCss() {
    if (document.getElementById("st-sound-css")) return;
    var s = document.createElement("style");
    s.id = "st-sound-css";
    s.textContent =
      "#st-sound-toggle{position:fixed;left:12px;bottom:110px;z-index:610;width:34px;height:34px;border-radius:50%;border:1px solid rgba(79,195,247,.35);background:rgba(4,11,24,.92);color:#9fd4f7;font-size:14px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.4)}" +
      "body.stR2 #st-sound-toggle{bottom:156px}" +
      "body.st-auth-visible #st-sound-toggle{display:none!important}";
    document.head.appendChild(s);
  }
  function ensureToggle() {
    if (document.getElementById("st-sound-toggle") || !document.body) return;
    injectCss();
    var b = document.createElement("button");
    b.id = "st-sound-toggle";
    b.type = "button";
    function label() { b.textContent = isMuted() ? "🔇" : "🔊"; b.title = isMuted() ? "Sons coupés (cliquer pour réactiver)" : "Sons activés (cliquer pour couper)"; }
    label();
    b.addEventListener("click", function () { setMuted(!isMuted()); label(); if (!isMuted()) window.__stellarionPlaySound1703("click"); });
    document.body.appendChild(b);
  }

  // Filets de securite BORNES (pas des boucles setInterval perpetuelles, pour ne
  // pas reproduire le probleme de rafraichissement permanent deja identifie).
  wireToast();
  [500, 1500, 4000, 9000].forEach(function (t) { setTimeout(wireToast, t); });
  document.addEventListener("DOMContentLoaded", ensureToggle);
  window.addEventListener("load", ensureToggle);
  [1000, 3000, 8000, 15000].forEach(function (t) { setTimeout(ensureToggle, t); });
})();
