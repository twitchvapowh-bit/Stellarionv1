/* STELLARION 1.6.42 — CANARY MOBILE
   Si ce fichier est bien chargé, un badge bleu "MOBILE 1642 ACTIF" apparaît en bas à droite.
   Objectif : vérifier si les téléphones de tes amis chargent réellement le dernier code.
*/
(function(){
  "use strict";
  if(window.__stellarionMobileCanary1642) return;
  window.__stellarionMobileCanary1642 = true;

  function phone(){
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") ||
      matchMedia("(pointer:coarse)").matches ||
      Math.min(innerWidth, innerHeight) <= 900;
  }

  function authVisible(){
    var a=document.getElementById("auth-screen");
    if(!a) return false;
    var cs=getComputedStyle(a);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }

  function injectCss(){
    if(document.getElementById("stellarion-mobile-canary-css-1642")) return;
    var s=document.createElement("style");
    s.id="stellarion-mobile-canary-css-1642";
    s.textContent = `
@media (max-width:980px), (pointer:coarse){
  html,body{
    width:100vw!important;
    max-width:100vw!important;
    min-width:0!important;
    overflow-x:hidden!important;
    -webkit-text-size-adjust:100%!important;
    text-size-adjust:100%!important;
    background:#020510!important;
  }
  *{box-sizing:border-box!important}
  input,textarea,select,button{font-size:16px!important}

  #stellarion-mobile-canary-1642{
    display:block!important;
    position:fixed!important;
    right:8px!important;
    bottom:8px!important;
    z-index:2147483647!important;
    background:#00b7ff!important;
    color:#00111f!important;
    border:2px solid #fff!important;
    border-radius:999px!important;
    padding:7px 10px!important;
    font:900 11px/1 system-ui,Arial!important;
    letter-spacing:.5px!important;
    box-shadow:0 0 18px rgba(0,183,255,.85)!important;
    pointer-events:none!important;
  }

  #auth-screen{
    position:fixed!important;
    inset:0!important;
    z-index:2147483000!important;
    width:100vw!important;
    height:100dvh!important;
    min-height:100dvh!important;
    max-width:100vw!important;
    padding:14px!important;
    overflow:auto!important;
    align-items:center!important;
    justify-content:center!important;
  }
  #auth-screen > div{
    width:min(420px,92vw)!important;
    max-width:92vw!important;
    padding:0!important;
    margin:auto!important;
  }
  #auth-screen .brand{
    font-size:clamp(22px,7vw,32px)!important;
    letter-spacing:4px!important;
  }

  body.st-auth-1642 #app,
  body.st-auth-1642 .topbar,
  body.st-auth-1642 .carousel-container,
  body.st-auth-1642 .stable-resourcebar1542b,
  body.st-auth-1642 .layout{
    display:none!important;
  }

  body.st-game-portrait-1642 #app,
  body.st-game-portrait-1642 .topbar,
  body.st-game-portrait-1642 .carousel-container,
  body.st-game-portrait-1642 .stable-resourcebar1542b,
  body.st-game-portrait-1642 .layout{
    display:none!important;
  }
  body.st-game-portrait-1642:before{
    content:"STELLARION — tourne le téléphone en mode paysage";
    position:fixed!important;
    inset:0!important;
    z-index:2147483000!important;
    display:grid!important;
    place-items:center!important;
    padding:24px!important;
    text-align:center!important;
    background:radial-gradient(circle at 50% 20%,#102248,#020510 72%)!important;
    color:#eaf6ff!important;
    font:900 22px/1.25 system-ui,Arial!important;
    letter-spacing:1px!important;
  }

  body.st-game-landscape-1642 .topbar{
    width:100vw!important;
    max-width:100vw!important;
    height:38px!important;
    min-height:38px!important;
    padding:3px 6px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
  }
  body.st-game-landscape-1642 .brand{font-size:16px!important;letter-spacing:3px!important;white-space:nowrap!important}
  body.st-game-landscape-1642 .carousel-container{
    width:100vw!important;
    max-width:100vw!important;
    height:36px!important;
    min-height:36px!important;
    padding:3px 6px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
  }
  body.st-game-landscape-1642 .carousel-pages{
    display:flex!important;
    flex-wrap:nowrap!important;
    gap:5px!important;
    overflow-x:auto!important;
    scrollbar-width:none!important;
  }
  body.st-game-landscape-1642 .carousel-pages::-webkit-scrollbar{display:none!important}
  body.st-game-landscape-1642 .carousel-page,
  body.st-game-landscape-1642 .carousel-nav-btn{
    flex:0 0 auto!important;
    height:30px!important;
    min-height:30px!important;
    padding:0 8px!important;
    font-size:11px!important;
    white-space:nowrap!important;
  }

  body.st-game-landscape-1642 .stable-resourcebar1542b{
    width:100vw!important;
    max-width:100vw!important;
    padding:3px 6px!important;
    margin:0!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    border-radius:0!important;
  }
  body.st-game-landscape-1642 .stable-resource-list1542b{
    display:flex!important;
    flex-wrap:nowrap!important;
    gap:5px!important;
    overflow-x:auto!important;
    scrollbar-width:none!important;
  }
  body.st-game-landscape-1642 .stable-resource-list1542b::-webkit-scrollbar{display:none!important}
  body.st-game-landscape-1642 .stable-res1542b{
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
  body.st-game-landscape-1642 .stable-res-ico1542b{font-size:17px!important}
  body.st-game-landscape-1642 .stable-res1542b small{font-size:9px!important;line-height:1!important;white-space:nowrap!important}
  body.st-game-landscape-1642 .stable-res1542b strong{font-size:13px!important;line-height:1!important;white-space:nowrap!important}
  body.st-game-landscape-1642 .stable-clock1542b{display:none!important}
  body.st-game-landscape-1642 .fragment-shop-entry1546{
    max-width:150px!important;
    height:24px!important;
    min-height:24px!important;
    line-height:24px!important;
    font-size:10px!important;
    padding:0 8px!important;
    margin:0!important;
  }

  body.st-game-landscape-1642 .layout,
  body.st-game-landscape-1642 .layout.has-bottom-queue{
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
  body.st-game-landscape-1642 .layout>.side,
  body.st-game-landscape-1642 .layout>.side.left,
  body.st-game-landscape-1642 .layout>.side.right{display:none!important}
  body.st-game-landscape-1642 #center{
    width:100vw!important;
    max-width:100vw!important;
    height:100%!important;
    overflow:auto!important;
    -webkit-overflow-scrolling:touch!important;
  }
  body.st-game-landscape-1642 .gwm-stage{
    width:100vw!important;
    max-width:100vw!important;
    height:100%!important;
    min-height:260px!important;
    overflow:hidden!important;
  }
}
`;
    document.head.appendChild(s);
  }

  function badge(){
    if(!phone()) return;
    if(document.getElementById("stellarion-mobile-canary-1642")) return;
    var b=document.createElement("div");
    b.id="stellarion-mobile-canary-1642";
    b.textContent="MOBILE 1642 ACTIF";
    document.body.appendChild(b);
  }

  function apply(){
    injectCss();
    badge();
    if(!document.body) return;
    var p=phone();
    var auth=authVisible();
    var portrait=innerHeight >= innerWidth;
    var game=p && !auth;
    document.body.classList.toggle("st-auth-1642", p && auth);
    document.body.classList.toggle("st-game-portrait-1642", game && portrait);
    document.body.classList.toggle("st-game-landscape-1642", game && !portrait);
  }

  function install(){
    var meta=document.querySelector("meta[name='viewport']");
    if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
    meta.setAttribute("content","width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover");
    apply();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
  window.addEventListener("resize", function(){setTimeout(apply,80)}, {passive:true});
  window.addEventListener("orientationchange", function(){setTimeout(apply,250)}, {passive:true});
  try{new MutationObserver(function(){apply()}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class"]});}catch(e){}

  window.stellarionMobileAudit1642=function(){
    return {loaded:true, phone:phone(), auth:authVisible(), portrait:innerHeight>=innerWidth, w:innerWidth, h:innerHeight, body:document.body.className};
  };
})();
