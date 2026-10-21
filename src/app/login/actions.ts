"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemo } from "@/lib/env";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const emailSchema = z.email("Enter a valid email address");

/** Accounts made with a bare username live under this internal domain; it never receives mail. */
const USERNAME_DOMAIN = "kinkitchen.local";

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (isDemo) redirect("/");
  const login = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const isUsername = login !== "" && !login.includes("@");
  if (isUsername && !password) {
    return { status: "error", message: "Enter your password to log in with a username, or use your email for a sign-in link.", email: login };
  }
  const email = isUsername ? `${login.toLowerCase()}@${USERNAME_DOMAIN}` : login;
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message, email: login };

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  if (password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: "That login and password don't match. Try again or use a sign-in link.", email: login };
    redirect("/");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { status: "error", message: `Couldn't send the link: ${error.message}`, email };
  return { status: "sent", email };
}

export async function signOut() {
  if (!isDemo) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await (await createSupabaseServerClient()).auth.signOut();
  }
  redirect("/login");
}
