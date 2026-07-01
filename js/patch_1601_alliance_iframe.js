
/* STELLARION 1.6.01 - Isolation iframe des champs alliance/QG/annonces (fix definitif) */
(function(){
  "use strict";
  if (window.__stellarionAllianceIframeIsolation1601) return;
  window.__stellarionAllianceIframeIsolation1601 = true;

  // id ou classe -> comment pousser la valeur tapée vers le state du jeu
  var FIELD_MAP = [
    { match: function(el){ return el.id === "allianceResetChat1599"; },
      push: function(v){ try{ window.allianceResetSetDraft1599("chat", v); }catch(e){} },
      big: false },
    { match: function(el){ return el.id === "allianceResetAnnouncement1599"; },
      push: function(v){ try{ window.allianceResetSetDraft1599("announcement", v); }catch(e){} },
      big: true },
    { match: function(el){ return el.id === "allianceCxChat"; },
      push: function(v){ try{ var s=window.state; if(s) s.allianceChatDraft=v; }catch(e){} },
      big: false },
    { match: function(el){ return el.id === "allianceCxAnnouncement"; },
      push: function(v){ try{ var s=window.state; if(s){ s.allianceAnnouncementDraft=v; s.allianceCx=s.allianceCx||{}; s.allianceCx.announcementDraft=v; } }catch(e){} },
      big: true },
    { match: function(el){ return el.classList && (el.classList.contains("alliance-v5-field") || el.classList.contains("alliance-safe-field") || el.classList.contains("alliance-v4-field")); },
      push: function(v){ try{ window.setAllianceChatDraft(v); }catch(e){} },
      big: false }
  ];

  var FOCUS_STATE = {}; // id -> {focused:bool, caret:int, value:string}

  function findRule(el){
    for (var i=0;i<FIELD_MAP.length;i++){ if (FIELD_MAP[i].match(el)) return FIELD_MAP[i]; }
    return null;
  }

  function styleFor(big){
    return "html,body{margin:0;padding:0;background:transparent}" +
      "textarea{box-sizing:border-box;width:100%;height:100%;min-height:" + (big?"140px":"90px") + ";" +
      "background:#06101f;color:#e2e8f0;border:1px solid rgba(79,195,247,.30);border-radius:12px;" +
      "padding:10px;font:14px Inter,Segoe UI,Arial,sans-serif;resize:vertical;outline:none;caret-color:#4FC3F7;}";
  }

  function makeIframe(originalEl, rule){
    var id = originalEl.id || ("field_" + Math.random().toString(36).slice(2));
    var initialValue = originalEl.value || "";
    var placeholder = originalEl.getAttribute("placeholder") || "";

    var iframe = document.createElement("iframe");
    iframe.setAttribute("data-stellarion-isolated", id);
    iframe.style.border = "none";
    iframe.style.width = "100%";
    iframe.style.height = rule.big ? "150px" : "100px";
    iframe.style.display = "block";
    iframe.style.background = "transparent";

    var esc = function(s){ return String(s||"").replace(/[&<>"']/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); };

    iframe.srcdoc =
      "<!doctype html><html><head><meta charset='utf-8'><style>" + styleFor(rule.big) + "</style></head>" +
      "<body><textarea id='inner' placeholder='" + esc(placeholder) + "'>" + esc(initialValue) + "</textarea>" +
      "<script>" +
      "var t=document.getElementById('inner');" +
      "t.addEventListener('input',function(){" +
      "  try{ parent.postMessage({stellarionField:'" + id + "', value:t.value, caret:t.selectionStart}, '*'); }catch(e){}" +
      "});" +
      "t.addEventListener('keyup',function(){" +
      "  try{ parent.postMessage({stellarionField:'" + id + "', value:t.value, caret:t.selectionStart}, '*'); }catch(e){}" +
      "});" +
      "t.addEventListener('click',function(){" +
      "  try{ parent.postMessage({stellarionField:'" + id + "', value:t.value, caret:t.selectionStart}, '*'); }catch(e){}" +
      "});" +
      "t.addEventListener('focus',function(){ try{ parent.postMessage({stellarionFieldFocus:'" + id + "'}, '*'); }catch(e){} });" +
      "t.addEventListener('blur',function(){ try{ parent.postMessage({stellarionFieldBlur:'" + id + "'}, '*'); }catch(e){} });" +
      "<\/script></body></html>";

    originalEl.style.display = "none";
    originalEl.setAttribute("data-stellarion-shadowed", "1");
    originalEl.parentNode.insertBefore(iframe, originalEl);

    // Si ce champ avait le focus juste avant (recréé par un render), on le redonne
    var wasFocused = FOCUS_STATE[id] && FOCUS_STATE[id].focused;
    if (wasFocused) {
      requestAnimationFrame(function(){
        try {
          var innerDoc = iframe.contentWindow.document;
          var innerT = innerDoc.getElementById("inner");
          if (innerT) {
            innerT.value = FOCUS_STATE[id].value != null ? FOCUS_STATE[id].value : initialValue;
            innerT.focus();
            if (FOCUS_STATE[id].caret != null) {
              innerT.setSelectionRange(FOCUS_STATE[id].caret, FOCUS_STATE[id].caret);
            }
          }
        } catch(e){}
      });
    }

    return iframe;
  }

  window.addEventListener("message", function(ev){
    var data = ev.data;
    if (!data || typeof data !== "object") return;
    if (data.stellarionField) {
      FOCUS_STATE[data.stellarionField] = FOCUS_STATE[data.stellarionField] || {};
      FOCUS_STATE[data.stellarionField].value = data.value;
      FOCUS_STATE[data.stellarionField].caret = data.caret;
      // pousse la valeur vers le state du jeu via la bonne fonction
      var iframeEl = document.querySelector("iframe[data-stellarion-isolated='" + data.stellarionField + "']");
      if (iframeEl) {
        var shadow = document.getElementById(data.stellarionField);
        var rule = shadow ? findRule(shadow) : null;
        if (rule) rule.push(data.value);
      }
    }
    if (data.stellarionFieldFocus) {
      FOCUS_STATE[data.stellarionFieldFocus] = FOCUS_STATE[data.stellarionFieldFocus] || {};
      FOCUS_STATE[data.stellarionFieldFocus].focused = true;
    }
    if (data.stellarionFieldBlur) {
      FOCUS_STATE[data.stellarionFieldBlur] = FOCUS_STATE[data.stellarionFieldBlur] || {};
      FOCUS_STATE[data.stellarionFieldBlur].focused = false;
    }
  });

  function scanAndIsolate(){
    var candidates = document.querySelectorAll(
      "#allianceResetChat1599, #allianceResetAnnouncement1599, #allianceCxChat, #allianceCxAnnouncement, " +
      ".alliance-v5-field, .alliance-safe-field, .alliance-v4-field"
    );
    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (el.getAttribute("data-stellarion-shadowed")) continue; // déjà traité
      var rule = findRule(el);
      if (!rule) continue;
      makeIframe(el, rule);
    }
  }

  scanAndIsolate();
  setInterval(scanAndIsolate, 80); // filet de sécurité

  // Détection instantanée dès qu'un render() recrée un des champs ciblés
  try {
    var mo = new MutationObserver(function(){ scanAndIsolate(); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch(e){}

  window.stellarionAllianceIframeAudit1601 = function(){
    return {
      patch: "alliance-iframe-isolation-1.6.01",
      isolatedIframes: Array.prototype.slice.call(document.querySelectorAll("iframe[data-stellarion-isolated]")).map(function(f){return f.getAttribute("data-stellarion-isolated");}),
      focusState: FOCUS_STATE
    };
  };
})();
