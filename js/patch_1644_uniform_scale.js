/* STELLARION 1.6.44 — Rendu uniforme multi-téléphones (fix "taille de police").
   PROBLÈME : chaque joueur a des réglages différents (taille de police Android,
   taille d'affichage, zoom Chrome/Safari). Résultat : le pixel CSS n'a pas la
   même valeur chez tout le monde => le layout casse chez certains.
   SOLUTION :
   1) Viewport LOGIQUE FIXE sur téléphone : la page est toujours calculée à
      932px de large en paysage (430px en portrait), et le navigateur la met
      à l'échelle physiquement. Même layout chez tout le monde, quel que soit
      l'écran, le zoom ou la densité.
   2) Détection de l'inflation de police forcée par l'OS (accessibilité) :
      si détectée (>15%), un message une fois par session invite le joueur à
      remettre la taille de texte par défaut (seul réglage qu'un site ne peut
      pas neutraliser).
   3) Réglage fin manuel : stellarionSetScale1644(0.9) (mémorisé).
   CHARGER CE PATCH EN DERNIER : il doit gagner sur les autres patchs qui
   réécrivent la balise viewport (1637/1641/1642/1643).
   Console : stellarionUniformAudit1644()
*/
(function () {
  "use strict";
  if (window.__stellarionUniformScale1644) return;
  window.__stellarionUniformScale1644 = true;

  var DESIGN_W_LANDSCAPE = 932; // largeur logique du jeu en paysage
  var DESIGN_W_PORTRAIT = 430;  // largeur logique en portrait
  var ZKEY = "stellarion_user_zoom_1644";
  var TOASTKEY = "stellarion_fontwarn_1644";

  function phone() {
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") ||
      matchMedia("(pointer:coarse)").matches ||
      Math.min(innerWidth, innerHeight) <= 900;
  }

  function isPortrait() {
    try { return matchMedia("(orientation:portrait)").matches; }
    catch (e) { return innerHeight >= innerWidth; }
  }

  /* ---------- 1) Viewport logique fixe ---------- */
  var meta = null;

  function desiredContent() {
    if (!phone()) return "width=device-width, initial-scale=1.0, viewport-fit=cover";
    var w = isPortrait() ? DESIGN_W_PORTRAIT : DESIGN_W_LANDSCAPE;
    // width fixe => le navigateur calcule lui-même l'échelle pour remplir
    // l'écran : layout identique sur tous les téléphones.
    return "width=" + w + ", viewport-fit=cover";
  }

  function ensureViewport() {
    if (!meta || !meta.isConnected) {
      meta = document.querySelector("meta[name='viewport']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
      }
    }
    var want = desiredContent();
    if (meta.getAttribute("content") !== want) meta.setAttribute("content", want);
  }

  /* ---------- 2) Détection de l'inflation de police OS ----------
     line-height:1 => hauteur du span = taille de police réellement utilisée.
     Si l'OS force un texte agrandi, h/100 > 1. Aucun site ne peut neutraliser
     ce réglage : on prévient le joueur, une fois par session. */
  function measureFontScale() {
    try {
      if (!document.body) return 1;
      var probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;left:-9999px;top:0;font:100px/1 Arial,sans-serif;" +
        "padding:0;margin:0;border:0;visibility:hidden;white-space:nowrap;" +
        "-webkit-text-size-adjust:none;text-size-adjust:none";
      probe.textContent = "Hg";
      document.body.appendChild(probe);
      var h = probe.getBoundingClientRect().height;
      probe.parentNode.removeChild(probe);
      return h > 0 ? h / 100 : 1;
    } catch (e) { return 1; }
  }

  function maybeWarnFontScale() {
    if (!phone()) return;
    try { if (sessionStorage.getItem(TOASTKEY) === "1") return; } catch (e) {}
    var k = measureFontScale();
    if (k <= 1.15) return;
    try { sessionStorage.setItem(TOASTKEY, "1"); } catch (e) {}
    var t = document.createElement("div");
    t.id = "stellarion-fontwarn-1644";
    t.style.cssText =
      "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);" +
      "z-index:2147483646;width:min(420px,92vw);box-sizing:border-box;" +
      "background:rgba(6,16,31,.97);border:1px solid rgba(79,195,247,.4);" +
      "border-radius:14px;padding:12px 14px;color:#eaf6ff;" +
      "font:600 12px/1.4 system-ui,Arial;box-shadow:0 10px 40px rgba(0,0,0,.6)";
    t.innerHTML =
      "<b style='color:#4FC3F7'>Affichage STELLARION</b><br>" +
      "Ton téléphone force une taille de texte agrandie (x" + k.toFixed(2) + "). " +
      "Pour un affichage optimal, remets la taille de police par défaut " +
      "(Android : Paramètres &gt; Affichage &gt; Taille de police — " +
      "Chrome : Paramètres &gt; Accessibilité).<br>" +
      "<button type='button' style='margin-top:8px;padding:8px 12px;border:0;" +
      "border-radius:9px;background:#4FC3F7;color:#04162e;font-weight:800;" +
      "cursor:pointer'>OK</button>";
    t.querySelector("button").addEventListener("click", function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    });
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 20000);
  }

  /* ---------- 3) Réglage fin manuel (mémorisé) ---------- */
  function userZoom() {
    try {
      var v = parseFloat(localStorage.getItem(ZKEY));
      return (v >= 0.5 && v <= 1.5) ? v : 1;
    } catch (e) { return 1; }
  }

  function applyZoom() {
    var z = userZoom();
    try { document.documentElement.style.zoom = (z === 1) ? "" : String(z); } catch (e) {}
  }

  window.stellarionSetScale1644 = function (z) {
    z = Number(z);
    if (!(z >= 0.5 && z <= 1.5)) return "Usage : stellarionSetScale1644(0.9) — valeur entre 0.5 et 1.5.";
    try { localStorage.setItem(ZKEY, String(z)); } catch (e) {}
    applyZoom();
    return "Échelle " + z + " appliquée et mémorisée.";
  };
  window.stellarionResetScale1644 = function () {
    try { localStorage.removeItem(ZKEY); } catch (e) {}
    applyZoom();
    return "Échelle par défaut restaurée.";
  };

  /* ---------- Boot ---------- */
  function apply() {
    ensureViewport();
    applyZoom();
  }

  apply();
  document.addEventListener("DOMContentLoaded", function () { apply(); maybeWarnFontScale(); });
  window.addEventListener("load", function () { apply(); maybeWarnFontScale(); });
  window.addEventListener("resize", function () { setTimeout(apply, 80); }, { passive: true });
  window.addEventListener("orientationchange", function () { setTimeout(apply, 250); }, { passive: true });
  // Les patchs 1637/1641/1642/1643 réécrivent la balise viewport à leur boot :
  // on ré-affirme la nôtre en continu (coût négligeable, écriture seulement si différent).
  setInterval(apply, 800);
  if (document.body) maybeWarnFontScale();

  window.stellarionUniformAudit1644 = function () {
    return {
      patch: "uniform-scale-1.6.44",
      viewport: meta && meta.getAttribute("content"),
      phone: phone(),
      portrait: isPortrait(),
      innerW: innerWidth,
      innerH: innerHeight,
      dpr: devicePixelRatio,
      fontScale: measureFontScale(),
      userZoom: userZoom()
    };
  };
})();
