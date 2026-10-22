---
name: Kin Kitchen
description: "A bakery ledger and pantry for a home baker on a merienda tray: Today's orders and tasks, a Google-Sheets-style ingredient sheet, labelled canisters, recipe pricing with Bake mode, cake design sketches, money sheets and reports."
colors:
  ground: "oklch(0.975 0.006 85)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.972 0.008 80)"
  ink: "oklch(0.29 0.035 50)"
  ink-2: "oklch(0.47 0.035 50)"
  ink-3: "oklch(0.56 0.03 55)"
  line: "oklch(0.925 0.012 75)"
  line-strong: "oklch(0.84 0.018 70)"
  shell: "oklch(0.95 0.03 128)"
  shell-2: "oklch(0.915 0.045 128)"
  shell-3: "oklch(0.875 0.06 128)"
  shell-ink: "oklch(0.3 0.05 135)"
  shell-ink-2: "oklch(0.45 0.05 135)"
  accent: "oklch(0.37 0.05 52)"
  accent-hover: "oklch(0.31 0.05 52)"
  accent-ink: "oklch(0.98 0.012 85)"
  accent-wash: "oklch(0.94 0.025 60)"
  focus: "oklch(0.52 0.1 50)"
  rise: "oklch(0.54 0.18 28)"
  rise-wash: "oklch(0.96 0.025 28)"
  rise-on-shell: "oklch(0.5 0.18 28)"
  drop: "oklch(0.5 0.12 145)"
  drop-wash: "oklch(0.96 0.035 145)"
  low: "oklch(0.82 0.14 85)"
  low-ink: "oklch(0.5 0.1 75)"
  low-wash: "oklch(0.97 0.05 90)"
  low-on: "oklch(0.3 0.06 70)"
  jar-glass: "oklch(0.97 0.008 85)"
  jar-rim: "oklch(0.78 0.025 70)"
  jar-fill: "oklch(0.68 0.12 135)"
  jar-lid: "oklch(0.42 0.05 50)"
  series-1: "#3e8a50"
  series-2: "#874420"
  series-3: "#c2701c"
  series-4: "#3d7fb8"
  series-5: "#cc4b6c"
  chart-bar: "#874420"
  chart-grid: "oklch(0.93 0.01 75)"
  chrome: "#e8f1de"
  manifest-bg: "#faf8f3"
  icon-ink: "#fdfbf6"
typography:
  headline:
    fontFamily: "Bricolage Grotesque, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.1rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Bricolage Grotesque, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.015em"
  figure-lg:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: "2.4rem"
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  figure-step:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: "1.7rem"
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.4rem"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.15rem"
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.05rem"
  micro:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
  bake-title:
    fontFamily: "Bricolage Grotesque, Geist, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.75rem, 1.3rem + 2vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  bake-step:
    fontFamily: "Bricolage Grotesque, Geist, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.015em"
  bake-alarm:
    fontFamily: "Bricolage Grotesque, Geist, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 3vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  bake-timer:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
rounded:
  inner: "5px"
  focus: "6px"
  field: "8px"
  surface: "10px"
  sheet-top: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "40px"
  rail: "240px"
  container: "1320px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.surface}"
    typography: "{typography.body}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.rise}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 12px"
  low-pill:
    backgroundColor: "{colors.low}"
    textColor: "{colors.low-on}"
    rounded: "{rounded.pill}"
    typography: "{typography.micro}"
    padding: "1px 6px"
  change-tag-rise:
    backgroundColor: "{colors.rise-wash}"
    textColor: "{colors.rise}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  change-tag-drop:
    backgroundColor: "{colors.drop-wash}"
    textColor: "{colors.drop}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  low-badge:
    backgroundColor: "{colors.low-wash}"
    textColor: "{colors.low-ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.micro}"
    height: "20px"
    padding: "0 8px"
  canister-detail:
    width: "64px"
    height: "84px"
  nav-rail:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink-2}"
    width: "240px"
  nav-rail-item-hover:
    backgroundColor: "{colors.shell-2}"
    textColor: "{colors.shell-ink}"
  nav-rail-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    height: "36px"
  tab-bar:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink-2}"
    height: "64px"
  tab-bar-indicator-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    width: "56px"
    height: "28px"
  toast:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.surface}"
    typography: "{typography.label}"
  fab:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 24px 0 20px"
  section-tabs:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.surface}"
    padding: "2px"
  section-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
    typography: "{typography.label}"
    height: "36px"
    padding: "0 14px"
  stat-strip:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "16px 16px 20px"
  stat-lead-figure:
    textColor: "{colors.ink}"
    typography: "{typography.figure-lg}"
  stat-step-figure:
    textColor: "{colors.ink}"
    typography: "{typography.figure-step}"
  status-pill-pending:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    typography: "{typography.caption}"
    height: "24px"
    padding: "0 8px"
  status-pill-baking:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  status-pill-done:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  status-pill-cancelled:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  payment-mark-open:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    typography: "{typography.caption}"
    height: "24px"
    padding: "0 8px"
  payment-mark-urgent:
    backgroundColor: "{colors.rise-wash}"
    textColor: "{colors.rise}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  ledger-header-cell:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "44px"
    padding: "0 12px"
  ledger-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "44px"
    padding: "0 12px"
  ledger-draft-row:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink}"
    height: "44px"
  ledger-locked-cell:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    height: "44px"
    padding: "0 12px"
  cell-editor:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "0 12px"
  cell-error-tip:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.field}"
    typography: "{typography.caption}"
    padding: "8px 12px"
    width: "240px"
  computed-line:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.focus}"
    padding: "10px 12px"
  price-label-figure:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    typography: "{typography.figure-lg}"
    padding: "12px"
  period-nav-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.surface}"
    width: "36px"
    height: "36px"
  bake-frame:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink}"
  bake-step-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    typography: "{typography.bake-step}"
  bake-timer-pill:
    backgroundColor: "{colors.shell-2}"
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  bake-nav-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.surface}"
    height: "56px"
  bake-alarm:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.bake-alarm}"
  bake-alarm-stop:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet-top}"
    height: "96px"
  board-tool:
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.surface}"
    height: "56px"
    width: "56px"
  board-tool-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  icing-swatch:
    rounded: "{rounded.pill}"
    width: "48px"
    height: "48px"
