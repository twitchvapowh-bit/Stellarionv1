/* STELLARION 1.7.05 — Continuité des animations décoratives.
   Cause racine du scintillement "sur toutes les pages" : render() remplace
   TOUT le innerHTML de #app a chaque appel (254 appels directs dans le
   code + le tick automatique). Ca ne touche pas que les donnees : chaque
   element decoratif anime en CSS (orbites de planete, pulsations,
   rotation, "aura"...) est detruit et recree a chaque render(), ce qui
   remet son animation a la frame zero -> saut visible / scintillement,
   sur n'importe quelle page qui contient un element anime.
   Reecrire render() pour qu'il ne remplace que ce qui change serait une
   chirurgie lourde sur le cœur du moteur d'affichage (trop risque sur un
   jeu en prod avec paiements reels, comme la dette CSS ou la chaine de
   wrappers sur render() deja signalees). Ce patch corrige le SYMPTOME
   visible sans toucher a render() : des qu'un element anime "infinite"
   apparait dans le DOM, on synchronise son animation-delay sur une
   horloge fixe (le moment du tout premier chargement de la page), pour
   qu'il reprenne l'animation exactement la ou elle devrait en etre au
   lieu de repartir de zero. Additif, aucune donnee de jeu touchee. */
(function () {
  "use strict";
  if (window.__stellarionAnimContinuity1705) return;
  window.__stellarionAnimContinuity1705 = true;

  // Horloge de reference fixe pour toute la session : peu importe l'instant
  // exact choisi, l'important est qu'il ne bouge jamais, pour que chaque
  // recreation d'un meme element retombe sur la meme phase d'animation.
  var EPOCH = performance.now();

  function parseTimeToMs(s) {
    s = (s || "").trim();
    if (!s) return 0;
    if (s.endsWith("ms")) return parseFloat(s) || 0;
    if (s.endsWith("s")) return (parseFloat(s) || 0) * 1000;
    return parseFloat(s) || 0;
  }

  function syncOne(el) {
    if (!el || el.nodeType !== 1) return;
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { return; }
    var name = cs.animationName;
    if (!name || name === "none") return;
    var names = name.split(",");
    var durations = cs.animationDuration.split(",");
    var deja = cs.animationDelay.split(",");
    var iterationCounts = cs.animationIterationCount ? cs.animationIterationCount.split(",") : [];
    var out = [];
    var changed = false;
    for (var i = 0; i < names.length; i++) {
      var durMs = parseTimeToMs(durations[i % durations.length] || durations[0]);
      var infinite = (iterationCounts[i % iterationCounts.length] || iterationCounts[0] || "").trim() === "infinite";
      if (!durMs || !infinite) { out.push(deja[i % deja.length] || "0s"); continue; }
      var elapsed = (performance.now() - EPOCH) % durMs;
      out.push((-elapsed).toFixed(0) + "ms");
      changed = true;
    }
    if (changed) el.style.animationDelay = out.join(",");
  }

  function syncTree(root) {
    if (!root || root.nodeType !== 1) return;
    syncOne(root);
    try {
      var all = root.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) syncOne(all[i]);
    } catch (e) {}
  }

  var scheduled = false;
  var queued = [];
  function flush() {
    scheduled = false;
    var batch = queued;
    queued = [];
    for (var i = 0; i < batch.length; i++) syncTree(batch[i]);
  }
  function queueSync(node) {
    queued.push(node);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }

  try {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) queueSync(added[j]);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", function () { if (document.body) queueSync(document.body); });
  window.addEventListener("load", function () { if (document.body) queueSync(document.body); });
})();
