// The Form sheet: the source's apply dialog, redrawn as two columns of cells.
//
// The dialog itself stays open under armour, invisible and inert, holding
// every value. This sheet reads from it and writes into it; it never owns
// state. That is why panic can leave it alone and resume is silent.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h, colLetter } = QT.ui;

  function control(f, onSet) {
    if (f.kind === 'select' || f.kind === 'radio')
      return h(
        'select',
        { class: 'f-in', onchange: (e) => onSet(f, e.target.value) },
        f.kind === 'radio' && h('option', { value: '', selected: !f.value }, 'Select…'),
        f.options.map((o) => h('option', { value: o.value, selected: o.value === f.value }, o.label))
      );
    if (f.kind === 'checkbox')
      return h('input', { class: 'f-chk', type: 'checkbox', checked: !!f.value, onchange: (e) => onSet(f, e.target.checked) });
    if (f.kind === 'file') return h('span', { class: 'muted' }, f.value || 'Attached in source');
    if (f.kind === 'static') return h('span', { class: 'muted' }, '');
    return h('input', { class: 'f-in', type: 'text', value: f.value || '', oninput: (e) => onSet(f, e.target.value) });
  }

  function render(target, { form, step, onSet, onBack, onNext }) {
    const colgroup = h('colgroup', null, h('col', { style: 'width:46px' }), h('col', { style: 'width:300px' }), h('col', { style: 'width:340px' }), h('col', { style: 'width:90px' }));
    const letters = h('tr', { class: 'g-letters' }, h('th', { class: 'g-corner' }), [0, 1, 2].map((c) => h('th', { class: 'g-letter' }, colLetter(c))));
    const head = h(
      'tr',
      { class: 'g-head' },
      h('th', { class: 'g-num' }, '1'),
      h('td', { class: 'g-cell g-hcell' }, 'Field'),
      h('td', { class: 'g-cell g-hcell' }, 'Value'),
      h('td', { class: 'g-cell g-hcell' }, 'Req.')
    );
    const rows = form.fields.map((f, r) =>
      h(
        'tr',
        { class: 'g-row' },
        h('th', { class: 'g-num' }, String(r + 2)),
        h('td', { class: 'g-cell' }, f.label),
        h('td', { class: 'g-cell f-cell' }, control(f, onSet)),
        h('td', { class: 'g-cell' }, f.required ? 'Yes' : '')
      )
    );
    const label = form.isFinal ? `Step ${step} · final` : form.isReview ? `Step ${step} · review next` : `Step ${step}`;
    const bar = h(
      'div',
      { class: 'f-bar' },
      h('span', { class: 'f-step' }, label),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', disabled: !form.hasBack, onclick: onBack }, 'Back'),
      h('button', { class: 'btn primary', onclick: onNext }, form.isFinal ? 'Submit' : form.isReview ? 'Review' : 'Next')
    );
    target.replaceChildren(
      h('div', { class: 'f-wrap' }, h('table', { class: 'grid' }, colgroup, h('thead', null, letters, head), h('tbody', null, rows)), bar)
    );
  }

  QT.form = { render };
})();
