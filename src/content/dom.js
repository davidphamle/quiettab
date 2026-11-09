// dom.js holds EVERY assumption about the source site's DOM and URLs.
// No other file may contain one of its class names, attributes, URL shapes
// or button labels. When the site changes, this file and
// harness/mock-linkedin.html change together, and that diff is the record.
//
// Candidate selectors are ordered most-durable first:
//   data attributes -> ARIA / accessible names -> structure -> class names.
// Every lookup that falls through all candidates counts a miss in QT.health,
// which the toolbar popup surfaces. That is the only way a user can tell
// "the site changed its markup" apart from "there are no results".
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
  function qa(root, list, key) {
    if (!root) return [];
    for (const s of list) {
      const els = root.querySelectorAll(s);
      if (els.length) return [...els];
    }
    if (key) miss(key);
    return [];
  }
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const text = (el) => (el ? clean(el.textContent) : '');
  // Text with a space at every node boundary: footers are lists of chips
  // whose textContent would otherwise run together ("2 days agoSaved").
  function spaced(el) {
    if (!el) return '';
    const parts = [];
    const tw = document.createTreeWalker(el, 4);
    while (tw.nextNode()) parts.push(tw.currentNode.nodeValue);
    return clean(parts.join(' '));
  }

  const S = {
    list: ['.jobs-search-results-list', '.scaffold-layout__list > div', '.scaffold-layout__list'],
    card: ['li[data-occludable-job-id]', '[data-job-id]', '.job-card-container'],
    cardLink: ['a[href*="/jobs/view/"]'],
    cardTitle: ['.job-card-list__title--link strong', '.job-card-list__title', 'a[href*="/jobs/view/"]'],
    cardCompany: ['.artdeco-entity-lockup__subtitle', '.job-card-container__primary-description', '.job-card-container__company-name'],
    cardLocation: ['.job-card-container__metadata-wrapper li', '.artdeco-entity-lockup__caption', '.job-card-container__metadata-item'],
    cardFooter: ['.job-card-container__footer-wrapper', '.job-card-list__footer-wrapper', 'ul[class*="footer"]'],
    detail: ['[data-job-details-container]', '.jobs-search__job-details--container', '.jobs-details', '.job-view-layout'],
    detailTitle: ['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', 'h1'],
    detailBody: ['#job-details', '.jobs-description__content', '.jobs-box__html-content'],
    saveBtn: ['button.jobs-save-button', 'button[aria-label^="Save" i]', 'button[aria-label*="saved" i]'],
    applyBtn: ['button.jobs-apply-button', 'button[aria-label*="Apply" i]'],
    modal: ['[role="dialog"][aria-labelledby*="apply" i]', '.jobs-easy-apply-modal', '[role="dialog"].artdeco-modal'],
    group: ['[data-test-form-element]', '.jobs-easy-apply-form-section__grouping', '.fb-dash-form-element'],
    back: ['button[aria-label="Back to previous step"]'],
    primary: [
      'button[aria-label="Submit application"]',
      'button[aria-label="Review your application"]',
      'button[aria-label="Continue to next step"]',
      'footer button.artdeco-button--primary',
    ],
    search: ['input[aria-label^="Search by title" i]', 'input[id^="jobs-search-box-keyword"]', '.jobs-search-box__text-input'],
  };

  function jobId(card) {
    const d = card.dataset || {};
    if (d.occludableJobId) return d.occludableJobId;
    if (d.jobId) return d.jobId;
    const inner = card.querySelector('[data-job-id]');
    if (inner) return inner.dataset.jobId;
    const a = card.querySelector('a[href*="/jobs/view/"]');
    const m = a && a.getAttribute('href').match(/\/jobs\/view\/(\d+)/);
    return m ? m[1] : null;
  }

  function cardState(card) {
    const foot = spaced(q(card, S.cardFooter));
    if (/\bApplied\b/i.test(foot)) return 'Applied';
    if (/\bSaved\b/i.test(foot)) return 'Saved';
    if (/\bViewed\b/i.test(foot)) return 'Viewed';
    return '';
  }

  // Block-aware text: keeps paragraph and list structure without innerText,
  // which depends on layout (and the page is at opacity 0, not unlaid-out,
  // but innerText is also absent in test DOMs).
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
          if (tag === 'BR') { flush(); continue; }
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

  const dom = (QT.dom = {
    S,
    isJobsRoute() {
      return location.pathname.indexOf('/jobs') === 0 || !!q(document, S.card);
    },

    readRows() {
      const seen = new Set();
      const rows = [];
      const cards = dom.isJobsRoute() ? qa(document, S.card, 'card') : [];
      let untitled = 0;
      for (const card of cards) {
        const id = jobId(card);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const title = text(q(card, S.cardTitle));
        if (!title) {
          untitled++; // occluded placeholder: the list keeps off-screen cards empty
          continue;
        }
        const time = card.querySelector('time');
        const foot = spaced(q(card, S.cardFooter));
        rows.push({
          id,
          title,
          company: text(q(card, S.cardCompany, 'cardCompany')),
          location: text(q(card, S.cardLocation, 'cardLocation')),
          posted: time ? text(time) : '',
          postedISO: time ? time.getAttribute('datetime') || '' : '',
          easy: /Easy Apply/i.test(foot),
          state: cardState(card),
        });
      }
      // Cards present but none readable means the title markup moved.
      if (cards.length && !rows.length && untitled) miss('cardTitle');
      return rows;
    },

    clickRow(id) {
      const card =
        document.querySelector(`[data-occludable-job-id="${id}"]`) ||
        document.querySelector(`[data-job-id="${id}"]`);
      if (!card) return miss('clickRow'), false;
      const target = q(card, S.cardLink) || card;
      target.click();
      return true;
    },

    readDetail() {
      const pane = q(document, S.detail);
      if (!pane) return null;
      const title = text(q(pane, S.detailTitle));
      const body = q(pane, S.detailBody);
      const save = q(pane, S.saveBtn);
      const apply = q(pane, S.applyBtn);
      return {
        title,
        notes: body ? blocks(body) : [],
        saved: save ? save.getAttribute('aria-pressed') === 'true' || /^Saved\b/i.test(text(save)) : false,
        canSave: !!save,
        easy: apply ? /Easy Apply/i.test(text(apply) + ' ' + (apply.getAttribute('aria-label') || '')) : false,
        canApply: !!apply,
      };
    },

    toggleSave() {
      const pane = q(document, S.detail);
      const btn = q(pane, S.saveBtn, 'saveBtn');
      if (btn) btn.click();
      return !!btn;
    },

    openApply() {
      const pane = q(document, S.detail);
      const btn = q(pane, S.applyBtn, 'applyBtn');
      if (btn) btn.click();
      return !!btn;
    },

    // The apply dialog, read semantically. Step is derived from the
    // accessibility contract, not from the progress meter: the meter is
    // already non-zero on the first screen because contact details arrive
    // prefilled.
    readApply() {
      const modal = q(document, S.modal);
      if (!modal || !modal.isConnected) return null;
      const back = q(modal, S.back);
      const primary = q(modal, S.primary);
      const primaryLabel = primary ? primary.getAttribute('aria-label') || text(primary) : '';
      const fields = qa(modal, S.group).map((g, i) => {
        const radios = [...g.querySelectorAll('input[type="radio"]')];
        const control = radios.length ? null : g.querySelector('input:not([type="hidden"]), select, textarea');
        const labelEl = g.querySelector('legend, label');
        const label = clean(labelEl ? labelEl.textContent : '');
        const required =
          !!g.querySelector('[required], [aria-required="true"]') || /\*\s*$/.test(label);
        if (radios.length) {
          const opts = radios.map((r) => {
            const l = g.querySelector(`label[for="${r.id}"]`);
            return { value: r.value, label: clean(l ? l.textContent : r.value), el: r };
          });
          const on = radios.find((r) => r.checked);
          return { i, kind: 'radio', label: label.replace(/\*\s*$/, ''), required, options: opts, value: on ? on.value : '' };
        }
        if (!control) return { i, kind: 'static', label, required: false, value: '' };
        const kind = control.tagName === 'SELECT' ? 'select' : control.type === 'checkbox' ? 'checkbox' : control.type === 'file' ? 'file' : 'text';
        return {
          i,
          kind,
          label: label.replace(/\*\s*$/, ''),
          required,
          el: control,
          options: kind === 'select' ? [...control.options].map((o) => ({ value: o.value, label: clean(o.textContent) })) : null,
          value: kind === 'checkbox' ? (control.checked ? 'Yes' : '') : kind === 'file' ? (control.files && control.files[0] ? control.files[0].name : '') : control.value,
        };
      });
      return {
        modal,
        hasBack: !!back,
        isFinal: /submit application/i.test(primaryLabel),
        isReview: /review/i.test(primaryLabel),
        primaryLabel,
        fields,
      };
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
      const modal = q(document, S.modal);
      const b = q(modal, S.back, 'back');
      if (b) b.click();
    },
    applyNext() {
      const modal = q(document, S.modal);
      const b = q(modal, S.primary, 'primary');
      if (b) b.click();
    },

    // Narrow locally is the grid's job; widening hands the string to the
    // site's own search.
    widenSearch(query) {
      const input = q(document, S.search);
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, query);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        return 'input';
      }
      location.assign('/jobs/search/?keywords=' + encodeURIComponent(query));
      return 'url';
    },

    // Results lazy-load as their list scrolls. Scrolling it (it is laid out,
    // just transparent) triggers their IntersectionObserver.
    loadMore() {
      let box = q(document, S.list);
      const start = box;
      while (box && box !== document.body && box.scrollHeight <= box.clientHeight) box = box.parentElement;
      if (!box || box === document.body) box = start;
      if (!box) return window.scrollTo(0, document.documentElement.scrollHeight);
      box.scrollTop = box.scrollHeight;
      box.dispatchEvent(new Event('scroll'));
    },

    observeRoot() {
      return document.body || document.documentElement;
    },
  });
})();
