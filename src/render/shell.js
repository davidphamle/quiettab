// The frame: four fixed bands (chrome / body / tabs / status). Their sizes
// come from the skin and never change at runtime, and sheet renderers only
// ever see the body's viewport, so nothing they draw can move the frame.
(function () {
  const QT = (window.QT = window.QT || {});
  const { h } = QT.ui;
  QT.skins = QT.skins || {};

  const BASE_CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.frame { position: fixed; inset: 0; display: grid; overflow: hidden;
  grid-template-rows: var(--chrome-h) minmax(0, 1fr) var(--tabs-h) var(--status-h);
  background: var(--chrome-bg); color: var(--ink); font: 13px/1.4 var(--ui-font); }
.band { min-height: 0; overflow: hidden; }
.body { display: flex; min-height: 0; background: var(--sheet-bg); border-top: 1px solid var(--line-strong); }
.viewport { flex: 1 1 auto; overflow: auto; min-width: 0; position: relative; }
.side { flex: 0 0 var(--side-w); border-left: 1px solid var(--line-strong); background: var(--panel-bg); min-height: 0; display: none; }
.side.open { display: flex; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: default; }
input, select { font: inherit; color: inherit; }
.spacer { flex: 1 1 auto; }
.muted { color: var(--ink-3); }

/* grid */
.grid { border-collapse: separate; border-spacing: 0; table-layout: fixed; font: var(--cell-font); color: var(--cell-ink); }
.grid th, .grid td { height: var(--row-h); padding: 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  border-right: 1px solid var(--grid); border-bottom: 1px solid var(--grid); text-align: left; font-weight: 400; }
.g-letters th { position: sticky; top: 0; z-index: 3; background: var(--hdr-bg); color: var(--hdr-ink); text-align: center; font: var(--hdr-font); border-color: var(--line-strong); }
.g-corner { left: 0; z-index: 5 !important; }
.g-num { position: sticky; left: 0; z-index: 2; background: var(--hdr-bg); color: var(--hdr-ink); text-align: center !important; font: var(--hdr-font) !important; border-color: var(--line-strong) !important; }
.g-head td, .g-head th { position: sticky; top: var(--row-h); z-index: 2; }
.g-head td { background: var(--frozen-bg); font-weight: 700; }
.g-head th { z-index: 4; }
.g-head { box-shadow: 0 2px 0 var(--freeze-line); }
.g-head td { border-bottom: 2px solid var(--freeze-line); }
.g-hcell { position: relative; padding-right: 22px !important; }
.g-fbtn { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 17px; height: 17px; border-radius: 3px; display: grid; place-items: center; color: var(--ink-3); }
.g-fbtn svg { width: 13px; height: 13px; }
.g-fbtn:hover { background: var(--hover); }
.g-fbtn.on { color: var(--accent); background: var(--accent-soft); }
.g-cell.num { text-align: right; }
.g-cell.sel { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--sel-fill); }
.hl { background: var(--hdr-hl) !important; color: var(--hdr-hl-ink) !important; }
.g-row.active td { background: var(--row-active); }
.g-row:not(.empty):hover td { background: var(--row-hover); }

/* filter menu */
.layer { position: fixed; inset: 0; pointer-events: none; }
.layer > * { pointer-events: auto; }
.pop { position: absolute; }
.fmenu, .mmenu { width: 240px; background: var(--panel-bg); border: 1px solid var(--line-strong); border-radius: var(--radius); box-shadow: 0 6px 24px rgba(15,23,42,.16); padding: 6px 0; font: 13px/1.4 var(--ui-font); color: var(--ink); }
.fm-sort { border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-bottom: 4px; }
.fm-row, .mm-item { display: flex; width: 100%; padding: 5px 14px; text-align: left; gap: 8px; }
.fm-row:hover, .mm-item:hover { background: var(--hover); }
.mm-item .k { margin-left: auto; color: var(--ink-3); }
.mm-sep { height: 1px; background: var(--line); margin: 4px 0; }
.fm-head { padding: 4px 14px; font-weight: 600; font-size: 12px; color: var(--ink-2); }
.fm-links { padding: 0 14px 6px; font-size: 12px; color: var(--ink-3); }
.fm-link { color: var(--accent); }
.fm-search { display: block; margin: 0 14px 6px; width: calc(100% - 28px); height: 28px; border: 1px solid var(--line-strong); border-radius: 4px; padding: 0 8px; background: var(--sheet-bg); }
.fm-list { max-height: 220px; overflow: auto; padding: 0 6px; }
.fm-item { display: flex; align-items: center; gap: 8px; padding: 3px 8px; border-radius: 4px; }
.fm-item:hover { background: var(--hover); }
.fm-val { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm-count { color: var(--ink-3); font-variant-numeric: tabular-nums; }
.fm-foot { display: flex; justify-content: flex-end; padding: 8px 14px 4px; border-top: 1px solid var(--line); margin-top: 6px; }

/* buttons */
.btn { height: 28px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: var(--radius); background: var(--sheet-bg); }
.btn:hover:not([disabled]) { background: var(--hover); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.btn[disabled] { opacity: .45; }
.icon-btn { width: 28px; height: 28px; border-radius: var(--radius); display: inline-grid; place-items: center; color: var(--ink-2); }
.icon-btn:hover { background: var(--hover); }

/* record card */
.card { display: flex; flex-direction: column; width: 100%; min-height: 0; }
.card-head { flex: 0 0 auto; padding: 10px 16px 12px; border-bottom: 1px solid var(--line); }
.card-bar { display: flex; align-items: center; justify-content: space-between; margin: 0 -6px 6px 0; }
.card-ref { font: var(--hdr-font); color: var(--ink-3); letter-spacing: .02em; }
.card-title { font-size: 15px; font-weight: 600; line-height: 1.35; margin-bottom: 8px; }
.card-meta { display: grid; grid-template-columns: 72px 1fr; gap: 3px 10px; margin: 0; font-size: 12.5px; }
.card-meta dt { color: var(--ink-3); }
.card-meta dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-notes { flex: 1 1 auto; overflow: auto; padding: 12px 16px; font-size: 13px; line-height: 1.55; color: var(--ink-2); min-height: 0; }
.card-notes p { margin: 0 0 8px; }
.card-foot { flex: 0 0 auto; display: flex; gap: 8px; justify-content: flex-end; padding: 10px 16px; border-top: 1px solid var(--line); }
.skel { height: 10px; border-radius: 3px; background: var(--line); margin: 8px 0 12px; }
.w90 { width: 90%; } .w80 { width: 80%; } .w70 { width: 70%; } .w50 { width: 50%; }

/* form sheet */
.f-wrap { display: flex; flex-direction: column; min-height: 100%; }
.f-wrap > .grid { align-self: flex-start; }
.f-cell { padding: 0 !important; }
.f-in { width: 100%; height: calc(var(--row-h) - 1px); border: 0; padding: 0 6px; background: transparent; font: var(--cell-font); outline: none; }
.f-in:focus { box-shadow: inset 0 0 0 2px var(--accent); }
.f-chk { margin: 0 6px; }
.f-bar { position: sticky; bottom: 0; left: 0; z-index: 6; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--panel-bg); border-top: 1px solid var(--line); margin-top: auto; }
.f-step { font: var(--hdr-font); color: var(--ink-3); }

/* empty states */
.empty-state { padding: 40px 56px; color: var(--ink-3); font: var(--cell-font); }
.empty-hint { position: absolute; top: calc(var(--row-h) * 3 + 6px); left: 64px; max-width: 360px; padding: 12px 14px;
  background: var(--panel-bg); border: 1px solid var(--line-strong); border-radius: var(--radius);
  box-shadow: 0 2px 10px rgba(15,23,42,.08); color: var(--ink-2); font: 13px/1.45 var(--ui-font); }
.eh-title { font-weight: 600; color: var(--ink); margin-bottom: 2px; }

/* pager */
.pager { display: inline-flex; align-items: center; gap: 2px; font-size: 12.5px; color: var(--ink-2); }
.pager:empty { display: none; }
.pager .pg-btn { width: 26px; height: 26px; border-radius: var(--radius); display: inline-grid; place-items: center; color: var(--ink-2); }
.pager .pg-btn:hover:not([disabled]) { background: var(--hover); }
.pager .pg-btn[disabled] { opacity: .35; }
.pager .pg-btn svg { width: 14px; height: 14px; }
.pager .pg-n { min-width: 48px; text-align: center; font-variant-numeric: tabular-nums; }
`;

  function mount(root, skin, ctx) {
    const style = h('style', null, BASE_CSS + '\n' + skin.css);
    const chrome = skin.chrome(ctx);
    const tabs = skin.tabs(ctx);
    const status = skin.status(ctx);
    const main = h('div', { class: 'viewport', tabindex: '0' });
    const side = h('aside', { class: 'side' });
    const layer = h('div', { class: 'layer skin-' + skin.id });
    const frame = h(
      'div',
      { class: 'frame skin-' + skin.id },
      h('header', { class: 'band chrome' }, chrome.el),
      h('div', { class: 'band body' }, main, side),
      h('nav', { class: 'band tabs' }, tabs.el),
      h('footer', { class: 'band status' }, status.el)
    );
    root.replaceChildren(style, frame, layer);

    let pop = null;
    const ui = {
      skin,
      frame,
      main,
      side,
      layer,
      chrome,
      tabs,
      status,
      showSide(open) {
        side.classList.toggle('open', !!open);
        if (!open) side.replaceChildren();
      },
      openPop(el, anchor) {
        ui.closePop();
        const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 0, bottom: 0 };
        const w = (frame.getBoundingClientRect && frame.getBoundingClientRect().width) || 1200;
        pop = h('div', { class: 'pop', style: `left:${Math.max(4, Math.min(r.left, w - 250))}px;top:${r.bottom + 2}px` }, el);
        layer.replaceChildren(pop);
        return pop;
      },
      closePop() {
        pop = null;
        layer.replaceChildren();
      },
      get popOpen() {
        return !!pop;
      },
    };
    return ui;
  }

  // Shared pager control for skins: "< Page 2 >", bound to the source's own
  // result pages. Hidden when the source does not page.
  function pager(ctx) {
    const { icons } = QT.ui;
    const el = h('span', { class: 'pager' });
    return {
      el,
      set(p) {
        if (!p) return el.replaceChildren();
        el.replaceChildren(
          h('button', { class: 'pg-btn', 'aria-label': 'Previous page', disabled: !p.hasPrev, html: icons.left, onclick: () => ctx.onPage(-1) }),
          h('span', { class: 'pg-n' }, 'Page ' + p.page),
          h('button', { class: 'pg-btn', 'aria-label': 'Next page', disabled: !p.hasNext, html: icons.right, onclick: () => ctx.onPage(1) })
        );
      },
    };
  }

  QT.shell = { mount, pager, BASE_CSS };
})();
