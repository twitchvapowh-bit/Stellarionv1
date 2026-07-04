/* STELLARION 1.6.25 — Patch mobile : pinch-zoom carte galaxie + boutons zoom tactiles.
   Aucune modification de main.js. Se charge après main.js, comme les autres patches.
   - Pinch (2 doigts) : zoom autour du centre, via gwmSetCameraLocal/gwmSetCamera.
   - Boutons +/- flottants : visibles uniquement sur écrans tactiles (CSS mobile.css).
   - Ne touche pas au pan 1 doigt : il fonctionne déjà via les pointer events de main.js. */
(function () {
  "use strict";
  if (window.__stellarionMobilePatch1625) return;
  window.__stellarionMobilePatch1625 = true;

  var ZMIN = 0.22, ZMAX = 2.4;

  function cam() {
    try { if (typeof gwmCamera === "function") return gwmCamera(); } catch (e) {}
    var s = window.state;
    return (s && s.uiState && (s.uiState.gwmCamera || s.uiState.galaxyCamera)) || { x: 0, y: 0, zoom: 1 };
  }

  function setZoom(z, saveIt) {
    z = Math.min(ZMAX, Math.max(ZMIN, z));
    var c = cam();
    try {
      if (typeof gwmSetCameraLocal === "function") { gwmSetCameraLocal(c.x, c.y, z, { save: !!saveIt }); return; }
    } catch (e) {}
    try {
      if (typeof gwmSetCamera === "function") { gwmSetCamera(c.x, c.y, z); return; }
    } catch (e) {}
  }

  /* ---------- 1) PINCH-ZOOM à deux doigts sur .gwm-stage ----------
     Écouteurs au niveau document (capture) : le stage est recréé à chaque
     render(), on n'a donc rien à réattacher. Quand un 2e doigt se pose,
     on bloque le pan de main.js (stopPropagation) et on gère le pinch. */
  var touches = {};   // pointerId -> {x,y}
  var pinch = null;   // {startDist, startZoom}

  function tCount() { var n = 0; for (var k in touches) n++; return n; }
  function dist() {
    var pts = []; for (var k in touches) pts.push(touches[k]);
    if (pts.length < 2) return 0;
    var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function onStage(ev) {
    return !!(ev.target && ev.target.closest && ev.target.closest(".gwm-stage"));
  }

  document.addEventListener("pointerdown", function (ev) {
    if (ev.pointerType !== "touch" || !onStage(ev)) return;
    touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    if (tCount() === 2) {
      pinch = { startDist: dist(), startZoom: Number(cam().zoom) || 1 };
      // Coupe le pan de main.js pour ce 2e doigt : évite un drag parasite.
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);

  document.addEventListener("pointermove", function (ev) {
    if (ev.pointerType !== "touch" || !(ev.pointerId in touches)) return;
    touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    if (pinch && tCount() >= 2) {
      var d = dist();
      if (pinch.startDist > 10 && d > 10) {
        setZoom(pinch.startZoom * (d / pinch.startDist), false);
      }
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);

  function endTouch(ev) {
    if (ev.pointerType !== "touch") return;
    var wasPinching = !!pinch && (ev.pointerId in touches);
    delete touches[ev.pointerId];
    if (tCount() < 2 && pinch) {
      pinch = null;
      setZoom(Number(cam().zoom) || 1, true); // fige + save
      if (wasPinching) { ev.stopPropagation(); }
    }
  }
  document.addEventListener("pointerup", endTouch, true);
  document.addEventListener("pointercancel", endTouch, true);

  /* ---------- 2) Boutons +/- flottants sur la carte ----------
     Injectés dans .gwm-stage parent ; réinjectés après chaque render()
     via MutationObserver (même mécanique que le patch alliance 1601). */
  function injectZoomButtons() {
    var stage = document.querySelector(".gwm-stage");
    if (!stage || !stage.parentNode) return;
    var host = stage.parentNode;
    if (host.querySelector(".stellarion-mzoom1625")) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    var box = document.createElement("div");
    box.className = "stellarion-mzoom1625";

    var plus = document.createElement("button");
    plus.type = "button"; plus.textContent = "+";
    plus.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      setZoom((Number(cam().zoom) || 1) * 1.25, true);
    });

    var minus = document.createElement("button");
    minus.type = "button"; minus.textContent = "−";
    minus.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      setZoom((Number(cam().zoom) || 1) * 0.8, true);
    });

    box.appendChild(plus);
    box.appendChild(minus);
    host.appendChild(box);
  }

  try {
    var mo = new MutationObserver(function () { injectZoomButtons(); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  injectZoomButtons();
  setInterval(injectZoomButtons, 1500); // filet de sécurité

  /* ---------- 3) Audit ---------- */
  window.stellarionMobileAudit1625 = function () {
    return {
      patch: "mobile-1.6.25",
      zoom: cam().zoom,
      zoomButtons: !!document.querySelector(".stellarion-mzoom1625"),
      activeTouches: tCount(),
      pinching: !!pinch
    };
  };
})();

/* STELLARION 1.6.26 — Invite "tourne ton téléphone" (paysage recommandé).
   Injectée au chargement ; visible seulement en portrait sur téléphone (CSS).
   Disparaît automatiquement en paysage ; bouton pour continuer en portrait
   (choix mémorisé pour la session). */
(function () {
  "use strict";
  if (window.__stellarionRotatePrompt1626) return;
  window.__stellarionRotatePrompt1626 = true;

  function inject() {
    if (document.getElementById("stellarion-rotate1626")) return;
    if (!document.body) return;

    // Choix mémorisé pour la session : ne pas réafficher
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("stellarionRotateDismissed1626") === "1"; } catch (e) {}
    if (dismissed) {
      document.body.classList.add("stellarion-rotate-dismissed1626");
      return;
    }

    var overlay = document.createElement("div");
    overlay.id = "stellarion-rotate1626";
    overlay.innerHTML =
      '<div class="sr1626-inner">' +
        '<div class="sr1626-phone"></div>' +
        '<div class="sr1626-title">TOURNE TON T\u00c9L\u00c9PHONE</div>' +
        '<div class="sr1626-text">STELLARION se joue en mode paysage pour profiter de toute la galaxie.</div>' +
        '<button type="button" class="sr1626-btn" id="sr1626-skip">Continuer en portrait</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var btn = document.getElementById("sr1626-skip");
    if (btn) btn.addEventListener("click", function () {
      document.body.classList.add("stellarion-rotate-dismissed1626");
      try { sessionStorage.setItem("stellarionRotateDismissed1626", "1"); } catch (e) {}
    });
    // En paysage, la media query masque l'overlay toute seule : rien d'autre à faire.
  }

  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);
})();
