/* STELLARION 1.6.32 — Page Construction : colonnes remplacées par un pop-up bâtiment.
   - La colonne "Résumé planète / Production / Ressources / Construction active"
     (csummary1542f) et le panneau "Détail bâtiment" (cdetail1542f, colonne droite)
     sont masqués : la grille des bâtiments prend toute la largeur.
   - Un clic sur une carte bâtiment ouvre un pop-up contenant :
     le détail du bâtiment (niveau, production actuelle/prochaine, coût,
     bouton AMÉLIORER fonctionnel) + le résumé planète en dessous.
   - Zéro duplication de logique : le pop-up affiche le HTML des fonctions
     existantes (constructionDetailPanelHtml, summaryHtml via le DOM masqué),
     donc toujours synchronisé, et queueBuilding() reste le seul point d'amélioration.
   - Rafraîchissement auto du pop-up tant qu'il est ouvert (niveau, file, coûts). */
(function () {
  "use strict";
  if (window.__stellarionBuildingPopup1632) return;
  window.__stellarionBuildingPopup1632 = true;

  /* ---------- 1) CSS : masquer les colonnes + styles du pop-up ---------- */
  var css = document.createElement("style");
  css.id = "stellarion-building-popup-css-1632";
  css.textContent = [
    /* Colonne résumé (droite de la grille construction) : masquée */
    ".csummary1542f{display:none!important}",
    ".construction-clean1542f{grid-template-columns:230px minmax(0,1fr)!important}",
    /* Panneau détail (colonne droite du layout) : masqué, layout élargi.
       Même spécificité que les règles de fin de main.css pour gagner la cascade. */
    "body.view-buildings .layout>.side.right,body.stable-ui1542b.view-buildings .layout>.side.right{display:none!important}",
    "@media(min-width:1201px){body.view-buildings .layout,body.view-buildings .layout.has-bottom-queue,body.stable-ui1542b.view-buildings .layout{grid-template-columns:var(--sg-left,330px) minmax(0,1fr)!important}}",
    "@media(max-width:820px){.construction-clean1542f{grid-template-columns:1fr!important}.ccats1542f{display:none!important}}",
    /* Pop-up */
    ".bpop1632-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(0,4,12,.72);backdrop-filter:blur(7px);display:grid;place-items:center;padding:16px}",
    ".bpop1632{width:min(460px,calc(100vw - 20px));max-height:calc(100dvh - 24px);overflow:auto;background:linear-gradient(180deg,rgba(8,22,42,.98),rgba(3,9,22,.99));border:1px solid rgba(79,195,247,.35);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 40px rgba(79,195,247,.12);position:relative;scrollbar-width:none}",
    ".bpop1632::-webkit-scrollbar{width:0}",
    ".bpop1632-close{position:absolute;top:10px;right:10px;z-index:2;width:42px;height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:#0b1626;color:#fff;font-size:20px;font-weight:900;cursor:pointer}",
    ".bpop1632-close:active{background:rgba(79,195,247,.2)}",
    ".bpop1632-detail{padding:16px 16px 4px}",
    /* Le détail réutilise le style cdetail1542f existant : on neutralise juste sa carte */
    ".bpop1632-detail .cdetail1542f,.bpop1632-detail .card{border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important}",
    ".bpop1632-detail .btn{min-height:46px}",
    ".bpop1632-summary{padding:4px 16px 16px}",
    ".bpop1632-summary h4{margin:12px 0 8px;font-size:11px;letter-spacing:2px;color:#4FC3F7;text-transform:uppercase}",
    /* Le résumé cloné garde ses classes csummary-card1542f : compactées ici */
    ".bpop1632-summary .csummary-card1542f{border:1px solid rgba(79,195,247,.16);background:rgba(255,255,255,.03);border-radius:14px;padding:12px;margin-bottom:10px}",
    ".bpop1632-summary .csummary-card1542f h3{margin:0 0 8px;font-size:13px;color:#90caf9}"
  ].join("\n");
  document.head.appendChild(css);

  /* ---------- 2) Construction / rafraîchissement du pop-up ---------- */
  var openId = null;      // id du bâtiment affiché, null = fermé
  var refreshTimer = null;

  function detailHtml() {
    try {
      if (typeof window.constructionDetailPanelHtml === "function")
        return window.constructionDetailPanelHtml();
    } catch (e) {}
    return "<p class='muted'>Détail indisponible.</p>";
  }

  // Le résumé planète n'est pas exposé globalement : on le lit dans le DOM
  // masqué (le jeu continue de le générer à chaque render, il reste à jour).
  function summaryHtml() {
    var el = document.querySelector(".csummary1542f");
    return el ? el.innerHTML : "";
  }

  function popupInner() {
    return (
      '<button type="button" class="bpop1632-close" data-bpop-close="1">✕</button>' +
      '<div class="bpop1632-detail">' + detailHtml() + "</div>" +
      '<div class="bpop1632-summary"><h4>Planète</h4>' + summaryHtml() + "</div>"
    );
  }

  function refresh() {
    var pop = document.getElementById("bpop1632");
    if (!pop || openId == null) return;
    // Pas de refresh si l'utilisateur est en train d'appuyer (évite de couper un tap)
    if (pop.__pressing) return;
    pop.innerHTML = popupInner();
  }

  function open(buildingId) {
    openId = buildingId || (window.state && window.state.selectedBuildingId) || null;
    var back = document.getElementById("bpop1632-backdrop");
    if (!back) {
      back = document.createElement("div");
      back.id = "bpop1632-backdrop";
      back.className = "bpop1632-backdrop";
      back.innerHTML = '<div class="bpop1632" id="bpop1632"></div>';
      document.body.appendChild(back);

      back.addEventListener("click", function (ev) {
        if (ev.target === back || (ev.target.closest && ev.target.closest("[data-bpop-close]"))) close();
      });
      var pop = back.querySelector("#bpop1632");
      pop.addEventListener("pointerdown", function () { pop.__pressing = true; });
      pop.addEventListener("pointerup", function () { setTimeout(function () { pop.__pressing = false; }, 250); });
      pop.addEventListener("pointercancel", function () { pop.__pressing = false; });
    }
    refresh();
    // Contenu mis à jour en continu (niveau, coût, file) tant que c'est ouvert
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refresh, 1000);
  }

  function close() {
    openId = null;
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    var back = document.getElementById("bpop1632-backdrop");
    if (back && back.parentNode) back.parentNode.removeChild(back);
  }
  window.stellarionCloseBuildingPopup1632 = close;

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") close();
  });

  /* ---------- 3) Ouverture au clic sur une carte bâtiment ----------
     On laisse le onclick d'origine s'exécuter (sélection + render),
     puis on ouvre le pop-up une fois la sélection à jour. */
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#bpop1632-backdrop")) return;            // clic dans le pop-up
    if (t.closest("button,.btn,input,a")) return;           // AMÉLIORER de la carte, etc.
    var card = t.closest(".ccard1542f,.build-card,.building-node");
    if (!card) return;
    setTimeout(function () {
      open(window.state && window.state.selectedBuildingId);
    }, 60);
  }, false);

  /* Si on quitte la page Construction, le pop-up se ferme */
  setInterval(function () {
    if (openId != null && window.state && window.state.view !== "buildings") close();
  }, 800);

  window.stellarionBuildingPopupAudit1632 = function () {
    return {
      patch: "building-popup-1.6.32",
      open: openId != null,
      selected: window.state && window.state.selectedBuildingId,
      summaryHidden: !!document.querySelector(".csummary1542f"),
      detailFnOk: typeof window.constructionDetailPanelHtml === "function"
    };
  };
})();
