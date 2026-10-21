import { ToastProvider } from "@/components/toast";
import "./focus.css";

/**
 * Full-bleed kitchen screens (Bake mode): the pale pandan shell is the whole frame.
 * No rail, no tab bar, no sample banner: nothing to dismiss while baking.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="focus-shell min-h-dvh bg-shell text-shell-ink">{children}</div>
    </ToastProvider>
  );
}
