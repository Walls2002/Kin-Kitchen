# Kin Kitchen

Run a home bakery: the pantry (package price, cost per gram / ml / piece, stock, a price history that writes itself), recipe pricing, orders, income and expenses, monthly / annual / product / 5-year dashboards, an income statement and balance sheet, a BIR 8% tax tracker and a task list. Everything is linked: recipe costs follow ingredient prices, order payments are the income, finishing an order takes its ingredients from stock, and a pantry purchase writes its own expense. Next.js 16 + Supabase + Tailwind + Recharts, all on free tiers. Installable as a PWA.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase keys set, the app runs in **demo mode** on synthetic sample data (labeled as such): 35 ingredients, 9 recipes, ten months of individual orders, purchases and bills, and monthly totals going back four more years so the 5-year view has something to show. Demo data lives in server memory and resets when the server restarts.

`next.config.ts` turns off `logging.browserToTerminal`: with Next 16.4 on Windows, forwarding browser console output to the dev log kept triggering recompiles that reloaded open pages in a loop. Stop `npm run dev` before running `npm run build` as well.

## Connect Supabase

1. Create a free project at supabase.com.
2. In the SQL editor, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), then [supabase/migrations/0002_business.sql](supabase/migrations/0002_business.sql), then [supabase/migrations/0003_bake_and_designs.sql](supabase/migrations/0003_bake_and_designs.sql) (recipe steps and cake designs). The first creates the pantry tables, the generated `cost_per_unit` columns, the `updated_at` and price-history triggers, row-level security, the `price_movers(days)` function and a `ping()` function for keep-alive. The second adds recipes, orders, income, expenses, balance sheet items, tax payments, tasks and saved dashboard views, each behind row-level security.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`.
4. In Supabase > Authentication > URL configuration, add `<your site>/auth/callback` to the redirect URLs (for magic links).
5. Optional: to log in with a password, create the user in Supabase > Authentication > Users with a password.

The first time you log in, the starter categories are created for you. Only the anon key is used; the service-role key is never needed.

## Deploy to Vercel

Import the repo in Vercel, add the three environment variables, and deploy. Set `NEXT_PUBLIC_SITE_URL` to the production URL.

**Keep the free database awake:** Supabase pauses free projects after about 7 days without activity. [.github/workflows/keep-alive.yml](.github/workflows/keep-alive.yml) pings `/api/health` every 3 days. Set a repository variable `APP_URL` to your deployed URL (GitHub > Settings > Secrets and variables > Actions > Variables).

## Where things are

| Path | What it is |
| --- | --- |
| `src/app/(app)/page.tsx` | Today: this month so far, orders due, tasks, running low, next BIR deadline |
| `src/app/(app)/orders/`, `recipes/` | Order tracker and recipe pricing calculator |
| `src/app/(app)/income/`, `expenses/`, `tax/` | Money sheets and the BIR 8% tracker |
| `src/app/(app)/reports/` | Monthly, annual, products + custom views, statements, 5-year growth |
| `src/app/(app)/tasks/` | Task tracker |
| `src/app/(focus)/bake/` | Bake mode: full-screen step-by-step with ingredients, timers and screen wake lock |
| `src/app/(app)/designs/` | Cake design gallery and drawing board |
| `src/app/(app)/ingredients/`, `pantry/` | Ingredient sheet, detail (price history, purchases), pantry insights |
| `src/app/(app)/@modal/` | Add/edit as a modal when opened from inside the app |
| `src/app/(app)/settings/page.tsx` | Categories, CSV export, account |
| `src/lib/data/` | `Repo` interface with Supabase and demo implementations; `demo-business.ts` seeds the sample business |
| `src/lib/biz.ts` | All business arithmetic: recipe cost, order totals, income ledger, statements, BIR 8%, product stats, custom views, task timing |
| `src/lib/actions.ts` | Server actions, validated with the shared Zod schemas in `src/lib/schemas.ts` |
| `src/proxy.ts` | Session refresh and login redirect (inactive in demo mode) |
| `PRODUCT.md`, `DESIGN.md` | Product context and the design system |

## Backups

Settings > Export to CSV downloads ingredients, price history, recipes, orders, income, expenses and tax payments. Do it monthly; the free tier has no point-in-time recovery.

## Tax figures

The Tax screen assumes the BIR 8% income tax option for a sole proprietor: 8% of gross sales above ₱250,000 a year, filed quarterly on 1701Q (May 15, Aug 15, Nov 15) and annually on 1701A (Apr 15). Every figure is an estimate from what you've recorded; confirm with your RDO or accountant.
