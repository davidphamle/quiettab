// Orchestration: state, rendering, panic.
//
// Nothing here knows the source site's markup; it asks QT.dom.
(function () {
  const QT = (window.QT = window.QT || {});
  const { code } = QT.ui;

  const ITEM_COLS = [
    { key: 'ref', label: 'Ref', w: 74 },
    { key: 'role', label: 'Role', w: 290 },
    { key: 'org', label: 'Org', w: 180 },
    { key: 'location', label: 'Location', w: 190 },
    { key: 'tier', label: 'Tier', w: 86 },
    { key: 'posted', label: 'Posted', w: 110 },
    { key: 'mode', label: 'Mode', w: 74 },
    { key: 'status', label: 'Status', w: 80 },
  ];
  const ITEM_CHIPS = ['org', 'location', 'tier', 'mode', 'status'];

  const fresh = (c) => ({ filters: {}, find: '', sel: { r: -1, c: c || 0 }, sort: null });
  const st = {
    sheet: 'items',
    items: fresh(1),
    archive: fresh(0),
    cardId: null,
    expectForm: false,
    formHidden: false,
    formStep: 1,
  };

  let host = null;
  let root = null;
  let ui = null;
  let lastSig = '';
  let timer = null;
  let lastMore = 0;

  const A = (QT.app = { state: st });

  // ---------- data ----------
  function itemRows() {
    const s = QT.settings.values;
    return QT.dom.readRows().map((r) => ({
      id: r.id,
      ref: 'R-' + String(r.id).slice(-4),
      title: r.title,
      role: r.title,
      org: s.codeSources ? 'NPC-' + (100 + code(r.company || '', 900)) : r.company,
      location: r.location,
      tier: QT.filters.tierOf(r.title),
      posted: r.posted,
      mode: r.easy ? 'Form' : 'Source',
      status: r.state || '',
    }));
  }

  function archiveData() {
    const src = QT.settings.values.archive || QT.archiveDefault;
    const columns = src.columns.map((label, i) => {
      const vals = src.rows.map((r) => r[i] || '');
      const num = vals.length > 0 && vals.every((v) => v === '' || /^[-$€£¥]?\s?[\d,.]+%?$/.test(v));
      return { key: 'c' + i, label, w: i === 0 ? 80 : num ? 100 : 150, num };
    });
    const rows = src.rows.map((r) => {
      const o = {};
      columns.forEach((c, i) => (o[c.key] = r[i] || ''));
      return o;
    });
    return { columns, rows };
  }

  function sortRows(rows, sort, columns) {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const num = (v) => parseFloat(String(v).replace(/[^\d.-]/g, ''));
    return rows.slice().sort((a, b) => {
      const x = a[sort.key] || '';
      const y = b[sort.key] || '';
      const d = col && col.num ? num(x) - num(y) : String(x).localeCompare(String(y));
      return d * sort.dir;
    });
  }

  function model(sheet) {
    const ss = st[sheet];
    const base = sheet === 'items' ? { columns: ITEM_COLS, rows: itemRows() } : archiveData();
    const keys = base.columns.map((c) => c.key);
    const rows = sortRows(QT.filters.apply(base.rows, ss.filters, ss.find, keys), ss.sort, base.columns);
    return { columns: base.columns, all: base.rows, rows };
  }

  // ---------- render ----------
  function formFocused() {
    const a = root && root.activeElement;
    return !!(a && a.closest && a.closest('.f-wrap'));
  }

  function render(force) {
    if (!ui) return;
    const s = QT.settings.values;
    const skin = ui.skin;
    const form = QT.dom.readApply();

    if (!form) {
      if (st.sheet === 'form') st.sheet = 'items';
      st.expectForm = false;
      st.formStep = 1;
    } else {
      if (!form.hasBack) st.formStep = 1;
      if (st.expectForm && !st.formHidden && st.sheet !== 'archive') {
        st.sheet = 'form';
        st.expectForm = false;
      }
    }
    if (st.sheet === 'form' && st.formHidden) st.sheet = 'archive';

    const sheet = st.sheet;
    const m = sheet === 'form' ? null : model(sheet);
    const detail = sheet === 'items' && st.cardId ? QT.dom.readDetail() : null;

    const sig = JSON.stringify([
      st,
      s.skin,
      s.fileName,
      s.codeSources,
      m && m.rows,
      m && m.all.length,
      detail,
      form && { f: form.fields.map((f) => [f.label, f.kind, f.value, f.required]), b: form.hasBack, p: form.primaryLabel },
    ]);
    if (!force && sig === lastSig) return;
    if (sheet === 'form' && formFocused() && !force) return; // don't rebuild under the caret
    lastSig = sig;

    const tabs = [
      { id: 'items', label: 'Items' },
      { id: 'archive', label: 'Archive' },
    ];
    if (form && !st.formHidden) tabs.push({ id: 'form', label: 'Form' });
    ui.tabs.set(tabs, sheet);
    ui.chrome.setName(s.fileName);

    if (sheet === 'form') {
      ui.chrome.setChips([]);
      ui.chrome.setFind('');
      ui.chrome.setFormula('A1', 'Field');
      ui.showSide(false);
      QT.form.render(ui.main, {
        form,
        step: st.formStep,
        onSet: (f, v) => QT.dom.setField(f, v),
        onBack: () => {
          st.formStep = Math.max(1, st.formStep - 1);
          QT.dom.applyBack();
          schedule();
        },
        onNext: () => {
          if (!form.isFinal) st.formStep++;
          QT.dom.applyNext();
          schedule();
        },
      });
      ui.status.set('Ready', form.fields.length + ' fields');
      ui.tabs.setAggregate('');
      return;
    }

    const ss = st[sheet];
    const filtered = {};
    Object.keys(ss.filters).forEach((k) => (filtered[k] = true));

    const gm = {
      columns: m.columns,
      rows: m.rows,
      rowKey: sheet === 'items' ? 'id' : null,
      activeKey: sheet === 'items' ? st.cardId : null,
      sel: ss.sel,
      headerFilters: skin.headerFilters,
      filtered,
      minRows: skin.minRows,
      padCols: skin.padCols,
      onCell: (r, c, row) => {
        ss.sel = { r, c };
        if (sheet === 'items' && row) {
          st.cardId = row.id;
          QT.dom.clickRow(row.id);
        }
        render(true);
      },
      onFilter: (c, anchor) => openFilter(sheet, m.columns[c], anchor),
      onNearEnd: sheet === 'items' ? more : null,
    };
    QT.grid.render(ui.main, gm);

    const chipKeys = sheet === 'items' ? ITEM_CHIPS : m.columns.slice(1, 6).map((c) => c.key);
    ui.chrome.setChips(
      skin.chips
        ? chipKeys.map((k) => {
            const col = m.columns.find((c) => c.key === k);
            return { key: k, label: col.label, on: !!ss.filters[k] };
          })
        : []
    );
    ui.chrome.setFind(ss.find);
    const cell = QT.grid.cellAt(gm, ss.sel.r, ss.sel.c);
    ui.chrome.setFormula(cell.addr, cell.value);

    const row = sheet === 'items' && st.cardId ? m.all.find((r) => r.id === st.cardId) : null;
    if (row) {
      ui.showSide(true);
      const idx = m.rows.indexOf(row);
      QT.card.render(ui.side, {
        row,
        rowNumber: idx === -1 ? '–' : idx + 2,
        detail,
        onSave: () => {
          QT.dom.toggleSave();
          schedule();
        },
        onOpen: () => {
          if (detail && detail.easy) st.expectForm = true;
          QT.dom.openApply();
          schedule();
        },
        onClose: () => {
          st.cardId = null;
          render(true);
        },
      });
    } else ui.showSide(false);

    const shown = m.rows.length;
    const total = m.all.length;
    const isEmptySource = sheet === 'items' && total === 0;
    ui.status.set(isEmptySource ? 'No data in this range' : 'Ready', shown === total ? `${total} rows` : `${shown} of ${total} rows`);
    ui.tabs.setAggregate(`Count: ${shown}`);
  }

  function openFilter(sheet, col, anchor) {
    const m = model(sheet);
    const ss = st[sheet];
    const el = QT.filters.menu({
      title: col.label,
      facets: QT.filters.facet(m.all, col.key),
      allowed: ss.filters[col.key] || null,
      onChange: (allowed) => {
        if (allowed) ss.filters[col.key] = allowed;
        else delete ss.filters[col.key];
        ss.sel = { r: -1, c: ss.sel.c };
        render(true);
      },
      onClose: () => ui.closePop(),
      onSort: ui.skin.headerFilters
        ? (dir) => {
            ss.sort = { key: col.key, dir };
            ui.closePop();
            render(true);
          }
        : null,
    });
    ui.openPop(el, anchor);
  }

  function more() {
    const now = Date.now();
    if (now - lastMore < 800) return;
    lastMore = now;
    QT.dom.loadMore();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => render(false), 120);
  }

  // ---------- panic ----------
  // One-way. Never navigates, submits, closes the source's dialog or removes
  // a node it owns, so a beforeunload is impossible rather than avoided.
  // Return is a deliberate click on the Items tab.
  function panic() {
    if (!ui) return;
    ui.closePop();
    st.sheet = 'archive';
    st.archive = fresh(0);
    st.formHidden = true;
    const a = root.activeElement;
    if (a && a.blur) a.blur();
    render(true);
    ui.main.scrollTop = 0;
    ui.main.scrollLeft = 0;
  }

  // ---------- chrome callbacks ----------
  const ctx = {
    onTab(id) {
      if (id === 'items') st.formHidden = false;
      st.sheet = id;
      ui.closePop();
      render(true);
    },
    onFind(v) {
      if (st.sheet === 'form') return;
      st[st.sheet].find = v;
      render(true);
    },
    onFindEnter(v) {
      if (st.sheet === 'items' && v.trim()) QT.dom.widenSearch(v.trim());
    },
    onChip(key, anchor) {
      const m = model(st.sheet);
      const col = m.columns.find((c) => c.key === key);
      if (col) openFilter(st.sheet, col, anchor);
    },
    openPop(el, anchor) {
      return ui.openPop(el, anchor);
    },
    closePop() {
      ui.closePop();
    },
    action(id) {
      ui.closePop();
      const ss = st[st.sheet];
      if (id === 'clear-filters' && ss) ss.filters = {};
      if (id === 'close-record') st.cardId = null;
      if (id === 'sort-asc' && ss) ss.sort = { key: (model(st.sheet).columns[ss.sel.c] || {}).key, dir: 1 };
      if (id === 'sort-desc' && ss) ss.sort = { key: (model(st.sheet).columns[ss.sel.c] || {}).key, dir: -1 };
      if (id === 'archive') return panic();
      render(true);
    },
  };

  // ---------- keys ----------
  function isPanicKey(e) {
    const k = QT.settings.values.panicKey;
    return e.code === k.code && !!e.altKey === !!k.alt && !!e.shiftKey === !!k.shift && !!e.ctrlKey === !!k.ctrl && !!e.metaKey === !!k.meta;
  }

  function onKey(e) {
    if (isPanicKey(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      panic();
      return;
    }
    // A closed shadow root retargets events to the host, so "from us" means
    // the target is the host; what is focused inside comes from the root.
    if (!ui || e.composedPath()[0] !== host) return;
    const a = root.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    if (st.sheet === 'form') return;
    const ss = st[st.sheet];
    const m = model(st.sheet);
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      ss.sel = {
        r: Math.max(-1, Math.min(m.rows.length - 1, ss.sel.r + dr)),
        c: Math.max(0, Math.min(m.columns.length - 1, ss.sel.c + dc)),
      };
      render(true);
    } else if (e.key === 'Enter' && st.sheet === 'items' && m.rows[ss.sel.r]) {
      const row = m.rows[ss.sel.r];
      st.cardId = row.id;
      QT.dom.clickRow(row.id);
      render(true);
    } else if (e.key === 'Escape') {
      if (ui.popOpen) ui.closePop();
      else if (st.cardId) {
        st.cardId = null;
        render(true);
      }
    }
  }

  // ---------- lifecycle ----------
  function mount() {
    const s = QT.settings.values;
    const skin = QT.skins[s.skin] || QT.skins.classic;
    ui = QT.shell.mount(root, skin, ctx);
    QT.titleGuard && QT.titleGuard.set(skin.title(s.fileName));
    lastSig = '';
    render(true);
  }

  function applyPaused() {
    const paused = !!QT.settings.values.paused;
    document.documentElement.classList.toggle('qt-off', paused);
    host.style.display = paused ? 'none' : 'block';
    if (QT.titleGuard) paused ? QT.titleGuard.release() : QT.titleGuard.engage();
  }

  A.start = function () {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-qt-host', '');
    host.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;display:block;');
    document.documentElement.appendChild(host);
    root = host.attachShadow({ mode: 'closed' });
    A.root = root; // kept in the content-script world only; the page cannot reach a closed root
    applyPaused();
    mount();

    new MutationObserver(schedule).observe(QT.dom.observeRoot(), {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'aria-label', 'datetime'],
    });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', () => {
      if (QT.settings.values.blurOnBlur) panic();
    });

    QT.settings.onChange((v, patch) => {
      if ('paused' in patch) applyPaused();
      if ('skin' in patch || 'fileName' in patch) mount();
      else render(true);
    });

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
        if (!msg) return;
        if (msg.type === 'qt:panic') panic();
        if (msg.type === 'qt:health')
          reply({ misses: QT.health.total, rows: itemRows().length, paused: !!QT.settings.values.paused, skin: QT.settings.values.skin });
      });
    }
  };

  A.panic = panic;
  A.render = render;
  A.flush = () => {
    clearTimeout(timer);
    render(false);
  };
  A.ui = () => ui;
  A.ITEM_COLS = ITEM_COLS;
})();
