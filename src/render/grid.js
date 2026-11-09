// The grid renderer. Items and Archive are both drawn by this one function,
// so the panic landing cannot drift from the everyday view.
//
// It renders into a target it is handed and never touches anything outside
// it, so it cannot move the frame (zero layout shift).
(function () {
  const QT = (window.QT = window.QT || {});
  const { h, colLetter, icons } = QT.ui;

  /**
   * m = {
   *   columns: [{ key, label, w }],
   *   rows: [obj],                 // already filtered and sorted
   *   rowKey: 'id' | null,
   *   activeKey,                   // row whose record is open
   *   sel: { r, c },               // r = -1 is the header row
   *   headerFilters: bool,         // filter buttons in the header row
   *   filtered: { key: true },     // columns with an active filter
   *   minRows, padCols,
   *   onCell(r, c, row), onFilter(colIndex, buttonEl), onNearEnd()
   * }
   */
  function render(target, m) {
    const cols = m.columns;
    const pad = m.padCols || 0;
    const totalCols = cols.length + pad;
    const sel = m.sel || { r: -1, c: 0 };

    const colgroup = h(
      'colgroup',
      null,
      h('col', { style: 'width:46px' }),
      cols.map((c) => h('col', { style: `width:${c.w || 120}px` })),
      Array.from({ length: pad }, () => h('col', { style: 'width:100px' }))
    );

    const letters = h(
      'tr',
      { class: 'g-letters' },
      h('th', { class: 'g-corner' }),
      Array.from({ length: totalCols }, (_, c) =>
        h('th', { class: 'g-letter' + (c === sel.c ? ' hl' : '') }, colLetter(c))
      )
    );

    const headCells = cols.map((col, c) => {
      const on = !!(m.filtered && m.filtered[col.key]);
      return h(
        'td',
        { class: 'g-cell g-hcell' + (sel.r === -1 && sel.c === c ? ' sel' : ''), 'data-r': '-1', 'data-c': String(c) },
        h('span', { class: 'g-txt' }, col.label),
        m.headerFilters &&
          h('button', {
            class: 'g-fbtn' + (on ? ' on' : ''),
            'data-f': String(c),
            'aria-label': 'Filter ' + col.label,
            html: on ? icons.filter : icons.caret,
          })
      );
    });
    for (let i = 0; i < pad; i++) {
      const c = cols.length + i;
      headCells.push(
        h('td', { class: 'g-cell g-hcell' + (sel.r === -1 && sel.c === c ? ' sel' : ''), 'data-r': '-1', 'data-c': String(c) })
      );
    }
    const header = h('tr', { class: 'g-head' }, h('th', { class: 'g-num' + (sel.r === -1 ? ' hl' : '') }, '1'), headCells);

    const body = [];
    const n = Math.max(m.rows.length, m.minRows || 0);
    for (let r = 0; r < n; r++) {
      const row = m.rows[r];
      const active = row && m.rowKey && row[m.rowKey] === m.activeKey;
      body.push(
        h(
          'tr',
          { class: 'g-row' + (active ? ' active' : '') + (row ? '' : ' empty') },
          h('th', { class: 'g-num' + (sel.r === r ? ' hl' : '') }, String(r + 2)),
          Array.from({ length: totalCols }, (_, c) => {
            const col = cols[c];
            const v = row && col ? row[col.key] : '';
            return h(
              'td',
              {
                class: 'g-cell' + (col && col.num ? ' num' : '') + (sel.r === r && sel.c === c ? ' sel' : ''),
                'data-r': String(r),
                'data-c': String(c),
              },
              v == null ? '' : String(v)
            );
          })
        )
      );
    }

    const table = h('table', { class: 'grid' }, colgroup, h('thead', null, letters, header), h('tbody', null, body));

    table.addEventListener('mousedown', (e) => {
      const fb = e.target.closest('[data-f]');
      if (fb) {
        e.preventDefault();
        m.onFilter && m.onFilter(+fb.getAttribute('data-f'), fb);
        return;
      }
      const td = e.target.closest('td[data-r]');
      if (!td) return;
      const r = +td.getAttribute('data-r');
      const c = +td.getAttribute('data-c');
      m.onCell && m.onCell(r, c, r >= 0 ? m.rows[r] : null);
    });

    target.replaceChildren(table);
    if (!target.__qtScroll) {
      target.__qtScroll = true;
      target.addEventListener('scroll', () => {
        const near = target.scrollTop + target.clientHeight >= target.scrollHeight - 200;
        if (near && target.__qtNearEnd) target.__qtNearEnd();
      });
    }
    target.__qtNearEnd = m.onNearEnd || null;
    return table;
  }

  // What the formula bar / name box show for a selection.
  function cellAt(m, r, c) {
    const col = m.columns[c];
    const addr = colLetter(c) + String(r + 2);
    if (!col) return { addr, value: '' };
    if (r === -1) return { addr, value: col.label };
    const row = m.rows[r];
    return { addr, value: row && row[col.key] != null ? String(row[col.key]) : '' };
  }

  QT.grid = { render, cellAt };
})();
