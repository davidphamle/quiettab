# Quiet Tab

A Chrome extension that redraws a job-search page as a dull spreadsheet, so
browsing roles at your desk looks like working in a tracker.

> **Read this first.** Quiet Tab changes what your screen looks like to
> someone standing behind you. It does not change what your employer can
> see. Monitored machines and networks still log the sites you visit, and
> extensions can be visible to IT. Check your acceptable-use policy.

## How it works

**Armour + overlay** (see `docs/build-notes.md` for the reasoning):

- **Armour** (`src/armour.css`): a static stylesheet injected at
  `document_start` by the manifest. It blanks the page and hides imagery
  before first paint, with no JavaScript involved. If every script fails you
  get a blank page, never the source site.
- **Overlay** (`src/content`, `src/render`): reads the page's data out of its
  DOM and draws our own workbook into a closed shadow root on `<html>`.
  Clicks are proxied back to the page's real controls.
- **Panic** (`Alt+Shift+Q`, configurable at `chrome://extensions/shortcuts`):
  jumps to the Archive sheet. One-way, never navigates, never touches the
  page's own dialog, so typed form values survive and nothing can trigger a
  "leave site?" prompt.

## Interfaces

Pick one on the options page. All share the same grid, record panel, form
sheet, filters and panic behaviour.

| Skin | Looks like |
|---|---|
| **Workbook** (default) | A web spreadsheet: menus, formatting toolbar, name box + formula bar, frozen header with filter carets, sheet tabs |
| **Classic** | A read-only csv viewer with filter chips |

## Install (unpacked)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Pin the icon. Its panel has the **on/off switch**, the **interface picker**,
   and this tab's status.

Only job pages are covered; the rest of the site works as normal.

## Develop

```bash
npm install
npm test                      # acceptance suite, once per skin
CHROME=/path/to/chrome npm run visual   # screenshots + layout-shift check
```

| Path | What it is |
|---|---|
| `src/content/dom.js` | **Every** assumption about the source site's DOM. Nothing else may contain one. |
| `src/content/route.js` | Which URLs are covered. With `dom.js`, the whole source-site adapter. |
| `harness/mock-linkedin.html` | Executable statement of the site's current DOM (`-legacy.html`: the old one). Changes with `dom.js`. |
| `harness/acceptance.mjs` | Regression suite. Run before every release. |
| `src/render/skins/` | Interface skins. Each owns its chrome bands; the grid, card and form renderers are shared. |

## Known gaps

- Selectors are written to documented shapes and pass against the fixture;
  they are unverified against the live site. The toolbar popup shows a miss
  count. Check it during the first live session.
- Filters reach loaded rows only (by design). Widen with the find box + Enter.
- Single-page navigation into the jobs area from elsewhere on the site is
  covered because armour applies site-wide; non-job routes show an empty
  Items sheet.
