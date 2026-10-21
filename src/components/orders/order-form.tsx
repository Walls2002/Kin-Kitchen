"use client";

import { ArrowLeft, Check, ChefHat, Flame, Minus, Plus, RotateCcw, Trash2, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteOrder, restoreOrder, saveOrder, saveSketch } from "@/lib/biz-actions";
import { addDays, orderTotals, recipeCost } from "@/lib/biz";
import { formatCount, formatDayWeek, formatPeso, formatPesoSigned, relativeDay } from "@/lib/format";
import { orderSchema, type OrderInput } from "@/lib/schemas";
import { ORDER_STATUSES, PAYMENT_METHODS, SALES_CHANNELS, type Ingredient, type Order, type OrderStatus, type PaymentMethod, type Recipe } from "@/lib/types";
import { MoneyLine, StatusPill, statusLabel } from "../biz-ui";
import { Combobox } from "../recipes/combobox";
import { PesoInput } from "../recipes/recipe-editor";
import { Sheet } from "../sheet";
import { useToast } from "../toast";
import { Button, Field, Input, Select, Textarea, cx, inputClass } from "../ui";
import { statusMessage, toOrderInput, useStatusChange } from "./order-bits";
import { OrderDesign, type PendingDesign } from "./order-design";

interface Props {
  order?: Order;
  recipes: Recipe[];
  ingredients: Ingredient[];
  customers: { name: string; contact: string | null }[];
  now: string;
  /** Extra panels for the right column, like "From the pantry". */
  aside?: ReactNode;
}

interface ItemState {
  key: string;
  recipe_id: string | null;
  name: string;
  qty: string;
  unit_price: string;
  unit_cost: number;
}

