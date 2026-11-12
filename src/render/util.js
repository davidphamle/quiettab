(function () {
  const QT = (window.QT = window.QT || {});
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected']);

  // Tiny element builder. Deterministic by construction: no ids, no random
  // keys, attribute order follows the call. The panic landing relies on this.
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs)
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (PROPS.has(k)) {
          el[k] = v;
          if (k !== 'value') el.setAttribute(k, '');
          else el.setAttribute('value', v);
        } else el.setAttribute(k, v === true ? '' : v);
      }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : String(kid));
    }
    return el;
  }

  function colLetter(i) {
    let s = '';
    i++;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  // Stable short code: used for row refs and for coded company names.
  function code(str, mod) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0;
    return x % mod;
  }

  // Line icons drawn for this project. 16px grid, currentColor stroke.
  const P = (d) =>
    `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const icons = {
    undo: P('<path d="M5 6H10a3 3 0 0 1 0 6H7"/><path d="M7 3.5 4.5 6 7 8.5"/>'),
    redo: P('<path d="M11 6H6a3 3 0 0 0 0 6h3"/><path d="M9 3.5 11.5 6 9 8.5"/>'),
    print: P('<path d="M4.5 6V2.5h7V6"/><rect x="2.5" y="6" width="11" height="5" rx="1"/><path d="M4.5 9.5h7v4h-7z"/>'),
    paint: P('<rect x="3" y="2.5" width="9" height="4" rx="1"/><path d="M12 4.5h1.5v3H8v2"/><path d="M7 9.5h2v4H7z"/>'),
    bold: '<b>B</b>',
    italic: '<i>I</i>',
    strike: '<s>S</s>',
    color: '<u>A</u>',
    fill: P('<path d="M3 9 7.5 4.5 11 8l-4.5 4.5z"/><path d="M12.5 10.5s1 1.3 1 2a1 1 0 0 1-2 0c0-.7 1-2 1-2z"/>'),
    borders: P('<rect x="2.5" y="2.5" width="11" height="11"/><path d="M8 2.5v11M2.5 8h11" stroke-dasharray="1 1.5"/>'),
    merge: P('<path d="M2.5 4v8M13.5 4v8"/><path d="M5 8h6M9 6l2 2-2 2M7 6 5 8l2 2"/>'),
    align: P('<path d="M3 4h10M3 7h7M3 10h10M3 13h7"/>'),
    wrap: P('<path d="M3 4h10M3 8h8a2 2 0 0 1 0 4H9"/><path d="M10 10.5 8.5 12l1.5 1.5"/><path d="M3 12h3"/>'),
    link: P('<path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.5.5"/><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.5-.5"/>'),
    comment: P('<path d="M3 3.5h10v7H7l-3 2.5v-2.5H3z"/>'),
    chart: P('<path d="M3 13.5V2.5M3 13.5h10.5"/><path d="M5.5 11V8M8.5 11V5M11.5 11V7"/>'),
    filter: P('<path d="M2.5 3.5h11L9.5 8.5V13l-3-1.5v-3z"/>'),
    sigma: P('<path d="M12 3.5H4l4 4.5-4 4.5h8"/>'),
    search: P('<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>'),
    caret: P('<path d="m5 6.5 3 3 3-3"/>'),
    ext: P('<path d="M9 3h4v4"/><path d="M13 3 7.5 8.5"/><path d="M11.5 9.5v3.5h-8.5v-8.5h3.5"/>'),
    left: P('<path d="m9.5 4-4 4 4 4"/>'),
    right: P('<path d="m6.5 4 4 4-4 4"/>'),
    plus: P('<path d="M8 3v10M3 8h10"/>'),
    lines: P('<path d="M3 4.5h10M3 8h10M3 11.5h10"/>'),
    star: P('<path d="m8 2.5 1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1 4.6 12.9l.7-3.8L2.5 6.5l3.8-.5z"/>'),
    folder: P('<path d="M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z"/>'),
    cloud: P('<path d="M4.5 12h7a2.5 2.5 0 0 0 .3-5A3.5 3.5 0 0 0 5 7.5 2.3 2.3 0 0 0 4.5 12z"/><path d="m6.5 9.5 1.2 1.2 2.3-2.3"/>'),
    history: P('<path d="M3 8a5 5 0 1 0 1.5-3.5"/><path d="M3 2.5v2.5h2.5"/><path d="M8 5.5V8l2 1.5"/>'),
    close: P('<path d="m4 4 8 8M12 4l-8 8"/>'),
    person: P('<circle cx="8" cy="6" r="2.5"/><path d="M3.5 13.5a4.5 4.5 0 0 1 9 0"/>'),
    lock: P('<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>'),
    doc: P('<path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3"/>'),
    app: `<svg viewBox="0 0 24 24" width="24" height="24"><rect x="2" y="1" width="20" height="22" rx="3" fill="#3b6e8f"/><path d="M6 7h12M6 11.5h12M6 16h12M11 7v10" stroke="#fff" stroke-width="1.6" fill="none"/></svg>`,
  };

  QT.ui = { h, colLetter, code, icons };
})();
