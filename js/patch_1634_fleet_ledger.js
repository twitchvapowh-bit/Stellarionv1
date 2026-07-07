/* STELLARION 1.6.34 — Anti-duplication de flotte (ledger) + outil de réparation.
   CAUSE RACINE du doublement (visible surtout après un "Max" = flotte complète) :
   1) f.startTime utilise performance.now(), horloge remise à zéro à chaque
      rechargement => états de vol incohérents entre sessions.
   2) L'hydratation serveur peut ressusciter une flotte à done:false ;
      le garde 1.6.05 (par id) ne couvre pas tous les chemins => la flotte
      est re-créditée. Flotte complète re-créditée = stock exactement doublé.

   CORRECTIF STRUCTUREL — registre de lancement ("ledger") :
   - Au lancement d'une flotte cliente, ses vaisseaux DÉDUITS sont inscrits
     dans un registre persistant (localStorage).
   - Au retour, le crédit n'est autorisé QUE si l'entrée existe ; elle est
     alors consommée. Un vaisseau déduit ne peut être re-crédité qu'UNE fois.
   - Toute flotte "returning" SANS entrée au registre (résurrection, hydratation,
     session précédente inconnue) est livrée SANS vaisseaux : trajet et butin
     inchangés, mais zéro crédit fantôme.
   - Les flottes serverAuthority restent gérées par le patch 1.6.06.

   BONUS : normalisation des startTime venus d'une session précédente
   (perf clock > horloge courante = impossible) pour dégeler les flottes.

   OUTILS CONSOLE :
   - stellarionShipAudit1634()              : état des stocks + registre
   - await stellarionReduceShips1634(0.2)   : garde 20% des vaisseaux côté serveur
*/
(function () {
  "use strict";
  if (window.__stellarionFleetLedger1634) return;
  window.__stellarionFleetLedger1634 = true;

  var KEY = "stellarion_fleet_ledger_1634";

  function S() {
    try { return window.state || (typeof state !== "undefined" ? state : null); }
    catch (e) { return window.state || null; }
  }
  function loadLedger() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function saveLedger(l) {
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {}
  }
  var ledger = loadLedger();

  function pruneLedger() {
    var now = Date.now();
    var changed = false;
    Object.keys(ledger).forEach(function (id) {
      // 48h max : une flotte ne vole jamais aussi longtemps
      if (now - (ledger[id].t || 0) > 48 * 3600 * 1000) { delete ledger[id]; changed = true; }
    });
    if (changed) saveLedger(ledger);
  }

  /* ---------- 1) Enregistrement des lancements ----------
     Toute flotte cliente fraîche (id "f<timestamp>" créé il y a < 15s,
     pas serverAuthority, pas returning) est inscrite avec ses vaisseaux. */
  function registerNewLaunches() {
    var st = S();
    if (!st || !Array.isArray(st.fleets)) return;
    var now = Date.now();
    var changed = false;
    st.fleets.forEach(function (f) {
      if (!f || !f.id || f.serverAuthority === true || f.returning || f.done) return;
      if (ledger[f.id]) return;
      var m = String(f.id).match(/^f(\d{13})/);
      if (!m) return;                          // pas une flotte cliente
      if (now - Number(m[1]) > 15000) return;  // pas fraîche : hydratation/résurrection
      var ships = {};
      var total = 0;
      Object.keys(f.ships || {}).forEach(function (id) {
        var n = Math.max(0, Math.floor(Number(f.ships[id]) || 0));
        if (n > 0) { ships[id] = n; total += n; }
      });
      if (total <= 0) return;
      ledger[f.id] = { t: now, ships: ships };
      changed = true;
    });
    if (changed) { pruneLedger(); saveLedger(ledger); }
  }
  setInterval(registerNewLaunches, 400);
  registerNewLaunches();

  /* ---------- 2) Contrôle du crédit au retour ----------
     Avant chaque processFleets : pour chaque flotte returning sur le point
     d'être livrée, si pas d'entrée au registre => f.ships vidé (aucun crédit) ;
     sinon on plafonne au contenu du registre puis on CONSOMME l'entrée. */
  function wrapProcessFleets() {
    // 1.6.45 — verrou absolu : ce wrap etait reclame toutes les 500ms et se
    // battait avec d'autres patches processFleets (1605, 1606, V7 dans
    // main.js) qui font de meme sans se reconnaitre mutuellement => les
    // wrappers se re-enveloppent les uns les autres sans fin => Maximum
    // call stack size exceeded (confirme par trace navigateur en prod).
    if (window.__stellarionProcessGuard1634Done) return;
    if (typeof window.processFleets !== "function" || window.processFleets.__ledgerGuarded1634) return;
    var original = window.processFleets;

    var wrapped = function () {
      try {
        var st = S();
        if (st && Array.isArray(st.fleets)) {
          var nowT = performance.now() / 1000;
          st.fleets.forEach(function (f) {
            if (!f || f.done || !f.returning) return;
            if (f.serverAuthority === true) return; // géré par 1.6.06
            var due = (nowT - (Number(f.startTime) || 0)) >= (Number(f.duration) || 0);
            if (!due) return;
            var entry = f.id ? ledger[f.id] : null;
            if (!entry) {
              // Résurrection / hydratation / session inconnue : livraison à vide.
              if (f.ships && Object.keys(f.ships).length) {
                console.warn("[fleet-ledger-1634] Crédit fantôme bloqué pour", f.id, f.ships);
                f.ships = {};
              }
              return;
            }
            // Plafonne au registre (jamais plus que ce qui a été déduit)
            var capped = {};
            Object.keys(f.ships || {}).forEach(function (id) {
              var n = Math.max(0, Math.floor(Number(f.ships[id]) || 0));
              var cap = Math.max(0, Math.floor(Number(entry.ships[id]) || 0));
              var v = Math.min(n, cap);
              if (v > 0) capped[id] = v;
            });
            f.ships = capped;
            delete ledger[f.id];            // consommé : plus jamais re-créditable
            saveLedger(ledger);
          });
        }
      } catch (e) {}
      return original.apply(this, arguments);
    };

    wrapped.__ledgerGuarded1634 = true;
    if (original.__creditGuarded1605) wrapped.__creditGuarded1605 = true;
    if (original.__serverAuthGuarded1606) wrapped.__serverAuthGuarded1606 = true;
    window.processFleets = wrapped;
    window.__stellarionProcessGuard1634Done = true;
  }
  wrapProcessFleets();
  setInterval(wrapProcessFleets, 500); // si un autre patch ré-écrase processFleets

  /* ---------- 3) Dégel des flottes d'une session précédente ----------
     startTime (perf clock) supérieur à l'horloge courante = impossible dans
     cette session => on repart de maintenant (trajet relancé, crédit toujours
     contrôlé par le registre, donc sans risque de doublon). */
  function normalizeStaleFleets() {
    var st = S();
    if (!st || !Array.isArray(st.fleets)) return;
    var nowT = performance.now() / 1000;
    st.fleets.forEach(function (f) {
      if (!f || f.done) return;
      if (Number(f.startTime) > nowT + 5) f.startTime = nowT;
    });
  }
  setInterval(normalizeStaleFleets, 2000);
  normalizeStaleFleets();

  /* ---------- 4) Outils de réparation (console) ---------- */
  window.stellarionShipAudit1634 = function () {
    var st = S();
    var perPlanet = {};
    var total = 0;
    Object.keys((st && st.planetShips) || {}).forEach(function (pid) {
      var sub = 0;
      Object.keys(st.planetShips[pid] || {}).forEach(function (id) {
        sub += Math.max(0, Math.floor(Number(st.planetShips[pid][id]) || 0));
      });
      perPlanet[pid] = sub;
      total += sub;
    });
    return {
      patch: "fleet-ledger-1.6.34",
      totalShips: total,
      perPlanet: perPlanet,
      ledgerEntries: Object.keys(ledger).length,
      fleetsInFlight: ((st && st.fleets) || []).filter(function (f) { return f && !f.done; }).length
    };
  };

  function localReduceShips(factor) {
    factor = Number(factor);
    if (!(factor > 0 && factor < 1)) return "Usage : stellarionReduceShips1634(0.2) pour garder 20% des vaisseaux.";
    var st = S();
    if (!st || !st.planetShips) return "state.planetShips introuvable.";
    var before = 0, after = 0;
    Object.keys(st.planetShips).forEach(function (pid) {
      var ships = st.planetShips[pid] || {};
      Object.keys(ships).forEach(function (id) {
        var n = Math.max(0, Math.floor(Number(ships[id]) || 0));
        before += n;
        var v = Math.floor(n * factor);
        if (v > 0) ships[id] = v; else delete ships[id];
        after += v;
      });
    });
    try { if (typeof window.save === "function") window.save(); } catch (e) {}
    try { if (typeof window.render === "function") window.render(); } catch (e) {}
    return { mode: "local-ui-only", avant: before, apres: after, supprimes: before - after };
  }

  async function serverReduceShips(factor) {
    factor = Number(factor);
    if (!(factor > 0 && factor < 1)) return "Usage : await stellarionReduceShips1634(0.2) pour garder 20% des vaisseaux.";
    if (typeof window.stellarionServerAuthorityAction1570 !== "function") {
      return localReduceShips(factor);
    }
    var before = window.stellarionShipAudit1634();
    var out = null;
    try {
      out = await window.stellarionServerAuthorityAction1570("repair_reduce_ships", { factor: factor });
    } catch (e) {
      return {
        mode: "server-authority",
        ok: false,
        error: String((e && e.message) || e),
        beforeLocalAudit: before,
        note: "Redeploie la fonction Supabase game-action, puis relance await stellarionReduceShips1634(" + factor + ")."
      };
    }
    try {
      var st = S();
      if (st) st.missionDraft = { ships: {}, cargo: { titanium: 0, xenite: 0, antimatter: 0 } };
    } catch (e) {}
    try { if (typeof window.save === "function") window.save(); } catch (e) {}
    try { if (typeof window.render === "function") window.render(); } catch (e) {}
    var after = window.stellarionShipAudit1634();
    return {
      mode: "server-authority",
      beforeLocalAudit: before,
      serverRepair: out && out.repair ? out.repair : null,
      afterLocalAudit: after,
      note: "Si serverRepair est null, redeploie d'abord la fonction Supabase game-action mise a jour."
    };
  }

  // Garde `factor` (ex: 0.2 = garde 20%, supprime 80%). Retourne le bilan.
  window.stellarionReduceShips1634 = function (factor) {
    return serverReduceShips(factor);
  };
  window.stellarionReduceShipsServer1635 = serverReduceShips;
  window.stellarionReduceShipsLocalOnly1635 = localReduceShips;
})();
