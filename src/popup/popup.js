// Toolbar panel: on/off switch, interface picker, shortcut, tab status.
// Changes are written to storage; open tabs pick them up live through
// chrome.storage.onChanged (settings.js), no reload.
(async function () {
  const $ = (id) => document.getElementById(id);
  const get = () => new Promise((r) => chrome.storage.local.get('qt', (x) => r((x && x.qt) || {})));
  const save = async (patch) => {
    s = { ...(await get()), ...patch };
    await new Promise((r) => chrome.storage.local.set({ qt: s }, r));
    paint();
  };
  let s = await get();

  const BLURB = {
    workbook: ['Workbook', 'Web spreadsheet with menus and a formula bar'],
    classic: ['Classic', 'Plain csv viewer with filter chips'],
  };
  const THUMB = {
    workbook: '<div class="thumb t-workbook"><div class="a"><i></i><i></i><i></i><i></i></div><div class="b"></div><div class="c"></div><div class="g"></div><div class="d"><i></i><i></i></div></div>',
    classic: '<div class="thumb t-classic"><div class="a"></div><div class="b"><i></i><i></i><i></i></div><div class="g"></div><div class="d"><i></i><i></i></div><div class="e"></div></div>',
  };
  const ids = Object.keys((window.QT && window.QT.skins) || BLURB);
  const current = () => s.skin || 'workbook';

  for (const id of ids) {
    const [name, sub] = BLURB[id] || [window.QT.skins[id].label, ''];
    const b = document.createElement('button');
    b.className = 'skin';
    b.setAttribute('role', 'radio');
    b.dataset.skin = id;
    b.innerHTML = (THUMB[id] || '<div class="thumb"></div>') + `<span class="name"></span><span class="sub"></span>`;
    b.querySelector('.name').textContent = name;
    b.querySelector('.sub').textContent = sub;
    b.onclick = () => save({ skin: id });
    $('skins').appendChild(b);
  }
  // Arrow keys move between interfaces, as in any radio group.
  $('skins').addEventListener('keydown', (e) => {
    const i = ids.indexOf(current());
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const next = ids[(i + d + ids.length) % ids.length];
    save({ skin: next }).then(() => $('skins').querySelector(`[data-skin="${next}"]`).focus());
  });

  let tabInfo = null;
  function paint() {
    const on = !s.paused;
    $('power').setAttribute('aria-checked', String(on));
    $('power').setAttribute('aria-label', on ? 'View on' : 'View off');
    $('body').classList.toggle('off', !on);
    for (const b of $('skins').children) {
      const sel = b.dataset.skin === current();
      b.setAttribute('aria-checked', String(sel));
      b.tabIndex = sel ? 0 : -1;
    }
    const st = $('state');
    if (!on) st.innerHTML = '<b>Off.</b> Pages show as normal.';
    else if (tabInfo && tabInfo.covered === false) st.innerHTML = '<b>On.</b> Not active on this page.';
    else st.innerHTML = '<b>On.</b> Active on this tab.';
  }
  $('power').onclick = () => save({ paused: !s.paused });
  $('opts').onclick = () => chrome.runtime.openOptionsPage();

  if (chrome.commands && chrome.commands.getAll)
    chrome.commands.getAll((cmds) => {
      const c = cmds.find((x) => x.name === 'panic');
      if (c && c.shortcut) $('key').textContent = c.shortcut;
    });

  paint();

  // Tab status. Rows read plus selector misses: the only way to tell "the
  // source changed its markup" from "no results".
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: 'qt:health' }, (res) => {
    const el = $('health');
    if (chrome.runtime.lastError || !res) {
      el.textContent = 'Not available here';
      return;
    }
    tabInfo = res;
    paint();
    if (!res.covered) el.textContent = 'Not active';
    else if (res.misses === 0) {
      el.textContent = `${res.rows} rows · OK`;
      el.className = 'ok';
    } else {
      el.textContent = `${res.rows} rows · ${res.misses} misses`;
      el.className = 'warn';
    }
  });
})();
