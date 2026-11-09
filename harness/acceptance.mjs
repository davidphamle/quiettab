// Acceptance suite. Run before every release:  node harness/acceptance.mjs
// Boots the real content scripts against harness/mock-linkedin.html in jsdom.
// Visual and real-browser layout checks live in harness/visual.mjs.
import { boot, wait, read, manifest } from './load.mjs';
import fs from 'node:fs';
import path from 'node:path';

const results = [];
let section = '';
const check = (name, ok, info) => results.push({ section, name, ok: !!ok, info });
const group = (s) => (section = s);

let W = null; // the window under test; set on every boot
const bootW = async (seed) => (W = await boot(seed));
const R = (w) => (w || W).QT.app.root;
const $ = (a, b) => (typeof a === 'string' ? R(W).querySelector(a) : R(a).querySelector(b));
const $$ = (a, b) => [...(typeof a === 'string' ? R(W).querySelectorAll(a) : R(a).querySelectorAll(b))];
const rows = (w) => $$(w, 'tbody .g-row:not(.empty)');
const cell = (row, c) => row.querySelectorAll('td')[c].textContent;
const down = (w, el) => el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
const flush = (w) => w.QT.app.flush();
const PANIC = { code: 'KeyQ', key: 'Q', altKey: true, shiftKey: true };
const press = (w, o) => w.dispatchEvent(new w.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...o }));
const tab = (w, id) => $(w, `[data-tab="${id}"]`);
const activeTab = (w) => {
  const t = $$(w, '[data-tab]').find((b) => /\bon\b/.test(b.className));
  return t && t.getAttribute('data-tab');
};
const tabIds = (w) => $$(w, '[data-tab]').map((b) => b.getAttribute('data-tab'));
const statusText = (w) => {
  const s = $(w, '.status');
  return s ? s.textContent : '';
};
function snap(w) {
  const r = R(w);
  const vals = [...r.querySelectorAll('input,select,textarea')].map((e) => (e.type === 'checkbox' ? e.checked : e.value));
  return r.innerHTML + '|' + JSON.stringify(vals) + '|' + w.QT.app.ui().main.scrollTop;
}
async function openRow(w, i) {
  down(w, rows(w)[i].querySelectorAll('td')[1]);
  await wait(w, 40);
  flush(w);
}
async function openFilter(w, key, label) {
  const skin = w.QT.app.ui().skin;
  if (skin.headerFilters) {
    const i = w.QT.app.ITEM_COLS.findIndex((c) => c.label === label);
    down(w, $$(w, '.g-fbtn')[i] || $$(w, `.g-fbtn`)[0]);
  } else $(w, `[data-chip="${key}"]`).click();
  return $(w, '.fmenu');
}

