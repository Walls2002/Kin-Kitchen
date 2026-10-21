"use client";

import { Check, ChevronRight, ClipboardList, Pencil, Plus, Repeat, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { deleteTask, markTask, saveTask } from "@/lib/biz-actions";
import { daysBetween, taskState, today, type TaskBucket } from "@/lib/biz";
import { formatDayWeek, relativeDay } from "@/lib/format";
import { TASK_AREAS, type Task, type TaskRepeat } from "@/lib/types";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Field, Input, Segmented, Select, Textarea, cx } from "./ui";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface DueOrder {
  id: string;
  number: number;
  customer: string;
  due_date: string;
  summary: string;
  status: string;
}

/** Ticking a task off, with an optimistic tick and an undo toast. */
function useTaskMarks() {
  const toast = useToast();
  const [, start] = useTransition();
  const [marks, setMarks] = useState<Record<string, string | null>>({});
  const doneOn = (t: Task) => (t.id in marks ? marks[t.id] : t.done_on);
  const toggle = (t: Task, done: boolean, restore?: string | null) => {
    const prev = doneOn(t);
    setMarks((m) => ({ ...m, [t.id]: restore !== undefined ? restore : done ? today() : null }));
    start(async () => {
      const res = await markTask(t.id, done, restore);
      if (!res.ok) {
        setMarks((m) => ({ ...m, [t.id]: prev }));
        toast({ message: `Couldn't update the task. ${res.error}`, tone: "error" });
        return;
      }
      if (restore !== undefined) return;
      toast({ message: done ? `Done: ${t.title}` : `Back on the list: ${t.title}`, action: { label: "Undo", onAction: () => toggle(t, !done, prev) } });
    });
  };
  return { doneOn, toggle };
}

function repeatText(t: Task) {
  if (t.repeat === "daily") return "Every day";
  if (t.repeat === "weekly") return `Every ${WEEKDAYS[t.weekday ?? 1]}`;
  return null;
}

function TaskRow({ task, now, done, onToggle, onEdit, compact }: { task: Task; now: string; done: boolean; onToggle: () => void; onEdit?: () => void; compact?: boolean }) {
  const st = taskState({ ...task }, now);
  const rep = repeatText(task);
  const late = !done && st.overdue && st.dueOn ? daysBetween(st.dueOn, now) : 0;
  return (
    <li className={cx("group flex items-start gap-1", !compact && "sep-t first:sep-none")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={onToggle}
        className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-surface)] hover:bg-surface-2"
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
      >
        <span
          className={cx(
            "grid size-[22px] place-items-center rounded-[6px] transition-colors duration-150",
            done ? "bg-accent text-accent-ink" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--line-strong)] group-hover:shadow-[inset_0_0_0_1.5px_var(--ink-3)]",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-2.5">
        <p className={cx("leading-snug", done ? "text-ink-3 line-through decoration-1" : "text-ink")}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
          <span>{task.area}</span>
          {rep ? (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3" aria-hidden />
              {rep}
            </span>
          ) : null}
          {late > 0 ? (
            <span className="font-semibold text-rise">{late === 1 ? "1 day late" : `${late} days late`}</span>
          ) : task.repeat === "none" && st.dueOn && !done ? (
            <span className="figures">{st.bucket === "later" ? formatDayWeek(st.dueOn) : relativeDay(st.dueOn, now)}</span>
          ) : task.repeat === "weekly" && st.dueOn && st.dueOn !== now && !done ? (
            <span>{relativeDay(st.dueOn, now)}</span>
          ) : null}
        </p>
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} aria-label={`Edit "${task.title}"`} className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-[var(--radius-surface)] text-ink-3 hover:bg-surface-2 hover:text-ink">
          <Pencil className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

/* ---------- editing ---------- */

interface Draft {
  title: string;
  area: string;
  repeat: TaskRepeat;
  due_date: string;
  weekday: string;
  notes: string;
}

const toDraft = (t?: Task): Draft => ({
  title: t?.title ?? "",
  area: t?.area ?? "Baking",
  repeat: t?.repeat ?? "none",
  due_date: t?.due_date ?? "",
  weekday: String(t?.weekday ?? 1),
  notes: t?.notes ?? "",
});

