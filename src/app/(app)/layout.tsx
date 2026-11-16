import { LeaveGuardProvider } from "@/components/leave-guard";
import { Fab, Rail, TabBar, type NavCounts } from "@/components/nav";
import { ToastProvider } from "@/components/toast";
import { getRepo } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { signOut } from "../login/actions";

async function currentEmail() {
  if (isDemo) return null;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  return data.user?.email ?? null;
}

/** New website inquiries for the nav badge. Never lets a failed read break the app frame. */
async function navCounts(): Promise<NavCounts> {
  try {
    const web = await (await getRepo()).listWebOrders();
    return { "/inquiries": web.filter((w) => w.status === "new").length };
  } catch {
    return {};
  }
}

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const [email, counts] = await Promise.all([currentEmail(), navCounts()]);
  return (
    <ToastProvider>
      <LeaveGuardProvider>
        <Rail
          counts={counts}
          footer={
            isDemo ? null : (
              <form action={signOut} data-leaves className="flex flex-col gap-1">
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
        <TabBar counts={counts} />
        <Fab />
        {modal}
      </LeaveGuardProvider>
    </ToastProvider>
  );
}
