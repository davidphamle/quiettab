# Quiet Tab — build notes (rebuild)

This repository was **rebuilt from the v0.3.0 build notes** on 9 Nov 2026,
because the original v0.3.0 source was not available. The original notes are
kept verbatim in `docs/build-notes-v0.3-original.md`; they are the spec this
code was rebuilt against. Everything they describe is implemented unless
listed below.

## Differences from the original v0.3.0

| Area | Original | Rebuild |
|---|---|---|
| Threads sheet (messages) | Built, "stricter" exposure | **Not rebuilt.** §12 decision still needs David's call, so it is left out rather than guessed. |
| Acceptance suite | 91 checks | Rewritten from the notes: 96 checks on the classic skin. Not the same 91. |
| P0 numbering | Checks keyed to PRD P0s | PRD not available; checks are grouped by behaviour instead. |

## Rebuilt guarantees (each has checks in `harness/acceptance.mjs`)

- Armour at `document_start`, no JS dependency, lifted only by `.qt-off`.
- Closed shadow root on `<html>`; page kept at opacity 0 so lazy-load works.
- Byte-identical panic landing from any state; panic one-way; closes menus,
  resets Archive filters.
- No `beforeunload`: panic never navigates, submits, or touches the source dialog.
- Silent resume: Form tab returns after a deliberate Items click.
- Form step from semantics (Back present / "Submit application"), not the meter.
- Record card: head fixed, notes scroll, footer outside the scroll.
- Stale-pane guard. Save (not Flag). Filters on loaded rows with counts.
- Title and favicon guard (not in the original notes, but the tab strip
  showed the source site's name, which armour CSS cannot reach).

---

## v0.4.0 — Workbook skin (9 Nov 2026)

**Skins.** `src/render/skins/` now holds interchangeable interface skins. A
skin owns only the chrome bands (top, tabs, status) and their tokens; the
grid, record card, form sheet, filters and panic are shared, so every
guarantee above holds for every skin and the acceptance suite runs once per
skin. Choose one on the options page.

**Workbook (new default).** Follows the layout conventions of a mainstream
web spreadsheet: title row with File/Edit/View/Insert/Format/Data/Tools/Help
menus, a formatting toolbar, a name box and `fx` formula bar that track the
selected cell, column letters A–N with spare empty columns and rows, a frozen
header row whose filter carets open the values menu (with Sort A→Z / Z→A),
arrow-key cell navigation, sheet tabs with `+` and all-sheets buttons, and a
`Count:` readout in the tab bar. The record card opens as the tool's details
panel. Find lives in the toolbar.

Deliberately generic: our own icon set, a neutral slate palette, no product
names, logos, wordmarks or signature brand colours. A convincing unbranded
tool survives a glance better than an imitation of a specific product, where
a wrong avatar or a missing menu is exactly what gets noticed. The avatar
shows initials from settings, or a plain person icon when left blank.

**Classic** keeps the v0.3 csv-viewer look (chips + find bar + status line).

**Other changes**
- Popover menus now inherit skin tokens (they sit in a layer outside the frame).
- Form sheet pads to a full sheet of rows and keeps its column widths.
- `harness/visual.mjs`: headless-Chrome screenshots of every state, a band
  geometry check across sheets (zero layout shift), and the armour-only
  fail-safe (body opacity 0 with no scripts).

**Checks:** 96/96 on workbook, 96/96 on classic. Visual: bands stable, no
page errors, armour-only page blank, on both skins.

---

## v0.5.0 — the site's new job search, top-layer leak, toolbar panel (12 Nov 2026)

First live session found three problems. All fixed; each has checks.

**1. Zero rows.** LinkedIn has moved job search to `/jobs/search-results/`, a
server-driven UI with hashed class names. None of the v0.3 selectors existed.
Read the live DOM and rewrote `dom.js` against durable hooks only:
cards are `div[role=button][componentkey="job-card-component-ref-<id>"]`
(the job ID is in the key); title/company/location are plain `<p>`s; the
detail pane is the second `data-testid="lazy-column"`; description is
`data-testid="expandable-text-box"`; Save/Apply are found by accessible name
("Save the job", "Easy Apply to this job", "Apply on company website");
results are paged (`pagination-controls-*` testids). The legacy markup is
kept as the fallback, and both have a fixture (`mock-linkedin.html` current,
`mock-linkedin-legacy.html` legacy). The stale-pane guard now compares job IDs.

**2. The apply form drew on top of the spreadsheet** with name, email and
phone visible. It is now a native `<dialog>` opened with `showModal()`: top
layer, so ancestor opacity (armour) does not reach it, and every element
outside it becomes inert. Fix, verified live and in headless Chrome:
- armour hides `dialog:modal`'s own children and its backdrop, and any
  `:popover-open` element;
- the overlay host moves *inside* the topmost open modal (the only
  interactive place) and back to `<html>` when it closes. It never removes
  or reorders the site's nodes, so the form keeps every value;
- Escape is swallowed while inside a dialog, so it can't close the form or
  trigger "Save this application?".
The dialog states "N/M pages", so the Form sheet now reads "Step 2 of 3".

**3. No way to navigate.** Armour covered the whole site. Now only `/jobs/*`
is covered (`src/content/route.js`, which with `dom.js` is the adapter);
the rest of the site behaves normally, and a route watcher covers/uncovers
on single-page navigation. Items gains a pager bound to the site's pages,
and an empty-state hint ("Type a search term in Find and press Enter").
Find + Enter now navigates to the results URL, because the new search box
is a typeahead that ignores synthetic keys.

**Toolbar panel** redesigned: on/off switch, interface picker (Workbook /
Classic, with drawn previews; arrow keys work), shortcut, tab status
(rows + selector misses, or "Not active"), settings link. Changes apply to
open tabs live.

**Checks:** acceptance runs per skin × markup — 109/109 current, 102/102
legacy, on both skins. Visual (real Chrome, real `showModal()`): host on
top and typeable inside the modal, dialog content hidden, Escape kept the
form open, bands stable, no page errors, both skins.

**Still unverified live:** the saved-state label after clicking Save
(assumed "Unsave the job"/"Saved"), and the Back / Review / Submit button
wording on later form pages (assumed by text). Both have fallbacks and count
a miss if wrong.

---

## v0.5.1 — external links, button states, tab bar (13 Nov 2026)

From the second live session:

- **"Open source" did nothing.** On the live site, "Apply on company website"
  first opens a *Share your profile?* modal (a switch and Continue). Armour
  hid it, so the page sat behind an invisible dialog. `dom.js` now sorts the
  site's dialogs into the apply form (real input controls plus a way through
  pages) and everything else; everything else is redrawn as a prompt in the
  tool's own style (title, switches, Continue / Cancel), proxied both ways.
  Known prompts get canonical wording; unknown ones keep their title unless
  it names the site's subject, and always offer Cancel. Panic hides prompts
  like it hides the Form tab; Items brings them back.
- **Phantom Form tab** came from that switch. A settings switch no longer
  counts as a form control.
- **Button renamed** "Open link" with an external-link icon ("Opens in a new
  tab"); Easy Apply rows still say "Open form".
- **Hover / pressed states.** The generic grey hover was applied to the blue
  primary button too, putting white text on near-white. Primary, toggled and
  plain buttons now each have hover, pressed and keyboard-focus states.
  Measured in Chrome: contrast 4.7 rest, 5.8 hover, 7.2 pressed.
- **Tab bar.** Removed the dead "+"; "≡" lists the sheets; the caret (on the
  active tab only) and right-click open a sheet menu: sort by the selected
  column, clear filters, close the details panel. Menus open upward from the
  bottom bar. "Count" is plain text, not a dead button.
- **Blank Posted on viewed rows.** The site drops the date from a card once
  viewed; it is now taken from the detail pane when the row is opened and
  remembered for the session.

Checks: 130 / 113 (workbook current / legacy), 122 / 105 (classic). Visual:
button contrast in all states, prompt on top, menu inside the window.