interface PayState {
  id: string;
  amount: string;
  date: string;
  method: PaymentMethod;
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[₱,\s]/g, "")));
const show = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "");
const orZero = (n: number) => (Number.isFinite(n) ? n : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function OrderForm({ order, recipes, ingredients, customers, now, aside }: Props) {
  const router = useRouter();
  const toast = useToast();
  const ids = useId();
  const [pending, start] = useTransition();
  const ingById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const menu = useMemo(
    () => recipes.filter((r) => r.active).sort((a, b) => (a.group ?? "~").localeCompare(b.group ?? "~") || a.name.localeCompare(b.name)),
    [recipes],
  );

  const seq = useRef(0);
  const nextKey = () => `i${seq.current++}`;

  const [v, setV] = useState(() => ({
    customer: order?.customer ?? "",
    contact: order?.contact ?? "",
    channel: order?.channel ?? "Facebook",
    order_date: order?.order_date ?? now,
    due_date: order?.due_date ?? addDays(now, 1),
    delivery_fee: order ? show(order.delivery_fee) : "",
    discount: order ? show(order.discount) : "",
    notes: order?.notes ?? "",
  }));
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? "pending");
  // The status bar changes the saved order; keep the form's status field in step with it.
  const [seenStatus, setSeenStatus] = useState(order?.status);
  if (order && order.status !== seenStatus) {
    setSeenStatus(order.status);
    setStatus(order.status);
  }
  const [items, setItems] = useState<ItemState[]>(() =>
    (order?.items ?? []).map((i, n) => ({ key: `s${n}`, recipe_id: i.recipe_id, name: i.name, qty: show(i.qty), unit_price: show(i.unit_price), unit_cost: i.unit_cost })),
  );
  const [payments, setPayments] = useState<PayState[]>(() => (order?.payments ?? []).map((p) => ({ id: p.id, amount: show(p.amount), date: p.date, method: p.method })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRefs = useRef(new Map<string, HTMLInputElement>());

  const clear = (...keys: string[]) =>
    setErrors((e) => {
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = (patch: Partial<typeof v>) => {
    setV((cur) => ({ ...cur, ...patch }));
    clear(...Object.keys(patch));
  };

  /* ---------- items ---------- */

  const addRecipe = (r: Recipe) => {
    const existing = items.find((i) => i.recipe_id === r.id);
    if (existing) {
      setItems((all) => all.map((i) => (i.key === existing.key ? { ...i, qty: show(orZero(num(i.qty)) + 1) } : i)));
    } else {
      setItems((all) => [
        ...all,
        { key: nextKey(), recipe_id: r.id, name: r.name, qty: "1", unit_price: show(r.price), unit_cost: round2(recipeCost(r, ingById).perUnit) },
      ]);
    }
    clear("items");
  };
  const addCustom = (name: string) => {
    const key = nextKey();
    setItems((all) => [...all, { key, recipe_id: null, name, qty: "1", unit_price: "", unit_cost: 0 }]);
    clear("items");
    requestAnimationFrame(() => nameRefs.current.get(key)?.focus());
  };
  const setItem = (key: string, idx: number, patch: Partial<ItemState>) => {
    setItems((all) => all.map((i) => (i.key === key ? { ...i, ...patch } : i)));
    clear(...Object.keys(patch).map((k) => `items.${idx}.${k}`));
  };
  const step = (key: string, idx: number, by: number) => {
    const cur = items.find((i) => i.key === key);
    if (!cur) return;
    setItem(key, idx, { qty: show(Math.max(1, Math.floor(orZero(num(cur.qty))) + by)) });
  };

  /* ---------- payload and totals ---------- */

  const payload: OrderInput = {
    customer: v.customer,
    contact: v.contact,
    channel: v.channel,
    order_date: v.order_date,
    due_date: v.due_date,
    status,
    items: items.map((i) => ({ recipe_id: i.recipe_id, name: i.name, qty: num(i.qty), unit_price: num(i.unit_price), unit_cost: i.unit_cost })),
    delivery_fee: v.delivery_fee.trim() === "" ? 0 : num(v.delivery_fee),
    discount: v.discount.trim() === "" ? 0 : num(v.discount),
    payments: payments.map((p) => ({ id: p.id, amount: num(p.amount), date: p.date, method: p.method })),
    notes: v.notes,
  };
  const t = orderTotals({
    items: payload.items.map((i) => ({ ...i, qty: orZero(i.qty), unit_price: orZero(i.unit_price) })),
    delivery_fee: orZero(payload.delivery_fee),
    discount: orZero(payload.discount),
    payments: payload.payments.map((p) => ({ ...p, amount: orZero(p.amount) })),
  });
  const sales = t.subtotal - orZero(payload.discount);
  const margin = t.cost > 0 ? (t.profit / t.cost) * 100 : null;

  /* ---------- payments ---------- */

  const addPayment = () => {
    setPayments((all) => [...all, { id: crypto.randomUUID(), amount: t.balance > 0 ? show(t.balance) : "", date: now, method: "GCash" }]);
  };
  const setPayment = (id: string, idx: number, patch: Partial<PayState>) => {
    setPayments((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    clear(...Object.keys(patch).map((k) => `payments.${idx}.${k}`));
  };

  /* ---------- save and delete ---------- */

  const [design, setDesign] = useState<PendingDesign | null>(null);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(undefined);
    const result = orderSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".") || "form"] ??= issue.message;
      setErrors(errs);
      setFormError("Some fields need attention.");
      return;
    }
    start(async () => {
      const res = await saveOrder(order?.id ?? null, result.data);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      const c = res.data!;
      const changed = c.previous !== c.order.status;
      const m = changed ? statusMessage(c, { afterSave: true }) : { message: "" };
      const lead = order ? `Saved order #${c.order.number}.` : `Added order #${c.order.number} for ${c.order.customer}.`;
      // A design drawn while writing a new order is saved now, attached to it.
      let designNote = "";
      if (!order && design) {
        // An unnamed design takes the customer's name ("Mila's cake").
        const first = c.order.customer.trim().split(/\s+/)[0];
        const title = design.title === "Cake design" && first ? `${first}'s cake` : design.title;
        const d = await saveSketch(null, { ...design, title, order_id: c.order.id });
        designNote = d.ok ? " Cake design saved." : " The cake design didn't save; draw it again on the order.";
      }
      toast({ message: (changed ? `${lead} ${m.message}` : lead) + designNote, tone: m.tone });
      if (!order) router.push(`/orders/${c.order.id}`);
    });
  };

  const remove = () => {
    if (!order) return;
    const previous = toOrderInput(order);
    start(async () => {
      const res = await deleteOrder(order.id);
      setConfirmDelete(false);
      if (!res.ok) {
        toast({ message: `Couldn't delete order #${order.number}: ${res.error}`, tone: "error" });
        return;
      }
      router.push("/orders");
      toast({
        message: `Deleted order #${order.number}${order.status === "done" ? ". Its ingredients went back to the pantry." : ""}`,
        action: {
          label: "Undo",
          onAction: async () => {
            const back = res.data ? await restoreOrder(res.data) : await saveOrder(null, previous);
            if (back.ok) {
              toast({ message: `Put back order #${order.number}` });
              router.push(`/orders/${order.id}`);
            } else toast({ message: `Couldn't put it back: ${back.error}`, tone: "error" });
          },
        },
      });
    });
  };

  const channels = Array.from(new Set<string>([...SALES_CHANNELS, ...(order ? [order.channel] : [])]));
  const knownCustomer = (name: string) => customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/orders" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink lg:h-9">
        <ArrowLeft className="size-4" aria-hidden />
        Orders
      </Link>
      <header className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-semibold tracking-tight">
            {order ? (
              <>
                <span>
                  Order <span className="figures">#{order.number}</span>
                </span>
                <StatusPill status={order.status} className="font-sans" />
              </>
            ) : (
              "New order"
            )}
          </h1>
          <p className="mt-1 text-ink-2">
            {order ? (
              <>
                For <span className="font-medium text-ink">{order.customer}</span> · due {formatDayWeek(order.due_date)} ({relativeDay(order.due_date, now)})
              </>
            ) : (
              "Who it's for, what they want and when. Payments you record here count as income."
            )}
          </p>
        </div>
        {order ? <StatusBar order={order} /> : null}
      </header>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          {/* customer and dates */}
          <section className="surface p-4 sm:p-5" aria-labelledby={`${ids}-cust`}>
            <h2 id={`${ids}-cust`} className="text-md font-semibold tracking-tight">
              Customer
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Name" error={errors.customer} className="sm:col-span-2">
                {(p) => (
                  <>
                    <Input
                      {...p}
                      list={`${ids}-customers`}
                      value={v.customer}
                      autoComplete="off"
                      autoFocus={!order}
                      placeholder="Who is it for?"
                      onChange={(e) => {
                        const known = knownCustomer(e.target.value);
                        set(known && !v.contact && known.contact ? { customer: e.target.value, contact: known.contact } : { customer: e.target.value });
                      }}
                    />
                    <datalist id={`${ids}-customers`}>
                      {customers.map((c) => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field label="Contact" optional error={errors.contact} hint="Mobile number or Messenger name">
                {(p) => <Input {...p} value={v.contact} onChange={(e) => set({ contact: e.target.value })} autoComplete="off" placeholder="0917 123 4567" />}
              </Field>
              <Field label="Came in through" error={errors.channel}>
                {(p) => (
                  <Select {...p} value={v.channel} onChange={(e) => set({ channel: e.target.value })}>
                    {channels.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <div className="sep-t mt-5 grid grid-cols-2 gap-3 pt-5">
              <Field label="Ordered on" error={errors.order_date}>
                {(p) => <Input {...p} type="date" value={v.order_date} max={addDays(now, 365)} onChange={(e) => set({ order_date: e.target.value })} className="figures" />}
              </Field>
              <Field label="Due" error={errors.due_date} hint={v.due_date && v.due_date >= v.order_date ? `${formatDayWeek(v.due_date)}, ${relativeDay(v.due_date, now)}` : undefined}>
                {(p) => <Input {...p} type="date" value={v.due_date} min={v.order_date} onChange={(e) => set({ due_date: e.target.value })} className="figures" />}
              </Field>
            </div>
          </section>

          {/* items */}
          <section className="surface" aria-labelledby={`${ids}-items`}>
            <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
              <h2 id={`${ids}-items`} className="text-md font-semibold tracking-tight">
                Items
              </h2>
              <p className="mt-0.5 text-sm text-ink-2">Pick from your recipes so the cost and pantry use follow along, or add a custom item.</p>
            </header>
            <div className="px-4 pt-4 sm:px-5">
              <Combobox
                label="Add an item"
                placeholder="Add an item: search your recipes"
                options={menu}
                getKey={(r) => r.id}
                match={(r, needle) => r.name.toLowerCase().includes(needle) || (r.group ?? "").toLowerCase().includes(needle)}
                onPick={addRecipe}
                extra={{ label: "Custom item", onPick: addCustom }}
                render={(r) => (
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display font-semibold">{r.name}</span>
                      <span className="block truncate text-xs text-ink-2">
                        {r.yield_label}
                        {r.group ? ` · ${r.group}` : ""}
                      </span>
                    </span>
                    <span className="figures shrink-0 text-sm font-medium">{formatPeso(r.price)}</span>
                  </span>
                )}
              />
              {errors.items ? <p className="mt-2 text-xs font-medium text-rise">{errors.items}</p> : null}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-2 sm:px-5">Nothing on this order yet.</p>
            ) : (
              <ul className="mt-3 sep-t">
                {items.map((it, idx) => {
                  const r = it.recipe_id ? recipeById.get(it.recipe_id) : undefined;
                  const lineTotal = orZero(num(it.qty)) * orZero(num(it.unit_price));
                  const itemErr = errors[`items.${idx}.name`] ?? errors[`items.${idx}.qty`] ?? errors[`items.${idx}.unit_price`];
                  return (
                    <li
                      key={it.key}
                      className="sep-b grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_6.5rem_2.75rem] sm:px-5"
                    >
                      <div className="min-w-0 sm:order-1">
                        {it.recipe_id ? (
                          <>
                            <p className="font-display font-semibold [overflow-wrap:anywhere]">{it.name}</p>
                            <p className="text-xs text-ink-2">
                              {r ? `per ${r.yield_label}` : "Recipe was deleted"} · cost {formatPeso(it.unit_cost)} each
                            </p>
                            {order && r && order.status !== "done" && order.status !== "cancelled" ? (
                              <Link
                                href={`/bake/${r.id}?order=${order.id}`}
                                className="-ml-1 mt-1 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink underline-offset-4 hover:bg-accent-wash lg:h-9"
                              >
                                <ChefHat className="size-4 text-accent" aria-hidden />
                                Bake this
                                <span className="sr-only">: {r.name}, step by step</span>
                              </Link>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <label htmlFor={`${ids}-name-${it.key}`} className="sr-only">
                              Item name
                            </label>
                            <input
                              id={`${ids}-name-${it.key}`}
                              ref={(el) => {
                                if (el) nameRefs.current.set(it.key, el);
                                else nameRefs.current.delete(it.key);
                              }}
                              value={it.name}
                              onChange={(e) => setItem(it.key, idx, { name: e.target.value })}
                              placeholder="Custom item name"
                              aria-invalid={errors[`items.${idx}.name`] ? true : undefined}
                              className={inputClass("font-display font-semibold")}
                            />
                            <p className="mt-1 text-xs text-ink-2">Custom item · no recipe cost or pantry use</p>
                          </>
                        )}
                      </div>
                      <span className="figures self-start pt-0.5 text-right font-semibold sm:order-4 sm:self-center sm:pt-0">{formatPeso(lineTotal)}</span>
                      <button
                        type="button"
                        onClick={() => setItems((all) => all.filter((i) => i.key !== it.key))}
                        aria-label={`Remove ${it.name || "item"}`}
                        className="grid size-11 place-items-center self-start rounded-[var(--radius-surface)] text-ink-3 hover:bg-surface-2 hover:text-rise sm:order-5 sm:self-center"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                      <div className="col-span-3 flex items-center gap-2 sm:contents">
                        <div className="flex shrink-0 items-center sm:order-2" role="group" aria-label={`Quantity of ${it.name || "item"}`}>
                          <button
                            type="button"
                            onClick={() => step(it.key, idx, -1)}
                            disabled={orZero(num(it.qty)) <= 1}
                            aria-label="One less"
                            className="grid size-11 place-items-center rounded-full text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 disabled:text-ink-3 disabled:hover:bg-transparent"
                          >
                            <Minus className="size-4" aria-hidden />
                          </button>
                          <input
                            value={it.qty}
                            inputMode="decimal"
                            onChange={(e) => setItem(it.key, idx, { qty: e.target.value })}
                            aria-label="Quantity"
                            aria-invalid={errors[`items.${idx}.qty`] ? true : undefined}
                            className="figures h-11 w-11 rounded-[6px] bg-transparent text-center font-semibold focus:shadow-[inset_0_0_0_2px_var(--focus)] focus:outline-none aria-[invalid=true]:text-rise"
                          />
                          <button
                            type="button"
                            onClick={() => step(it.key, idx, 1)}
                            aria-label="One more"
                            className="grid size-11 place-items-center rounded-full bg-accent text-accent-ink hover:bg-accent-hover"
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1 sm:order-3 sm:flex-none">
                          <PesoInput
                            aria-label={`Price each for ${it.name || "item"}`}
                            aria-invalid={errors[`items.${idx}.unit_price`] ? true : undefined}
                            value={it.unit_price}
                            onChange={(unit_price) => setItem(it.key, idx, { unit_price })}
                          />
                        </div>
                      </div>
                      {itemErr ? <p className="col-span-full -mt-1 text-xs font-medium text-rise sm:order-6">{itemErr}</p> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!order ? <OrderDesign customer={v.customer} value={design} onChange={setDesign} /> : null}

          <section className="surface p-4 sm:p-5">
            <Field label="Notes" optional error={errors.notes}>
              {(p) => <Textarea {...p} value={v.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Dedication, pickup time, allergies, delivery address" />}
            </Field>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* totals */}
          <section className="surface p-4 sm:p-5" aria-labelledby={`${ids}-totals`}>
            <h2 id={`${ids}-totals`} className="text-md font-semibold tracking-tight">
              Totals
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Delivery fee" error={errors.delivery_fee}>
                {(p) => <PesoInput {...p} value={v.delivery_fee} onChange={(delivery_fee) => set({ delivery_fee })} />}
              </Field>
              <Field label="Discount" error={errors.discount}>
                {(p) => <PesoInput {...p} value={v.discount} onChange={(discount) => set({ discount })} />}
              </Field>
            </div>
            <div className="mt-4" aria-live="polite">
              <MoneyLine label="Subtotal" value={formatPeso(t.subtotal)} />
              <MoneyLine label="Delivery" value={formatPeso(orZero(payload.delivery_fee))} muted />
              <MoneyLine label="Discount" value={orZero(payload.discount) ? `−${formatPeso(orZero(payload.discount))}` : formatPeso(0)} muted />
              <MoneyLine label="Total" value={formatPeso(t.total)} strong />
              <MoneyLine label="Paid" value={formatPeso(t.paid)} muted />
              <div className={cx("mt-1 flex items-baseline justify-between gap-4 rounded-[8px] px-2 py-1.5 -mx-2", t.balance > 0.005 && "bg-rise-wash")}>
                <span className={cx("font-semibold", t.balance > 0.005 ? "text-rise" : "text-ink")}>{t.balance > 0.005 ? "Balance to collect" : t.balance < -0.005 ? "Overpaid" : "Balance"}</span>
                <span className={cx("figures font-semibold", t.balance > 0.005 ? "text-rise" : "text-ink")}>{formatPeso(Math.abs(t.balance))}</span>
              </div>
              <p className="figures mt-3 text-xs text-ink-2">
                Estimated profit {formatPesoSigned(t.profit)}
                {margin !== null ? ` · ${margin.toFixed(1)}% of cost` : ""} · cost {formatPeso(t.cost)}
                <span className="block">Sales after discount, less recipe cost. Delivery fees pass through.</span>
              </p>
            </div>
          </section>

          {/* payments */}
          <section className="surface" aria-labelledby={`${ids}-pay`}>
            <header className="sep-b flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id={`${ids}-pay`} className="text-md font-semibold tracking-tight">
                  Payments
                </h2>
                <p className="text-xs text-ink-2">These count as income on the day received.</p>
              </div>
              <Button size="sm" onClick={addPayment}>
                <Plus aria-hidden /> Record payment
              </Button>
            </header>
            {payments.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-2 sm:px-5">No payment yet. Record a deposit or the full amount when it comes in.</p>
            ) : (
              <ul>
                {payments.map((p, idx) => {
                  const err = errors[`payments.${idx}.amount`] ?? errors[`payments.${idx}.date`];
                  return (
                    <li key={p.id} className="sep-b grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 px-4 py-3 last:shadow-none sm:px-5">
                      <PesoInput aria-label="Amount received" aria-invalid={errors[`payments.${idx}.amount`] ? true : undefined} value={p.amount} onChange={(amount) => setPayment(p.id, idx, { amount })} />
                      <Select aria-label="Paid by" value={p.method} onChange={(e) => setPayment(p.id, idx, { method: e.target.value as PaymentMethod })}>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => setPayments((all) => all.filter((x) => x.id !== p.id))}
                        aria-label="Remove this payment"
                        className="grid size-11 place-items-center rounded-[var(--radius-surface)] text-ink-3 hover:bg-surface-2 hover:text-rise"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                      <Input
                        type="date"
                        aria-label="Date received"
                        aria-invalid={errors[`payments.${idx}.date`] ? true : undefined}
                        value={p.date}
                        onChange={(e) => setPayment(p.id, idx, { date: e.target.value })}
                        className="figures col-span-2"
                      />
                      {err ? <p className="col-span-full text-xs font-medium text-rise">{err}</p> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* status */}
          <section className="surface p-4 sm:p-5">
            <Field label="Status" error={errors.status} hint="Marking it done takes the ingredients out of the pantry">
              {(p) => (
                <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </section>

          {aside}
        </div>
      </div>

      {formError ? (
        <p role="alert" className="mt-5 rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
          {formError}
        </p>
      ) : null}

      <div className="sep-t sticky bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 -mx-4 mt-5 flex items-center gap-2 bg-ground px-4 py-3 sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0">
        {order ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label={`Delete order #${order.number}`} className="max-sm:w-11 max-sm:px-0">
            <Trash2 aria-hidden />
            <span className="max-sm:hidden">Delete</span>
          </Button>
        ) : null}
        <span className="figures mr-auto hidden text-sm text-ink-2 sm:inline">
          {items.length ? `${formatCount(items.reduce((s, i) => s + orZero(num(i.qty)), 0))} items · ${formatPeso(t.total)}` : ""}
        </span>
        <Button onClick={() => router.back()} className="max-lg:hidden">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" busy={pending} className="flex-1 sm:flex-none">
          {order ? "Save order" : "Add order"}
        </Button>
      </div>

      {order ? (
        <Sheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={`Delete order #${order.number}?`}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)} className="flex-1 lg:ml-auto lg:flex-none">
                Keep it
              </Button>
              <Button variant="danger" onClick={remove} busy={pending} className="flex-1 lg:flex-none">
                <Trash2 aria-hidden /> Delete order
              </Button>
            </>
          }
        >
          <p>
            {order.customer}&apos;s order and its {order.payments.length ? `${order.payments.length} payment${order.payments.length === 1 ? "" : "s"}` : "details"} will be removed.
            {order.payments.length ? " Those payments come off your income." : ""}
          </p>
          {order.status === "done" ? <p className="mt-2 text-sm text-ink-2">It was done, so the ingredients it took go back into the pantry.</p> : null}
        </Sheet>
      ) : null}
    </form>
  );
}

/* ---------- one-tap status actions on the detail page ---------- */

function StatusBar({ order }: { order: Order }) {
  const { change, busy } = useStatusChange();
  const actions: { to: OrderStatus; label: string; icon: ReactNode; variant: "primary" | "secondary" | "ghost" }[] =
    order.status === "pending"
      ? [
          { to: "baking", label: "Start baking", icon: <Flame aria-hidden />, variant: "secondary" },
          { to: "done", label: "Mark done", icon: <Check aria-hidden />, variant: "secondary" },
          { to: "cancelled", label: "Cancel order", icon: <X aria-hidden />, variant: "ghost" },
        ]
      : order.status === "baking"
        ? [
            { to: "done", label: "Mark done", icon: <Check aria-hidden />, variant: "secondary" },
            { to: "pending", label: "Back to to-do", icon: <RotateCcw aria-hidden />, variant: "ghost" },
            { to: "cancelled", label: "Cancel order", icon: <X aria-hidden />, variant: "ghost" },
          ]
        : order.status === "done"
          ? [{ to: "baking", label: "Reopen", icon: <RotateCcw aria-hidden />, variant: "secondary" }]
          : [{ to: "pending", label: "Reopen", icon: <RotateCcw aria-hidden />, variant: "secondary" }];
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto" role="group" aria-label={`Order is ${statusLabel(order.status).toLowerCase()}. Change status`}>
      {actions.map((a) => (
        <Button key={a.to} variant={a.variant} busy={busy === `${order.id}:${a.to}`} onClick={() => change(order, a.to)} className="max-sm:flex-1">
          {a.icon}
          {a.label}
        </Button>
      ))}
    </div>
  );
}