---

# Design System: Kin Kitchen

## Overview

**Creative North Star: "The Merienda Tray"**

Kin Kitchen is a merienda tray set out on the counter: buko-white paper, white label surfaces, latik-brown ink, a pale pandan-leaf shell around the edge, cocoa (the brown of the KK-heart logo) for every action, and yema gold kept for one job, running low. It is always light. The owner asked for a bright kitchen app in baking colours that does not look like a generated template, so the kakanin colours (pandan, cocoa, calamansi, blueberry, strawberry) are carried by data (chart series, category dots, the icing palette) and never by chrome. The chrome is quiet: pale pandan rail and tab bar with a hairline edge, white labels pulled off it for the selected place.

The structure underneath carried over unchanged from the previous world. Home is **Today** (stat strip, orders due, tasks, running-low canisters, the next tax return). Money lists are ledger sheets; statements are white labels with locked computed lines; a recipe's price label prints cost per unit as its one large figure; an ingredient opens as a labelled canister whose fill is its stock. The Ingredients route, at the owner's request, copies Google Sheets outright (column letters, row numbers, a formula bar, blue selection, category sheet tabs), and that copy keeps its own scoped greys and blue.

Two full-bleed kitchen surfaces sit inside the same world. **Bake mode** is the recipe card propped against the flour tin: the pandan shell becomes the whole frame, the current step sits on a white label in big Bricolage, every ingredient stays in view, and timers are pills that ring and flash cocoa. The **cake design board** is the cake-box-lid sketch: a 4:3 board of cake outlines, named icing swatches and 56px tools on the pandan shell. Density elsewhere is operational: one-tap checks on a phone in the kitchen, whole-sheet review on a PC.

**Key Characteristics:**
- Always light: buko-white ground, white label surfaces, latik-brown ink; no dark mode, no dark chrome.
- A pale pandan shell (rail, tab bar, toasts, Bake and board frames) with a hairline `shell-3` edge and dark pandan ink.
- Cocoa is the only action colour (primary buttons, focus, selection, the selected nav icon in duotone).
- Kakanin colours live in data only: five validated chart series, the fixed category legend, the icing palette.
- Yema gold means running low, and nothing else.
- Anything the app works out is locked behind a lock icon on a recessed tint, never editable.
- Rises and drops always carry an arrow and a figure; business figures colour by good or bad for the owner.
- Phosphor icons through one vocabulary module: regular, bold where emphasised, duotone for the selected nav item.
- Solid hairlines and flat surfaces; shadow only on floating layers.

## Colors

A warm, light palette: every neutral carries a little cream or latik hue (50 to 90 in OKLCH), the shell is a pale leaf green (128 to 135), cocoa (50 to 52, the logo brown) does all the acting, and three state hues hold single jobs.

### Primary
- **Cocoa Action** (`accent`, hover `accent-hover`, text `accent-ink`): primary buttons, Bake mode's Next and timer Stop, the floating add pill, text selection, the selected nav icon, done task checkboxes, the progress segments of a bake. The owner rejected ube purple (2026-10-22); cocoa is sampled from the KK-heart logo (#523727) and sits a step lighter and warmer than `ink` so actions still read as actions.
- **Cocoa Wash** (`accent-wash`): Baking order status, the draft row of a ledger sheet, the recipe price label's cost band, the fresh history label's landing flash, the More page's icon tiles, the open-detail link hover, Bake mode's current-ingredient highlight and its "start timer" control.
- **Cocoa Focus** (`focus`): focus rings, cell editor rings, the input caret, the saving dot and the nav-pending progress bar along the top of the screen.

