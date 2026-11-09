# Quiet Tab — build notes

Built from PRD v0.2 + Figma `2dKqAtTKL3pTZdUmAzIszZ`.
**v0.3.0** (19 Aug 2026). All 12 P0s implemented. 91/91 acceptance checks passing.

---

## The architectural correction

PRD §11 says "content script plus injected stylesheet." **That shape does not
survive the v0.2 design.** CSS can recolour LinkedIn; it cannot turn a feed of
cards into a grid with a numbered row gutter, lettered column headers, a
`tracker_q3.csv` chrome bar and sheet tabs. No LinkedIn DOM node becomes a row
number.

Built instead as **armour + overlay**:

- **Armour** — static stylesheet at `document_start` via the manifest, zero JS
  dependency. Blanks the page, hides all imagery, kills brand colour before
  first paint. This is what actually satisfies P0.4. Fail-safe: on by default,
  lifts only when JS adds `.qt-off`, so a script failure leaves a dark page
  rather than a LinkedIn page.
- **Overlay** — reads LinkedIn's data out of its DOM, renders our own workbook
  into a closed shadow root on `<html>`. Clicks proxy back to LinkedIn's real
  controls, so P0.12 holds without reimplementing LinkedIn.

Two guarantees fall out of owning the pixels and could not be bought otherwise:
P0.6's byte-identical panic landing (Items and Archive are the *same*
`grid.render()` call, so they cannot drift), and zero layout shift (the shell
is four fixed grid bands; sheet renderers never see the frame, so they cannot
move it).

LinkedIn's real page stays alive at `opacity: 0`, not `display: none` — their
results lazy-load through IntersectionObserver, which fires on layout
intersection and ignores opacity. Display-none would stop the list loading past
the first screen.

## How P0.10 was met

By making a `beforeunload` impossible rather than avoiding one. Panic never
navigates, never submits, never closes LinkedIn's dialog, never removes a node
they own. Their Easy Apply modal is left open under armour — invisible, inert,
still holding every typed value. This also makes P0.11's silent resume nearly
free: the form was never dismantled.

**Panic is one-way.** No press-again-to-return. A user who hits the key because
someone appeared will, eventually, hit it again reflexively while that person
is still there. Return is a deliberate Items-tab click.

---

## v0.3.0 — fixes and additions

**Record card: Notes scrolls, head stays.** The card body used to scroll as a
whole, so a long listing pushed the reference, title, and metadata off the top
as you read — and those are exactly the values you read the notes *against*.
Now only the notes move; the footer sits outside the scroll entirely (§13
item 1 closed).

**Flag → Save.** Flag reads as marking a problem, and it mapped to LinkedIn's
Save action, so the label and the behaviour pointed opposite ways.

**Submit flow opens on step 1.** It was opening on step 2 because step was
derived from LinkedIn's progress meter, and that meter is not zero on the first
screen — it already reflects prefilled contact details. Any threshold low
enough to read that as step 1 is too low to mean anything later. Now derived
from semantics: no Back button → step 1; primary button reading "Submit
application" → step 3. Both come from LinkedIn's accessibility contract, the
second-most durable thing on the site after data attributes. The harness now
paginates as three real steps so this cannot regress unnoticed.

**Filter dropdowns.** Every chip opens a menu built from the values actually
present in the loaded rows, with counts, and filters the grid instantly.
Deliberately *not* wired to LinkedIn's facets — reasoning in the header of
`render/filters.js`, but in short: their facets are a server round trip (a
repaint on the most-used control, on a product whose premise is stillness),
their facet DOM differs between `/jobs/search` and `/jobs/collections`, and
filtering the rows in front of you is what a spreadsheet does. Typing narrows
locally; Enter hands the string to LinkedIn's search to widen.

Tier is derived from title seniority (the `TIERS` table in `filters.js`)
because LinkedIn does not put experience level on a job card. Archive's chips
are derived from whatever columns the user pasted. Panic resets Archive filters
and closes any open menu, or the byte-identical landing would depend on what
was filtered last.

**Toolbar popup.** Clicking the icon now opens a small panel rather than the
settings page. Worth flagging that this is the one addition that *adds* risk:
it is a panel appearing above the page at the moment someone has just watched a
mouse travel to the browser chrome. Built to survive being seen — nothing on it
names LinkedIn, jobs, applications, or hiding; it reads as a file-tool status
panel; four short lines so it closes again in a second. Panic shortcut is the
first row. It also surfaces the selector-health count, which is the only way a
user can tell "LinkedIn changed its DOM" apart from "no results".

**Stale detail pane guard.** LinkedIn loads the detail pane after the card
click, so for a beat it holds the previous job. The card now falls back to its
loading state on a title mismatch rather than rendering this row's reference
next to another job's notes — an internally contradictory record is worse to be
caught reading than an empty one.

---

## Open questions — decisions taken

| §12 question | Decision | Reversible? |
|---|---|---|
| Company name coding | Plain name; `codeSources` setting switches to `NPC-220` | Yes, one setting — built so the glance test can measure it |
| Decoy authoring | Shipped default + paste-from-spreadsheet editor in options | Yes |
| Threads exposure | Stricter: nothing auto-opens, `S. Nguyen` references, subject lines never rendered | **Still needs David's call** |
| In-flight upload during panic | Untouched — upload continues | Open, deserves the scrutiny the PRD asks for |
| IT-monitoring disclaimer | First thing on the options page, second person, before any setting | — |

## Known gaps (none hidden behind a passing test)

1. **Filters reach loaded rows only.** A decision, not a shortfall — but a chip
   cannot reach a job that has not loaded yet. Widen with the search box,
   narrow with the chips.
2. **Selectors unverified against live LinkedIn.** Written to documented
   shapes, pass against the fixture. `QT.health` counts misses at runtime and
   the popup surfaces it — check during the first live session.
3. §13 item 5 (long/multi-part questions) — mechanism only, not designed.
4. §13 item 6 (panic from Threads mid-compose) — handled, not designed.
5. P1 not built: preset token modes, notification suppression. Blur-on-blur is
   built, off by default.

## Maintenance surface

`src/content/dom.js` holds **every** LinkedIn assumption. Nothing else in the
codebase may contain a LinkedIn class name, URL shape, or attribute. Ordered
candidate selectors, most-durable first (`[data-job-id]` → ARIA → structure →
class names). `harness/mock-linkedin.html` is the executable statement of what
we believe LinkedIn's DOM looks like — when LinkedIn changes, that file changes
and the diff is the record.

`node harness/acceptance.mjs` is the P0.12 regression suite. Run before every
release.
