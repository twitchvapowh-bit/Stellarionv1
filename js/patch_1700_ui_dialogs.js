/* STELLARION 1.7.00 — Dialogues et notifications stylés du jeu.
   Objectif : remplacer les popups grises du navigateur (alert/confirm) et
   donner enfin un vrai visuel aux dizaines d'appels toast()/addLog() qui,
   jusqu'ici, se contentaient d'ajouter une ligne dans le journal sans
   jamais rien afficher a l'ecran.
   Additif uniquement : aucune fonction existante n'est supprimee, ce
   fichier ne fait qu'ENVELOPPER window.addLog et window.alert, et fournit
   deux nouvelles fonctions globales (stConfirm, stToast) que main.js
   appelle desormais a la place de confirm() natif (voir 1.5.xx-1.6.xx :
   les ~9 appels confirm() de main.js ont ete convertis en
   "await stConfirm(...)" dans cette meme session). */
(function () {
  "use strict";
  if (window.__stellarionUiDialogs1700) return;
  window.__stellarionUiDialogs1700 = true;

  /* ---------- CSS (injecte une seule fois, aucun !important : ce sont
     des elements neufs, isoles, qui n'ont pas besoin de gagner une
     bataille de specificite contre le reste du jeu) ---------- */
  function injectCss() {
    if (document.getElementById("st-ui-dialogs-css")) return;
    var css =
      "#st-toast-stack{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:2147483630;display:flex;flex-direction:column-reverse;gap:8px;align-items:center;pointer-events:none;max-width:min(92vw,420px)}" +
      "body.stR2 #st-toast-stack{bottom:66px}" +
      ".st-toast{pointer-events:auto;display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:14px;background:rgba(6,16,31,.94);border:1px solid rgba(79,195,247,.28);box-shadow:0 14px 40px rgba(0,0,0,.45);color:#eaf6ff;font:600 13px/1.35 Inter,\"Segoe UI\",Arial,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .22s ease,transform .22s ease;max-width:100%}" +
      ".st-toast.st-toast-in{opacity:1;transform:translateY(0)}" +
      ".st-toast.st-toast-out{opacity:0;transform:translateY(6px)}" +
      ".st-toast .st-toast-dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:var(--stellar-blue,#4FC3F7);box-shadow:0 0 8px currentColor}" +
      ".st-toast.st-type-success{border-color:rgba(105,240,174,.4)} .st-toast.st-type-success .st-toast-dot{background:var(--stellar-green,#69F0AE)}" +
      ".st-toast.st-type-error{border-color:rgba(255,82,82,.45)} .st-toast.st-type-error .st-toast-dot{background:var(--stellar-red,#ff5252)}" +
      ".st-toast.st-type-warning{border-color:rgba(255,213,79,.4)} .st-toast.st-type-warning .st-toast-dot{background:var(--stellar-gold,#FFD54F)}" +
      ".st-toast-msg{white-space:pre-line;word-break:break-word}" +
      "#st-confirm-back{position:fixed;inset:0;z-index:2147483640;background:rgba(1,4,12,.62);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .16s ease}" +
      "#st-confirm-back.st-in{opacity:1}" +
      ".st-confirm-card{width:min(380px,100%);background:linear-gradient(180deg,rgba(9,20,40,.98),rgba(4,10,22,.99));border:1px solid rgba(79,195,247,.35);border-radius:18px;padding:22px 22px 16px;box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 40px rgba(79,195,247,.1);color:#eaf6ff;font-family:Inter,\"Segoe UI\",Arial,sans-serif;transform:translateY(8px);transition:transform .16s ease}" +
      "#st-confirm-back.st-in .st-confirm-card{transform:translateY(0)}" +
      ".st-confirm-msg{font-size:15px;line-height:1.45;margin:0 0 18px;white-space:pre-line}" +
      ".st-confirm-actions{display:flex;gap:10px}" +
      ".st-confirm-actions button{flex:1;padding:11px;border-radius:11px;border:0;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}" +
      ".st-confirm-cancel{background:rgba(255,255,255,.06);color:#cfe3fb;border:1px solid rgba(79,195,247,.25)!important}" +
      ".st-confirm-ok{background:linear-gradient(135deg,#4FC3F7,#3a8fd4);color:#04162e}";
    var s = document.createElement("style");
    s.id = "st-ui-dialogs-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Toasts ---------- */
  var MAX_TOASTS = 4;

  function guessType(msg) {
    var t = String(msg || "");
    if (/❌|erreur|impossible|échec|échoué|refus/i.test(t)) return "error";
    if (/✅|créé|reussi|réussi|succès|confirmé/i.test(t)) return "success";
    if (/⚠|attention|prudence/i.test(t)) return "warning";
    return "info";
  }

  function ensureStack() {
    injectCss();
    var stack = document.getElementById("st-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "st-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function stToast(message, type, durationMs) {
    if (!message) return;
    if (!document.body) { setTimeout(function () { stToast(message, type, durationMs); }, 50); return; }
    var stack = ensureStack();
    type = type || guessType(message);
    var dur = durationMs || (type === "error" ? 6500 : 4200);
    var el = document.createElement("div");
    el.className = "st-toast st-type-" + type;
    el.innerHTML = '<span class="st-toast-dot"></span><span class="st-toast-msg"></span>';
    el.querySelector(".st-toast-msg").textContent = String(message);
    stack.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("st-toast-in"); });
    function remove() {
      if (!el.isConnected) return;
      el.classList.add("st-toast-out");
      el.classList.remove("st-toast-in");
      setTimeout(function () { try { el.remove(); } catch (e) {} }, 240);
    }
    setTimeout(remove, dur);
    el.addEventListener("click", remove);
    // Ecrete la pile : on ne garde jamais plus de MAX_TOASTS a l'ecran.
    while (stack.children.length > MAX_TOASTS) {
      var oldest = stack.lastElementChild; // column-reverse : le plus vieux est en dernier enfant
      if (!oldest) break;
      oldest.remove();
    }
  }
  window.stToast = stToast;

  /* ---------- Confirm stylé (Promise<boolean>) ---------- */
  function stConfirm(message, opts) {
    injectCss();
    opts = opts || {};
    return new Promise(function (resolve) {
      function finish(v) {
        back.classList.remove("st-in");
        document.removeEventListener("keydown", onKey, true);
        setTimeout(function () { try { back.remove(); } catch (e) {} }, 160);
        resolve(v);
      }
      function onKey(e) { if (e.key === "Escape") finish(false); }
      var back = document.createElement("div");
      back.id = "st-confirm-back";
      back.innerHTML =
        '<div class="st-confirm-card">' +
          '<p class="st-confirm-msg"></p>' +
          '<div class="st-confirm-actions">' +
            '<button type="button" class="st-confirm-cancel"></button>' +
            '<button type="button" class="st-confirm-ok"></button>' +
          '</div>' +
        '</div>';
      back.querySelector(".st-confirm-msg").textContent = String(message || "Confirmer ?");
      back.querySelector(".st-confirm-cancel").textContent = opts.cancelLabel || "Annuler";
      back.querySelector(".st-confirm-ok").textContent = opts.okLabel || "Confirmer";
      back.addEventListener("click", function (e) { if (e.target === back) finish(false); });
      back.querySelector(".st-confirm-cancel").addEventListener("click", function () { finish(false); });
      back.querySelector(".st-confirm-ok").addEventListener("click", function () { finish(true); });
      document.body.appendChild(back);
      document.addEventListener("keydown", onKey, true);
      requestAnimationFrame(function () { back.classList.add("st-in"); });
    });
  }
  window.stConfirm = stConfirm;

  /* ---------- Branchements : addLog() affiche desormais un vrai toast,
     alert() natif devient un toast (non bloquant) au lieu d'une popup
     grise. Le comportement d'origine (journal, retour de valeur) est
     conserve a l'identique : on enveloppe, on ne remplace rien. ---------- */
  function wireAddLog() {
    var orig = window.addLog;
    if (typeof orig !== "function" || orig.__st1700) return;
    var wrapped = function (msg) {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) {}
      try { stToast(msg); } catch (e) {}
      return out;
    };
    wrapped.__st1700 = true;
    window.addLog = wrapped;
  }

  // addLog est defini plus tard dans main.js (charge avant ce patch, donc
  // deja present) ; on relance quand meme un filet de securite au cas ou
  // un autre patch le redefinirait apres nous.
  wireAddLog();
  setInterval(wireAddLog, 2000);

  if (!window.__stNativeAlert1700) {
    window.__stNativeAlert1700 = window.alert ? window.alert.bind(window) : null;
    window.alert = function (msg) {
      try { stToast(String(msg == null ? "" : msg), guessType(msg) === "info" ? "warning" : guessType(msg)); }
      catch (e) { try { if (window.__stNativeAlert1700) window.__stNativeAlert1700(msg); } catch (e2) {} }
    };
  }
})();