### Secondary
- **Strawberry Rise** (`rise`, `rise-wash`): a cost-per-unit increase; a business move that is bad for the owner (sales or profit fall, expense rise, loss, margin under target, overdue group, late task); an open balance only when due today or late; form errors, failed saves (2px inset ring) and the danger button. `rise-on-shell` is the error ink on a pandan toast and on the board's error notes.
- **Pandan Drop** (`drop`, `drop-wash`): a cost-per-unit decrease; a business move that is good for the owner; the Paid check and the balance sheet's matched check.

### Tertiary
- **Yema Gold** (`low`, `low-ink`, `low-wash`, `low-on`): running low only. Canister fill below the low-line, the Low badge, the low stock cell (`low-wash` with a solid `low` LOW pill), the Running low stat dot. `low-on` is the dark ink on solid yema.

### Neutral
- **Buko Ground** (`ground`): page background behind every surface.
- **Label White** (`surface`): panels, sheets, cells, inputs, secondary buttons, the selected rail item, the Bake step card.
- **Tray Mist** (`surface-2`): recessed fills: ledger sticky headers, locked computed cells and lines, ghost hover, segmented tracks, panel footers, Bake's yield and time chips.
- **Latik Ink** (`ink`, `ink-2`, `ink-3`): primary text; secondary text and meta; placeholders, counts, idle icons.
- **Hairlines** (`line`, `line-strong`): `line` for surface edges, separators and grids; `line-strong` for control outlines and scrollbar thumbs.
- **Pandan Shell** (`shell`, `shell-2`, `shell-3`, `shell-ink`, `shell-ink-2`): the frame. `shell` fills the rail, tab bar, toasts, cell tips, the Done status pill and the full Bake and board frames; `shell-2` is hover and the resting Bake timer pill; `shell-3` is the hairline edge of the rail and tab bar, pressed states and the selected rail item's ring. `shell-ink` is text on the shell, `shell-ink-2` inactive items and group names.

### Canister and chart
- **Jar** (`jar-glass`, `jar-rim`, `jar-fill`, `jar-lid`): the canister gauge. A cream glass, a warm rim, a pandan fill, a latik lid.
- **Chart series** (`series-1` to `series-5`): pandan, cocoa, calamansi, blueberry, strawberry, validated on the light surface in that order (cocoa `#874420` replaced ube 2026-10-22 and passes every check). Multi-series charts and the recipe cost bar take them in order; single-series and rank bars use `chart-bar` (cocoa); gridlines use `chart-grid`.

### Category legend
Category dots are computed, not tokenised: `oklch(0.66 0.13 H)` with hues cycled in the fixed order 62, 352, 232, 30, 300, 195, 140, 18, 265, 165, 330, 100. No hue falls between 63 and 99, the yema band. A dot is always shown beside its category name.

### Browser chrome
`chrome` is the theme colour for the browser and installed app (layout `themeColor` and manifest `theme_color`), a pale pandan that matches the shell. `manifest-bg` is the manifest background. The app icon is a logo-brown `#523727` tile with the KK-heart mark in cream `#f7f3e8`; the PWA icon keeps the mark inside the maskable safe circle.

### Scoped exception: Google Sheets greys and blue
The Ingredients sheet copies Google Sheets at the owner's request. Its colours are declared only under `.gsheet` (grid `#e2e3e3`, strong grid `#c4c7c5`, header band `#f8f9fa`, header ink `#5f6368`, active header `#d3e3fd` with `#0b57d0` ink, selection `#1a73e8`, freeze bar `#dadce0`) and are used nowhere else. They are an owner-pinned exception, not system tokens; no other surface may borrow them.

### Content colours: icing palette
The cake design board offers named icing swatches as drawing colours, not UI tokens: White icing `#ffffff`, Pink `#f2a7c3`, Ube `#8e5bb5`, Chocolate `#6b3f2a` (the default), Caramel `#c98b4e`, Lemon `#f2d16b`, Mint `#8fd3b6`, Sky `#8ec5ec`, Red `#d9473b`, Latik `#3b2a1f`, plus a free colour picker. The board paper (`#eef0ea`), cake fill (`#fbf8f1`) and outline guides (`#b9c2b4`) are drawing materials of the sketch. These stay inside the board and its saved pictures; chrome never uses them.

### Named Rules
**The One Job Yellow Rule.** Yema gold means running low and nothing else. No highlights, warnings, category dots, chart series or icing chrome in the yellow band.

**The Data Wears The Kakanin Rule.** Pandan, cocoa, calamansi, blueberry and strawberry appear as data (series, categories, icing), never as decoration. Chrome stays buko, white, latik, pale pandan and the single cocoa action.

**The Never Colour Alone Rule.** A rise always carries an up arrow and a signed or percentage figure; a drop a down arrow; low always says "Low" in words.

