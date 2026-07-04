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

/* STELLARION 1.6.28 — Rail de scroll tactile à droite de chaque page.
   iOS/Android masquent les barres natives : on injecte un rail fixe avec
   un curseur glissable au doigt. Suit le scroll de la page, se masque
   automatiquement quand la page tient dans l'écran. */
(function () {
  "use strict";
  if (window.__stellarionScrollRail1628) return;
  window.__stellarionScrollRail1628 = true;

  var rail = null, thumb = null, dragging = false, dragStartY = 0, dragStartScroll = 0;

  function docH() {
    var d = document.documentElement, b = document.body;
    return Math.max(d ? d.scrollHeight : 0, b ? b.scrollHeight : 0);
  }
  function maxScroll() { return Math.max(0, docH() - window.innerHeight); }

  function ensureRail() {
    if (rail || !document.body) return;
    rail = document.createElement("div");
    rail.id = "stellarion-scrollrail1628";
    thumb = document.createElement("div");
    thumb.className = "thumb";
    rail.appendChild(thumb);
    document.body.appendChild(rail);

    // Glisser le curseur (ou taper le rail) => scroll proportionnel
    rail.addEventListener("pointerdown", function (e) {
      dragging = true;
      rail.classList.add("dragging");
      rail.setPointerCapture && rail.setPointerCapture(e.pointerId);
      dragStartY = e.clientY;
      dragStartScroll = window.scrollY;
      // Tap direct sur le rail (hors curseur) : saute à la position
      if (e.target === rail) {
        var r = rail.getBoundingClientRect();
        var ratio = (e.clientY - r.top) / Math.max(1, r.height);
        window.scrollTo(0, ratio * maxScroll());
        dragStartScroll = window.scrollY;
      }
      e.preventDefault();
      e.stopPropagation();
    });
    rail.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var r = rail.getBoundingClientRect();
      var deltaRatio = (e.clientY - dragStartY) / Math.max(1, r.height);
      window.scrollTo(0, dragStartScroll + deltaRatio * docH());
      e.preventDefault();
      e.stopPropagation();
    });
    function endDrag() { dragging = false; if (rail) rail.classList.remove("dragging"); }
    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
  }

  function update() {
    if (!rail) return;
    var ms = maxScroll();
    if (ms < 40) {
      rail.classList.remove("visible");
      document.body.classList.remove("stellarion-has-rail1628");
      return;
    }
    rail.classList.add("visible");
    document.body.classList.add("stellarion-has-rail1628");

    var railH = rail.getBoundingClientRect().height || 1;
    var thumbH = Math.max(44, railH * (window.innerHeight / Math.max(1, docH())));
    var topMax = railH - thumbH;
    var top = topMax * (window.scrollY / ms);
    thumb.style.height = thumbH + "px";
    thumb.style.top = Math.min(topMax, Math.max(0, top)) + "px";
  }

  function boot() {
    ensureRail();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    // Le contenu change à chaque render() : on resynchronise régulièrement
    setInterval(update, 700);
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
