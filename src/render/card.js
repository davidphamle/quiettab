// The record card: one row, opened beside the grid.
//
// Layout contract (v0.3, §13 item 1):
//   head   - fixed. Ref, title, metadata: the values the notes are read against.
//   notes  - the ONLY scrolling region.
//   footer - outside the scroll entirely.
//
// Stale-pane guard: the source loads its detail pane after the click, so for
// a moment it still holds the previous record. If the detail title does not
// match this row, the card shows its loading state. An internally
// contradictory record is worse to be caught reading than an empty one.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h, icons } = QT.ui;

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function matches(row, detail) {
    if (!row || !detail || !detail.title) return false;
    const a = norm(row.title);
    const b = norm(detail.title);
    return a === b || (a.length > 8 && (a.indexOf(b) === 0 || b.indexOf(a) === 0));
  }

  function render(target, { row, rowNumber, detail, onSave, onOpen, onClose, busy }) {
    const ok = matches(row, detail);
    const meta = [
      ['Org', row.org],
      ['Location', row.location],
      ['Tier', row.tier],
      ['Posted', row.posted],
      ['Mode', row.mode],
    ];

    const head = h(
      'div',
      { class: 'card-head' },
      h(
        'div',
        { class: 'card-bar' },
        h('span', { class: 'card-ref' }, `Row ${rowNumber} · ${row.ref}`),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', html: icons.close, onclick: onClose })
      ),
      h('div', { class: 'card-title' }, row.title),
      h('dl', { class: 'card-meta' }, meta.map(([k, v]) => [h('dt', null, k), h('dd', null, v || '—')]))
    );

    const notes = h(
      'div',
      { class: 'card-notes', 'data-loading': ok ? null : '' },
      ok
        ? detail.notes.length
          ? detail.notes.map((p) => h('p', null, p))
          : h('p', { class: 'muted' }, 'No notes on this row.')
        : [h('div', { class: 'skel w90' }), h('div', { class: 'skel w70' }), h('div', { class: 'skel w80' }), h('div', { class: 'skel w50' })]
    );

    const saved = ok ? detail.saved : row.status === 'Saved';
    const foot = h(
      'div',
      { class: 'card-foot' },
      h(
        'button',
        { class: 'btn' + (saved ? ' on' : ''), disabled: !ok || !detail.canSave || busy, onclick: onSave },
        saved ? 'Saved' : 'Save'
      ),
      h(
        'button',
        { class: 'btn primary', disabled: !ok || !detail.canApply || busy, onclick: onOpen },
        ok && !detail.easy ? 'Open source' : 'Open form'
      )
    );

    target.replaceChildren(h('div', { class: 'card' }, head, notes, foot));
  }

  QT.card = { render, matches };
})();
