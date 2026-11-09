// Filters work on the rows already loaded, never on the source site's facets.
//
// Why not wire them to the site's own filters:
//  1. Their facets are a server round trip. That is a repaint on the most
//     used control, in a product whose whole premise is stillness.
//  2. Their facet markup differs between the search and collections routes,
//     so it would double the maintenance surface in dom.js.
//  3. Filtering the rows in front of you is what a spreadsheet does. Anyone
//     watching expects that, not a page reload.
// Typing narrows locally. Enter in the find box hands the string to the
// site's search to widen. Known limit: a filter cannot reach a row that has
// not loaded yet.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h } = QT.ui;

  // Experience level is not on a result card, so tier comes from the title.
  // First match wins; order matters.
  const TIERS = [
    ['Executive', /\b(chief|c[etfo]o|vp|vice president|head of)\b/i],
    ['Director', /\bdirector\b/i],
    ['Principal', /\b(principal|staff|distinguished)\b/i],
    ['Lead', /\b(lead|team lead)\b/i],
    ['Senior', /\b(senior|sr\.?|snr)\b/i],
    ['Junior', /\b(junior|jr\.?|graduate|grad|intern(ship)?|entry[- ]level|trainee)\b/i],
  ];
  function tierOf(title) {
    for (const [name, re] of TIERS) if (re.test(title || '')) return name;
    return 'Mid';
  }

  function facet(rows, key) {
    const counts = new Map();
    for (const r of rows) {
      const v = r[key] == null || r[key] === '' ? '(Blanks)' : String(r[key]);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }

  // filters: { key: [allowedValue, ...] } ; missing key = no filter.
  function apply(rows, filters, find, keys) {
    const f = filters || {};
    const needle = (find || '').trim().toLowerCase();
    return rows.filter((r) => {
      for (const k of Object.keys(f)) {
        const allowed = f[k];
        if (!allowed) continue;
        const v = r[k] == null || r[k] === '' ? '(Blanks)' : String(r[k]);
        if (allowed.indexOf(v) === -1) return false;
      }
      if (needle) {
        const hay = (keys || Object.keys(r)).map((k) => String(r[k] == null ? '' : r[k])).join(' ').toLowerCase();
        if (hay.indexOf(needle) === -1) return false;
      }
      return true;
    });
  }

  // The filter menu: a spreadsheet's "filter by values" popover. Toggling a
  // value filters the grid immediately; OK just closes.
  function menu({ title, facets, allowed, onChange, onClose, onSort }) {
    const isOn = (v) => !allowed || allowed.indexOf(v) !== -1;
    let query = '';
    const list = h('div', { class: 'fm-list' });
    const all = facets.map((f) => f.value);

    function emit(next) {
      allowed = next && next.length === all.length ? null : next;
      onChange(allowed);
      paint();
    }
    function paint() {
      list.replaceChildren(
        ...facets
          .filter((f) => !query || f.value.toLowerCase().indexOf(query) !== -1)
          .map((f) =>
            h(
              'label',
              { class: 'fm-item' },
              h('input', {
                type: 'checkbox',
                checked: isOn(f.value),
                onchange: (e) => {
                  const cur = allowed ? allowed.slice() : all.slice();
                  const i = cur.indexOf(f.value);
                  if (e.target.checked && i === -1) cur.push(f.value);
                  if (!e.target.checked && i !== -1) cur.splice(i, 1);
                  emit(cur);
                },
              }),
              h('span', { class: 'fm-val' }, f.value),
              h('span', { class: 'fm-count' }, String(f.count))
            )
          )
      );
    }
    paint();

    return h(
      'div',
      { class: 'fmenu', role: 'dialog', 'aria-label': 'Filter ' + title },
      onSort &&
        h(
          'div',
          { class: 'fm-sort' },
          h('button', { class: 'fm-row', onclick: () => onSort(1) }, 'Sort A → Z'),
          h('button', { class: 'fm-row', onclick: () => onSort(-1) }, 'Sort Z → A')
        ),
      h('div', { class: 'fm-head' }, 'Filter by values'),
      h(
        'div',
        { class: 'fm-links' },
        h('button', { class: 'fm-link', onclick: () => emit(null) }, 'Select all'),
        h('span', null, ' · '),
        h('button', { class: 'fm-link', onclick: () => emit([]) }, 'Clear')
      ),
      h('input', {
        class: 'fm-search',
        type: 'text',
        placeholder: 'Search values',
        oninput: (e) => {
          query = e.target.value.toLowerCase();
          paint();
        },
      }),
      list,
      h('div', { class: 'fm-foot' }, h('button', { class: 'btn primary', onclick: onClose }, 'OK'))
    );
  }

  QT.filters = { TIERS, tierOf, facet, apply, menu };
})();
