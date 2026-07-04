/* STELLARION 1.6.37 — Correctif mobile universel
   Objectif : rendu propre sur iPhone/Safari/Chrome Android, même si le navigateur
   applique un zoom ou une taille de texte différente.
   - Cache complètement le jeu quand l'écran de connexion est visible.
   - Empêche le carrousel/topbar de passer par-dessus le formulaire.
   - Rend la barre ressources compacte et scrollable horizontalement sur mobile.
   - Force la zone centrale du jeu en plein écran utile sur mobile.
*/
(function () {
  "use strict";
  if (window.__stellarionMobileLayout1637) return;
  window.__stellarionMobileLayout1637 = true;

  function ensureViewport() {
    var meta = document.querySelector("meta[name='viewport']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, viewport-fit=cover"
    );
    try {
      document.documentElement.style.webkitTextSizeAdjust = "100%";
      document.body.style.webkitTextSizeAdjust = "100%";
    } catch (e) {}
  }

  function isMobileLike() {
    return window.matchMedia("(pointer: coarse)").matches ||
      Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 820 ||
      /iphone|ipad|ipod|android/i.test(navigator.userAgent || "");
  }

  function authVisible() {
    var auth = document.getElementById("auth-screen");
    if (!auth) return false;
    var cs = getComputedStyle(auth);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }

  function applyClasses() {
    var m = isMobileLike();
    document.documentElement.classList.toggle("st-mobile1637", m);
    document.body.classList.toggle("st-mobile1637", m);
    document.body.classList.toggle("st-mobile-landscape1637", m && window.innerWidth > window.innerHeight);
    document.body.classList.toggle("st-mobile-auth1637", m && authVisible());
  }

  function injectCss() {
    if (document.getElementById("stellarion-mobile-layout-1637-css")) return;
    var style = document.createElement("style");
    style.id = "stellarion-mobile-layout-1637-css";
    style.textContent = `
html.st-mobile1637, html.st-mobile1637 body{
  width:100%;
  min-width:0!important;
  max-width:100vw!important;
  overflow-x:hidden!important;
  -webkit-text-size-adjust:100%!important;
  text-size-adjust:100%!important;
}

/* Connexion : le jeu ne doit jamais rester visible derrière */
body.st-mobile-auth1637 #app,
body.st-mobile-auth1637 .topbar,
body.st-mobile-auth1637 .carousel-container,
body.st-mobile-auth1637 .stable-resourcebar1542b,
body.st-mobile-auth1637 .layout,
body.st-mobile-auth1637 .bottom-queue,
body.st-mobile-auth1637 .queue-dock,
body.st-mobile-auth1637 .notification-center{
  display:none!important;
  visibility:hidden!important;
  pointer-events:none!important;
}

body.st-mobile1637 #auth-screen{
  z-index:2147483000!important;
  inset:0!important;
  min-height:100dvh!important;
  width:100vw!important;
  overflow:auto!important;
  padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))!important;
  box-sizing:border-box!important;
  align-items:center!important;
  justify-content:center!important;
}

body.st-mobile1637 #auth-screen > div{
  width:min(420px,94vw)!important;
  max-width:94vw!important;
  padding:10px!important;
  margin:auto!important;
  box-sizing:border-box!important;
}

body.st-mobile-landscape1637 #auth-screen{
  align-items:flex-start!important;
  justify-content:center!important;
}

body.st-mobile-landscape1637 #auth-screen > div{
  transform:scale(.88)!important;
  transform-origin:top center!important;
}

/* Topbar : compacte, non destructrice */
body.st-mobile1637 .topbar{
  position:sticky!important;
  top:0!important;
  z-index:80!important;
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
  min-height:44px!important;
  height:auto!important;
  max-width:100vw!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  padding:6px 8px!important;
  box-sizing:border-box!important;
  scrollbar-width:none!important;
}

body.st-mobile1637 .topbar::-webkit-scrollbar,
body.st-mobile1637 .carousel-pages::-webkit-scrollbar,
body.st-mobile1637 .stable-resource-list1542b::-webkit-scrollbar{
  display:none!important;
}

body.st-mobile1637 .topbar-brand1512{
  flex:0 0 auto!important;
  min-width:150px!important;
  max-width:170px!important;
}

body.st-mobile1637 .topbar-brand1512 .brand{
  font-size:17px!important;
  letter-spacing:3px!important;
  white-space:nowrap!important;
}

body.st-mobile1637 .topbar-brand1512 .small{
  font-size:10px!important;
  line-height:1.15!important;
  white-space:nowrap!important;
}

body.st-mobile1637 .carousel-container{
  flex:1 0 auto!important;
  min-width:0!important;
  max-width:calc(100vw - 170px)!important;
  height:44px!important;
  padding:4px!important;
  overflow:hidden!important;
}

body.st-mobile1637 .carousel-pages{
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  max-width:100%!important;
  height:100%!important;
  scroll-snap-type:none!important;
}

body.st-mobile1637 .carousel-page,
body.st-mobile1637 .carousel-nav-btn{
  flex:0 0 auto!important;
  min-height:34px!important;
  height:34px!important;
  padding:0 10px!important;
  font-size:12px!important;
  white-space:nowrap!important;
}

/* Barre ressources : le bug vu sur les captures vient surtout d'elle */
body.st-mobile1637 .stable-resourcebar1542b{
  position:relative!important;
  z-index:40!important;
  width:100vw!important;
  max-width:100vw!important;
  margin:0!important;
  padding:6px 8px!important;
  box-sizing:border-box!important;
  border-left:0!important;
  border-right:0!important;
  border-radius:0!important;
  overflow:hidden!important;
}

body.st-mobile1637 .stable-resource-list1542b{
  display:flex!important;
  flex-wrap:nowrap!important;
  gap:7px!important;
  width:100%!important;
  max-width:100%!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  padding:0!important;
  box-sizing:border-box!important;
}

body.st-mobile1637 .stable-res1542b{
  flex:0 0 118px!important;
  min-width:118px!important;
  max-width:118px!important;
  min-height:48px!important;
  padding:7px 8px!important;
  box-sizing:border-box!important;
  display:grid!important;
  grid-template-columns:26px minmax(0,1fr)!important;
  gap:7px!important;
  align-items:center!important;
}

body.st-mobile1637 .stable-res-ico1542b{
  font-size:20px!important;
  line-height:1!important;
}

body.st-mobile1637 .stable-res1542b small{
  font-size:10px!important;
  line-height:1.1!important;
  white-space:nowrap!important;
}

body.st-mobile1637 .stable-res1542b strong{
  font-size:16px!important;
  line-height:1.1!important;
  white-space:nowrap!important;
}

body.st-mobile1637 .stable-clock1542b{
  display:none!important;
}

body.st-mobile1637 .fragment-shop-entry1546{
  display:block!important;
  width:100%!important;
  min-height:22px!important;
  height:22px!important;
  margin-top:4px!important;
  padding:0 6px!important;
  border-radius:7px!important;
  font-size:10px!important;
  line-height:22px!important;
}

/* Layout jeu : pas de colonnes desktop écrasées sur téléphone */
body.st-mobile1637 .layout,
body.st-mobile1637 .layout.has-bottom-queue,
body.st-mobile1637 body.stable-ui1542b .layout{
  display:block!important;
  width:100vw!important;
  max-width:100vw!important;
  height:calc(100dvh - 112px)!important;
  min-height:0!important;
  overflow:hidden!important;
  padding:0!important;
  margin:0!important;
  box-sizing:border-box!important;
}

body.st-mobile1637 .layout > .side,
body.st-mobile1637 .layout > .side.right{
  display:none!important;
}

body.st-mobile1637 #center{
  width:100vw!important;
  max-width:100vw!important;
  height:100%!important;
  min-height:0!important;
  overflow:auto!important;
  box-sizing:border-box!important;
  -webkit-overflow-scrolling:touch!important;
}

body.st-mobile1637 .gwm-stage{
  width:100%!important;
  max-width:100vw!important;
  height:100%!important;
  min-height:360px!important;
  overflow:hidden!important;
}

body.st-mobile-landscape1637 .stable-resourcebar1542b{
  padding:4px 6px!important;
}

body.st-mobile-landscape1637 .stable-res1542b{
  flex-basis:104px!important;
  min-width:104px!important;
  max-width:104px!important;
  min-height:42px!important;
  padding:5px 6px!important;
}

body.st-mobile-landscape1637 .stable-res1542b strong{
  font-size:14px!important;
}

body.st-mobile-landscape1637 .fragment-shop-entry1546{
  min-height:20px!important;
  height:20px!important;
  line-height:20px!important;
}

/* Évite les panneaux énormes qui débordent dans Safari mobile */
body.st-mobile1637 .card,
body.st-mobile1637 .panel{
  max-width:100%!important;
  box-sizing:border-box!important;
}

body.st-mobile1637 input,
body.st-mobile1637 textarea,
body.st-mobile1637 select,
body.st-mobile1637 button{
  font-size:16px!important; /* évite le zoom auto iOS sur focus */
}
`;
    document.head.appendChild(style);
  }

  function install() {
    ensureViewport();
    injectCss();
    applyClasses();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
  window.addEventListener("resize", function(){ setTimeout(applyClasses, 80); }, { passive:true });
  window.addEventListener("orientationchange", function(){ setTimeout(applyClasses, 250); }, { passive:true });

  var obs = new MutationObserver(function(){ applyClasses(); });
  try {
    obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["style","class"] });
  } catch (e) {}

  var oldRender = window.render;
  if (typeof oldRender === "function" && !oldRender.__mobile1637) {
    var wrapped = function () {
      var out = oldRender.apply(this, arguments);
      setTimeout(applyClasses, 0);
      setTimeout(applyClasses, 120);
      return out;
    };
    wrapped.__mobile1637 = true;
    window.render = wrapped;
    try { render = wrapped; } catch (e) {}
  }

  window.stellarionMobileAudit1637 = function () {
    return {
      patch: "mobile-layout-1.6.37",
      mobile: isMobileLike(),
      landscape: window.innerWidth > window.innerHeight,
      authVisible: authVisible(),
      bodyClass: document.body.className,
      width: window.innerWidth,
      height: window.innerHeight
    };
  };
})();
