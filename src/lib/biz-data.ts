import "server-only";
import { incomeLedger, today } from "./biz";
import { getRepo } from "./data";

/** Everything the business screens read, loaded in one round. */
export async function loadBusiness() {
  const repo = await getRepo();
  const [ingredients, categories, recipes, orders, income, expenses, balance, taxPayments, tasks, views] = await Promise.all([
    repo.listIngredients(),
    repo.listCategories(),
    repo.recipes.list(),
    repo.orders.list(),
    repo.income.list(),
    repo.expenses.list(),
    repo.balance.list(),
    repo.taxPayments.list(),
    repo.tasks.list(),
    repo.views.list(),
  ]);
  return {
    ingredients,
    categories,
    recipes,
    orders,
    income,
    expenses,
    balance,
    taxPayments,
    tasks,
    views,
    ledger: incomeLedger(income, orders),
    now: today(),
  };
}

export type Business = Awaited<ReturnType<typeof loadBusiness>>;
