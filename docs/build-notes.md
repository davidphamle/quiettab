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
