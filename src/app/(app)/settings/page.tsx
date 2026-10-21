import type { Metadata } from "next";
import { Download, LogOut } from "@/components/icons";
import { CategoryManager } from "@/components/category-manager";
import { Button, buttonClass } from "@/components/ui";
import { getRepo } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { signOut } from "../../login/actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="surface px-4 py-5 sm:px-6" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`} className="text-md font-semibold tracking-tight">
        {title}
      </h2>
      {description ? <p className="mt-0.5 mb-4 text-sm text-ink-2">{description}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const repo = await getRepo();
  const [categories, ingredients, history, orders, income, expenses, recipes, taxPayments] = await Promise.all([
    repo.listCategories(),
    repo.listIngredients(),
    repo.listHistory(),
    repo.orders.list(),
    repo.income.list(),
    repo.expenses.list(),
    repo.recipes.list(),
    repo.taxPayments.list(),
  ]);
  const paymentCount = orders.reduce((s, o) => s + o.payments.length, 0);
  const exports: [string, string, number][] = [
    ["ingredients", "Inventory", ingredients.length],
    ["history", "Price history", history.length],
    ["recipes", "Recipes", recipes.length],
    ["orders", "Orders", orders.length],
    ["income", "Income", income.length + paymentCount],
    ["expenses", "Expenses", expenses.length],
    ["tax", "Tax payments", taxPayments.length],
  ];
  const counts: Record<string, number> = {};
  for (const i of ingredients) if (i.category_id) counts[i.category_id] = (counts[i.category_id] ?? 0) + 1;

  let email: string | null = null;
  if (!isDemo) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    email = (await (await createSupabaseServerClient()).auth.getUser()).data.user?.email ?? null;
  }

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-ink-2">Ingredient categories, backups and your account.</p>
      </header>
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Block title="Categories" description="Order here sets the order in menus. The number is how many ingredients use each one.">
          <CategoryManager categories={categories} counts={counts} />
        </Block>
        <div className="flex flex-col gap-5">
          <Block title="Export to CSV" description="The free database has no point-in-time backups, so download these once a month. Each opens in Excel or Google Sheets.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exports.map(([type, label, count]) => (
                <a key={type} href={`/api/export?type=${type}`} download className={buttonClass("secondary", "md", "justify-start")}>
                  <Download aria-hidden /> {label} <span className="figures ml-auto text-ink-2">{count}</span>
                </a>
              ))}
            </div>
          </Block>
          <Block title="Account">
            {isDemo ? (
              <p className="text-sm text-ink-2">
                Running on sample data that resets when the server restarts. Add <code className="figures text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="figures text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to switch to your own private data.
              </p>
            ) : (
              <form action={signOut} className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 truncate">
                  <span className="block text-sm text-ink-2">Logged in as</span>
                  {email}
                </p>
                <Button type="submit">
                  <LogOut aria-hidden /> Log out
                </Button>
              </form>
            )}
          </Block>
          <Block title="Install on your phone">
            <p className="text-sm text-ink-2">
              On Android, open the browser menu and choose <span className="text-ink">Install app</span>. On iPhone, tap Share, then{" "}
              <span className="text-ink">Add to Home Screen</span>.
            </p>
          </Block>
        </div>
      </div>
    </>
  );
}
