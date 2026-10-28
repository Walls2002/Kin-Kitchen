# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA; mobile web and desktop browser are equal first-class targets (360px phones up to large desktops).

## Stack

Pinned by the spec (`kin-kitchen-specs.md`): Next.js App Router + TypeScript, Tailwind CSS, Recharts, Supabase (Postgres, Auth, RLS) via `@supabase/supabase-js` + `@supabase/ssr`, Zod, hosted on Vercel Hobby. Free tiers only.

Confirmed addition: a local demo mode with realistic sample data runs whenever Supabase keys are absent, so every screen works before a project is connected.

## Users

One owner: Wally, who runs a small home baking business. Uses the app on a phone in the kitchen or at the supply store (checking a price, adjusting stock after a bake, entering a new receipt price), and on a PC to review trends and costs.

## Product Purpose

Run the whole home bakery from one place. The pantry tracks every ingredient's package price, size, unit and stock, with the real cost per gram, ml or piece and an automatic price history. On top of it (owner request, 2026-10-17, from the "All-in-one spreadsheet" reference): recipe pricing, an order tracker, income and expense trackers, monthly and annual dashboards, product comparison and custom dashboards, an income statement and balance sheet, a 5-year growth view, a BIR tax tracker and a task tracker.

Success: updating an ingredient or logging an order takes a few taps; price increases, low stock, unpaid balances and tax deadlines are visible without digging; every report is computed from what was recorded, never retyped; running cost is zero.

## Positioning

Cost per unit is a database-computed fact shown beside every price, and price history is written by a trigger, never by hand. The same rule runs through the business modules: recipe cost follows live ingredient prices, order payments are the income ledger, finishing an order takes its ingredients out of the pantry, a pantry purchase writes its own expense, and statements, dashboards and tax estimates are computed. The owner never maintains a log; the log maintains itself.

## Operating Context

- Phone use is short and interrupted: floury hands, standing at a shelf or a store aisle, one value to check or change.
- Desktop use is review: comparing suppliers, scanning movers, exporting CSV backups monthly.
- Currency is Philippine peso (₱1,250.00); cost per unit shown to 4 decimals (₱0.1250/g).
- Tax regime: sole proprietor on the BIR 8% income tax option. Quarterly 1701Q (May 15, Aug 15, Nov 15) and annual 1701A (Apr 15).
- Units stored as `g`, `ml`, `pc`; entry accepts kg and L and converts.
- Categories: Flour, Sugar, Dairy, Eggs, Fats, Leaveners, Flavorings, Chocolate, Nuts and fruit, Packaging, Other (extendable).

## Capabilities and Constraints

- Ingredients CRUD; duplicate names blocked per category.
- Automatic price history (trigger), manual backfill rows with past dates.
- Stock quick adjust (+/−/set) with optimistic update and undo.
- Search, filter (category, supplier, low stock), sort (name, price, cost per unit, stock, last updated).
- Pantry insights: 4 stat cards, price trend, biggest movers (30/90 days), cost per unit ranking, stock value by category, stock vs threshold.
- Today (home): month-to-date sales and profit, balances to collect, orders due this week with one-tap Start baking / Mark done, today's tasks, running low, next BIR deadline.
- Recipe pricing: ingredient lines priced from live cost per unit, labor and itemized utilities (electricity, water, gas) per batch, yield, cost per unit, and varieties (owner request, 2026-10-28): each way a product is sold (box of 6, 6x2 cake) is a variety with its own size in units, price, extra pantry items and price-list note, and shows its own cost, profit on cost against a target and suggested price. The Price list (under Sell) is a table of every variety's price, edited through a modal per row, and that price is the product's real price; the Recipes list is one line per product. The bulk-quote calculator was removed (owner found it confusing). Pricing rule (owner's client, 2026-10-18): profit is a percent of the total batch cost (markup), 50% by default, so price = cost × 1.5; the share of the selling price is shown alongside.
- Orders: customer, channel, dates, items from recipes, delivery and discount, deposits and payments, status (to do, baking, done, cancelled). Done deducts recipe ingredients from stock; undo returns exactly what was taken.
- Income (manual + order payments, locked) and Expenses (manual + pantry purchases) as editable sheets.
- Reports: monthly, annual, products (best sellers vs most profitable, volume vs margin, saved custom views), income statement (cash basis) and balance sheet (manual items + computed inventory, receivables, tax payable, earnings kept), 5-year growth.
- Tax: BIR 8% option (8% of gross above ₱250,000 a year), 1701Q quarters and 1701A annual with deadlines, payments, ₱3M VAT-line meter. Estimates only.
- Tasks: one-off, daily and weekly, plus orders due today and tomorrow.
- Bake mode (owner request, 2026-10-17): start a bake from a recipe (or from an order item) and the phone becomes a propped recipe card: every ingredient for one batch always in view, one step at a time in large type, big Back / Next, step timers that ring and flash, and the screen kept awake. Recipes carry a Method (steps with optional timer minutes).
- Cake designs (owner request, 2026-10-17): a free drawing board on blank paper or a cake outline (round top/side, two tiers, sheet, cupcakes) with icing-colour pens, marker, line eraser and undo; designs attach to orders, show on the order and in Bake mode, collect in a gallery, and share as a picture.
- Single-owner auth (magic link or email + password); RLS on every table.
- CSV export of ingredients, price history, recipes, orders, income, expenses and tax payments.
- Light and dark mode follow the system setting.
- Non-goals: multi-user, offline editing, invoicing or e-receipts, VAT or graduated-rate tax computation, accrual accounting.

## Brand Commitments

Name: Kin Kitchen. No existing logo, palette or typography; the visual identity is open.

## Evidence on Hand

Only the spec. No real ingredient data, prices or suppliers yet: demo-mode data is synthetic and must be labeled as sample data in the UI.

## Product Principles

1. The number that matters is cost per unit; it travels with every price.
2. A phone edit is a few taps; never make the kitchen visit a form-filling session.
3. Changes surface themselves: increases, drops and low stock are visible without a query.
4. Color is never the only signal; direction and text accompany every red/green/amber.
5. Free to run, and honest about free-tier limits.

## Accessibility & Inclusion

44px minimum tap targets, labels on every input, `inputmode="decimal"` for numbers, color never the sole signal, system light/dark.
