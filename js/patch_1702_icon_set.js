/* STELLARION 1.7.02 — Set d'icônes vectorielles à la place des emojis.
   Constat de l'audit : ~530 emojis Unicode servent d'icônes dans toute
   l'interface (🚀⚔️🛡️🏆...). Ils s'affichent différemment selon
   Windows/Mac/Android/le navigateur, ce qui donne un rendu incohérent
   d'une machine à l'autre — le premier détail qui trahit une interface
   "bricolée" face aux références du genre.
   Additif et non destructif : ce patch NE MODIFIE AUCUN texte source. Il
   scanne le DOM déjà rendu (même principe que le "chasseur de pastilles"
   du patch mobile R2 dans index.html) et remplace, uniquement à
   l'affichage, les emojis les plus fréquents par une petite icône SVG
   trait unique qui hérite la couleur du texte environnant (currentColor)
   — cohérente quel que soit l'OS. Le texte d'origine n'est jamais
   modifié en mémoire (state, sauvegardes) : uniquement son rendu visuel. */
(function () {
  "use strict";
  if (window.__stellarionIconSet1702) return;
  window.__stellarionIconSet1702 = true;

  // Paths dessinés main, style trait unique (stroke=currentColor), viewBox 0 0 24 24.
  var ICONS = {
    "🚀": '<path d="M12 2c3 2 4.5 5.5 4.5 9.5 0 2-.5 3.7-1 5l-3.5 3-3.5-3c-.5-1.3-1-3-1-5C7.5 7.5 9 4 12 2z"/><circle cx="12" cy="10" r="1.6"/><path d="M8 15c-1.5.5-2.5 2-2.5 4 2-.3 3.3-1.2 4-2.5M16 15c1.5.5 2.5 2 2.5 4-2-.3-3.3-1.2-4-2.5"/>',
    "⚔️": '<path d="M4 20L16 8M14 4l6 2-2 6-3-1-2-2-1-3z"/><path d="M20 20L8 8M10 4L4 6l2 6 3-1 2-2 1-3z"/>',
    "⚔": '<path d="M4 20L16 8M14 4l6 2-2 6-3-1-2-2-1-3z"/><path d="M20 20L8 8M10 4L4 6l2 6 3-1 2-2 1-3z"/>',
    "🛡️": '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/>',
    "🛡": '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/>',
    "✅": '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16.5 9"/>',
    "❌": '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    "🌍": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z"/>',
    "🌐": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z"/>',
    "🏆": '<path d="M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 5H4v2a4 4 0 004 4M17 5h3v2a4 4 0 01-4 4"/><path d="M12 14v3M9 20h6M9.5 17h5l.5 3h-6l.5-3z"/>',
    "🏗️": '<path d="M4 21V10l5-3 5 3v11M9 21v-6h0M4 13h5M14 21V6l6 3v12M14 12h6"/>',
    "🏗": '<path d="M4 21V10l5-3 5 3v11M9 21v-6h0M4 13h5M14 21V6l6 3v12M14 12h6"/>',
    "📦": '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v9l9 4 9-4V8M12 12v9"/>',
    "🛰️": '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 5l3 3M20 5l-3 3M4 19l3-3M20 19l-3-3M6 6l2.5 2.5M18 6l-2.5 2.5"/>',
    "🛰": '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 5l3 3M20 5l-3 3M4 19l3-3M20 19l-3-3M6 6l2.5 2.5M18 6l-2.5 2.5"/>',
    "✉️": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6l9 7 9-7"/>',
    "✉": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6l9 7 9-7"/>',
    "📩": '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 7l9 6 9-6M12 3v7M9 7l3 3 3-3"/>',
    "📬": '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 7l9 6 9-6"/><circle cx="18" cy="17" r="3"/>',
    "🪐": '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="2.6" transform="rotate(-18 12 12)"/>',
    "⚡": '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
    "🎯": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    "📍": '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.3" r="2.3"/>',
    "👤": '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    "🔒": '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 018 0V11"/>',
    "💠": '<path d="M12 2l5 10-5 10-5-10 5-10z"/><path d="M7 12h10"/>',
    "🌌": '<circle cx="9" cy="10" r="5.5"/><circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="8" r="1" fill="currentColor" stroke="none"/>',
    "💫": '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    "💳": '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M6 14h4"/>',
    "⚜️": '<path d="M12 3c1.2 2 1.2 4-.2 5.4C13.6 9.6 15 8.6 15 6.6c1.6 1 2 3 .8 4.6-1 1.3-2.6 1.6-3.8.9V15h2v2H10v-2h2v-2.9c-1.2.7-2.8.4-3.8-.9-1.2-1.6-.8-3.6.8-4.6 0 2 1.4 3 3.2 1.8C10.8 7 10.8 5 12 3z"/>',
    "🎁": '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9h16M12 9v11"/><path d="M12 9c-2-3-6-3-6-.5C6 9 8 9 12 9zM12 9c2-3 6-3 6-.5C18 9 16 9 12 9z"/>'
  };

  var RE = new RegExp(Object.keys(ICONS)
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); })
    .join("|"), "g");

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1 };

  function makeIcon(ch) {
    var span = document.createElement("span");
    span.className = "st-icon";
    span.setAttribute("data-e", ch);
    span.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[ch] + "</svg>";
    return span;
  }

  function convertTextNode(node) {
    var text = node.nodeValue;
    if (!text) return false;
    RE.lastIndex = 0;
    if (!RE.test(text)) return false;
    RE.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var last = 0, m;
    while ((m = RE.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(makeIcon(m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
    return true;
  }

  function walk(root) {
    if (!root || root.nodeType !== 1 || SKIP_TAGS[root.tagName]) return;
    if (root.classList && root.classList.contains("st-icon")) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || SKIP_TAGS[p.tagName] || (p.classList && p.classList.contains("st-icon"))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) {
      try { convertTextNode(nodes[i]); } catch (e) {}
    }
  }

  function injectCss() {
    if (document.getElementById("st-icon-css")) return;
    var s = document.createElement("style");
    s.id = "st-icon-css";
    s.textContent = ".st-icon{display:inline-flex;vertical-align:-0.15em;line-height:0}.st-icon svg{display:block}";
    document.head.appendChild(s);
  }

  var pending = false;
  function scheduleScan() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      if (document.body) walk(document.body);
    }, 120);
  }

  injectCss();
  document.addEventListener("DOMContentLoaded", scheduleScan);
  window.addEventListener("load", scheduleScan);
  try {
    new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (e) {}
  // Filet de sécurité peu fréquent (le MutationObserver couvre l'essentiel des re-rendus) :
  // volontairement lent pour ne pas ajouter au problème déjà identifié des boucles setInterval.
  setInterval(scheduleScan, 4000);
  scheduleScan();
})();
