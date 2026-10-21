"use client";

import { X } from "@/components/icons";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  tone?: "default" | "error";
  action?: { label: string; onAction: () => void };
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        data-toasts
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex transition-[bottom] duration-200 motion-reduce:transition-none flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:items-end lg:pr-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, toast.action ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [onDone, toast.action]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-surface)] bg-shell py-2 pr-2 pl-4 text-sm text-shell-ink shadow-[var(--shadow-sheet)]"
    >
      <span className={toast.tone === "error" ? "mr-auto min-w-0 font-medium text-rise-on-shell" : "mr-auto min-w-0"}>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action!.onAction();
            onDone();
          }}
          className="h-9 shrink-0 rounded-[5px] px-3 font-semibold text-shell-ink underline-offset-4 hover:bg-shell-3 max-lg:h-11"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" onClick={onDone} aria-label="Dismiss" className="grid size-9 shrink-0 place-items-center rounded-[5px] text-shell-ink-2 hover:bg-shell-3 hover:text-shell-ink max-lg:size-11">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