export async function run(seedBase = {}) {
  const S = (o) => ({ ...seedBase, ...o });
  const skinName = seedBase.skin || 'classic';

  // ------------------------------------------------------------------ boot
  group('Boot & armour');
  let w = await bootW(S({}));
  const QT = w.QT;
  const host = w.document.querySelector('[data-qt-host]');
  const skin = w.QT.app.ui().skin;
  check('host is a child of <html>, not <body>', host && host.parentNode === w.document.documentElement);
  check('shadow root is closed (page cannot reach it)', host && host.shadowRoot === null);
  check('tab title replaced', w.document.title === skin.title('tracker_q3'), w.document.title);
  check('favicon replaced with neutral icon', [...w.document.querySelectorAll('link[rel~="icon"]')].every((l) => l.href.startsWith('data:image/svg+xml')));
  w.document.title = 'Jobs | LinkedIn';
  await wait(w, 5);
  check('title guard re-asserts after the site rewrites it', w.document.title === skin.title('tracker_q3'));
  check('armour lifted only by .qt-off (not present by default)', !w.document.documentElement.classList.contains('qt-off'));
  const css = read('src/armour.css');
  check('armour: body opacity 0 under html:not(.qt-off)', /html:not\(\.qt-off\) body \{[^}]*opacity: 0 !important/.test(css));
  check('armour: never display:none on body (keeps lazy-load alive)', !/body\s*\{[^}]*display:\s*none/.test(css));
  check('armour: imagery hidden', /img,[\s\S]*visibility: hidden !important/.test(css));
  check('armour: loaded by manifest at document_start, no JS needed', manifest.content_scripts[0].run_at === 'document_start' && manifest.content_scripts[0].css.includes('src/armour.css'));

  group('Grid');
  check('20 loaded rows rendered (occluded placeholder skipped)', rows(w).length === 20, rows(w).length);
  const heads = $$(w, '.g-head .g-hcell .g-txt').map((e) => e.textContent).filter(Boolean).length
    ? $$(w, '.g-head .g-hcell .g-txt').map((e) => e.textContent)
    : $$(w, '.g-head .g-hcell').map((e) => e.textContent);
  check('header row = Ref Role Org Location Tier Posted Mode Status', heads.slice(0, 8).join(' ') === 'Ref Role Org Location Tier Posted Mode Status', heads.join(' '));
  check('header is spreadsheet row 1; data starts at row 2', $('.g-head .g-num') ? true : false);
  check('first data row numbered 2', rows(w)[0].querySelector('.g-num').textContent === '2');
  check('column letters A.. over the grid', $$(w, '.g-letter')[0].textContent === 'A' && $$(w, '.g-letter')[7].textContent === 'H');
  check('ref derived from id: R-0101', cell(rows(w)[0], 0) === 'R-0101');
  const tier = (t) => QT.filters.tierOf(t);
  check('tier: Senior', tier('Senior Product Manager') === 'Senior');
  check('tier: Director', tier('Director of Product') === 'Director');
  check('tier: Executive (VP / Head of)', tier('VP Product') === 'Executive' && tier('Head of Product') === 'Executive');
  check('tier: Principal / Staff', tier('Principal Product Manager - Platform') === 'Principal' && tier('Staff Product Manager') === 'Principal');
  check('tier: Lead', tier('Product Lead') === 'Lead');
  check('tier: Junior (graduate)', tier('Graduate Product Analyst') === 'Junior');
  check('tier: Mid by default', tier('Product Manager') === 'Mid');
  check('mode column: Form / Source', cell(rows(w)[0], 6) === 'Form' && cell(rows(w)[2], 6) === 'Source');
  const chromeText = $(w, '.chrome').textContent + $(w, '.tabs').textContent + $(w, '.status').textContent;
  check('no source/job vocabulary anywhere in the frame', !/linkedin|easy apply|\bjobs?\b|apply|recruit/i.test(chromeText + $(w, '.viewport').textContent), chromeText);
  check('selector health: zero misses on boot', QT.health.total === 0, JSON.stringify(QT.health.misses));

  group('Record card');
  down(w, rows(w)[0].querySelectorAll('td')[1]);
  check('clicking a row proxies to the source card', w.__mock.state.current && w.__mock.state.current[0] === '4071200101');
  check('card shows loading while detail pane is empty', $('.card-notes') && $('.card-notes').hasAttribute('data-loading'));
  await wait(w, 40);
  flush(w);
  check('card fills once detail matches', $('.card-notes') && !$('.card-notes').hasAttribute('data-loading'));
  check('card head carries ref and title', /R-0101/.test($('.card-head').textContent) && /Senior Product Manager/.test($('.card-head').textContent));
  check('notes keep paragraph/list structure', $$(w, '.card-notes p').length >= 8 && $$(w, '.card-notes p').some((p) => /^• Run discovery/.test(p.textContent)));
  check('footer sits outside the scrolling notes', $('.card-foot').parentNode === $('.card') && !$('.card-notes').contains($('.card-foot')));
  check('head sits outside the scrolling notes', !$('.card-notes').contains($('.card-head')));
  check('only notes scroll (CSS contract)', /\.card-notes \{[^}]*overflow: auto/.test(QT.shell.BASE_CSS) && !/\.card \{[^}]*overflow: auto/.test(QT.shell.BASE_CSS));
  check('active row highlighted', rows(w)[0].classList.contains('active'));
  // stale pane: click row 2, pane still holds row 1
  down(w, rows(w)[1].querySelectorAll('td')[1]);
  check('stale pane guard: previous record never shown against this row', $('.card-notes').hasAttribute('data-loading') && !/Senior Product Manager/.test($('.card-notes').textContent) && /Payments/.test($('.card-head').textContent));
  await wait(w, 40);
  flush(w);
  check('second record fills after its pane loads', /Tidewell/.test($('.card-notes').textContent));
  const saveBtn = $$(w, '.card-foot .btn')[0];
  check('action is labelled Save (not Flag)', saveBtn.textContent === 'Save');
  saveBtn.click();
  await wait(w, 5);
  flush(w);
  check('Save proxies to the source and reflects back', w.__mock.state.saved['4071200102'] === true && $$(w, '.card-foot .btn')[0].textContent === 'Saved');
  check('Status column reads Saved', cell(rows(w)[1], 7) === 'Saved');

  group('Filters');
  w = await bootW(S({}));
  let menu = await openFilter(w, 'tier', 'Tier');
  check('filter menu opens', !!menu);
  const counts = $$(w, '.fm-count').map((e) => +e.textContent);
  check('menu built from loaded values with counts', counts.reduce((a, b) => a + b, 0) === 20 && counts.length >= 5, counts);
  const before = rows(w).length;
  const seniorBox = $$(w, '.fm-item').find((l) => l.textContent.startsWith('Senior')).querySelector('input');
  seniorBox.checked = false;
  seniorBox.dispatchEvent(new w.Event('change', { bubbles: true }));
  check('unchecking a value filters the grid instantly', rows(w).length < before && rows(w).every((r) => cell(r, 4) !== 'Senior'));
  check('status shows filtered count', / of 20 rows/.test(statusText(w)), statusText(w));
  check('filters never touch the source list', w.document.querySelectorAll('#results [data-job-id]').length === 20 && w.__mock.searches.length === 0);
  [...R(w).querySelectorAll('.fm-link')].find((b) => b.textContent === 'Clear').click();
  check('Clear hides every row', rows(w).length === 0);
  [...R(w).querySelectorAll('.fm-link')].find((b) => b.textContent === 'Select all').click();
  check('Select all restores', rows(w).length === 20);
  $('.fm-foot .btn').click();
  check('OK closes the menu', !$('.fmenu'));
  const find = $('.chrome input[type="text"]');
  find.value = 'Adelaide';
  find.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('typing narrows locally', rows(w).length > 0 && rows(w).every((r) => /Adelaide/.test(r.textContent)) && rows(w).length < 20);
  find.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  check('Enter widens via the source search', w.__mock.searches[0] === 'Adelaide');

  group('Panic landing');
  w = await bootW(S({}));
  press(w, PANIC);
  const clean = snap(w);
  check('panic key switches to Archive', activeTab(w) === 'archive');
  check('Archive shows the decoy tracker', rows(w).length === 26 && cell(rows(w)[0], 0) === 'Q3-101');
  // state B: Items with filter, find, card and menu open
  w = await bootW(S({}));
  await openRow(w, 3);
  await openFilter(w, 'location', 'Location');
  const fi = $('.chrome input[type="text"]');
  fi.value = 'Product';
  fi.dispatchEvent(new w.Event('input', { bubbles: true }));
  await openFilter(w, 'org', 'Org');
  press(w, PANIC);
  check('byte-identical landing: from Items with filter, find, card and open menu', snap(w) === clean);
  check('panic closes any open menu', !$('.fmenu') && $('.layer').children.length === 0);
  // state C: Archive filtered and scrolled
  w.QT.app.state.archive.filters = { c4: ['Signed'] };
  w.QT.app.state.archive.find = 'SA';
  w.QT.app.state.archive.sel = { r: 3, c: 2 };
  w.QT.app.render(true);
  w.QT.app.ui().main.scrollTop = 120;
  press(w, PANIC);
  check('byte-identical landing: from a filtered Archive', snap(w) === clean);
  check('panic resets Archive filters', Object.keys(w.QT.app.state.archive.filters).length === 0 && rows(w).length === 26);
  press(w, PANIC);
  check('panic is one-way: pressing again stays on Archive', activeTab(w) === 'archive' && snap(w) === clean);
  tab(w, 'items').click();
  check('return is a deliberate Items click; Items state survives', activeTab(w) === 'items' && w.QT.app.state.items.find === 'Product' && !!$('.card'));
  await w.__send({ type: 'qt:panic' });
  check('browser-level shortcut message also panics', activeTab(w) === 'archive' && snap(w) === clean);
  check('blur-on-blur is off by default', w.QT.settings.values.blurOnBlur === false);
  tab(w, 'items').click();
  w.dispatchEvent(new w.Event('blur'));
  check('window blur does not panic when off', activeTab(w) === 'items');
  w = await bootW(S({ blurOnBlur: true }));
  w.dispatchEvent(new w.Event('blur'));
  check('window blur panics when enabled', activeTab(w) === 'archive');

  group('Form flow (no beforeunload, silent resume)');
  w = await bootW(S({}));
  await openRow(w, 0);
  $$(w, '.card-foot .btn')[1].click();
  await wait(w, 5);
  flush(w);
  const modal = w.document.querySelector('[role="dialog"]');
  check('Open form proxies to the source dialog', !!modal);
  check('Form sheet opens and is active', activeTab(w) === 'form');
  check('progress meter is non-zero on the first screen (fixture)', +modal.querySelector('progress').value > 0);
  check('opens on step 1 regardless of the meter', $('.f-step').textContent === 'Step 1');
  check('Back disabled on step 1', $$(w, '.f-bar .btn')[0].disabled);
  const labels = $$(w, '.f-wrap tbody tr td:nth-child(2)').map((e) => e.textContent);
  check('fields read semantically', labels[0] === 'Email address' && labels[1] === 'Mobile phone number', labels);
  check('required flagged', $$(w, '.f-wrap tbody tr td:nth-child(4)').every((e) => e.textContent === 'Yes'));
  const phone = $$(w, '.f-wrap .f-in')[1];
  phone.value = '0412 345 678';
  phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('typing writes into the source field', w.__mock.answers.phone === '0412 345 678' && modal.querySelector('#am-phone').value === '0412 345 678');
  $$(w, '.f-bar .btn')[1].click();
  await wait(w, 5);
  flush(w);
  check('Next advances to step 2', $('.f-step').textContent.startsWith('Step 2') && !$$(w, '.f-bar .btn')[0].disabled);
  const yrs = $$(w, '.f-wrap .f-in')[0];
  yrs.value = '7';
  yrs.dispatchEvent(new w.Event('input', { bubbles: true }));
  const rights = $$(w, '.f-wrap select.f-in')[0];
  rights.value = 'Yes';
  rights.dispatchEvent(new w.Event('change', { bubbles: true }));
  check('radio groups render as a select and write back', w.__mock.answers.rights === 'Yes');
  const formSnapBefore = w.document.querySelector('#am-years').value;
  yrs.focus();
  press(w, PANIC);
  check('panic mid-form lands byte-identical', snap(w) === clean);
  check('no beforeunload fired', w.__mock.unloadAttempts === 0);
  check('source dialog left open and connected', modal.isConnected && w.__mock.removedModals === 0);
  check('typed values intact in the source', w.document.querySelector('#am-years').value === formSnapBefore && formSnapBefore === '7');
  check('Form tab hidden on the landing', !tabIds(w).includes('form'));
  tab(w, 'items').click();
  check('resume: Form tab returns after Items click', tabIds(w).includes('form'));
  tab(w, 'form').click();
  check('resume: values still present on step 2', $$(w, '.f-wrap .f-in')[0].value === '7' && $('.f-step').textContent.startsWith('Step 2'));
  $$(w, '.f-bar .btn')[1].click();
  await wait(w, 5);
  flush(w);
  check('review step labelled final, primary reads Submit', /final/.test($('.f-step').textContent) && $$(w, '.f-bar .btn')[1].textContent === 'Submit');
  $$(w, '.f-bar .btn')[1].click();
  await wait(w, 5);
  flush(w);
  check('submit: dialog closed by the source, back on Items', !w.document.querySelector('[role="dialog"]') && activeTab(w) === 'items');
  check('row status reads Applied', cell(rows(w)[0], 7) === 'Applied');
  await openRow(w, 2);
  const openBtn = $$(w, '.card-foot .btn')[1];
  check('non-form rows offer "Open source"', openBtn.textContent === 'Open source');
  openBtn.click();
  await wait(w, 5);
  flush(w);
  check('Open source proxies without opening a Form sheet', w.__mock.externalOpened === '4071200103' && activeTab(w) === 'items');

  group('Loading & settings');
  w = await bootW(S({}));
  const vp = w.QT.app.ui().main;
  vp.dispatchEvent(new w.Event('scroll'));
  await wait(w, 5);
  flush(w);
  check('reaching the grid end loads more from the source (opacity, not display:none)', rows(w).length === 28, rows(w).length);
  w = await bootW(S({ codeSources: true }));
  const org = cell(rows(w)[0], 2);
  check('codeSources shows NPC codes', /^NPC-\d{3}$/.test(org), org);
  check('codes are stable per organisation', cell(rows(w)[11], 2) === org);
  await w.chrome.storage.local.set({ qt: { ...S({}), paused: true } });
  await wait(w, 5);
  check('pause adds .qt-off and hides the frame', w.document.documentElement.classList.contains('qt-off') && w.document.querySelector('[data-qt-host]').style.display === 'none');
  await w.chrome.storage.local.set({ qt: { ...S({}), paused: false, fileName: 'budget_fy27' } });
  await wait(w, 5);
  check('unpause restores armour; file name change retitles', !w.document.documentElement.classList.contains('qt-off') && w.document.title === skin.title('budget_fy27'));
  w = await bootW(S({ archive: { columns: ['Code', 'Vendor', 'Team', 'Quarter', 'Owner', 'Spend'], rows: [['A1', 'Acme', 'Ops', 'Q1', 'K', '$10'], ['A2', 'Beta', 'Ops', 'Q2', 'L', '$20']] } }));
  press(w, PANIC);
  check('Archive renders the pasted sheet', rows(w).length === 2 && cell(rows(w)[0], 1) === 'Acme');
  if (skin.chips) check('Archive chips derived from pasted columns', $$(w, '[data-chip]').map((c) => c.textContent).join(',') === 'Vendor,Team,Quarter,Owner,Spend');
  else check('Archive header filters derived from pasted columns', $$(w, '.g-fbtn').length === 6);
  check('numeric pasted column right-aligned', rows(w)[0].querySelectorAll('td')[5].classList.contains('num'));
  const parsed = QT.parseArchive('A\tB\n1\t2\n3\t4');
  check('paste parser: tab-separated with header row', parsed.columns.join() === 'A,B' && parsed.rows.length === 2);

  group('Maintenance surface');
  const files = walk('src').filter((f) => f.endsWith('.js') && !f.endsWith('content/dom.js'));
  const leaks = files.filter((f) => /linkedin|artdeco|job-card|jobs-|\/jobs\/|easy apply|data-job|occludable/i.test(read(f)));
  check('no source-site assumption outside dom.js', leaks.length === 0, leaks);
  const D = w.QT.dom.S;
  const doc = w.document;
  w = await bootW(S({}));
  await openRow(w, 0);
  const mustResolve = ['list', 'card', 'cardLink', 'cardTitle', 'cardCompany', 'cardLocation', 'cardFooter', 'detail', 'detailTitle', 'detailBody', 'saveBtn', 'applyBtn', 'search'];
  const unresolved = mustResolve.filter((k) => !w.QT.dom.S[k].some((s) => w.document.querySelector(s)));
  check('every selector group resolves against the fixture', unresolved.length === 0, unresolved);
  check('selector health still zero after a full session', w.QT.health.total === 0, JSON.stringify(w.QT.health.misses));
  void D;
  void doc;

  return { results, skinName };
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export function report({ results, skinName }) {
  let cur = '';
  let fails = 0;
  for (const r of results) {
    if (r.section !== cur) {
      cur = r.section;
      console.log(`\n${cur}`);
    }
    if (!r.ok) fails++;
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.ok || r.info === undefined ? '' : '  → ' + JSON.stringify(r.info)}`);
  }
  console.log(`\n[${skinName}] ${results.length - fails}/${results.length} passing`);
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.chdir(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'));
  const skins = process.argv.slice(2).length ? process.argv.slice(2) : ['classic'];
  let fails = 0;
  for (const s of skins) fails += report(await run({ skin: s }));
  process.exit(fails ? 1 : 0);
}
