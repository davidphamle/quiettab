// Real-browser checks in headless Chrome: screenshots of each state, frame
// band geometry across sheets (zero layout shift), the armour fail-safe, and
// the top-layer dialog case jsdom cannot model (a real showModal()).
//   CHROME=/path/to/chrome node harness/visual.mjs [skin]
// The fixture is served at a real job-search URL (request interception), so
// route scoping behaves as it does on the site. Nothing leaves the machine.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { read, manifest } from './load.mjs';

const OUT = 'harness/out';
fs.mkdirSync(OUT, { recursive: true });
const skin = process.argv[2] || 'workbook';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const URL_JOBS = 'https://www.linkedin.com/jobs/search-results/?keywords=product%20manager';

const SHIM = `window.chrome={storage:{local:{get:(k,cb)=>cb({qt:{skin:${JSON.stringify(skin)}}}),set:(o,cb)=>cb&&cb()},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}}};`;

function html(withScripts) {
  const [early, idle] = manifest.content_scripts;
  let s = read('harness/mock-linkedin.html');
  const head = early.css.map((f) => `<style>${read(f)}</style>`).join('') + (withScripts ? `<script>${SHIM}</script>` + early.js.map((f) => `<script>${read(f)}</script>`).join('') : '');
  s = s.replace('<head>', () => '<head>' + head);
  if (withScripts) s = s.replace('</body>', () => idle.js.map((f) => `<script>${read(f)}</script>`).join('') + '</body>');
  return s;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const p = await browser.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const shot = (n) => p.screenshot({ path: `${OUT}/${skin}-${n}.png` });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
// The fixture's own leave-page guard (form still open) between sections.
p.on('dialog', (d) => d.accept());
let body = html(false);
await p.setRequestInterception(true);
p.on('request', (r) => {
  if (r.url().startsWith('https://www.linkedin.com/')) r.respond({ status: 200, contentType: 'text/html', body });
  else r.abort();
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fail-safe: armour alone
await p.goto(URL_JOBS);
const blank = await p.evaluate(() => getComputedStyle(document.body).opacity);
await shot('armour-only');

body = html(true);
await p.goto(URL_JOBS);
await sleep(400);
const bands = () =>
  p.evaluate(() => {
    const f = QT.app.ui().frame;
    return [...f.children].map((b) => JSON.stringify(b.getBoundingClientRect()));
  });
const b0 = await bands();
await shot('1-items');

await p.evaluate(() => {
  const r = QT.app.root.querySelectorAll('tbody .g-row')[1].querySelectorAll('td')[1];
  r.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
});
await sleep(300);
await shot('2-record');
const b1 = await bands();

await p.evaluate(() => {
  const root = QT.app.root;
  const btn = root.querySelectorAll('.g-fbtn')[4] || root.querySelector('[data-chip="tier"]');
  if (btn.classList.contains('g-fbtn')) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  else btn.click();
});
await shot('3-filter');

await p.evaluate(() => {
  QT.app.ui().closePop();
  QT.app.root.querySelectorAll('.card-foot .btn')[1].click();
});
await sleep(400);
await shot('4-form');
const b2 = await bands();
// Real top layer: the source's form is a showModal() dialog.
const topLayer = await p.evaluate(() => {
  const d = document.querySelector('dialog[open]');
  const host = document.querySelector('[data-qt-host]');
  const kid = d && [...d.children].find((c) => c !== host);
  return {
    dialogIsModal: !!d && d.matches(':modal'),
    hostInsideDialog: !!d && host.parentNode === d,
    hostOnTop: document.elementFromPoint(720, 450) === host,
    dialogContentHidden: !!kid && getComputedStyle(kid).opacity === '0',
    backdropClear: !!d && getComputedStyle(d, '::backdrop').backgroundColor === 'rgba(0, 0, 0, 0)',
  };
});
// Type into the sheet through the real browser: proves the host is not inert.
await p.evaluate(() => {
  const i = QT.app.root.querySelectorAll('.f-wrap .f-in')[1];
  i.focus();
  i.select();
});
await p.keyboard.type('0499 111 222');
const typedThrough = await p.evaluate(() => window.__mock.field('phone').value);
await p.keyboard.press('Escape');
const escapeKeptOpen = await p.evaluate(() => !!document.querySelector('dialog[open]') && !window.__mock.dismissAttempts);

await p.keyboard.down('Alt');
await p.keyboard.down('Shift');
await p.keyboard.press('KeyQ');
await p.keyboard.up('Shift');
await p.keyboard.up('Alt');
await sleep(150);
await shot('5-archive');
const b3 = await bands();
const title = await p.title();

// Button states, the redrawn "Share your profile?" step, and tab-bar menus.
await p.goto(URL_JOBS);
await sleep(400);
await p.evaluate(() => {
  const r = QT.app.root.querySelectorAll('tbody .g-row')[2].querySelectorAll('td')[1];
  r.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
});
await sleep(300);
const btnBox = await p.evaluate(() => {
  const b = QT.app.root.querySelectorAll('.card-foot .btn')[1];
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.textContent };
});
const colours = async () =>
  p.evaluate(() => {
    const b = QT.app.root.querySelectorAll('.card-foot .btn')[1];
    const cs = getComputedStyle(b);
    return { bg: cs.backgroundColor, fg: cs.color };
  });
const rest = await colours();
await p.mouse.move(btnBox.x, btnBox.y);
await sleep(150);
const hover = await colours();
await p.screenshot({ path: `${OUT}/${skin}-6-button-hover.png`, clip: { x: btnBox.x - 160, y: btnBox.y - 30, width: 260, height: 60 } });
await p.mouse.down();
await sleep(150);
const pressed = await colours();
await p.screenshot({ path: `${OUT}/${skin}-7-button-pressed.png`, clip: { x: btnBox.x - 160, y: btnBox.y - 30, width: 260, height: 60 } });
await p.mouse.up();
await sleep(400);
await shot('8-prompt');
const prompt = await p.evaluate(() => {
  const pr = QT.app.root.querySelector('.pr');
  return pr ? { title: pr.querySelector('.pr-title').textContent, onTop: document.elementFromPoint(720, 300) === document.querySelector('[data-qt-host]') } : null;
});
await p.evaluate(() => [...QT.app.root.querySelectorAll('.pr-foot .btn')].find((b) => b.textContent === 'Cancel').click());
await sleep(200);
let menuInView = true;
if (skin === 'workbook') {
  await p.evaluate(() => QT.app.root.querySelector('[aria-label="All sheets"]').click());
  await sleep(100);
  await shot('9-sheets-menu');
  menuInView = await p.evaluate(() => {
    const m = QT.app.root.querySelector('.mmenu').getBoundingClientRect();
    return m.top >= 0 && m.bottom <= innerHeight && m.height > 20;
  });
}
const lum = (c) => {
  // rgb(0-255) or color(srgb 0-1) from color-mix()
  const k = /^color\(/.test(c) ? 255 : 1;
  const [r, g, b] = c.replace(/^color\(srgb/, '').match(/\d*\.?\d+/g).map((v) => Number(v) * k);
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return +((x + 0.05) / (y + 0.05)).toFixed(2);
};
const buttonStates = {
  label: btnBox.label,
  rest: contrast(rest.bg, rest.fg),
  hover: contrast(hover.bg, hover.fg),
  pressed: contrast(pressed.bg, pressed.fg),
  hoverDiffers: hover.bg !== rest.bg,
  pressedDiffers: pressed.bg !== hover.bg,
};
const buttonsOk = buttonStates.hover >= 4.5 && buttonStates.pressed >= 4.5 && buttonStates.hoverDiffers && buttonStates.pressedDiffers;

// toolbar panel
const pop = await browser.newPage();
await pop.setViewport({ width: 300, height: 420, deviceScaleFactor: 2 });
await pop.evaluateOnNewDocument((sk) => {
  let st = { skin: sk };
  window.chrome = {
    storage: { local: { get: (k, cb) => cb({ qt: st }), set: (o, cb) => ((st = o.qt), cb && cb()) } },
    runtime: { openOptionsPage() {}, lastError: null },
    commands: { getAll: (cb) => cb([{ name: 'panic', shortcut: 'Alt+Shift+Q' }]) },
    tabs: { query: async () => [{ id: 1 }], sendMessage: (id, m, cb) => cb({ covered: true, rows: 25, misses: 0 }) },
  };
}, skin);
await pop.goto('file://' + path.resolve('src/popup/popup.html'));
await sleep(200);
const ph = await pop.evaluate(() => document.body.scrollHeight);
await pop.setViewport({ width: 300, height: ph, deviceScaleFactor: 2 });
await pop.screenshot({ path: `${OUT}/popup-${skin}.png` });
await pop.click('#power');
await sleep(100);
await pop.screenshot({ path: `${OUT}/popup-${skin}-off.png` });

await browser.close();
const same = [b1, b2, b3].every((b) => JSON.stringify(b) === JSON.stringify(b0));
const tl = Object.values(topLayer).every(Boolean);
console.log(JSON.stringify({ skin, armourOnlyBodyOpacity: blank, bandsStable: same, topLayer, typedThrough, escapeKeptOpen, buttonStates, prompt, menuInView, title, errors }, null, 2));
process.exit(blank === '0' && same && tl && typedThrough === '0499 111 222' && escapeKeptOpen && buttonsOk && prompt && prompt.onTop && menuInView && !errors.length ? 0 : 1);
