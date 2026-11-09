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