**The Fixed Legend Rule.** A category's colour comes from its position in the category list and never changes between screens, filters or sorts.

**The Good Or Bad Rule.** Ingredient prices keep their meaning: rise is a cost going up, drop a cost going down. Business figures colour by whether the move is good (pandan drop) or bad (strawberry rise) for the owner, with the arrow carrying the direction. A flat move is `ink-2` with a dash.

**The Receivables Are Not Rises Rule.** An open balance is a neutral `surface-2` pill with the amount; it takes `rise-wash` only when the order is due today or overdue and still owes. Paid is a green check and the word.

**The Order Status Rule.** Order status uses neutral, cocoa wash and shell only: To do on white, Baking on `accent-wash`, Done on `shell`, Cancelled on `surface-2` struck through, each with icon and word. Never yema, `rise` or `drop`.

### Logo
The owner's KK-heart logo (2026-10-22): two Ks facing each other, joined by a heart whose point loops into a knot, beside "Kin / Kitchen" stacked and the tagline "SISTERHOOD · DESSERTS · EST. 2026". `Mark` in `src/components/mark.tsx` is a stroke trace of it on a 930x720 box; the logo's own weight is 22 units, and small marks take a heavier stroke (50 in the rail, 34 on login) so they stay crisp. `Lockup` sets the wordmark in Montserrat 500 (`font-wordmark`, used nowhere else) in `accent`: compact in the rail, with the tagline on login. The mark is always one colour, never a gradient or outline box.

## Typography

**Display Font:** Bricolage Grotesque (with Geist, ui-sans-serif)
**Body Font:** Geist (with ui-sans-serif, system-ui)

**Character:** Bricolage gives names and headings a slightly hand-lettered label warmth; Geist keeps every figure, control and caption crisp. All headings take -0.015em tracking and balanced wrapping.

### Hierarchy
- **Headline** (Bricolage 600, 1.75rem / 2.1rem): page titles and record names on detail.
- **Title** (Bricolage 600, 1.0625rem / 1.5rem): section, panel and chart titles; rail group headings on the More page.
- **Figure Large** (Geist 600 tabular, 2.125rem): stock on detail; the lead stat of a stat strip from 640px; cost per unit on a recipe's price label.
- **Figure** (Geist 600 tabular, 1.75rem, line-height 1): cost per unit on ingredient detail; the lead stat on phones. Unit suffixes are smaller in `ink-2`.
- **Figure Step** (Geist 600 tabular, 1.3125rem / 1.7rem): secondary stats of a strip from 640px; pack price on detail.
- **Body** (Geist 400, 0.9375rem / 1.4rem): default text. The manual (/guide) reads at 1.0625rem with 1.7 leading in a 68ch measure.
- **Label** (Geist 500, 0.8125rem): small buttons, toggles, field labels, toasts, ledger cells and headers.
- **Caption** (Geist 400, 0.75rem): meta lines, hints, change tags, counts, tips, board tool labels.
- **Micro** (Geist 500 to 700, 0.6875rem): Low badge, LOW pill, tab-bar labels, the Sheets row numbers.
- **Bake Title** (Bricolage 600, fluid 1.75 to 2.75rem): the recipe name on Bake's ingredient panel and the "That's every step" close.
- **Bake Step** (Bricolage 600, fluid 1.5 to 2.25rem, 28ch): the current step, readable across the kitchen; 1.5rem on short landscape screens.
- **Bake Alarm** (Bricolage 600, fluid 2.25 to 4rem): the ringing timer's banner.
- **Bake Timer** (Geist 600 tabular, 2.5rem): a running timer's clock.

Customer and ingredient names in lists take the Bricolage 600 name face at about body size. The product scale is fixed (ratio about 1.2); only Bake mode's reading sizes are fluid.

### Named Rules
**The One Big Figure Rule.** Each label surface has exactly one large figure. The sheets are the exception: every cell sits at one size, and computed columns are marked by tint, weight and a lock, not scale.

**The One Lead Figure Rule.** A stat strip has one lead figure in a 1.7fr first column at Figure Large (Figure on phones); the rest step down to Figure Step (Title on phones). Word values are set in Bricolage at the step size.

**The Tabular Figures Rule.** Every price, quantity, percentage, count and clock uses tabular numerals.

**The 16px Input Exception.** Inputs, selects, textareas and cell editors render at 16px or larger so iOS does not zoom on focus. Don't "fix" this back to 15px.

## Layout

Desktop (1024px and up): a fixed 240px pale pandan rail on the left with a 1px `shell-3` right edge; content centred up to 1320px with 40px gutters and 32px top padding. Below 1024px the rail becomes a fixed 64px pandan tab bar along the bottom (1px `shell-3` top edge, safe-area padding), with the floating add pill above it on the right; gutters are 16px on phones and 24px from 640px.

