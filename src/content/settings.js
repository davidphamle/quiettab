(function () {
  const QT = (window.QT = window.QT || {});

  const DEFAULTS = {
    skin: 'workbook', // v0.4; 'classic' keeps the v0.3 csv-viewer look
    fileName: 'tracker_q3',
    initials: '',
    codeSources: false, // company names -> NPC-xxx codes
    blurOnBlur: false, // P1: switch to Archive when the window loses focus
    paused: false, // adds .qt-off; the only thing allowed to lift armour
    panicKey: { alt: true, shift: true, ctrl: false, meta: false, code: 'KeyQ' },
    archive: null, // { columns: [...], rows: [[...]] } pasted by the user
  };

  const store =
    typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
      ? chrome.storage.local
      : null;
  const listeners = [];

  const S = (QT.settings = {
    DEFAULTS,
    values: { ...DEFAULTS },
    async load() {
      if (!store) return S.values;
      const got = await new Promise((res) => store.get('qt', (r) => res((r && r.qt) || {})));
      S.values = { ...DEFAULTS, ...got };
      return S.values;
    },
    async set(patch) {
      S.values = { ...S.values, ...patch };
      if (store) await new Promise((res) => store.set({ qt: S.values }, res));
      listeners.forEach((fn) => fn(S.values, patch));
    },
    onChange(fn) {
      listeners.push(fn);
    },
  });

  if (store && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.qt) return;
      const next = { ...DEFAULTS, ...changes.qt.newValue };
      const patch = {};
      for (const k of Object.keys(next))
        if (JSON.stringify(next[k]) !== JSON.stringify(S.values[k])) patch[k] = next[k];
      if (!Object.keys(patch).length) return;
      S.values = next;
      listeners.forEach((fn) => fn(S.values, patch));
    });
  }
})();
