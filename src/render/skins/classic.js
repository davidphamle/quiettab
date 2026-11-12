// Classic skin: the v0.2 Figma look. A csv viewer: one file bar, a row of
// filter chips with a find box, sheet tabs, a status line.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h, icons } = QT.ui;

  const css = `
.frame, .layer { --chrome-h: 78px; --tabs-h: 30px; --status-h: 22px; --side-w: 380px;
  --ui-font: "Segoe UI", system-ui, -apple-system, sans-serif;
  --cell-font: 12.5px/1 ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace;
  --hdr-font: 11px/1 ui-monospace, Menlo, Consolas, monospace;
  --row-h: 24px; --radius: 3px;
  --chrome-bg: #f4f4f2; --sheet-bg: #ffffff; --panel-bg: #fbfbfa;
  --ink: #24292f; --ink-2: #444c56; --ink-3: #7a828c; --cell-ink: #24292f;
  --line: #e4e4e1; --line-strong: #d0d0cc; --grid: #ececea;
  --hdr-bg: #f4f4f2; --hdr-ink: #7a828c; --hdr-hl: #e2e8ef; --hdr-hl-ink: #24292f;
  --frozen-bg: #fafaf9; --freeze-line: #d0d0cc;
  --accent: #3d6b8c; --accent-soft: #e6eef4; --sel-fill: rgba(61,107,140,.06);
  --hover: #ececea; --row-hover: #fafaf8; --row-active: #eef3f7; }
.c-file { height: 38px; display: flex; align-items: center; gap: 8px; padding: 0 12px; }
.c-file .doc { color: var(--ink-3); display: grid; }
.c-name { font-weight: 600; }
.c-ro { margin-left: auto; color: var(--ink-3); font-size: 12px; display: flex; gap: 4px; align-items: center; }
.c-chips { height: 40px; display: flex; align-items: center; gap: 6px; padding: 0 12px; }
.chip { height: 26px; padding: 0 8px 0 10px; border: 1px solid var(--line-strong); border-radius: 13px; background: var(--sheet-bg); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
.chip.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.chip svg { width: 12px; height: 12px; }
.find { margin-left: auto; height: 28px; width: 240px; display: flex; align-items: center; gap: 6px; padding: 0 8px; border: 1px solid var(--line-strong); border-radius: var(--radius); background: var(--sheet-bg); color: var(--ink-3); }
.find input { border: 0; outline: 0; background: transparent; flex: 1; min-width: 0; color: var(--ink); }
.c-tabs { display: flex; height: 100%; align-items: stretch; padding-left: 46px; border-top: 1px solid var(--line-strong); background: var(--chrome-bg); }
.c-tab { padding: 0 16px; border-right: 1px solid var(--line-strong); color: var(--ink-2); font-size: 12px; }
.c-tab.on { background: var(--sheet-bg); color: var(--ink); font-weight: 600; box-shadow: inset 0 2px 0 var(--accent); }
.c-pager { margin-left: auto; display: flex; align-items: center; padding-right: 8px; }
.c-status { display: flex; height: 100%; align-items: center; padding: 0 12px; font-size: 11.5px; color: var(--ink-3); border-top: 1px solid var(--line); }
`;

  function chrome(ctx) {
    const name = h('span', { class: 'c-name' });
    const chipsBox = h('span', { style: 'display:contents' });
    const input = h('input', {
      type: 'text',
      placeholder: 'Find',
      oninput: (e) => ctx.onFind(e.target.value),
      onkeydown: (e) => {
        if (e.key === 'Enter') ctx.onFindEnter(e.target.value);
      },
    });
    const el = h(
      'div',
      null,
      h('div', { class: 'c-file' }, h('span', { class: 'doc', html: icons.doc }), name, h('span', { class: 'c-ro', html: icons.lock + '<span>Read-only</span>' })),
      h('div', { class: 'c-chips' }, chipsBox, h('label', { class: 'find', html: icons.search }, input))
    );
    return {
      el,
      setName(n) {
        name.textContent = n + '.csv';
      },
      setFind(v) {
        input.value = v;
        input.setAttribute('value', v);
      },
      setFormula() {},
      setChips(list) {
        // list: [{ key, label, on }] ; empty on sheets without chips
        chipsBox.replaceChildren(
          ...list.map((c) =>
            h('button', { class: 'chip' + (c.on ? ' on' : ''), 'data-chip': c.key, onclick: (e) => ctx.onChip(c.key, e.currentTarget) }, c.label, h('span', { html: icons.caret }))
          )
        );
      },
      setMenus() {},
    };
  }

  function tabs(ctx) {
    const list = h('span', { style: 'display:contents' });
    const pg = QT.shell.pager(ctx);
    const el = h('div', { class: 'c-tabs' }, list, h('span', { class: 'c-pager' }, pg.el));
    return {
      el,
      set(items, active) {
        list.replaceChildren(...items.map((t) => h('button', { class: 'c-tab' + (t.id === active ? ' on' : ''), 'data-tab': t.id, onclick: () => ctx.onTab(t.id) }, t.label)));
      },
      setAggregate() {},
      setPager: pg.set,
    };
  }

  function status() {
    const l = h('span');
    const r = h('span', { style: 'margin-left:auto' });
    return {
      el: h('div', { class: 'c-status' }, l, r),
      set(left, right) {
        l.textContent = left;
        r.textContent = right;
      },
    };
  }

  QT.skins = QT.skins || {};
  QT.skins.classic = {
    id: 'classic',
    label: 'Classic (csv viewer)',
    css,
    headerFilters: false,
    chips: true,
    padCols: 0,
    minRows: 0,
    title: (n) => n + '.csv',
    chrome,
    tabs,
    status,
  };
})();
