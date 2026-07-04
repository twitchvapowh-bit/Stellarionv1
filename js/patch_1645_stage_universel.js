/* STELLARION 1.6.45 — SCÈNE UNIVERSELLE (résolution fixe + échelle).
   OBJECTIF : tous les smartphones affichent EXACTEMENT la même image.
   PRINCIPE (technique standard des jeux HTML5) :
   - Le <body> devient une scène de taille FIXE : 932x430 en paysage,
     430x932 en portrait. Le layout est donc calculé à l'identique partout.
   - JS mesure l'écran réel (visualViewport) et applique transform:scale()
     pour remplir l'écran, centré, avec bandes noires si le ratio diffère.
   - Zoom navigateur, "taille d'affichage" Android, densité, barre d'adresse :
     tout est absorbé par le facteur d'échelle.
   LIMITE ASSUMÉE : la police forcée par l'OS (accessibilité) peut encore
   grossir le texte DANS la scène ; détectée => message au joueur (aucun site
   ne peut neutraliser ce réglage).
   REMPLACE le patch 1644 (ne pas charger les deux). CHARGER EN DERNIER.
   Console :
   - stellarionStageAudit1645()   : état de la scène
   - stellarionStageOff1645()     : désactive (mémorisé) puis recharge
   - stellarionStageOn1645()      : réactive
*/
(function () {
  "use strict";
  if (window.__stellarionStage1645) return;
  window.__stellarionStage1645 = true;

  var DW_L = 932, DH_L = 430;   // design paysage
  var DW_P = 430, DH_P = 932;   // design portrait
  var OFFKEY = "stellarion_stage_off_1645";
  var TOASTKEY = "stellarion_fontwarn_1645";

  function off() {
    try { return localStorage.getItem(OFFKEY) === "1"; } catch (e) { return false; }
  }
  window.stellarionStageOff1645 = function () {
    try { localStorage.setItem(OFFKEY, "1"); } catch (e) {}
    return "Scène désactivée. Recharge la page.";
  };
  window.stellarionStageOn1645 = function () {
    try { localStorage.removeItem(OFFKEY); } catch (e) {}
    return "Scène réactivée. Recharge la page.";
  };

  function phone() {
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") ||
      matchMedia("(pointer:coarse)").matches ||
      Math.min(screen.width, screen.height) <= 900;
  }

  function vw() { return (window.visualViewport && visualViewport.width) || innerWidth; }
  function vh() { return (window.visualViewport && visualViewport.height) || innerHeight; }
  function isPortrait() { return vh() >= vw(); }

  /* ---------- Viewport : device-width, échelle verrouillée ----------
     La normalisation est faite par transform, pas par la balise viewport. */
  var meta = null;
  function ensureViewport() {
    if (!meta || !meta.isConnected) {
      meta = document.querySelector("meta[name='viewport']");
      if (!meta) { meta = document.createElement("meta"); meta.name = "viewport"; document.head.appendChild(meta); }
    }
    var want = phone() && !off()
      ? "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
      : "width=device-width, initial-scale=1.0, viewport-fit=cover";
    if (meta.getAttribute("content") !== want) meta.setAttribute("content", want);
  }

  /* ---------- CSS de la scène + neutralisation des unités viewport ----------
     Les patchs précédents (1643...) utilisent 100vw/100dvh : dans une scène
     transformée, ces unités pointent vers l'écran réel, pas la scène.
     Sélecteurs préfixés html.st-stage1645 => spécificité supérieure, on gagne. */
  function injectCss() {
    if (document.getElementById("stellarion-stage-css-1645")) return;
    var s = document.createElement("style");
    s.id = "stellarion-stage-css-1645";
    s.textContent = `
html.st-stage1645{
  position:fixed!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  overflow:hidden!important;
  background:#020510!important;
}
html.st-stage1645 body{
  position:absolute!important;
  left:0!important;
  top:0!important;
  margin:0!important;
  padding:0!important;
  width:var(--st-dw,932px)!important;
  height:var(--st-dh,430px)!important;
  min-width:0!important;
  max-width:none!important;
  overflow:hidden!important;
  transform-origin:0 0!important;
  transform:translate(var(--st-ox,0px),var(--st-oy,0px)) scale(var(--st-k,1))!important;
  background:#020510!important;
}

/* Remplacement des 100vw/100dvh hérités des patchs mobiles : la scène = 100% */
html.st-stage1645 body .topbar,
html.st-stage1645 body .carousel-container,
html.st-stage1645 body .stable-resourcebar1542b,
html.st-stage1645 body .layout,
html.st-stage1645 body .layout.has-bottom-queue,
html.st-stage1645 body #center,
html.st-stage1645 body .gwm-stage{
  width:100%!important;
  max-width:100%!important;
}
html.st-stage1645 body #auth-screen{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  min-height:100%!important;
  max-width:100%!important;
  overflow:auto!important;
}
html.st-stage1645 body .layout{
  min-height:0!important;
  overflow:hidden!important;
}
html.st-stage1645.st-landscape1645 body .layout,
html.st-stage1645.st-landscape1645 body .layout.has-bottom-queue{
  height:calc(100% - 88px)!important;
}
html.st-stage1645.st-portrait1645 body .layout,
html.st-stage1645.st-portrait1645 body .layout.has-bottom-queue{
  display:block!important;
  height:calc(100% - 120px)!important;
}
html.st-stage1645 body #center{
  height:100%!important;
  overflow:auto!important;
  -webkit-overflow-scrolling:touch!important;
}
html.st-stage1645 body .gwm-stage{
  height:100%!important;
  min-height:0!important;
  overflow:hidden!important;
}
/* Pop-up construction 1632 : bornée à la scène, plus au viewport réel */
html.st-stage1645 body .bpop1632{
  width:min(460px,calc(100% - 20px))!important;
  max-height:calc(100% - 24px)!important;
}
/* Le rail de scroll 1628 n'a plus de scroll fenêtre dans la scène */
html.st-stage1645 body #stellarion-scrollrail1628{display:none!important}
`;
    document.head.appendChild(s);
  }

  /* ---------- Ajustement de l'échelle ---------- */
  function fit() {
    ensureViewport();
    var r = document.documentElement;
    if (!phone() || off()) {
      r.classList.remove("st-stage1645", "st-landscape1645", "st-portrait1645");
      return;
    }
    injectCss();
    var p = isPortrait();
    var dw = p ? DW_P : DW_L;
    var dh = p ? DH_P : DH_L;
    var k = Math.min(vw() / dw, vh() / dh);
    var ox = Math.max(0, (vw() - dw * k) / 2);
    var oy = Math.max(0, (vh() - dh * k) / 2);
    r.style.setProperty("--st-dw", dw + "px");
    r.style.setProperty("--st-dh", dh + "px");
    r.style.setProperty("--st-k", String(k));
    r.style.setProperty("--st-ox", ox.toFixed(2) + "px");
    r.style.setProperty("--st-oy", oy.toFixed(2) + "px");
    r.classList.add("st-stage1645");
    r.classList.toggle("st-portrait1645", p);
    r.classList.toggle("st-landscape1645", !p);
    // Toute la fenêtre reste à scroll 0 : le scroll vit dans #center
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------- Détection police forcée par l'OS (seule limite restante) ---------- */
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
      // La sonde vit dans la scène transformée : on retire le facteur d'échelle.
      var k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--st-k")) || 1;
      return h > 0 ? (h / k) / 100 : 1;
    } catch (e) { return 1; }
  }

  function maybeWarnFontScale() {
    if (!phone() || off()) return;
    try { if (sessionStorage.getItem(TOASTKEY) === "1") return; } catch (e) {}
    var k = measureFontScale();
    if (k <= 1.15) return;
    try { sessionStorage.setItem(TOASTKEY, "1"); } catch (e) {}
    var t = document.createElement("div");
    t.style.cssText =
      "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);" +
      "z-index:2147483646;width:min(420px,92%);box-sizing:border-box;" +
      "background:rgba(6,16,31,.97);border:1px solid rgba(79,195,247,.4);" +
      "border-radius:14px;padding:12px 14px;color:#eaf6ff;" +
      "font:600 12px/1.4 system-ui,Arial;box-shadow:0 10px 40px rgba(0,0,0,.6)";
    t.innerHTML =
      "<b style='color:#4FC3F7'>Affichage STELLARION</b><br>" +
      "Ton téléphone force une taille de texte agrandie (x" + k.toFixed(2) + "). " +
      "Pour un affichage optimal, remets la taille de police par défaut " +
      "(Android : Paramètres &gt; Affichage &gt; Taille de police).<br>" +
      "<button type='button' style='margin-top:8px;padding:8px 12px;border:0;" +
      "border-radius:9px;background:#4FC3F7;color:#04162e;font-weight:800;" +
      "cursor:pointer'>OK</button>";
    t.querySelector("button").addEventListener("click", function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    });
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 20000);
  }

  /* ---------- Boot ---------- */
  fit();
  document.addEventListener("DOMContentLoaded", function () { fit(); maybeWarnFontScale(); });
  window.addEventListener("load", function () { fit(); maybeWarnFontScale(); });
  window.addEventListener("resize", function () { setTimeout(fit, 60); }, { passive: true });
  window.addEventListener("orientationchange", function () { setTimeout(fit, 220); }, { passive: true });
  if (window.visualViewport) {
    try {
      visualViewport.addEventListener("resize", function () { setTimeout(fit, 60); });
      visualViewport.addEventListener("scroll", function () { setTimeout(fit, 60); });
    } catch (e) {}
  }
  // Ré-affirmation continue : d'autres patchs réécrivent viewport/classes.
  setInterval(fit, 900);
  if (document.body) maybeWarnFontScale();

  window.stellarionStageAudit1645 = function () {
    var cs = getComputedStyle(document.documentElement);
    return {
      patch: "stage-universel-1.6.45",
      actif: document.documentElement.classList.contains("st-stage1645"),
      desactive: off(),
      design: cs.getPropertyValue("--st-dw").trim() + " x " + cs.getPropertyValue("--st-dh").trim(),
      echelle: cs.getPropertyValue("--st-k").trim(),
      ecranReel: vw() + " x " + vh(),
      portrait: isPortrait(),
      fontScaleOS: measureFontScale(),
      dpr: devicePixelRatio
    };
  };
})();
