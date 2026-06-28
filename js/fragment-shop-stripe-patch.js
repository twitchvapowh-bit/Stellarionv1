(function () {
  if (window.__stellarionStripeShop) return;
  window.__stellarionStripeShop = true;
  var FUNCTIONS_BASE = (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "https://sqmroxhcmymkalemfrth.supabase.co") + "/functions/v1";
  async function getAccessToken() {
    try { var r = await supa.auth.getSession(); return r && r.data && r.data.session ? r.data.session.access_token : null; }
    catch (e) { return null; }
  }
  window.buyFragmentPack1546 = async function (id) {
    var token = await getAccessToken();
    if (!token) { try { if (typeof addLog === "function") addLog("Connecte-toi pour acheter des fragments."); } catch (e) {} alert("Tu dois etre connecte pour acheter des fragments."); return false; }
    try {
      var res = await fetch(FUNCTIONS_BASE + "/create-checkout", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ pack_id: id }) });
      var data = await res.json();
      if (data && data.url) { window.location.href = data.url; return true; }
      throw new Error(data && data.error ? data.error : "reponse invalide");
    } catch (e) { try { if (typeof addLog === "function") addLog("Boutique : impossible d ouvrir le paiement (" + e.message + ")."); } catch (_) {} alert("Impossible d ouvrir le paiement : " + e.message); return false; }
  };
  async function claimFragments() {
    var token = await getAccessToken();
    if (!token) return 0;
    try {
      var res = await fetch(FUNCTIONS_BASE + "/claim-fragments", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } });
      var data = await res.json();
      var credited = data && data.credited ? Number(data.credited) : 0;
      if (credited > 0) {
        state.resources = state.resources || {};
        state.resources.fragments = (Number(state.resources.fragments) || 0) + credited;
        try { if (typeof addLog === "function") addLog("Paiement confirme : +" + credited + " fragments credites."); } catch (e) {}
        try { if (typeof save === "function") save(); } catch (e) {}
        try { if (typeof updateLiveResourceText === "function") updateLiveResourceText(); } catch (e) {}
        try { if (typeof render === "function") render(); } catch (e) {}
      }
      return credited;
    } catch (e) { return 0; }
  }
  window.stellarionClaimFragments = claimFragments;
  async function claimWithRetry(times) {
    for (var i = 0; i < times; i++) { var c = await claimFragments(); if (c > 0) break; await new Promise(function (r) { setTimeout(r, 2500); }); }
    try { var u = new URL(window.location.href); u.searchParams.delete("stellarion_paid"); window.history.replaceState({}, "", u.toString()); } catch (e) {}
  }
  function boot() {
    var justPaid = /[?&]stellarion_paid=1/.test(window.location.search);
    if (justPaid) claimWithRetry(8); else claimFragments();
  }
  (function waitReady() {
    if (window.__stellarionReady && typeof state !== "undefined" && typeof supa !== "undefined" && supa) { boot(); }
    else { setTimeout(waitReady, 600); }
  })();
})();
