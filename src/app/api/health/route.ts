import { isDemo, supabaseAnonKey, supabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Keep-alive target: a scheduled ping here touches Supabase so the free project doesn't pause. */
export async function GET() {
  if (isDemo) return Response.json({ ok: true, mode: "demo" });
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/ping`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  return Response.json({ ok: res.ok, mode: "supabase" }, { status: res.ok ? 200 : 503 });
}
