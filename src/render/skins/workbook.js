// Workbook skin (v0.4): the layout conventions of a mainstream web
// spreadsheet - title row with menus, formatting toolbar, name box and
// formula bar, frozen header row with filter carets, sheet tabs with an
// aggregate readout.
//
// Deliberately generic: our own icon set, a neutral slate palette, no
// product names, logos, wordmarks or signature brand colours. A convincing
// unbranded tool survives a glance better than an imitation of a specific
// one, where a wrong avatar or a missing menu is exactly what gets noticed.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h, icons } = QT.ui;

  const css = `
.frame, .layer { --chrome-h: 140px; --tabs-h: 38px; --status-h: 0px; --side-w: 380px;
  --ui-font: "Segoe UI", Roboto, system-ui, -apple-system, "Helvetica Neue", sans-serif;
  --cell-font: 13px/1 Arial, "Helvetica Neue", Helvetica, sans-serif;
  --hdr-font: 11px/1 "Segoe UI", Roboto, system-ui, sans-serif;
  --row-h: 21px; --radius: 6px;
  --chrome-bg: #f8f9fb; --sheet-bg: #ffffff; --panel-bg: #ffffff;
  --ink: #1f2328; --ink-2: #444a53; --ink-3: #6b7280; --cell-ink: #1f2328;
  --line: #e5e7eb; --line-strong: #d4d7dd; --grid: #e2e4e8;
  --hdr-bg: #f3f4f6; --hdr-ink: #5b616e; --hdr-hl: #d6e2f5; --hdr-hl-ink: #1d3f7a;
  --frozen-bg: #ffffff; --freeze-line: #c4c9d1;
  --accent: #2f6fde; --accent-soft: #e8effc; --sel-fill: rgba(47,111,222,.07);
  --hover: #eceef2; --row-hover: transparent; --row-active: #f3f7fe; }
.frame .g-letters th { font-weight: 400; }
.frame .g-head td { font-weight: 700; }
.frame .grid td { border-color: var(--grid); }

/* title row */
.w-top { height: 64px; display: flex; align-items: center; padding: 0 12px 0 10px; gap: 10px; }
.w-app { width: 36px; height: 40px; display: grid; place-items: center; flex: 0 0 auto; }
.w-app svg { width: 26px; height: 26px; }
.w-titles { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 1px; }
.w-namerow { display: flex; align-items: center; gap: 2px; height: 26px; }
.w-name { font-size: 18px; line-height: 24px; padding: 0 6px; border-radius: 4px; border: 1px solid transparent; color: var(--ink); }
.w-name:hover { border-color: var(--line-strong); }
.w-mini { width: 24px; height: 24px; display: inline-grid; place-items: center; color: var(--ink-3); border-radius: 50%; }
.w-mini:hover { background: var(--hover); }
.w-saved { color: var(--ink-3); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; margin-left: 4px; }
.w-menus { display: flex; height: 24px; margin-left: 0; }
.w-menu { padding: 0 7px; border-radius: 4px; font-size: 14px; color: var(--ink); line-height: 24px; }
.w-menu:hover, .w-menu.open { background: var(--hover); }
.w-right { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.w-round { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: var(--ink-2); }
.w-round:hover { background: var(--hover); }
.w-round svg { width: 20px; height: 20px; }
.w-share { height: 36px; padding: 0 18px; border-radius: 18px; background: #dbe5f6; color: #183b70; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
.w-share:hover { background: #cfdcf2; }
.w-avatar { width: 32px; height: 32px; border-radius: 50%; background: #5b7083; color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 600; margin-left: 4px; }
.w-avatar svg { width: 20px; height: 20px; }

/* toolbar */
.w-tools { height: 40px; margin: 0 10px; padding: 0 6px; display: flex; align-items: center; gap: 1px; background: #eef1f5; border-radius: 20px; overflow: hidden; }
.tb { min-width: 28px; height: 28px; padding: 0 4px; border-radius: 4px; display: inline-grid; place-items: center; color: var(--ink-2); font-size: 14px; }
.tb:hover { background: #e1e5eb; }
.tb.on { background: #d6e2f5; color: var(--accent); }
.tb.txt { padding: 0 6px; font-size: 13px; display: inline-flex; gap: 2px; }
.tb.box { border: 1px solid transparent; }
.tb.drop { display: inline-flex; gap: 2px; padding: 0 4px 0 8px; font-size: 13px; }
.tb.drop svg { width: 12px; height: 12px; }
.tb b, .tb i, .tb s, .tb u { font-family: "Times New Roman", Georgia, serif; font-size: 15px; }
.tb-sep { width: 1px; height: 20px; background: #c9ced6; margin: 0 5px; flex: 0 0 auto; }
.w-find { margin-left: auto; height: 28px; width: 220px; flex: 0 1 220px; display: flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 14px; background: #fff; color: var(--ink-3); border: 1px solid transparent; }
.w-find:focus-within { border-color: var(--accent); }
.w-find input { border: 0; outline: 0; background: transparent; flex: 1; min-width: 0; font-size: 13px; color: var(--ink); }

/* formula bar */
.w-fx { height: 30px; margin-top: 6px; display: flex; align-items: center; border-top: 1px solid var(--line-strong); background: var(--sheet-bg); }
.w-namebox { width: 96px; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 6px 0 10px; border-right: 1px solid var(--line-strong); font: 13px Arial, sans-serif; color: var(--ink); }
.w-namebox svg { width: 12px; height: 12px; color: var(--ink-3); }
.w-fxglyph { width: 36px; text-align: center; font: italic 14px Georgia, "Times New Roman", serif; color: var(--ink-3); border-right: 1px solid var(--line); }
.w-fxval { flex: 1; padding: 0 10px; font: 13px Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }

/* sheet tabs */
.w-tabs { height: 100%; display: flex; align-items: center; gap: 2px; padding: 0 10px 0 6px; background: var(--chrome-bg); border-top: 1px solid var(--line-strong); }
.w-tabs .w-round { width: 32px; height: 32px; }
.w-tabs .w-round svg { width: 18px; height: 18px; }
.w-tab { height: 30px; padding: 0 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); }
.w-tab:hover { background: var(--hover); }
.w-tab.on { background: #dfe8f7; color: #1d3f7a; font-weight: 600; }
.w-tab svg { width: 12px; height: 12px; opacity: .7; }
.w-pager { margin-left: auto; display: flex; align-items: center; }
.w-agg { height: 30px; padding: 0 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); }
.w-agg:hover { background: var(--hover); }
.w-agg:empty { display: none; }

/* side panel: reads as the tool's own details panel */
.side { box-shadow: -1px 0 0 var(--line); }
.card-head { padding-top: 12px; }

/* menus */
.mmenu { width: 260px; padding: 6px 0; }
.mm-item.dim { color: var(--ink-3); }
`;

  const MENUS = [
    ['File', [['New', 'Ctrl+N'], ['Open', 'Ctrl+O'], ['Make a copy'], '-', ['Download'], ['Version history'], '-', ['Print', 'Ctrl+P']]],
    ['Edit', [['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Y'], '-', ['Cut', 'Ctrl+X'], ['Copy', 'Ctrl+C'], ['Paste', 'Ctrl+V'], '-', ['Find and replace', 'Ctrl+H']]],
    ['View', [['Show', null], ['Freeze', null], ['Gridlines'], '-', ['Close details panel', null, 'close-record'], '-', ['Zoom']]],
    ['Insert', [['Rows above'], ['Rows below'], ['Columns left'], ['Columns right'], '-', ['Chart'], ['Comment', 'Ctrl+Alt+M']]],
    ['Format', [['Number'], ['Text'], ['Alignment'], ['Wrapping'], '-', ['Conditional formatting'], ['Alternating colours'], '-', ['Clear formatting', 'Ctrl+\\']]],
    ['Data', [['Sort sheet A → Z', null, 'sort-asc'], ['Sort sheet Z → A', null, 'sort-desc'], '-', ['Remove filter', null, 'clear-filters'], ['Filter views'], '-', ['Data validation'], ['Column stats']]],
    ['Tools', [['Spelling'], ['Notification settings'], ['Accessibility']]],
    ['Help', [['Search the menus', 'Alt+/'], ['Keyboard shortcuts', 'Ctrl+/']]],
  ];

  function menuEl(items, ctx) {
    return h(
      'div',
      { class: 'mmenu', role: 'menu' },
      items.map((it) =>
        it === '-'
          ? h('div', { class: 'mm-sep' })
          : h(
              'button',
              { class: 'mm-item' + (it[2] ? '' : ''), role: 'menuitem', onclick: () => ctx.action(it[2] || 'noop') },
              h('span', null, it[0]),
              it[1] ? h('span', { class: 'k' }, it[1]) : null
            )
      )
    );
  }

  function chrome(ctx) {
    const s = QT.settings.values;
    const name = h('span', { class: 'w-name' });
    const nameBox = h('span');
    const fxVal = h('div', { class: 'w-fxval' });
    const input = h('input', {
      type: 'text',
      placeholder: 'Find in sheet',
      oninput: (e) => ctx.onFind(e.target.value),
      onkeydown: (e) => {
        if (e.key === 'Enter') ctx.onFindEnter(e.target.value);
      },
    });

    const menus = MENUS.map(([label, items]) =>
      h('button', { class: 'w-menu', onclick: (e) => ctx.openPop(menuEl(items, ctx), e.currentTarget) }, label)
    );

    const tb = (icon, label, cls) => h('button', { class: 'tb' + (cls ? ' ' + cls : ''), 'aria-label': label, html: icon, onclick: () => ctx.action('noop') });
    const txt = (t, label) => h('button', { class: 'tb txt', 'aria-label': label, onclick: () => ctx.action('noop') }, t);
    const drop = (t, label) => h('button', { class: 'tb drop', 'aria-label': label, onclick: () => ctx.action('noop') }, t, h('span', { html: icons.caret }));
    const sep = () => h('span', { class: 'tb-sep' });

    const avatar = s.initials ? h('span', { class: 'w-avatar' }, s.initials) : h('span', { class: 'w-avatar', html: icons.person });

    const el = h(
      'div',
      null,
      h(
        'div',
        { class: 'w-top' },
        h('span', { class: 'w-app', html: icons.app }),
        h(
          'div',
          { class: 'w-titles' },
          h(
            'div',
            { class: 'w-namerow' },
            name,
            h('button', { class: 'w-mini', 'aria-label': 'Star', html: icons.star }),
            h('button', { class: 'w-mini', 'aria-label': 'Move', html: icons.folder }),
            h('span', { class: 'w-saved', html: icons.cloud + '<span>All changes saved</span>' })
          ),
          h('div', { class: 'w-menus' }, menus)
        ),
        h(
          'div',
          { class: 'w-right' },
          h('button', { class: 'w-round', 'aria-label': 'Version history', html: icons.history }),
          h('button', { class: 'w-round', 'aria-label': 'Comments', html: icons.comment }),
          h('button', { class: 'w-share', html: icons.lock + '<span>Share</span>' }),
          avatar
        )
      ),
      h(
        'div',
        { class: 'w-tools' },
        tb(icons.undo, 'Undo'),
        tb(icons.redo, 'Redo'),
        tb(icons.print, 'Print'),
        tb(icons.paint, 'Paint format'),
        drop('100%', 'Zoom'),
        sep(),
        txt('$', 'Currency'),
        txt('%', 'Percent'),
        txt('.0', 'Fewer decimals'),
        txt('.00', 'More decimals'),
        txt('123', 'More formats'),
        sep(),
        drop('Default', 'Font'),
        sep(),
        h('button', { class: 'tb txt box', 'aria-label': 'Font size' }, '10'),
        sep(),
        tb(icons.bold, 'Bold'),
        tb(icons.italic, 'Italic'),
        tb(icons.strike, 'Strikethrough'),
        tb(icons.color, 'Text colour'),
        sep(),
        tb(icons.fill, 'Fill colour'),
        tb(icons.borders, 'Borders'),
        tb(icons.merge, 'Merge cells'),
        sep(),
        tb(icons.align, 'Horizontal align'),
        tb(icons.wrap, 'Text wrapping'),
        sep(),
        tb(icons.link, 'Insert link'),
        tb(icons.comment, 'Insert comment'),
        tb(icons.chart, 'Insert chart'),
        tb(icons.filter, 'Filter'),
        tb(icons.sigma, 'Functions'),
        h('label', { class: 'w-find', html: icons.search }, input)
      ),
      h(
        'div',
        { class: 'w-fx' },
        h('div', { class: 'w-namebox' }, nameBox, h('span', { html: icons.caret })),
        h('div', { class: 'w-fxglyph' }, 'fx'),
        fxVal
      )
    );

    return {
      el,
      setName(n) {
        if (name.textContent !== n) name.textContent = n;
      },
      setFind(v) {
        if (input.value !== v) input.value = v;
        input.setAttribute('value', v);
      },
      setFormula(addr, value) {
        nameBox.textContent = addr;
        fxVal.textContent = value;
      },
      setChips() {},
    };
  }

  function tabs(ctx) {
    const list = h('span', { style: 'display:contents' });
    const agg = h('button', { class: 'w-agg' });
    const pg = QT.shell.pager(ctx);
    const el = h(
      'div',
      { class: 'w-tabs' },
      h('button', { class: 'w-round', 'aria-label': 'Add sheet', html: icons.plus, onclick: () => ctx.action('noop') }),
      h('button', { class: 'w-round', 'aria-label': 'All sheets', html: icons.lines, onclick: () => ctx.action('noop') }),
      list,
      h('span', { class: 'w-pager' }, pg.el),
      agg
    );
    return {
      el,
      set(items, active) {
        list.replaceChildren(
          ...items.map((t) =>
            h('button', { class: 'w-tab' + (t.id === active ? ' on' : ''), 'data-tab': t.id, onclick: () => ctx.onTab(t.id) }, t.label, h('span', { html: icons.caret }))
          )
        );
      },
      setAggregate(text) {
        agg.textContent = text;
      },
      setPager: pg.set,
    };
  }

  function status() {
    // The workbook has no separate status line; the aggregate lives in the
    // tab bar. Band height is 0, so this never draws.
    return { el: h('span'), set() {} };
  }

  QT.skins = QT.skins || {};
  QT.skins.workbook = {
    id: 'workbook',
    label: 'Workbook (web spreadsheet)',
    css,
    headerFilters: true,
    chips: false,
    padCols: 6,
    minRows: 60,
    title: (n) => n,
    chrome,
    tabs,
    status,
  };
})();