The rail lists Today and Tasks, then Sell (Orders, Recipes, Cake designs), Money (Income, Expenses, Tax), Reports (Monthly, Annual, Products, Statements, 5-year growth), Pantry (Ingredients, Pantry insights), then How to use and Settings. The phone tabs are Today, Orders, Pantry, Money, More. Sibling pages in Money and Reports share section tabs under the header.

Today (reworked 2026-10-22, owner: "more user friendly but informative") is a header with the date and a plain one-line brief ("1 order due today · 3 tasks left · 8 things to buy", overdue first in `rise`), a four-stat strip (sales, profit after costs, to collect, orders done; deltas read "vs Sep 1–22"), then a 1.45fr / 1fr grid. Left: **This week** (seven day tiles, each with its order count, pieces to bake and a cocoa load bar against the week's busiest day; tapping a day lists only its orders; the whole week shows the next four orders, then "Show all") and **How October is going** (this month's running sales total in `series-1` over last month's in a dashed `ink-3`, a one-line verdict ahead or behind by this day, then best seller, top earner and spending). Right: tasks, **To buy** (running-low canisters with how many packages refill each to full and what that costs at the saved price, totalled in the description) and the next tax return. Below 1024px it is one column in kitchen order: week, tasks, to buy, month, tax. Recipe editor and order form put a fixed aside on the right (340 to 400px, 320 to 390px). The manual sets a 14rem sticky chapter list beside a 68ch reading column from 1024px.

Ledger sheets (income, expenses) keep their own scroll frame, sticky header, pinned first column and 44px rows. The Ingredients sheet sits in its Sheets frame: a search and filter row, a formula bar, the grid with a 46px row-number gutter and 24px column-letter band, 32px rows (44px below 1024px), and category sheet tabs along the bottom.

Bake mode and the board are full-bleed focus screens (no rail, no tab bar) on the shell, which also paints the overscroll and safe-area insets. Bake on a phone in portrait: shell top bar (close, recipe name, step count, screen-on mark, running timers), ingredients as a full two-column list, the step card filling the rest, Back and Next as a 56px bottom bar. Landscape and desktop: ingredients left, step right, up to 1600px. The board fills the screen at 4:3, tools at the bottom on phones and down the left on desktop.

Touch targets are 44px below 1024px; Bake and board controls are 48 to 56px everywhere.

## Elevation & Depth

Flat by default. Surfaces and controls are drawn by 1px hairline rings (`0 0 0 1px` in `line` or `line-strong`), inset separators and cell borders. The shell is separated from content by a single `shell-3` hairline, not by darkness. Depth appears only on layers that float: sheets and dialogs, toasts, the floating add pill, cell tips and chart tooltips. Dialogs open over a latik-tinted scrim (`oklch(0.3 0.04 50 / 0.35)`).

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 18px 44px -14px oklch(0.35 0.05 50 / 0.28), 0 2px 6px oklch(0.35 0.05 50 / 0.1)`): sheets, dialogs, toasts, the floating add pill, cell tips, chart tooltips.
- **Cell ring** (`box-shadow: inset 0 0 0 2px var(--focus)`): an open cell editor and a ledger's active cell; `var(--rise)` for an invalid editor or failed save. In the Ingredients sheet the active cell rings in the scoped Sheets blue instead. Structural, not elevation.
- **Nav progress glow** (`box-shadow: 0 0 8px var(--focus)`): the 3px nav-pending bar only.

### Named Rules
**The Flat Label Rule.** Label surfaces have no resting shadow. Shadow means a layer floats.

## Shapes

One corner language: 10px on every label and control (surfaces, buttons, inputs, selects, toasts, rail items, desktop dialogs, the board frame, board tools, the Bake step card). Inner pieces nest smaller: 8px for small toolbar controls and the cell error tip; 6px for the focus ring, computed lines, task checkboxes and the open-detail link; 5px for segmented options, toast actions, inline code and keyboard keys in the manual. Phone bottom sheets round only their top corners at 14px, and Bake's 96px alarm Stop button takes the same 14px. Ledger cells are square. Pills are for things you count, flag or time: change tags, Low badge, LOW pill, status pills, payment marks, the under-target tag, steppers, the tab bar's active indicator, the floating add, Bake timer pills and chips, step-progress segments, icing swatches and the recipe cost bar. Statement totals close with a 1px `line-strong` rule above and a 3px double rule below.

The canister is a rounded jar (body radius 16 on a 100x130 viewBox) with a separate latik lid, a 4-unit rim, a narrow glass highlight and a dashed low-line that overhangs the jar.

## Components

### Icons
Phosphor, imported only through the vocabulary module so one glyph means one thing everywhere. Regular weight by default; bold where a call site emphasises (stroke 2.2 and up maps to bold); duotone only for the selected nav item (rail, tab bar, manual chapter list), tinted `accent`.

### Buttons
Calm and solid; one primary per view.
- **Shape:** 10px.
- **Primary:** cocoa `accent` with `accent-ink`, 44px, 16px sides, weight 500. Hover `accent-hover`; press nudges down 1px; disabled is `line-strong` with white text.
- **Secondary:** white with a `line-strong` ring; hover fills `surface-2` and darkens the ring to `ink-3`.
- **Ghost:** `ink-2`, no fill; hover `surface-2` and `ink`.
- **Danger:** white, `rise` text, `line-strong` ring; hover `rise-wash` with a `rise` ring.
- **Sizes:** small 36px (44px below 1024px), medium 44px, large 48px; Bake and the board use 56px.

### Chips: change tags and Low marks
- **Change tag:** 24px pill, `rise-wash`/`rise` or `drop-wash`/`drop`, arrow plus percent.
- **Low badge:** 20px `low-wash` pill with a `low` inset ring, a yema dot and "Low".
- **LOW pill:** solid `low` with `low-on`, Micro bold "LOW", leading the figure in a low stock cell.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** `surface` on `ground`.
- **Shadow Strategy:** none at rest.
- **Border:** 1px `line` ring.
- **Internal Padding:** 16px (20px from 640px).

### Inputs / Fields
- **Style:** white, `line-strong` 1px ring, 10px, 44px, 12px sides; hover ring `ink-3`.
- **Focus:** a 2px `focus` ring; caret `focus`.
- **Error:** 2px `rise` ring with a `rise` message; hints Caption `ink-2`.
- **Segmented control:** `surface-2` track with a `line` ring; the selected option is a white 5px segment with a `line-strong` ring.

### Ingredients sheet (signature, owner-pinned Sheets copy)
A Google Sheets look-alike on the scoped `.gsheet` colours.
- **Search:** a fully round search on the Sheets header grey, ringing in Sheets blue on focus.
- **Formula bar:** an 8px top-rounded strip with an fx mark; shows the active cell's value, read-only for computed and picked cells.
- **Grid:** column letters and row numbers on the header grey, the active column's letter on the pale blue band; 1px Sheets grid; a 3px freeze bar under the header row and right of the name column; 32px rows (44px below 1024px), 13px text.
- **Header row:** bold `ink` names on white, sort buttons hovering to header grey.
- **Cells:** the name column pinned in Bricolage 600 with an open-detail link (`ink-3`, hover `accent-wash`); category dot leads the Category cell; figures tabular and right-aligned.
- **Locked Cost per unit:** on the Sheets header grey, semibold, lock in its header, hint "Worked out for you: price ÷ size".
- **Low stock cell:** `low-wash` with a LOW pill.
- **Selection:** a 2px Sheets-blue inset ring and the 7px fill handle; an open editor rings in cocoa `focus`; a failed save rings `rise`.
- **Sheet tabs:** one per category along the bottom; the active tab is white with Sheets-blue ink and a 3px blue underline.

### Ledger sheet (money lists)
Income and expenses keep the house sheet grammar: 10px frame, sticky `surface-2` header with sort chevrons, pinned first column, 1px `line` cells, 44px rows, inline editors, shell error and hint tips, failed-save ring and undo toasts.
- **Draft row:** a new row at the top on `accent-wash` with an `accent-wash` action strip below.
- **Locked rows:** rows another part of the app wrote sit on `surface-2` with a lock and a link to their source.
- **Computed columns:** locked, semibold, lock in the header.

### Stat strip
One white label holding three or four figures split by hairlines; two columns on phones, one row from 1024px with the first at 1.7fr. Each cell: an `ink-2` label, the figure, a caption with a Delta and, when linked, an `accent` arrow; linked cells hover to `surface-2`.

### Delta and profit figure
- **Delta:** tabular percent with a 12px arrow and a screen-reader word, coloured by The Good Or Bad Rule.
- **Profit figure:** signed peso with an arrow; profit `drop`, loss `rise`.
- **Under-target tag:** a 20px `rise-wash` pill, Micro bold, a down arrow and "under N%".

### Order status and payment
- **Status pill:** 24px, Caption bold, a 14px icon and the word: To do (white, `line-strong` ring, dashed circle), Baking (`accent-wash`, `line-strong` ring, flame), Done (`shell`, `shell-ink`, check), Cancelled (`surface-2`, `ink-3`, struck, X).
- **Payment mark:** Paid is a `drop` check and "Paid"; an open balance is a `surface-2` pill with a `line` ring and the amount, switching to `rise-wash`/`rise` only when urgent.

### Statements
White label panels; money lines with right-aligned tabular amounts; subtotals semibold over a `line` rule; grand totals add the double rule. Computed lines (inventory, receivables, tax payable, net income) are 6px `surface-2` blocks with a lock, a note and an `accent` link to their source. An unmatched balance shows as its own "Not yet matched" computed line.

### Recipe price label (signature)
An `accent-wash` band holds "Cost per [unit]" and the cost at Figure Large, the one large figure, with batch cost ÷ yield in Caption. Below, a 10px pill bar splits the batch cost into ingredients, labour and overhead in `series-1` to `series-3` with 2px gaps, over a dot legend.

### Bake mode (signature)
- **Frame:** the full `shell`; top bar of 48px shell buttons hovering `shell-2`, recipe name, step count, a screen-on mark, and running timer pills.
- **Ingredients:** a white label with the recipe in Bake Title, `surface-2` chips for yield and time, a tabular amount list with Bricolage names; the current step's ingredients highlight on `accent-wash` with a `line-strong` ring.
- **Step card:** white label, Bake Step type in a 28ch measure; a start-timer control on `accent-wash` that rings in `accent` on hover. The card slides 28px in from the direction of travel over 220ms.
- **Progress:** 8px pill segments, done in `accent`, current on `accent-wash` with an `accent` inset ring, ahead in `line`.
- **Timer pill:** 44px `shell-2` pill with a `shell-3` ring, tabular clock; a ringing pill flashes between cocoa and white once a second.
- **Alarm:** a full cocoa banner flashing to white once a second, Bake Alarm type, and a 96px white Stop button with a 3px ring. Under reduced motion it holds still as white with a 6px cocoa inner edge.
- **Back and Next:** a 56px bottom bar on a white strip; Next is the cocoa primary.

### Cake design board (signature)
- **Frame:** the full `shell`; title, linked order and save state on top.
- **Board:** a 4:3 sheet of board paper with faint cake outlines, 10px corners and a `shell-3` ring; hints sit in a translucent shell pill at its foot.
- **Tools:** 56px shell tools (10px, Caption labels, `shell-ink-2`, hover `shell-2`); the selected tool sits on a white 10px plate that glides between tools over 300ms, its icon in `accent` with a dot of the current icing colour; disabled at 40%.
- **Icing swatches:** 48px round swatches in the named icing colours with a check on the selected one (latik check on light icings, white on dark), and a conic "more colours" picker. Swatch colours are content, never chrome.
- **Gallery:** template and design tiles as white labels; designs attach to orders and appear in Bake mode. A design with more than one view shows its first view with the others as small 4:3 thumbnails in the corner, ringed in `surface`.
- **Shapes (owner request, 2026-10-22):** round from above and the side, two and three tiers, sheet, square tiers, heart, drip (dark ganache by default, its own "Drip and top" part), bento box (kraft lunch box), number cakes 0 to 9 (one "Number cake" tile, then a digit), cupcakes, blank. Then seven **theme cakes** (Birthday, Unicorn, Princess, Dinosaur, Floral wedding, Baby shower, Christmas): ordinary views pre-built from the same piping and decor, so everything on them stays editable. Drawing material lives in `cake-art.tsx`, `themes.ts`.
- **Views:** a design holds up to 8 views (a top view and a side view of one cake), each a full board with its own undo. Tabs sit in a translucent `shell` pill over the board's top-left corner: a round 4:3 thumbnail and a short name ("Top", "Side", "Heart 2"), the current tab on a white label, then "+ View". The first view is the row's own columns; the rest are `extra_views`. The order, Bake mode and Share picture show every view (the picture lays them out two across).
- **The shape-change warning:** changing the shape of a view that has drawing on it never happens silently. The sheet turns into "Change to Heart cake?" with this view and the new shape side by side, and three answers: Cancel, **Replace and clear** (danger), **Add as a new view** (primary). Replacing has Undo in the toast and in the history.
- **Piping tips:** sixteen tips, each tile carrying its Wilton number in a small `shell` badge (21 shell, 20 star, 1M rosette, 22 swirl, 12 pearl and heart, 2D drop flower, 104 rose and ruffle, 81 mini petals, 352 leaf, 124 ribbon swag, 6B rope, 21 zigzag, 48 basket weave, 233 grass).
- **Decor:** a sixth tool (D) with a tray of 27 accessories in five groups (toppers and words, sweets, cartoons, shapes, holidays), drawn in the piping's flat layered tones in a 100-unit frame. Items marked tint wear the chosen icing colour; natural things keep theirs (a strawberry stays red). Sizes read Small, Medium, Large. Tap places; press and drag places exactly; dragging a placed item moves it; the Eraser removes it. Words are piped in Dancing Script 700 (`cakeScript` in `src/lib/fonts.ts`, no preload) with greeting chips (a datalist on narrow phones); number candles letter in Bricolage 800. Share picture embeds both faces so the PNG matches the board.

### Report charts
Rank bars in `chart-bar` with the value at the bar end and a reserved right gutter; scatter dots in `series-1` with a `surface` stroke and median quadrants named in Caption; tooltips are white 10px labels with a `line` ring and the Sheet shadow.

### Section tabs and period stepper
- **Section tabs:** a `surface-2` track (10px, `line` ring, 2px padding) of 36px links (40px below 1024px); the current page is a white 5px tab with a `line-strong` ring.
- **Period stepper:** 36px (44px below 1024px) buttons with a `line-strong` ring around a tabular semibold period label.

### Tasks
Rows with a 44px hit area around a 22px, 6px-radius checkbox (white with a 1.5px `line-strong` ring, solid `accent` with a check when done) and a Caption meta line; late reads "N days late" in semibold `rise`.

### Navigation
- **Desktop rail:** 240px pale pandan column with the logo lockup (mark plus stacked "Kin / Kitchen" in cocoa), 36px items in `shell-ink-2` under small `shell-ink-2` group names; hover `shell-2` with `shell-ink`. The active item is a white 10px label with a `shell-3` ring, `ink` text and its icon in cocoa duotone.
- **Phone tab bar:** five 64px tabs with icon and Micro label; the active icon sits in a white 28x56 pill in cocoa duotone.
- **Pending feedback:** a tapped nav item tints with 16% `shell-ink` after 80ms, and a 3px `focus` bar with a soft glow runs across the top of the screen; hidden for the first 120ms so fast navigations do not flicker. Under reduced motion the bar holds at 60% instead of running.
- **More page:** the rail's groups as white list labels, each row a 40px `accent-wash` icon tile, the name and an `ink-2` blurb.
- **Floating add:** a 56px `accent` pill with a plus and a label naming what that list collects (Order, Add, Recipe, Income, Expense, Task, Design), Sheet shadow; absent elsewhere.

### Manual (/guide)
A reading page: Headline title, a 1.0625rem intro, a sticky chapter list whose current chapter shows its icon in cocoa duotone, and body copy in a 68ch measure. Inline code and keyboard keys are 5px chips (keys white with a `line-strong` ring and a 2px `line` underside).

### Sheets and toasts
- **Sheet:** white with the Sheet shadow, a 56px header and a hairline sticky footer; full height or 14px top-rounded on phones, centred with 10px corners on desktop; enters with a 24px rise over 260ms.
- **Toast:** a pandan `shell` bar, 10px, Sheet shadow, with an Undo action (5px, hover `shell-3`) and a dismiss; errors in `rise-on-shell`; enters with a 12px rise over 220ms.

### Canister (signature)
The stock gauge on ingredient detail at 64x84 beside the stock figure, and at 26x34 in Today's To buy list. The pandan fill rises to the stock level (full is three times the low level); at or below the dashed low-line it turns yema and the line turns `low-ink`. Fill changes animate over 420ms; reduced motion turns that off.

### Price history
A card of history labels, newest first, each with date, cost per unit and a change tag, ending in a `surface-2` footer. A fresh label slides in from 10px above, fading from `accent-wash` over 420ms.

## Do's and Don'ts

### Do:
- **Do** keep the app always light: buko `ground`, white `surface` labels, latik `ink`.
- **Do** frame the app in the pale pandan shell (rail, tab bar, toasts, Bake and board frames) separated by a `shell-3` hairline, never by a dark band.
- **Do** use cocoa `accent` for every action and `focus` for every focus ring.
- **Do** import icons only from the Phosphor vocabulary module: regular by default, bold for emphasis, duotone for the selected nav item.
- **Do** keep kakanin colours in data: the five series in fixed order, the category legend, the icing palette.
- **Do** keep computed values locked behind a lock on a recessed tint, never editable, with a link to their source.
- **Do** make the one large figure on a label surface its computed truth, in tabular Geist 600.
- **Do** pair every rise or drop with an arrow and a figure, and every low state with the word "Low".
- **Do** give each stat strip one lead figure in the 1.7fr first column and step the rest down.
- **Do** build money lists on the ledger sheet grammar.
- **Do** keep the Ingredients Sheets copy on its scoped `.gsheet` colours.
- **Do** use 10px corners for labels and controls, smaller nested radii inside them, and pills for things counted, flagged or timed.
- **Do** keep inputs at 16px or larger, touch targets at 44px below 1024px, and Bake and board controls at 48 to 56px.
- **Do** use the `cubic-bezier(0.16, 1, 0.3, 1)` ease-out for entrances and gauge fills, and drop motion and flashing under reduced motion.

### Don't:
- **Don't** add a dark mode or dark chrome.
- **Don't** use yema gold for anything except running low.
- **Don't** colour chrome with series, category or icing colours.
- **Don't** use the Google Sheets greys or blue outside the Ingredients sheet.
- **Don't** convey rise, drop or low by colour alone.
- **Don't** give label surfaces a resting shadow.
- **Don't** add chart series beyond the five validated ones, or reorder them.
- **Don't** reassign a category's colour based on filtering or sort order.
- **Don't** colour order status with yema, `rise` or `drop`.
- **Don't** treat a receivable as a price rise: open balances stay neutral until due today or late.
- **Don't** set words at figure size in a stat strip, or give a strip two lead figures.
- **Don't** import icons from a package directly or mix icon sets.
