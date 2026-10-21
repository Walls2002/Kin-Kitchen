import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/mark";
import { buttonClass } from "@/components/ui";
import { isDemo } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-shell px-4 py-10 [--mark-ink:var(--shell)]">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-2.5 text-shell-ink">
          <Mark className="size-8" />
          <span className="text-lg font-semibold tracking-tight">Kin Kitchen</span>
        </div>
        <div className="rounded-[16px] bg-surface px-6 pt-7 pb-8 sm:px-8">
          <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
          <p className="mt-1 mb-6 text-ink-2">Your pantry, recipes, orders and money.</p>
          {error ? (
            <p role="alert" className="mb-4 rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
              That sign-in link expired or was already used. Request a new one.
            </p>
          ) : null}
          {isDemo ? (
            <div className="flex flex-col gap-4">
              <p className="text-ink-2">
                Supabase isn&apos;t connected yet, so Kin Kitchen is running on sample data. Add your project keys to{" "}
                <code className="figures text-sm text-ink">.env.local</code> to log in for real.
              </p>
              <Link href="/" className={buttonClass("primary", "lg", "w-full")}>
                Open the sample kitchen
              </Link>
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </main>
  );
}
