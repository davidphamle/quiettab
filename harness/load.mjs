// Boots the extension's content scripts against the mock in jsdom, in the
// same order and at the same moments as the manifest: armour CSS and
// early.js at document_start, the rest at document_idle.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
export const manifest = JSON.parse(read('manifest.json'));

const SHIM = `
(function(){
  let store = window.__QT_SEED || {};
  const changed = [];
  const msg = [];
  window.__msg = msg;
  window.chrome = {
    storage: {
      local: {
        get(k, cb) { cb({ qt: JSON.parse(JSON.stringify(store)) }); },
        set(o, cb) {
          const old = store; store = JSON.parse(JSON.stringify(o.qt));
          setTimeout(() => { changed.forEach(fn => fn({ qt: { oldValue: old, newValue: store } }, 'local')); cb && cb(); }, 0);
        },
      },
      onChanged: { addListener(fn) { changed.push(fn); } },
    },
    runtime: { onMessage: { addListener(fn) { msg.push(fn); } } },
  };
  window.__send = (m) => new Promise(res => { let done = false; msg.forEach(fn => fn(m, {}, (r) => { done = true; res(r); })); setTimeout(() => !done && res(undefined), 0); });
})();`;

export async function boot(seed = {}) {
  const early = manifest.content_scripts[0];
  const idle = manifest.content_scripts[1];
  let html = read('harness/mock-linkedin.html');
  const startTags =
    early.css.map((f) => `<style data-armour>${read(f)}</style>`).join('') +
    `<script>window.__QT_SEED=${JSON.stringify({ qt: seed }).replace(/</g, '\\u003c')}.qt;</script>` +
    `<script>${SHIM}</script>` +
    early.js.map((f) => `<script>${read(f)}</script>`).join('');
  html = html.replace('<head>', '<head>' + startTags);

  const dom = new JSDOM(html, {
    url: 'https://www.linkedin.com/jobs/search/?keywords=product%20manager',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const f of idle.js) w.eval(read(f) + `\n//# sourceURL=${f}`);
  await tick(w);
  return w;
}

export const tick = (w, ms = 0) => new Promise((r) => w.setTimeout(r, ms));
export const wait = (w, ms) => tick(w, ms);
export { ROOT };
