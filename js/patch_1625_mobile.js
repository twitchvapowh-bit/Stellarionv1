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

  function isTouchDevice() {
    if (navigator.maxTouchPoints > 0) return true;
    if ("ontouchstart" in window) return true;
    try { return window.matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (e) { return false; }
  }
  function isPortrait() {
    try { return window.matchMedia("(orientation: portrait)").matches; } catch (e) {}
    return window.innerHeight > window.innerWidth;
  }
  function isDismissed() {
    try { return sessionStorage.getItem("stellarionRotateDismissed1626") === "1"; } catch (e) { return false; }
  }

  function ensureOverlay() {
    if (!document.body) return null;
    var overlay = document.getElementById("stellarion-rotate1626");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "stellarion-rotate1626";
    overlay.innerHTML =
      '<div class="sr1626-inner">' +
        '<div class="sr1626-phone"></div>' +
        '<div class="sr1626-title">TOURNE TON T\u00c9L\u00c9PHONE</div>' +
        '<div class="sr1626-text">STELLARION se joue en mode paysage pour profiter de toute la galaxie.</div>' +
        '<button type="button" class="sr1626-btn" id="sr1626-skip">Continuer en portrait</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var btn = overlay.querySelector("#sr1626-skip");
    if (btn) btn.addEventListener("click", function () {
      document.body.classList.add("stellarion-rotate-dismissed1626");
      overlay.classList.remove("sr1626-show");
      try { sessionStorage.setItem("stellarionRotateDismissed1626", "1"); } catch (e) {}
    });
    return overlay;
  }

  function refresh() {
    if (!isTouchDevice()) return;
    var overlay = ensureOverlay();
    if (!overlay) return;
    if (isDismissed()) {
      document.body.classList.add("stellarion-rotate-dismissed1626");
      overlay.classList.remove("sr1626-show");
      return;
    }
    // Téléphone uniquement (le petit côté de l'écran < 620px), pas les tablettes
    var phoneSized = Math.min(window.innerWidth, window.innerHeight) < 620;
    if (isPortrait() && phoneSized) overlay.classList.add("sr1626-show");
    else overlay.classList.remove("sr1626-show");
  }

  function boot() {
    refresh();
    window.addEventListener("resize", refresh, { passive: true });
    try { window.matchMedia("(orientation: portrait)").addEventListener("change", refresh); } catch (e) {}
    setInterval(refresh, 1200); // réinjection si un render l'efface
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();

/* STELLARION 1.6.29 — Rail de scroll tactile (v2 : drag gelé, mapping 1:1).
   Corrige le curseur qui changeait de taille pendant le drag :
   - la barre d'adresse mobile modifie innerHeight en plein scroll ;
     => toutes les dimensions sont GELÉES au pointerdown, aucun recalcul
        de taille tant que le doigt est posé.
   - le déplacement doigt->scroll est mappé sur la course réelle du rail
     (railH - thumbH), donc le curseur reste exactement sous le doigt. */
(function () {
  "use strict";
  if (window.__stellarionScrollRail1628) return;
  window.__stellarionScrollRail1628 = true;

  var rail = null, thumb = null;
  var dragging = false;
  var frozen = null;        // {railTop, railH, thumbH, travel, maxScroll, grabOffset}
  var lastThumbH = 0;

  function docH() {
    var d = document.documentElement, b = document.body;
    return Math.max(d ? d.scrollHeight : 0, b ? b.scrollHeight : 0);
  }
  function viewH() {
    var d = document.documentElement;
    return (d && d.clientHeight) || window.innerHeight;
  }
  function maxScroll() { return Math.max(0, docH() - viewH()); }

  function setThumb(topPx, heightPx) {
    if (heightPx != null) thumb.style.height = heightPx + "px";
    thumb.style.transform = "translateY(" + topPx + "px)";
  }

  function ensureRail() {
    if (rail || !document.body) return;
    rail = document.createElement("div");
    rail.id = "stellarion-scrollrail1628";
    thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.style.top = "0px"; // position via transform uniquement
    rail.appendChild(thumb);
    document.body.appendChild(rail);

    rail.addEventListener("pointerdown", function (e) {
      var r = rail.getBoundingClientRect();
      var ms = maxScroll();
      if (ms <= 0) return;
      var thumbH = Math.max(44, r.height * (viewH() / Math.max(1, docH())));
      var travel = Math.max(1, r.height - thumbH);
      var currentTop = travel * (window.scrollY / ms);

      // Tap hors curseur : on centre le curseur sous le doigt
      var pointerY = e.clientY - r.top;
      var onThumb = pointerY >= currentTop && pointerY <= currentTop + thumbH;
      var grabOffset = onThumb ? (pointerY - currentTop) : thumbH / 2;

      // GEL de toutes les dimensions pour toute la durée du drag
      frozen = { railTop: r.top, railH: r.height, thumbH: thumbH, travel: travel, maxScroll: ms, grabOffset: grabOffset };
      dragging = true;
      rail.classList.add("dragging");
      rail.setPointerCapture && rail.setPointerCapture(e.pointerId);

      moveTo(e.clientY);
      e.preventDefault();
      e.stopPropagation();
    });

    rail.addEventListener("pointermove", function (e) {
      if (!dragging || !frozen) return;
      moveTo(e.clientY);
      e.preventDefault();
      e.stopPropagation();
    });

    function endDrag() {
      dragging = false;
      frozen = null;
      if (rail) rail.classList.remove("dragging");
      update(); // resynchronisation propre une fois le doigt levé
    }
    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
  }

  // Position du doigt -> position du curseur (1:1) -> scroll proportionnel.
  // N'utilise QUE les valeurs gelées : zéro recalcul pendant le drag.
  function moveTo(clientY) {
    var f = frozen;
    var top = clientY - f.railTop - f.grabOffset;
    top = Math.min(f.travel, Math.max(0, top));
    setThumb(top, f.thumbH);
    window.scrollTo(0, (top / f.travel) * f.maxScroll);
  }

  function update() {
    if (!rail || dragging) return; // jamais de recalcul pendant le drag
    var ms = maxScroll();
    if (ms < 40) {
      rail.classList.remove("visible");
      document.body.classList.remove("stellarion-has-rail1628");
      return;
    }
    rail.classList.add("visible");
    document.body.classList.add("stellarion-has-rail1628");

    var railH = rail.getBoundingClientRect().height || 1;
    var thumbH = Math.max(44, railH * (viewH() / Math.max(1, docH())));
    // Anti-pulsation : on ne redimensionne que si le changement est notable
    // (la barre d'adresse mobile fait varier la hauteur de quelques px en scroll)
    if (Math.abs(thumbH - lastThumbH) < 8 && lastThumbH > 0) thumbH = lastThumbH;
    lastThumbH = thumbH;

    var travel = Math.max(1, railH - thumbH);
    var top = travel * (window.scrollY / ms);
    setThumb(Math.min(travel, Math.max(0, top)), thumbH);
  }

  function boot() {
    ensureRail();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    setInterval(update, 900);
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
