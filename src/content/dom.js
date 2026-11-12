// dom.js holds EVERY assumption about the source site's DOM (route.js holds
// its URL shapes). No other file may contain one of its class names,
// attributes or button labels. When the site changes, this file and
// harness/mock-linkedin.html change together, and that diff is the record.
//
// Two markups are supported:
//   current (Nov 2026, /jobs/search-results/): server-driven UI with hashed
//     class names. Hooks are data-testid, componentkey and accessible names,
//     never classes. Fixture: harness/mock-linkedin.html
//   legacy (/jobs/search/): the older list with data-job-id attributes.
//     Fixture: harness/mock-linkedin-legacy.html
// Candidates are ordered most-durable first. Every lookup that falls through
// all candidates counts a miss in QT.health, which the toolbar popup shows:
// the only way to tell "the site changed its markup" from "no results".
(function () {
  const QT = (window.QT = window.QT || {});
  const health = (QT.health = { misses: {}, total: 0 });

  function miss(key) {
    health.misses[key] = (health.misses[key] || 0) + 1;
    health.total++;
  }
  function q(root, list, key) {
    if (!root) return null;
    for (const s of list) {
      const el = root.querySelector(s);
      if (el) return el;
    }
    if (key) miss(key);
    return null;
  }
  function qa(root, list) {
    if (!root) return [];
    for (const s of list) {
      const els = root.querySelectorAll(s);
      if (els.length) return [...els];
    }
    return [];
  }
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const text = (el) => (el ? clean(el.textContent) : '');
  const label = (el) => (el ? clean(el.getAttribute('aria-label') || '') : '');
  // Text with a space at every node boundary ("2 days ago" + "Saved").
  function spaced(el) {
    if (!el) return '';
    const parts = [];
    const tw = document.createTreeWalker(el, 4);
    while (tw.nextNode()) parts.push(tw.currentNode.nodeValue);
    return clean(parts.join(' '));
  }
  const AGO = /\b(\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago|just now|today|yesterday)\b/i;
  const CARD_KEY = 'job-card-component-ref-';

  const S = {
    // current
    column: ['[data-testid="lazy-column"]'],
    card: [`div[role="button"][componentkey^="${CARD_KEY}"]`, '[componentkey^="' + CARD_KEY + '"]'],
    viewLink: ['a[href*="/jobs/view/"]'],
    detailBody: ['[data-testid="expandable-text-box"]', '#job-details', '.jobs-description__content', '.jobs-box__html-content'],
    saveBtn: [
      'button[aria-label="Save the job"]',
      'button[aria-label="Unsave the job"]',
      'button[aria-label^="Saved" i]',
      'button.jobs-save-button',
      'button[aria-label^="Save" i]',
    ],
    applyBtn: [
      'button[aria-label="Easy Apply to this job"]',
      'button[aria-label^="Apply on company website" i]',
      'button.jobs-apply-button',
      'button[aria-label*="Apply" i]',
    ],
    modal: ['dialog[data-testid="dialog"][open]', 'dialog[open]', '.jobs-easy-apply-modal', '[role="dialog"][aria-labelledby*="apply" i]', '[role="dialog"].artdeco-modal'],
    search: ['input[data-testid="typeahead-input"]', 'input[aria-label^="Search by title" i]', 'input[id^="jobs-search-box-keyword"]'],
    pageNext: ['[data-testid="pagination-controls-next-button-visible"]'],
    pagePrev: ['[data-testid="pagination-controls-prev-button-visible"]'],
    pageCurrent: ['[data-testid^="pagination-indicator"][aria-current="true"]', '[data-testid^="pagination-indicator"][aria-current="page"]'],
    // legacy
    lList: ['.jobs-search-results-list', '.scaffold-layout__list > div', '.scaffold-layout__list'],
    lCard: ['li[data-occludable-job-id]', '[data-job-id]'],
    lTitle: ['.job-card-list__title--link strong', '.job-card-list__title', 'a[href*="/jobs/view/"]'],
    lCompany: ['.artdeco-entity-lockup__subtitle', '.job-card-container__primary-description', '.job-card-container__company-name'],
    lLocation: ['.job-card-container__metadata-wrapper li', '.artdeco-entity-lockup__caption', '.job-card-container__metadata-item'],
    lFooter: ['.job-card-container__footer-wrapper', '.job-card-list__footer-wrapper', 'ul[class*="footer"]'],
    lDetail: ['[data-job-details-container]', '.jobs-search__job-details--container', '.jobs-details', '.job-view-layout'],
    lDetailTitle: ['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', 'h1'],
  };

  const viewId = (a) => {
    const m = a && (a.getAttribute('href') || '').match(/\/jobs\/view\/(\d+)/);
    return m ? m[1] : null;
  };
  const inDialog = (el) => !!(el.closest && el.closest('dialog, [role="dialog"]'));

  // ---------- current markup ----------
  function currentCards() {
    return qa(document, S.card).filter((c) => !inDialog(c));
  }
  function listColumn() {
    const c = currentCards()[0];
    return c ? c.closest(S.column[0]) : null;
  }
  // The detail pane is the outermost lazy column that is not the list and
  // not inside a dialog. (It nests another lazy column.)
  function detailRoot() {
    const list = listColumn();
    for (const col of document.querySelectorAll(S.column[0])) {
      if (col === list || inDialog(col)) continue;
      if (list && (list.contains(col) || col.contains(list))) continue;
      if (q(col, S.detailBody) || q(col, S.saveBtn) || q(col, S.viewLink)) return col;
    }
    return null;
  }
  function readCurrentCard(card) {
    const id = (card.getAttribute('componentkey') || '').slice(CARD_KEY.length).match(/^\d+/);
    const ps = [...card.querySelectorAll('p')];
    if (!id || !ps.length) return null;
    const t = ps[0].querySelector('[aria-hidden="true"]');
    const title = clean(t ? t.textContent : text(ps[0]).replace(/\s*\(Verified job\)\s*$/i, ''));
    if (!title) return null;
    const rest = ps.slice(3).map(spaced).join(' · ');
    const ago = rest.match(AGO);
    return {
      id: id[0],
      title,
      company: text(ps[1]),
      location: text(ps[2]),
      posted: ago ? ago[1] : '',
      easy: /\bEasy Apply\b/i.test(rest),
      state: /\bApplied\b/i.test(rest) ? 'Applied' : /\bSaved\b/i.test(rest) ? 'Saved' : /\bViewed\b/i.test(rest) ? 'Viewed' : '',
    };
  }

  // ---------- legacy markup ----------
  function legacyId(card) {
    const d = card.dataset || {};
    if (d.occludableJobId) return d.occludableJobId;
    if (d.jobId) return d.jobId;
    const inner = card.querySelector('[data-job-id]');
    if (inner) return inner.dataset.jobId;
    return viewId(card.querySelector('a[href*="/jobs/view/"]'));
  }
  function readLegacyCard(card) {
    const id = legacyId(card);
    const title = text(q(card, S.lTitle));
    if (!id || !title) return null; // occluded placeholder, not loaded yet
    const time = card.querySelector('time');
    const foot = spaced(q(card, S.lFooter));
    return {
      id,
      title,
      company: text(q(card, S.lCompany, 'cardCompany')),
      location: text(q(card, S.lLocation, 'cardLocation')),
      posted: time ? text(time) : '',
      easy: /Easy Apply/i.test(foot),
      state: /\bApplied\b/i.test(foot) ? 'Applied' : /\bSaved\b/i.test(foot) ? 'Saved' : /\bViewed\b/i.test(foot) ? 'Viewed' : '',
    };
  }

  // Block-aware text: keeps paragraph and list structure without innerText,
  // which depends on layout and is absent in test DOMs.
  function blocks(root) {
    const out = [];
    let line = '';
    const flush = () => {
      const t = clean(line);
      if (t) out.push(t);
      line = '';
    };
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) line += c.nodeValue;
        else if (c.nodeType === 1) {
          const tag = c.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BUTTON') continue;
          if (c.getAttribute('aria-hidden') === 'true') continue;
          if (tag === 'BR') {
            flush();
            continue;
          }
          const block = /^(P|DIV|LI|UL|OL|H[1-6]|SECTION|ARTICLE)$/.test(tag);
          if (block) flush();
          if (tag === 'LI') line += '• ';
          walk(c);
          if (block) flush();
        }
      }
    })(root);
    flush();
    return out;
  }

  function detailPane() {
    return detailRoot() || q(document, S.lDetail);
  }
  function findCard(id) {
    return (
      document.querySelector(`[componentkey="${CARD_KEY}${id}"]`) ||
      document.querySelector(`[data-occludable-job-id="${id}"]`) ||
      document.querySelector(`[data-job-id="${id}"]`)
    );
  }

  // ---------- dialogs ----------
  // Every dialog the source has open. Armour hides all of them, so each one
  // must be redrawn by the overlay or it is an invisible wall: the apply form
  // becomes the Form sheet, anything else (the "Share your profile?" step
  // before an external link, "Save this application?", ...) becomes a prompt.
  function openModals() {
    const open = [];
    for (const s of S.modal) for (const el of document.querySelectorAll(s)) if (!open.includes(el) && el.isConnected && (el.tagName !== 'DIALOG' || el.open)) open.push(el);
    return open;
  }
  // An application form: real input controls (a settings switch does not
  // count) and a way forward through pages.
  function isApplyForm(m) {
    const ctrl = [...m.querySelectorAll('input:not([type="hidden"]), select, textarea')].some((e) => e.getAttribute('role') !== 'switch');
    return ctrl && (/\d+\s*\/\s*\d+\s*pages?/i.test(text(m)) || !!primaryBtn(m));
  }
  function applyModal() {
    return openModals().find(isApplyForm) || null;
  }
  function promptModal() {
    const others = openModals().filter((m) => !isApplyForm(m));
    return others[others.length - 1] || null;
  }
  const ACTION = /^(continue|cancel|discard|save|yes|no|done|ok|close|not now|got it|submit)$/i;
  let promptEls = { toggles: [], actions: [] };
  const BTN = (m, words) =>
    [...m.querySelectorAll('button')].find((b) => {
      const s = (label(b) + ' ' + text(b)).toLowerCase();
      return words.some((w) => s.indexOf(w) !== -1);
    }) || null;
  function primaryBtn(m) {
    return BTN(m, ['submit application']) || BTN(m, ['review']) || BTN(m, ['continue to next step', 'next']) || null;
  }
  function backBtn(m) {
    return [...m.querySelectorAll('button')].find((b) => /^back\b/i.test(label(b) || text(b))) || null;
  }
  function labelFor(m, el) {
    if (el.id) {
      const l = m.querySelector(`label[for="${el.id.replace(/"/g, '\\"')}"]`);
      if (l) return text(l);
    }
    const wrap = el.closest('label');
    if (wrap) return text(wrap);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const l = document.getElementById(by.split(' ')[0]);
      if (l) return text(l);
    }
    return label(el);
  }

  const dom = (QT.dom = {
    S,
    navigate(url) {
      location.assign(url);
    },

    readRows() {
      if (!QT.route.covered()) return [];
      const out = [];
      const seen = new Set();
      const cur = currentCards();
      const cards = cur.length ? cur : qa(document, S.lCard);
      const read = cur.length ? readCurrentCard : readLegacyCard;
      for (const c of cards) {
        const r = read(c);
        if (!r || seen.has(r.id)) continue;
        seen.add(r.id);
        out.push(r);
      }
      // Cards present but none readable means the title markup moved.
      if (cards.length && !out.length) miss('cardTitle');
      return out;
    },

    clickRow(id) {
      const card = findCard(id);
      if (!card) return miss('clickRow'), false;
      const target = card.matches('[role="button"]') ? card : card.querySelector('a[href*="/jobs/view/"]') || card;
      target.click();
      return true;
    },

    readDetail() {
      const pane = detailPane();
      if (!pane) return null;
      const link = q(pane, S.viewLink);
      const title = text(link) || text(q(pane, S.lDetailTitle));
      const body = q(pane, S.detailBody);
      const save = q(pane, S.saveBtn);
      const apply = q(pane, S.applyBtn);
      const ago = [...pane.querySelectorAll('p')].filter((x) => !body || !body.contains(x)).map(text).join(' \u00b7 ').match(AGO);
      return {
        id: viewId(link),
        title,
        posted: ago ? ago[1] : '',
        notes: body ? blocks(body) : [],
        saved: !!save && (save.getAttribute('aria-pressed') === 'true' || /^(unsave|saved)\b/i.test(label(save)) || /^saved$/i.test(text(save))),
        canSave: !!save,
        easy: !!apply && /easy apply/i.test(label(apply) + ' ' + text(apply)),
        canApply: !!apply,
      };
    },

    toggleSave() {
      const btn = q(detailPane(), S.saveBtn, 'saveBtn');
      if (btn) btn.click();
      return !!btn;
    },

    openApply() {
      const btn = q(detailPane(), S.applyBtn, 'applyBtn');
      if (btn) btn.click();
      return !!btn;
    },

    // The apply dialog, read semantically. The current dialog states its
    // page ("2/4 pages"); otherwise step comes from the accessibility
    // contract (Back present, "Submit application"), never the progress
    // meter, which is non-zero on the first screen.
    readApply() {
      const modal = applyModal();
      if (!modal) return null;
      const primary = primaryBtn(modal);
      const primaryLabel = primary ? label(primary) || text(primary) : '';
      const pages = text(modal).match(/(\d+)\s*\/\s*(\d+)\s*pages?/i);

      const fields = [];
      const radios = new Map();
      for (const el of modal.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
        const req = el.required || el.getAttribute('aria-required') === 'true';
        if (el.type === 'radio') {
          const key = el.name || el.closest('fieldset') || el;
          if (!radios.has(key)) {
            const fs = el.closest('fieldset');
            const lg = fs && fs.querySelector('legend');
            const f = { kind: 'radio', label: text(lg), required: req, options: [], value: '' };
            radios.set(key, f);
            fields.push(f);
          }
          const f = radios.get(key);
          f.options.push({ value: el.value, label: labelFor(modal, el) || el.value, el });
          if (el.checked) f.value = el.value;
          if (req) f.required = true;
          continue;
        }
        const kind = el.tagName === 'SELECT' ? 'select' : el.type === 'checkbox' ? 'checkbox' : el.type === 'file' ? 'file' : 'text';
        fields.push({
          kind,
          label: labelFor(modal, el),
          required: req,
          el,
          options: kind === 'select' ? [...el.options].map((o) => ({ value: o.value, label: clean(o.textContent) })) : null,
          value: kind === 'checkbox' ? (el.checked ? 'Yes' : '') : kind === 'file' ? (el.files && el.files[0] ? el.files[0].name : '') : el.value,
        });
      }
      fields.forEach((f, i) => {
        // The live résumé picker is one unlabelled radio group whose options
        // are file names.
        if (f.kind === 'radio' && !f.label) f.label = f.options.every((o) => /\.(pdf|docx?|rtf|txt)$/i.test(o.label)) ? 'Resume' : 'Choose one';
        f.i = i;
        if (/\*\s*$/.test(f.label)) f.required = true;
        f.label = f.label.replace(/\s*\*\s*$/, '');
      });

      return {
        modal,
        hasBack: !!backBtn(modal),
        isFinal: /submit application/i.test(primaryLabel),
        isReview: /review/i.test(primaryLabel),
        primaryLabel,
        step: pages ? +pages[1] : null,
        steps: pages ? +pages[2] : null,
        fields,
      };
    },

    // A non-form dialog, described in the tool's vocabulary. Known ones get
    // canonical wording; unknown ones keep their title unless it names the
    // site's subject, and always offer Cancel.
    readPrompt() {
      const m = promptModal();
      if (!m) return (promptEls = { toggles: [], actions: [] }), null;
      const head = m.querySelector('#dialog-header, header, [id$="-header"]');
      const raw = text((head && head.querySelector('h1,h2,h3')) || head || m.querySelector('h1,h2,h3'));
      const share = /share your profile/i.test(raw);
      const title = share ? 'Share your profile?' : !raw || /linkedin|\bjobs?\b|appl|recruit|hir(e|ing)/i.test(raw) ? 'Confirm' : raw;
      const toggles = [...m.querySelectorAll('input[type="checkbox"]')].map((el) => {
        const l = labelFor(m, el);
        return { el, on: el.checked, label: share ? 'Share my profile when I continue' : l && !/^tap to toggle/i.test(l) && !/linkedin|\bjobs?\b/i.test(l) ? l : 'Option' };
      });
      const actions = [];
      // Actions can be links: the live "Continue" is an <a target=_blank>
      // through the site's redirect, not a button.
      for (const b of m.querySelectorAll('button, a[href], [role="button"]')) {
        const t = text(b);
        const isX = !t && /^(dismiss|close)\b/i.test(label(b));
        const a = isX ? { el: b, label: 'Cancel', cancel: true } : ACTION.test(t) ? { el: b, label: t, cancel: /^(cancel|not now|close)$/i.test(t) } : null;
        if (!a || actions.some((x) => x.label.toLowerCase() === a.label.toLowerCase())) continue;
        isX ? actions.unshift(a) : actions.push(a);
      }
      // No way forward = not a question yet (the apply form is still loading
      // its fields, or a spinner). Show nothing rather than a dead "Confirm".
      if (!actions.some((a) => !a.cancel)) return (promptEls = { toggles: [], actions: [] }), null;
      if (!actions.some((a) => a.cancel)) miss('promptCancel');
      promptEls = { toggles, actions };
      return {
        title,
        body: share ? 'Continuing opens the link in a new tab.' : '',
        toggles: toggles.map((t) => ({ label: t.label, on: t.on })),
        actions: actions.map((a) => ({ label: a.label, cancel: !!a.cancel })),
      };
    },
    promptAct(i) {
      const a = promptEls.actions[i];
      if (a && a.el.isConnected) a.el.click();
    },
    promptToggle(i) {
      const t = promptEls.toggles[i];
      if (t && t.el.isConnected) t.el.click();
    },

    setField(field, value) {
      if (field.kind === 'radio') {
        const opt = field.options.find((o) => o.value === value);
        if (opt) opt.el.click();
        return;
      }
      const el = field.el;
      if (!el) return;
      if (field.kind === 'checkbox') {
        if (!!value !== el.checked) el.click();
        return;
      }
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },

    applyBack() {
      const m = applyModal();
      const b = m && backBtn(m);
      if (b) b.click();
      else miss('back');
    },
    applyNext() {
      const m = applyModal();
      const b = m && primaryBtn(m);
      if (b) b.click();
      else miss('primary');
    },

    // Narrowing is the grid's job; widening hands the string to the site's
    // own search. The current site's search box is a typeahead that ignores
    // synthetic keys, so it navigates to the results URL instead.
    widenSearch(query) {
      const legacy = !document.querySelector(S.search[0]) && q(document, S.search);
      if (legacy) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(legacy, query);
        legacy.dispatchEvent(new Event('input', { bubbles: true }));
        legacy.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        return 'input';
      }
      dom.navigate(QT.route.searchUrl(query));
      return 'url';
    },

    // Current markup pages its results; legacy lazy-loads on scroll.
    pager() {
      const cur = q(document, S.pageCurrent);
      const next = q(document, S.pageNext);
      const prev = q(document, S.pagePrev);
      if (!cur && !next && !prev) return null;
      const n = cur && (label(cur) || text(cur)).match(/\d+/);
      return { page: n ? +n[0] : 1, hasPrev: !!prev, hasNext: !!next };
    },
    goPage(dir) {
      const b = q(document, dir > 0 ? S.pageNext : S.pagePrev);
      if (b) b.click();
      return !!b;
    },
    loadMore() {
      if (dom.pager()) return; // paged, not infinite
      let box = q(document, S.lList);
      const start = box;
      while (box && box !== document.body && box.scrollHeight <= box.clientHeight) box = box.parentElement;
      if (!box || box === document.body) box = start;
      if (!box) return;
      box.scrollTop = box.scrollHeight;
      box.dispatchEvent(new Event('scroll'));
    },

    observeRoot() {
      return document.body || document.documentElement;
    },
  });
})();
