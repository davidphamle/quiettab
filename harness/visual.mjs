// Real-browser checks in headless Chrome: screenshots of each state, frame
// band geometry across sheets (zero layout shift), and the armour fail-safe.
//   CHROME=/path/to/chrome node harness/visual.mjs [skin]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { read, manifest } from './load.mjs';

const OUT = 'harness/out';
fs.mkdirSync(OUT, { recursive: true });
const skin = process.argv[2] || 'workbook';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';

const SHIM = `window.chrome={storage:{local:{get:(k,cb)=>cb({qt:{skin:${JSON.stringify(skin)}}}),set:(o,cb)=>cb&&cb()},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}}};`;

function page(withScripts) {
  const [early, idle] = manifest.content_scripts;
  let html = read('harness/mock-linkedin.html');
  const head = early.css.map((f) => `<style>${read(f)}</style>`).join('') + (withScripts ? `<script>${SHIM}</script>` + early.js.map((f) => `<script>${read(f)}</script>`).join('') : '');
  html = html.replace('<head>', () => '<head>' + head);
  if (withScripts) html = html.replace('</body>', () => idle.js.map((f) => `<script>${read(f)}</script>`).join('') + '</body>');
  const file = path.resolve(OUT, withScripts ? `preview-${skin}.html` : 'armour-only.html');
  fs.writeFileSync(file, html);
  return 'file://' + file;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const p = await browser.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const shot = (n) => p.screenshot({ path: `${OUT}/${skin}-${n}.png` });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));

// fail-safe: armour alone
await p.goto(page(false));
const blank = await p.evaluate(() => getComputedStyle(document.body).opacity);
await shot('armour-only');

await p.goto(page(true));
await new Promise((r) => setTimeout(r, 300));
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
await new Promise((r) => setTimeout(r, 300));
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
  const root = QT.app.root;
  root.querySelectorAll('.card-foot .btn')[1].click();
});
await new Promise((r) => setTimeout(r, 300));
await shot('4-form');
const b2 = await bands();

await p.keyboard.down('Alt');
await p.keyboard.down('Shift');
await p.keyboard.press('KeyQ');
await p.keyboard.up('Shift');
await p.keyboard.up('Alt');
await new Promise((r) => setTimeout(r, 100));
await shot('5-archive');
const b3 = await bands();
const title = await p.title();

await browser.close();
const same = [b1, b2, b3].every((b) => JSON.stringify(b) === JSON.stringify(b0));
console.log(JSON.stringify({ skin, armourOnlyBodyOpacity: blank, bandsStable: same, title, errors }, null, 2));
process.exit(blank === '0' && same && !errors.length ? 0 : 1);
