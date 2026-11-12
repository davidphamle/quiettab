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
    // jsdom has no top layer: emulate showModal() and :modal (test-only).
  const D = window.HTMLDialogElement && window.HTMLDialogElement.prototype;
  if (D && !D.showModal) {
    D.showModal = function () { this.__modal = true; this.setAttribute('open', ''); };
    D.close = function () { this.__modal = false; this.removeAttribute('open'); };
    const m = Element.prototype.matches;
    Element.prototype.matches = function (sel) { return sel === ':modal' ? !!(this.__modal && this.hasAttribute('open')) : m.call(this, sel); };
  }
  window.__send = (m) => new Promise(res => { let done = false; msg.forEach(fn => fn(m, {}, (r) => { done = true; res(r); })); setTimeout(() => !done && res(undefined), 0); });
})();`;

export const FIXTURES = {
  current: { file: 'harness/mock-linkedin.html', url: 'https://www.linkedin.com/jobs/search-results/?keywords=product%20manager' },
  legacy: { file: 'harness/mock-linkedin-legacy.html', url: 'https://www.linkedin.com/jobs/search/?keywords=product%20manager' },
};

export async function boot(seed = {}, fixture = 'current', urlOverride) {
  const fx = FIXTURES[fixture];
  const early = manifest.content_scripts[0];
  const idle = manifest.content_scripts[1];
  let html = read(fx.file);
  const startTags =
    early.css.map((f) => `<style data-armour>${read(f)}</style>`).join('') +
    `<script>window.__QT_SEED=${JSON.stringify({ qt: seed }).replace(/</g, '\\u003c')}.qt;</script>` +
    `<script>${SHIM}</script>` +
    early.js.map((f) => `<script>${read(f)}</script>`).join('');
  html = html.replace('<head>', () => '<head>' + startTags);

  const dom = new JSDOM(html, {
    url: urlOverride || fx.url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const f of idle.js) w.eval(read(f) + `\n//# sourceURL=${f}`);
  // Navigation is not implemented in jsdom: record it instead.
  w.QT.dom.navigate = (u) => {
    w.__navigations = (w.__navigations || []).concat(u);
    const k = new URL(u, w.location.href).searchParams.get('keywords');
    if (k && w.__mock) w.__mock.searches.push(k);
  };
  await tick(w);
  return w;
}

export const tick = (w, ms = 0) => new Promise((r) => w.setTimeout(r, ms));
export const wait = (w, ms) => tick(w, ms);
export { ROOT };
