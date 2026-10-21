---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Kin Kitchen app (all routes)

Scope: the whole authenticated app plus /login. Visitor mode: Operate. Replaces the earlier receipt-tape world (rejected by the owner as generic, hard to scan, dark and dull).
Audience and job: Wally, a home baker. Phone in kitchen/store for one quick check or edit; PC for review and export.
Owner feedback driving this: Ingredients read as a generic SaaS table, every row weighs the same, the filter bar felt bolted on, dark mode felt dull. First job: a balanced pantry overview (restock, compare cost, find one item).
Constraints: spec-pinned stack and screens (kin-kitchen-specs.md); demo mode with labeled sample data; system light/dark; spec pins desktop "Add" as a header button.
Ingredients surface update (owner request, 2026-10-16): the card shelf felt too complicated; the owner pinned a Google Sheets style grid. Ingredients is now an editable sheet (pinned name column, sticky header, click-to-edit cells, amounts typed as "25 kg", undo toast, computed cost-per-unit column locked). Card shelf retired; the canister gauge remains on ingredient detail.
Business modules (owner request, 2026-10-17, from an "All-in-one spreadsheet" reference: income, expenses, recipe pricing, orders, monthly/annual dashboards, comparison + custom dashboards, balance sheet + income statement, 5-year growth, tax, tasks). Built as an extension of this world, no new identity: owner chose one build, fully linked (recipe cost from live ingredient cpu, payments are income, done orders deduct stock by recipe with exact undo, purchases write expenses), BIR 8% option. Home is now Today (orders due, tasks, low stock, tax deadline); pantry dashboard moved to /pantry. Money lists reuse the sheet grammar (LedgerSheet); computed lines are locked on the surface-2 tint; order status uses neutral/pine pills (yellow stays running-low only); business deltas colour by good/bad for the owner, always with arrow and figure.
Memorable moment: every ingredient is a labelled canister whose fill is its stock; low items show yellow below the low-line mark.

## Direction contract

THESIS: Kin Kitchen is an open pantry shelf. Each ingredient is a labelled canister: its fill level is the stock, its label prints the cost per unit large. It refuses the grey admin table where every row weighs the same.

OWN-WORLD: Pine-green shell (rail, tab bar, primary buttons); faint sage-white ground with white label cards; pine ink. Red-orange marks price rises, leaf green drops, canister yellow is reserved for running low only. Category shelves carry a fixed colour each. Bricolage Grotesque for headings and ingredient names, Geist for UI with tabular figures. 10px label corners, solid hairlines, no decorative shadow. Dark mode: deep pine ground, lifted label surfaces, bright sage and canister inks, never grey-on-black.

STORY: Wally scans shelves by category, sees at a glance which canisters are low and which prices rose, taps a canister to adjust stock, and opens a label for its price history.

FIRST VIEWPORT: Ingredients. Desktop: 240px pine rail; header with title, pantry counts and Add button; one integrated shelf toolbar (large search, category shelf tabs with colour dots and counts, Running low and Price went up toggles, sort); then shelves: category header on a pine shelf line, label cards in a 3-4 column grid, each with a canister gauge, name, pack price line, large cost-per-unit and a 30-day change tag. Mobile: pine tab bar, search, scrolling shelf tabs, one-column label rows, floating Add.

FORM: Pantry Canister Labels, position 1 of my 7 ordered candidates (the pick card); seed key 2aeb1f28. Signature move: the canister fill gauge with its low-line mark, animating fill on stock changes, reused on detail at large size. Raises: scale-only hierarchy (cost per unit is the one large figure), yellow reserved for one job, changed prices stay tagged for 30 days, a fixed category colour legend.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Bake mode and Cake designs (owner request, 2026-10-17)

Two kitchen surfaces inside the same world, Operate mode, code-led. Owner answers: one batch as written (no scaling); keep the screen awake; step timers with an alarm; designs attach to orders plus a gallery. Owner's bar: "SUPER USER FRIENDLY".

THESIS: Bake mode is the recipe card propped against the flour tin: one step at a time in big type, every ingredient always in view, nothing to dismiss. It refuses the scrolling recipe blog and the tiny admin form. The design board is the cake-box-lid sketch: pick a cake shape, draw with icing colours, done; no layers, no settings.

OWN-WORLD: the pine shell becomes the full-bleed frame (no rail, no tab bar); the current step sits on a white label card in Bricolage at reading-across-the-kitchen size; ingredients are a fixed list of tabular amounts with Bricolage names; timers are pine pills that ring and flash; yellow stays running-low only. The board is cake-board paper with faint cake outlines and named icing swatches; the toolbar is a pine shell bar with 56px targets.

STORY: Wally taps Start baking, stands the phone up, reads the ingredients, taps a big Next with a floury knuckle, starts the proofing timer, walks away, comes back to a ringing, flashing timer. For a custom cake, she sketches the customer's design on the order, sends it as an image, and sees it again in Bake mode.

FIRST VIEWPORT: Bake (phone portrait): pine top bar (close, recipe name, step n of N, screen-on mark, running timers); ingredients as a two-column list in full view; the step card filling the rest; Back and Next as a 64px bottom bar. Landscape/desktop: ingredients left column, step right. Board: the board fills the screen at 4:3; tool bar bottom on phones, left on desktop; title, order and save state on top.

FORM: extension of Pantry Canister Labels (position 1, seed key 2aeb1f28); signature move here is the ringing timer pill and the always-visible ingredient list.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## World replaced: Merienda tray (owner request, 2026-10-18)

Owner: "i hate the color scheme, make it light, more of baking colors, use icons from Phosphor, do not make it ai slop". Direction round: seed 491f68da, assigned "icing color chart"; the owner chose IMPECCABLE'S PICK, "Merienda tray". Layout, components and behaviour stay; palette, icons and shell change. Supersedes the pine OWN-WORLD above wherever they conflict. Ingredients additionally copies Google Sheets on owner request (column letters, row numbers, name box + formula bar, blue selection, category sheet tabs); those Sheets greys/blues are scoped to `.gsheet` only.

THESIS: the app is a merienda tray: buko-white paper, latik-brown ink, a pale pandan-leaf shell, ube for every action, yema gold only for running low. It refuses the cream-and-toasted-brown bakery default and any dark chrome.

OWN-WORLD: always light. Ground buko white, surfaces white, ink latik brown; rail and tab bar pale pandan with a hairline edge and dark pandan ink; primary buttons and focus ube; rise strawberry-red, drop pandan green, low yema gold (reserved). Chart series in fixed order pandan, ube, calamansi, blueberry, strawberry (validated). Bricolage headings, Geist UI, tabular figures. Phosphor icons through one vocabulary module, regular weight, bold where emphasised, duotone for the selected nav item.

STORY: unchanged; Wally reads everything at a glance in a bright kitchen.

FIRST VIEWPORT: unchanged composition; Today on the pale pandan rail with the duotone-marked active item.

FORM: Merienda tray, my top-ranked grounded candidate (pick card), seed key 491f68da. Signature move: the selected nav item's duotone ube icon on a white pill, and kakanin colours carried only by data (series, categories), never by chrome.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
