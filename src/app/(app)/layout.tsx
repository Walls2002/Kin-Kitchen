import { Fab, Rail, TabBar } from "@/components/nav";
import { ToastProvider } from "@/components/toast";
import { isDemo } from "@/lib/env";
import { signOut } from "../login/actions";

async function currentEmail() {
  if (isDemo) return null;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  return data.user?.email ?? null;
}

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const email = await currentEmail();
  return (
    <ToastProvider>
      <Rail
        footer={
          isDemo ? null : (
            <form action={signOut} className="flex flex-col gap-1">
              <span className="truncate">{email}</span>
              <button className="w-fit text-shell-ink underline decoration-shell-3 underline-offset-4 hover:decoration-shell-ink">Log out</button>
            </form>
          )
        }
      />
      <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+4rem)] lg:pb-0 lg:pl-60">
        {isDemo ? (
          <p className="bg-shell-2 px-4 py-2 text-center text-xs text-shell-ink lg:text-sm">
            <span className="font-semibold">Sample data.</span> Connect Supabase to keep your own pantry, orders and money.
          </p>
        ) : null}
        <main className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">{children}</main>
      </div>
      <TabBar />
      <Fab />
      {modal}
    </ToastProvider>
  );
}
