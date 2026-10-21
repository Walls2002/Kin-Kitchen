"use client";

import { MailCheck } from "@/components/icons";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { status: "idle" });
  const [usePassword, setUsePassword] = useState(false);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <MailCheck className="size-7 text-accent" strokeWidth={1.8} aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">Check your email</h2>
        <p className="text-ink-2">
          We sent a sign-in link to <span className="font-medium text-ink">{state.email}</span>. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email or username" error={state.status === "error" && !usePassword ? state.message : undefined}>
        {(p) => <Input {...p} name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required defaultValue={state.email} placeholder="you@example.com" />}
      </Field>
      {usePassword ? (
        <Field label="Password" error={state.status === "error" ? state.message : undefined}>
          {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}
        </Field>
      ) : null}
      <Button type="submit" variant="primary" size="lg" busy={pending} className="w-full">
        {usePassword ? "Log in" : "Email me a sign-in link"}
      </Button>
      <button type="button" onClick={() => setUsePassword((v) => !v)} className="h-11 text-sm font-medium text-accent underline-offset-4 hover:underline">
        {usePassword ? "Use a sign-in link instead" : "Use a password instead"}
      </button>
    </form>
  );
}
