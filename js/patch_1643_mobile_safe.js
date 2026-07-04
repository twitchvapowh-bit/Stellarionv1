/* STELLARION 1.6.43 — Mobile debug sans masquage
   Le badge reste pour prouver que le patch est chargé.
   Important : cette version NE CACHE PLUS les pages du jeu.
*/
(function(){
  "use strict";
  if(window.__stellarionMobileSafe1643) return;
  window.__stellarionMobileSafe1643 = true;

  function phone(){
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") ||
      matchMedia("(pointer:coarse)").matches ||
      Math.min(innerWidth, innerHeight) <= 900;
  }

  function injectCss(){
    if(document.getElementById("stellarion-mobile-safe-css-1643")) return;
    var s=document.createElement("style");
    s.id="stellarion-mobile-safe-css-1643";
    s.textContent = `
@media (max-width:980px), (pointer:coarse){
  html,body{
    width:100%!important;
    max-width:100vw!important;
    min-width:0!important;
    overflow-x:hidden!important;
    -webkit-text-size-adjust:100%!important;
    text-size-adjust:100%!important;
    background:#020510!important;
  }
  *{box-sizing:border-box!important}
  input,textarea,select,button{font-size:16px!important}

  #stellarion-mobile-safe-1643{
    display:block!important;
    position:fixed!important;
    right:8px!important;
    bottom:8px!important;
    z-index:2147483647!important;
    background:#19e68c!important;
    color:#00140b!important;
    border:2px solid #fff!important;
    border-radius:999px!important;
    padding:7px 10px!important;
    font:900 11px/1 system-ui,Arial!important;
    box-shadow:0 0 18px rgba(25,230,140,.85)!important;
    pointer-events:none!important;
  }

  /* Connexion propre, mais sans cacher brutalement le jeu par classes globales */
  #auth-screen{
    z-index:2147483000!important;
    width:100vw!important;
    max-width:100vw!important;
    min-height:100dvh!important;
    overflow:auto!important;
    padding:14px!important;
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

  /* Topbar compacte */
  .topbar{
    width:100vw!important;
    max-width:100vw!important;
    min-width:0!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
  }

  .carousel-container{
    max-width:100vw!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
  }
  .carousel-pages{
    display:flex!important;
    flex-wrap:nowrap!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    scrollbar-width:none!important;
  }
  .carousel-pages::-webkit-scrollbar{display:none!important}
  .carousel-page,.carousel-nav-btn{
    flex:0 0 auto!important;
    white-space:nowrap!important;
  }

  /* Ressources en ligne scrollable */
  .stable-resourcebar1542b{
    width:100vw!important;
    max-width:100vw!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
  }
  .stable-resource-list1542b{
    display:flex!important;
    flex-wrap:nowrap!important;
    gap:6px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    scrollbar-width:none!important;
  }
  .stable-resource-list1542b::-webkit-scrollbar{display:none!important}
  .stable-res1542b{
    flex:0 0 116px!important;
    min-width:116px!important;
    max-width:116px!important;
  }
  .stable-clock1542b{display:none!important}

  /* Petit téléphone : enlever uniquement les colonnes latérales, pas le centre */
  .layout{
    width:100vw!important;
    max-width:100vw!important;
    min-width:0!important;
    overflow:hidden!important;
  }
  #center{
    max-width:100vw!important;
    min-width:0!important;
    overflow:auto!important;
    -webkit-overflow-scrolling:touch!important;
  }
}

@media (max-width:980px) and (orientation:portrait), (pointer:coarse) and (orientation:portrait){
  /* Portrait : on garde les pages visibles, on les rend scrollables */
  .layout{
    display:block!important;
    grid-template-columns:none!important;
    height:auto!important;
    min-height:calc(100dvh - 120px)!important;
    overflow:auto!important;
  }
  .layout > .side.left,
  .layout > .side.right{
    display:none!important;
  }
  #center{
    display:block!important;
    width:100vw!important;
    height:auto!important;
    min-height:calc(100dvh - 120px)!important;
  }
}

@media (max-width:980px) and (orientation:landscape), (pointer:coarse) and (orientation:landscape){
  .topbar{
    height:38px!important;
    min-height:38px!important;
    padding:3px 6px!important;
  }
  .brand{font-size:16px!important;letter-spacing:3px!important}
  .carousel-container{
    height:36px!important;
    min-height:36px!important;
    padding:3px 6px!important;
  }
  .carousel-page,.carousel-nav-btn{
    height:30px!important;
    min-height:30px!important;
    padding:0 8px!important;
    font-size:11px!important;
  }
  .stable-resourcebar1542b{
    padding:3px 6px!important;
  }
  .stable-res1542b{
    flex-basis:96px!important;
    min-width:96px!important;
    max-width:96px!important;
    min-height:38px!important;
    padding:4px 5px!important;
  }
  .stable-res1542b small{font-size:9px!important;line-height:1!important}
  .stable-res1542b strong{font-size:13px!important;line-height:1!important}
  .layout{
    display:block!important;
    grid-template-columns:none!important;
    width:100vw!important;
    max-width:100vw!important;
    height:calc(100dvh - 88px)!important;
    overflow:hidden!important;
  }
  .layout>.side.left,
  .layout>.side.right{
    display:none!important;
  }
  #center{
    display:block!important;
    width:100vw!important;
    max-width:100vw!important;
    height:100%!important;
    overflow:auto!important;
  }
}
`;
    document.head.appendChild(s);
  }

  function badge(){
    if(!phone()) return;
    if(document.getElementById("stellarion-mobile-safe-1643")) return;
    var b=document.createElement("div");
    b.id="stellarion-mobile-safe-1643";
    b.textContent="MOBILE 1643 OK";
    document.body.appendChild(b);
  }

  function apply(){
    injectCss();
    badge();
    document.body && document.body.classList.toggle("st-mobile-safe-1643", phone());
  }

  function install(){
    var meta=document.querySelector("meta[name='viewport']");
    if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
    meta.setAttribute("content","width=device-width, initial-scale=1.0, viewport-fit=cover");
    apply();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
  window.addEventListener("resize", function(){setTimeout(apply,80)}, {passive:true});
  window.addEventListener("orientationchange", function(){setTimeout(apply,250)}, {passive:true});
  try{new MutationObserver(function(){apply()}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class"]});}catch(e){}

  window.stellarionMobileAudit1643=function(){
    return {loaded:true, phone:phone(), w:innerWidth, h:innerHeight, body:document.body.className};
  };
})();