function TaskSheet({ open, task, onClose }: { open: boolean; task: Task | null; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState<Draft>(toDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = useId();
  useEffect(() => {
    if (open) {
      setV(toDraft(task ?? undefined));
      setErrors({});
    }
  }, [open, task]);

  const input = (d: Draft, base?: Task) => ({
    title: d.title,
    area: d.area,
    repeat: d.repeat,
    due_date: d.repeat === "none" && d.due_date ? d.due_date : null,
    weekday: d.repeat === "weekly" ? Number(d.weekday) : null,
    done_on: base?.done_on ?? null,
    notes: d.notes,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveTask(task?.id ?? null, input(v, task ?? undefined));
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { title: res.error });
        return;
      }
      toast({ message: task ? "Saved the task" : `Added: ${v.title.trim()}` });
      onClose();
    });
  };

  const remove = () => {
    if (!task) return;
    start(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) return toast({ message: res.error, tone: "error" });
      onClose();
      toast({
        message: `Deleted: ${task.title}`,
        action: { label: "Undo", onAction: () => void saveTask(null, input(toDraft(task), task)) },
      });
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "Add a task"}
      width="max-w-lg"
      footer={
        <>
          {task ? (
            <Button variant="ghost" onClick={remove} className="text-rise! hover:bg-rise-wash!">
              <Trash2 aria-hidden /> Delete
            </Button>
          ) : null}
          <Button type="submit" form={formId} variant="primary" busy={pending} className="ml-auto flex-1 lg:flex-none">
            {task ? "Save task" : "Add task"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="What needs doing" error={errors.title}>
          {(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. Buy cake boxes" autoFocus={!task} autoComplete="off" />}
        </Field>
        <Field label="Area">
          {(p) => (
            <Select {...p} value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })}>
              {TASK_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Repeats</span>
          <Segmented
            label="Repeats"
            block
            value={v.repeat}
            onChange={(repeat) => setV({ ...v, repeat })}
            options={[
              { value: "none", label: "Once" },
              { value: "daily", label: "Every day" },
              { value: "weekly", label: "Every week" },
            ]}
          />
        </div>
        {v.repeat === "none" ? (
          <Field label="Due" optional hint="Leave empty for someday" error={errors.due_date}>
            {(p) => <Input {...p} type="date" value={v.due_date} onChange={(e) => setV({ ...v, due_date: e.target.value })} />}
          </Field>
        ) : v.repeat === "weekly" ? (
          <Field label="On">
            {(p) => (
              <Select {...p} value={v.weekday} onChange={(e) => setV({ ...v, weekday: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAYS[d]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <p className="text-sm text-ink-2">It comes back unticked every morning.</p>
        )}
        <Field label="Notes" optional>
          {(p) => <Textarea {...p} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}
        </Field>
      </form>
    </Sheet>
  );
}

/* ---------- the full task page ---------- */

const BUCKETS: { key: TaskBucket; title: string; empty: string }[] = [
  { key: "today", title: "Today", empty: "Nothing left for today." },
  { key: "week", title: "Later this week", empty: "Nothing else this week." },
  { key: "later", title: "Later and someday", empty: "No later tasks." },
];

export function TaskBoard({ tasks, orders, now }: { tasks: Task[]; orders: DueOrder[]; now: string }) {
  const { doneOn, toggle } = useTaskMarks();
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const [area, setArea] = useState("");
  // ?add=1 (the phone's floating Add) opens the sheet, also when already on /tasks.
  const addParam = useSearchParams().get("add") === "1";
  useEffect(() => {
    if (!addParam) return;
    setAdding(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, [addParam]);

  const live = useMemo(() => tasks.map((t) => ({ ...t, done_on: doneOn(t) })), [tasks, doneOn]);
  const shown = live.filter((t) => !area || t.area === area);
  const byBucket = (b: TaskBucket) =>
    shown
      .map((t) => ({ t, st: taskState(t, now) }))
      .filter((x) => x.st.bucket === b)
      .sort((a, z) => Number(z.st.overdue) - Number(a.st.overdue) || (a.st.dueOn ?? "9999").localeCompare(z.st.dueOn ?? "9999") || a.t.title.localeCompare(z.t.title));
  const done = byBucket("done");
  const leftToday = byBucket("today").length;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => setAdding(true)} className="max-lg:hidden">
          <Plus aria-hidden /> Add a task
        </Button>
        <label htmlFor="task-area" className="sr-only">
          Area
        </label>
        <Select id="task-area" value={area} onChange={(e) => setArea(e.target.value)} className="w-44">
          <option value="">All areas</option>
          {TASK_AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <p className="figures text-sm text-ink-2" aria-live="polite">
          {leftToday === 0 ? "All done for today" : `${leftToday} left today`} · {done.length} done
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          {BUCKETS.map((b) => {
            const rows = byBucket(b.key);
            return (
              <section key={b.key} className="surface px-2 pt-3 pb-1 sm:px-3" aria-labelledby={`b-${b.key}`}>
                <h2 id={`b-${b.key}`} className="flex items-baseline justify-between px-2 pb-1 text-md font-semibold tracking-tight">
                  {b.title}
                  <span className="figures text-sm font-normal text-ink-2">{rows.length}</span>
                </h2>
                {rows.length ? (
                  <ul>
                    {rows.map(({ t }) => (
                      <TaskRow key={t.id} task={t} now={now} done={false} onToggle={() => toggle(t, true)} onEdit={() => setEditing(t)} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 pt-1 pb-4 text-sm text-ink-2">{b.empty}</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:gap-5">
          <section className="surface px-2 pt-3 pb-1 sm:px-3" aria-labelledby="b-orders">
            <h2 id="b-orders" className="px-2 pb-1 text-md font-semibold tracking-tight">
              Orders to get ready
            </h2>
            <p className="px-2 pb-2 text-sm text-ink-2">Due today and tomorrow, from Orders.</p>
            {orders.length ? (
              <ul>
                {orders.map((o) => (
                  <li key={o.id} className="sep-t">
                    <Link href={`/orders/${o.id}`} className="flex min-h-14 items-center gap-3 rounded-[var(--radius-surface)] px-2 py-2.5 hover:bg-surface-2">
                      <ClipboardList className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          <span className="figures text-ink-2">#{o.number}</span> <span className="font-medium">{o.customer}</span>
                        </span>
                        <span className="block truncate text-xs text-ink-2">{o.summary}</span>
                      </span>
                      <span className="text-xs whitespace-nowrap text-ink-2">{relativeDay(o.due_date, now)}</span>
                      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 pb-4 text-sm text-ink-2">No orders due today or tomorrow.</p>
            )}
          </section>

          <details className="surface group px-2 py-1 sm:px-3" open={done.length > 0 && done.length < 6}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-2 text-md font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <ChevronRight className="size-4 text-ink-2 transition-transform duration-150 group-open:rotate-90" aria-hidden />
                Done
              </span>
              <span className="figures text-sm font-normal text-ink-2">{done.length}</span>
            </summary>
            {done.length ? (
              <ul className="pb-1">
                {done.map(({ t }) => (
                  <TaskRow key={t.id} task={t} now={now} done onToggle={() => toggle(t, false)} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            ) : (
              <p className="px-2 pb-4 text-sm text-ink-2">Ticked tasks land here. Daily ones come back tomorrow.</p>
            )}
          </details>
        </div>
      </div>

      <TaskSheet open={adding || !!editing} task={editing} onClose={() => (setAdding(false), setEditing(null))} />
    </>
  );
}

/* ---------- compact list for Today ---------- */

export function TodayTasks({ tasks, now }: { tasks: Task[]; now: string }) {
  const { doneOn, toggle } = useTaskMarks();
  // Keep a task on screen after it's ticked so the tick (and undo) stays visible.
  const seen = useRef(new Set<string>());
  const rows = tasks
    .map((t) => ({ ...t, done_on: doneOn(t) }))
    .filter((t) => {
      const st = taskState(t, now);
      const keep = st.bucket === "today" || (st.done && seen.current.has(t.id));
      if (st.bucket === "today") seen.current.add(t.id);
      return keep;
    })
    .sort((a, z) => Number(taskState(z, now).overdue) - Number(taskState(a, now).overdue));
  if (!rows.length) return <p className="px-2 pt-1 pb-4 text-sm text-ink-2">Nothing left for today.</p>;
  return (
    <ul>
      {rows.map((t) => {
        const isDone = taskState(t, now).done;
        return <TaskRow key={t.id} task={t} now={now} done={isDone} onToggle={() => toggle(t, !isDone)} />;
      })}
    </ul>
  );
}
