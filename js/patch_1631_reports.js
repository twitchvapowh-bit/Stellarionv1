/* STELLARION 1.6.31 — Suppression totale des rapports de combat texte (format archive).
   Le serveur crée un message texte brut au moment du crédit du butin ; sans
   meta.result, il est rendu via le bloc "Ancien rapport archivé" (illisible).
   Le patch 1.5.96 ne le supprimait qu'en cas de doublon riche détecté.
   ICI : suppression INCONDITIONNELLE de ces rapports texte, seul le rapport
   riche cr1539 ("Menace neutralisée", KPIs, butin détaillé) est conservé.
   La suppression est mémorisée côté serveur (helpers existants) pour empêcher
   toute resynchronisation. Les messages joueurs ne sont jamais touchés. */
(function () {
  "use strict";
  if (window.__stellarionKillArchivedReports1631) return;
  window.__stellarionKillArchivedReports1631 = true;

  function S() {
    try { return window.state || (typeof state !== "undefined" ? state : null); }
    catch (e) { return window.state || null; }
  }

  function isCombat(m) {
    return !!(m && /combat|rapport de combat|mission galactique/i.test(
      String(m.type) + " " + String(m.subject)));
  }

  // Rapport riche = données structurées OU HTML des templates propres : on GARDE.
  function hasRichReport(m) {
    var body = String(m && m.body || "");
    return !!(m && m.meta && m.meta.result) ||
      /stc-report|combat-report-pro|cr1539-|<div/i.test(body);
  }

  // Signature FORTE du texte serveur (photo 1) : marqueurs qui n'existent
  // que dans ces rapports-là. Un message joueur ne peut pas matcher.
  function isServerTextReport(m) {
    if (!isCombat(m) || hasRichReport(m)) return false;
    var txt = String(m && m.subject || "") + " " + String(m && m.body || "");
    return /Ce rapport est [eé]crit c[oô]t[eé] serveur|Stock apr[eè]s combat|Butin ajout[eé] au stock|\[Stellarion V9\] Rapport s[eé]curis[eé]/i.test(txt);
  }

  function rememberDeleted(m) {
    try {
      var dbId = typeof window.serverMessageDbId === "function" ? window.serverMessageDbId(m) : "";
      if (!dbId && m && m.meta && m.meta.dbId) dbId = String(m.meta.dbId);
      if (!dbId) return;
      if (typeof window.rememberServerMessageDeleted === "function") window.rememberServerMessageDeleted(dbId);
      if (typeof window.syncServerMessageDeleted === "function") window.syncServerMessageDeleted(dbId);
    } catch (e) {}
  }

  function purge() {
    var st = S();
    if (!st || !Array.isArray(st.messages)) return 0;
    var removed = 0;
    var kept = [];
    for (var i = 0; i < st.messages.length; i++) {
      var m = st.messages[i];
      if (isServerTextReport(m)) {
        rememberDeleted(m);
        removed++;
      } else {
        kept.push(m);
      }
    }
    if (!removed) return 0;
    st.messages = kept;
    if (st.selectedMessageId && !kept.some(function (m) { return String(m && m.id) === String(st.selectedMessageId); })) {
      st.selectedMessageId = (kept[0] && kept[0].id) || "";
    }
    try { if (typeof window.save === "function") window.save(); } catch (e) {}
    try { if (typeof window.updateNotificationBellLive === "function") window.updateNotificationBellLive(); } catch (e) {}
    return removed;
  }

  // 1) Purge avant chaque affichage de la messagerie
  function wrapMessagesView() {
    var old = window.messagesView;
    if (typeof old !== "function" || old.__killArchived1631) return;
    var wrapped = function () {
      purge();
      return old.apply(this, arguments);
    };
    wrapped.__killArchived1631 = true;
    window.messagesView = wrapped;
    try { messagesView = wrapped; } catch (e) {}
  }

  // 2) Purge juste après toute création de message (le rapport texte serveur
  //    arrive parfois quelques instants après le rapport riche)
  function wrapAddMessage() {
    var old = window.addMessage;
    if (typeof old !== "function" || old.__killArchived1631) return;
    var wrapped = function () {
      var out = old.apply(this, arguments);
      setTimeout(purge, 0);
      setTimeout(purge, 900);
      return out;
    };
    wrapped.__killArchived1631 = true;
    window.addMessage = wrapped;
    try { addMessage = wrapped; } catch (e) {}
  }

  // 3) Filet de sécurité : purge périodique (sync serveur, autres patches...)
  function boot() {
    wrapMessagesView();
    wrapAddMessage();
    purge();
    setInterval(function () {
      wrapMessagesView(); // au cas où un autre patch ré-écrase messagesView
      wrapAddMessage();
      purge();
    }, 2000);
  }

  var tries = 0;
  (function waitReady() {
    tries++;
    if (S() && typeof window.messagesView === "function") boot();
    else if (tries < 60) setTimeout(waitReady, 500);
    else boot(); // on démarre quand même : la purge par intervalle suffira
  })();

  window.stellarionKillArchivedReportsAudit1631 = function () {
    var st = S();
    var msgs = (st && st.messages) || [];
    return {
      patch: "kill-archived-reports-1.6.31",
      totalMessages: msgs.length,
      serverTextReportsRemaining: msgs.filter(isServerTextReport).length,
      richReports: msgs.filter(function (m) { return isCombat(m) && hasRichReport(m); }).length
    };
  };
})();
