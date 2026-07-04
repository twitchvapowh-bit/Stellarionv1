/* STELLARION 1.6.41 — Mobile réel multi-téléphones
   Corrige le problème iPhone 16 Pro Max OK / autres téléphones KO.
   Principe :
   - Page connexion : vraie version mobile, pas le layout jeu derrière.
   - Jeu : portrait interdit sur petits écrans => message propre "tourne ton téléphone".
   - Paysage : compression contrôlée de l'interface, barre ressources scrollable.
*/
(function () {
  "use strict";
  if (window.__stellarionMobileReal1641) return;
  window.__stellarionMobileReal1641 = true;

  function isTouchPhone() {
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") ||
      matchMedia("(pointer: coarse)").matches ||
      Math.min(innerWidth, innerHeight) <= 700;
  }

  function authVisible() {
    var a = document.getElementById("auth-screen");
    if (!a) return false;
    var cs = getComputedStyle(a);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }

  function ensureOverlay() {
    var ov = document.getElementById("stellarion-rotate-overlay-1641");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "stellarion-rotate-overlay-1641";
    ov.innerHTML =
      '<div class="sro-card-1641">' +
      '<div class="sro-title-1641">STELLARION</div>' +
      '<div class="sro-icon-1641">📱↔️</div>' +
      '<h2>Tourne ton téléphone</h2>' +
      '<p>Le jeu est prévu en mode paysage sur mobile pour garder une interface lisible.</p>' +
      '<small>Sur petit écran, le mode portrait écrase la galaxie, les ressources et les menus.</small>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  function injectCss() {
    if (document.getElementById("stellarion-mobile-real-css-1641")) return;
    var st = document.createElement("style");
    st.id = "stellarion-mobile-real-css-1641";
    st.textContent = `
@media (max-width: 980px), (pointer: coarse) {
  html, body {
    margin:0!important;
    width:100%!important;
    max-width:100vw!important;
    min-width:0!important;
    overflow-x:hidden!important;
    -webkit-text-size-adjust:100%!important;
    text-size-adjust:100%!important;
    background:#020510!important;
  }

  * { box-sizing:border-box!important; }

  input, textarea, select, button { font-size:16px!important; }

  /* Connexion propre sur TOUS les téléphones */
  #auth-screen {
    z-index:2147483000!important;
    position:fixed!important;
    inset:0!important;
    width:100vw!important;
    height:100dvh!important;
    min-height:100dvh!important;
    overflow:auto!important;
    padding:16px!important;
    align-items:center!important;
    justify-content:center!important;
  }

  #auth-screen > div {
    width:min(420px,92vw)!important;
    max-width:92vw!important;
    padding:0!important;
    margin:auto!important;
  }

  #auth-screen .brand {
    font-size:clamp(24px,8vw,32px)!important;
    letter-spacing:4px!important;
  }

  #auth-screen input,
  #auth-screen button {
    width:100%!important;
    max-width:100%!important;
    min-height:46px!important;
  }

  body.st-auth-visible-1641 #app,
  body.st-auth-visible-1641 .topbar,
  body.st-auth-visible-1641 .carousel-container,
  body.st-auth-visible-1641 .stable-resourcebar1542b,
  body.st-auth-visible-1641 .layout {
    display:none!important;
    pointer-events:none!important;
  }

  /* Overlay portrait : seulement quand on est connecté / dans le jeu */
  #stellarion-rotate-overlay-1641 {
    display:none;
    position:fixed;
    inset:0;
    z-index:2147482999;
    background:radial-gradient(circle at 50% 20%, #102248, #020510 72%);
    color:#eaf6ff;
    font-family:system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    place-items:center;
    padding:22px;
    text-align:center;
  }

  #stellarion-rotate-overlay-1641 .sro-card-1641 {
    width:min(420px,92vw);
    border:1px solid rgba(79,195,247,.28);
    border-radius:24px;
    background:rgba(6,16,31,.86);
    box-shadow:0 0 60px rgba(79,195,247,.12);
    padding:26px 20px;
  }

  #stellarion-rotate-overlay-1641 .sro-title-1641 {
    color:#4FC3F7;
    font-weight:900;
    letter-spacing:5px;
    font-size:24px;
    margin-bottom:14px;
  }

  #stellarion-rotate-overlay-1641 .sro-icon-1641 {
    font-size:52px;
    margin:8px 0 12px;
  }

  #stellarion-rotate-overlay-1641 h2 {
    margin:8px 0;
    font-size:22px;
  }

  #stellarion-rotate-overlay-1641 p {
    color:#bfd7ef;
    margin:8px 0;
    line-height:1.35;
  }

  #stellarion-rotate-overlay-1641 small {
    display:block;
    color:#7fa5c7;
    margin-top:12px;
    line-height:1.35;
  }

  body.st-phone-portrait-game-1641 #stellarion-rotate-overlay-1641 {
    display:grid!important;
  }

  body.st-phone-portrait-game-1641 #app,
  body.st-phone-portrait-game-1641 .topbar,
  body.st-phone-portrait-game-1641 .carousel-container,
  body.st-phone-portrait-game-1641 .stable-resourcebar1542b,
  body.st-phone-portrait-game-1641 .layout {
    display:none!important;
  }

  /* Paysage mobile : on accepte le jeu, mais on compacte vraiment */
  body.st-phone-landscape-game-1641 .topbar {
    position:sticky!important;
    top:0!important;
    z-index:100!important;
    width:100vw!important;
    max-width:100vw!important;
    min-height:38px!important;
    height:38px!important;
    padding:3px 6px!important;
    gap:5px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    display:flex!important;
    align-items:center!important;
  }

  body.st-phone-landscape-game-1641 .brand {
    font-size:16px!important;
    letter-spacing:3px!important;
    white-space:nowrap!important;
  }

  body.st-phone-landscape-game-1641 .small,
  body.st-phone-landscape-game-1641 .muted {
    font-size:10px!important;
  }

  body.st-phone-landscape-game-1641 .carousel-container {
    width:100vw!important;
    max-width:100vw!important;
    min-height:36px!important;
    height:36px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    padding:3px 6px!important;
    margin:0!important;
  }

  body.st-phone-landscape-game-1641 .carousel-pages {
    display:flex!important;
    flex-wrap:nowrap!important;
    gap:5px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    scrollbar-width:none!important;
  }

  body.st-phone-landscape-game-1641 .carousel-pages::-webkit-scrollbar {
    display:none!important;
  }

  body.st-phone-landscape-game-1641 .carousel-page,
  body.st-phone-landscape-game-1641 .carousel-nav-btn {
    flex:0 0 auto!important;
    height:30px!important;
    min-height:30px!important;
    padding:0 8px!important;
    font-size:11px!important;
    white-space:nowrap!important;
  }

  body.st-phone-landscape-game-1641 .stable-resourcebar1542b {
    width:100vw!important;
    max-width:100vw!important;
    padding:3px 6px!important;
    margin:0!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    border-radius:0!important;
    border-left:0!important;
    border-right:0!important;
  }

  body.st-phone-landscape-game-1641 .stable-resource-list1542b {
    display:flex!important;
    flex-wrap:nowrap!important;
    gap:5px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    scrollbar-width:none!important;
  }

  body.st-phone-landscape-game-1641 .stable-resource-list1542b::-webkit-scrollbar {
    display:none!important;
  }

  body.st-phone-landscape-game-1641 .stable-res1542b {
    flex:0 0 96px!important;
    width:96px!important;
    min-width:96px!important;
    max-width:96px!important;
    min-height:38px!important;
    padding:4px 5px!important;
    display:grid!important;
    grid-template-columns:22px minmax(0,1fr)!important;
    gap:4px!important;
    align-items:center!important;
  }

  body.st-phone-landscape-game-1641 .stable-res-ico1542b {
    font-size:17px!important;
  }

  body.st-phone-landscape-game-1641 .stable-res1542b small {
    font-size:9px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }

  body.st-phone-landscape-game-1641 .stable-res1542b strong {
    font-size:13px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }

  body.st-phone-landscape-game-1641 .stable-clock1542b {
    display:none!important;
  }

  body.st-phone-landscape-game-1641 .fragment-shop-entry1546 {
    max-width:150px!important;
    height:24px!important;
    min-height:24px!important;
    line-height:24px!important;
    font-size:10px!important;
    padding:0 8px!important;
    margin:0!important;
  }

  body.st-phone-landscape-game-1641 .layout,
  body.st-phone-landscape-game-1641 .layout.has-bottom-queue {
    display:block!important;
    grid-template-columns:none!important;
    width:100vw!important;
    max-width:100vw!important;
    height:calc(100dvh - 88px)!important;
    min-height:0!important;
    overflow:hidden!important;
    margin:0!important;
    padding:0!important;
  }

  body.st-phone-landscape-game-1641 .layout > .side,
  body.st-phone-landscape-game-1641 .layout > .side.left,
  body.st-phone-landscape-game-1641 .layout > .side.right {
    display:none!important;
  }

  body.st-phone-landscape-game-1641 #center {
    width:100vw!important;
    max-width:100vw!important;
    height:100%!important;
    overflow:auto!important;
    -webkit-overflow-scrolling:touch!important;
  }

  body.st-phone-landscape-game-1641 .gwm-stage {
    width:100vw!important;
    max-width:100vw!important;
    height:100%!important;
    min-height:260px!important;
    overflow:hidden!important;
  }

  body.st-phone-landscape-game-1641 .card,
  body.st-phone-landscape-game-1641 .panel {
    max-width:100%!important;
  }
}
`;
    document.head.appendChild(st);
  }

  function apply() {
    injectCss();
    ensureOverlay();

    var phone = isTouchPhone();
    var portrait = innerHeight >= innerWidth;
    var auth = authVisible();
    var game = phone && !auth;

    document.body.classList.toggle("st-phone-1641", phone);
    document.body.classList.toggle("st-auth-visible-1641", phone && auth);
    document.body.classList.toggle("st-phone-portrait-game-1641", game && portrait);
    document.body.classList.toggle("st-phone-landscape-game-1641", game && !portrait);
  }

  function install() {
    var meta = document.querySelector("meta[name='viewport']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover");
    apply();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
  window.addEventListener("resize", function(){ setTimeout(apply, 80); }, { passive:true });
  window.addEventListener("orientationchange", function(){ setTimeout(apply, 250); }, { passive:true });

  var mo = new MutationObserver(function(){ apply(); });
  try { mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["style","class"] }); } catch(e) {}

  var oldRender = window.render;
  if (typeof oldRender === "function" && !oldRender.__mobileReal1641) {
    var wrapped = function () {
      var out = oldRender.apply(this, arguments);
      setTimeout(apply, 0);
      setTimeout(apply, 120);
      return out;
    };
    wrapped.__mobileReal1641 = true;
    window.render = wrapped;
    try { render = wrapped; } catch(e) {}
  }

  window.stellarionMobileAudit1641 = function () {
    return {
      patch:"mobile-real-1641",
      phone:isTouchPhone(),
      portrait:innerHeight >= innerWidth,
      authVisible:authVisible(),
      width:innerWidth,
      height:innerHeight,
      bodyClass:document.body.className
    };
  };
})();
