/* STELLARION 1.7.01 — Tutoriel de premières minutes.
   Constat de l'audit : aucun onboarding n'existait, un nouveau joueur
   atterrissait directement dans un jeu de gestion complexe (ressources,
   bâtiments, chantier, flottes, alliances) sans aucun guide.
   Additif uniquement : ne touche a aucune donnee de sauvegarde, ne
   modifie aucune fonction existante. Se declenche via le signal
   window.__stellarionIsNewEmpire1701 pose dans main.js -> load() au tout
   premier lancement d'un compte (aucune sauvegarde trouvee = empire
   neuf), avec un flag localStorage pour ne jamais le rejouer de force,
   et un petit bouton "Revoir le tutoriel" pour le rouvrir a la demande. */
(function () {
  "use strict";
  if (window.__stellarionOnboarding1701) return;
  window.__stellarionOnboarding1701 = true;

  var SLIDES = [
    {
      title: "Bienvenue, Commandant",
      body: "Quelques secondes pour repérer les commandes essentielles avant de lancer ton empire spatial."
    },
    {
      title: "Tes ressources",
      body: "En haut de l'écran : Titane, Xénite, Antimatière et Fragments premium. Elles se produisent automatiquement selon le niveau de tes bâtiments — regarde-les grimper au fil du temps.",
      highlight: ".stable-resourcebar1542b"
    },
    {
      title: "Navigue entre les pages",
      body: "Ces onglets t'emmènent partout : Bâtiments pour développer ta planète, Chantier/Flotte pour construire des vaisseaux, Galaxie pour explorer et attaquer, Alliance pour rejoindre d'autres joueurs.",
      highlight: ".carousel-container"
    },
    {
      title: "Premier réflexe",
      body: "Commence par améliorer tes mines de ressources dans l'onglet Bâtiments : c'est ce qui fait progresser toute ton économie.",
      action: { label: "Aller à Bâtiments", page: "buildings" }
    },
    {
      title: "Rejoins une Alliance",
      body: "Dès que possible, rejoins ou crée une Alliance : protection mutuelle, banque commune, coups de main entre membres — c'est un vrai moteur de ce type de jeu.",
      action: { label: "Voir les Alliances", page: "alliance" }
    },
    {
      title: "Tu es prêt",
      body: "Tu peux revoir ce tutoriel à tout moment via le bouton \"?\" en bas de l'écran. Bon jeu, Commandant !"
    }
  ];

  function injectCss() {
    if (document.getElementById("st-onboard-css")) return;
    var css =
      "#st-onboard-back{position:fixed;inset:0;z-index:2147483635;background:rgba(1,4,12,.72);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .18s ease}" +
      "#st-onboard-back.st-in{opacity:1}" +
      ".st-onboard-card{width:min(420px,100%);background:linear-gradient(180deg,rgba(9,20,40,.98),rgba(4,10,22,.99));border:1px solid rgba(79,195,247,.35);border-radius:20px;padding:26px 24px 20px;box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 46px rgba(79,195,247,.12);color:#eaf6ff;font-family:Inter,\"Segoe UI\",Arial,sans-serif;transform:translateY(10px);transition:transform .18s ease}" +
      "#st-onboard-back.st-in .st-onboard-card{transform:translateY(0)}" +
      ".st-onboard-step{color:#7fa5c7;font:700 11px system-ui,Arial;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}" +
      ".st-onboard-card h2{margin:0 0 10px;font:800 20px system-ui,Arial;color:#4FC3F7}" +
      ".st-onboard-card p{margin:0 0 20px;font-size:14.5px;line-height:1.5;color:#dbeafe}" +
      ".st-onboard-dots{display:flex;gap:6px;justify-content:center;margin-bottom:16px}" +
      ".st-onboard-dots span{width:6px;height:6px;border-radius:50%;background:rgba(79,195,247,.25)}" +
      ".st-onboard-dots span.on{background:#4FC3F7;box-shadow:0 0 6px #4FC3F7}" +
      ".st-onboard-actions{display:flex;gap:10px;align-items:center}" +
      ".st-onboard-actions button{border:0;border-radius:11px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;padding:11px 14px}" +
      ".st-onboard-skip{background:transparent;color:#7fa5c7}" +
      ".st-onboard-next{flex:1;background:linear-gradient(135deg,#4FC3F7,#3a8fd4);color:#04162e}" +
      ".st-onboard-goto{flex:1;background:rgba(255,213,79,.14);color:#FFD54F;border:1px solid rgba(255,213,79,.4)!important}" +
      ".st-onboard-highlight{outline:2px solid #4FC3F7;outline-offset:3px;border-radius:14px;box-shadow:0 0 0 5000px rgba(1,4,12,.55);transition:outline-color .2s ease}" +
      "#st-onboard-reopen{position:fixed;left:12px;bottom:66px;z-index:610;width:34px;height:34px;border-radius:50%;border:1px solid rgba(79,195,247,.35);background:rgba(4,11,24,.92);color:#9fd4f7;font:800 14px system-ui,Arial;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.4)}" +
      "body.stR2 #st-onboard-reopen{bottom:112px}" +
      "body.st-auth-visible #st-onboard-reopen{display:none!important}";
    var s = document.createElement("style");
    s.id = "st-onboard-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function clearHighlight() {
    var prev = document.querySelector(".st-onboard-highlight");
    if (prev) prev.classList.remove("st-onboard-highlight");
  }

  function applyHighlight(sel) {
    clearHighlight();
    if (!sel) return;
    try {
      var el = document.querySelector(sel);
      if (el) el.classList.add("st-onboard-highlight");
    } catch (e) {}
  }

  function goPage(pageId) {
    try { if (typeof window.carouselGoToPage === "function") window.carouselGoToPage(pageId); } catch (e) {}
  }

  function userKey() {
    try { return (window.currentUser && window.currentUser.id) ? String(window.currentUser.id) : "anon"; } catch (e) { return "anon"; }
  }
  function seenKey() { return "st_onboard_seen_" + userKey(); }
  function markSeen() { try { localStorage.setItem(seenKey(), "1"); } catch (e) {} }
  function hasSeen() { try { return localStorage.getItem(seenKey()) === "1"; } catch (e) { return false; } }

  var idx = 0;
  var backEl = null;

  function render() {
    if (!backEl) return;
    var slide = SLIDES[idx];
    var card = backEl.querySelector(".st-onboard-card");
    var isLast = idx === SLIDES.length - 1;
    card.innerHTML =
      '<div class="st-onboard-step"></div>' +
      "<h2></h2><p></p>" +
      '<div class="st-onboard-dots"></div>' +
      '<div class="st-onboard-actions">' +
        '<button type="button" class="st-onboard-skip">Passer</button>' +
        (slide.action ? '<button type="button" class="st-onboard-goto"></button>' : "") +
        '<button type="button" class="st-onboard-next"></button>' +
      "</div>";
    card.querySelector(".st-onboard-step").textContent = "Étape " + (idx + 1) + " / " + SLIDES.length;
    card.querySelector("h2").textContent = slide.title;
    card.querySelector("p").textContent = slide.body;
    var dots = card.querySelector(".st-onboard-dots");
    SLIDES.forEach(function (_, i) {
      var d = document.createElement("span");
      if (i === idx) d.className = "on";
      dots.appendChild(d);
    });
    card.querySelector(".st-onboard-skip").addEventListener("click", close);
    if (slide.action) {
      var gotoBtn = card.querySelector(".st-onboard-goto");
      gotoBtn.textContent = slide.action.label;
      gotoBtn.addEventListener("click", function () { goPage(slide.action.page); });
    }
    var nextBtn = card.querySelector(".st-onboard-next");
    nextBtn.textContent = isLast ? "C'est parti" : "Suivant";
    nextBtn.addEventListener("click", function () { if (isLast) { close(); } else { idx++; render(); } });
    applyHighlight(slide.highlight);
  }

  function open(fromReplay) {
    injectCss();
    idx = 0;
    if (!backEl) {
      backEl = document.createElement("div");
      backEl.id = "st-onboard-back";
      backEl.innerHTML = '<div class="st-onboard-card"></div>';
      document.body.appendChild(backEl);
    }
    render();
    requestAnimationFrame(function () { backEl.classList.add("st-in"); });
    if (!fromReplay) markSeen();
  }

  function close() {
    clearHighlight();
    markSeen();
    if (backEl) {
      backEl.classList.remove("st-in");
      setTimeout(function () { try { backEl.remove(); backEl = null; } catch (e) {} }, 200);
    }
  }

  function ensureReopenButton() {
    if (document.getElementById("st-onboard-reopen") || !document.body) return;
    injectCss();
    var b = document.createElement("button");
    b.id = "st-onboard-reopen";
    b.type = "button";
    b.title = "Revoir le tutoriel";
    b.textContent = "?";
    b.addEventListener("click", function () { open(true); });
    document.body.appendChild(b);
  }

  function authVisible() {
    var a = document.getElementById("auth-screen");
    if (!a) return false;
    var cs = getComputedStyle(a);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  var tries = 0;
  function maybeAutoOpen() {
    tries++;
    if (authVisible()) { if (tries < 200) setTimeout(maybeAutoOpen, 300); return; }
    if (!document.querySelector(".stable-resourcebar1542b") || !document.querySelector(".carousel-container")) {
      if (tries < 200) setTimeout(maybeAutoOpen, 300);
      return;
    }
    ensureReopenButton();
    if (window.__stellarionIsNewEmpire1701 && !hasSeen()) {
      open(false);
    }
  }

  document.addEventListener("DOMContentLoaded", function () { setTimeout(maybeAutoOpen, 400); });
  window.addEventListener("load", function () { setTimeout(maybeAutoOpen, 400); });
  // Le bouton "?" vit hors de #app (ajoute directement a document.body), donc les
  // re-rendus du jeu (qui ne touchent que #app) ne le suppriment pas : un filet de
  // securite BORNE suffit, pas une boucle perpetuelle.
  [1000, 3000, 8000, 15000].forEach(function (t) { setTimeout(ensureReopenButton, t); });
})();
