// notify-web-order: emails the owner about one new website inquiry, through Brevo.
//
// Called by the web_orders insert trigger (migration 0012) with { id }. It only
// ever emails a row that exists and hasn't been emailed yet (it claims the row by
// setting notified_at first), so calling it from anywhere else can't send
// anything new. Deployed with JWT verification off for that reason.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   BREVO_API_KEY       a Brevo API key (xkeysib-…); if unset, the 'brevo_api_key' Vault secret is used
//                       (migration 0013). With neither, the function does nothing.
//   NOTIFY_EMAIL_FROM   sender, verified or on an authenticated domain in Brevo (default info@kinkitchen.store)
//   NOTIFY_EMAIL_TO     who gets the email (default rerlasan@gmail.com)
//   CRM_URL             the CRM, for the button (default https://kin-kitchen-sigma.vercel.app)
//   SITE_URL            the website, for the logo (default https://www.kinkitchen.store)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

type Item = { name: string; category: string | null; qty: number; note: string | null };
type Inquiry = {
  id: string;
  created_at: string;
  kind: "basket" | "custom-cake" | "question";
  customer: string;
  phone: string | null;
  email: string | null;
  contact_pref: string | null;
  pickup_point: string | null;
  pickup_date: string | null;
  occasion: string | null;
  notes: string | null;
  items: Item[] | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const KIND: Record<Inquiry["kind"], { label: string; noun: string }> = {
  basket: { label: "Pre-order", noun: "pre-order" },
  "custom-cake": { label: "Cake request", noun: "cake request" },
  question: { label: "Question", noun: "question" },
};

const TZ = "Asia/Manila";
const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });

/* Palette from the website: chocolate, oat, butter, cocoa ink and muted. */
const C = { ink: "#2e2219", muted: "#6b5a4c", choc: "#543c2a", oat: "#efe7da", panel: "#f8f2e9", butter: "#f6ecdb", line: "#e6dccd", white: "#ffffff" };
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

function render(w: Inquiry, crmUrl: string, siteUrl: string) {
  const kind = KIND[w.kind] ?? { label: "Inquiry", noun: "inquiry" };
  const subject = `New ${kind.noun} from ${w.customer}`;
  const items = Array.isArray(w.items) ? w.items : [];
  const link = `${crmUrl.replace(/\/$/, "")}/inquiries`;
  const logo = `${siteUrl.replace(/\/$/, "")}/images/kin-monogram.png`;
  const tel = w.phone ? `tel:${w.phone.replace(/[^\d+]/g, "")}` : null;

  // [label, plain value, html value]
  const facts: [string, string, string][] = [];
  if (w.phone) facts.push(["Mobile", w.phone, `<a href="${esc(tel!)}" style="color:${C.ink};text-decoration:underline">${esc(w.phone)}</a>`]);
  if (w.email) facts.push(["Email", w.email, `<a href="mailto:${esc(w.email)}" style="color:${C.ink};text-decoration:underline">${esc(w.email)}</a>`]);
  if (w.contact_pref) facts.push(["Reply by", w.contact_pref, esc(w.contact_pref)]);
  if (w.pickup_point) facts.push(["Pick-up", w.pickup_point, esc(w.pickup_point)]);
  if (w.pickup_date) facts.push([w.kind === "custom-cake" ? "Date" : "Pick-up date", day(w.pickup_date), esc(day(w.pickup_date))]);
  if (w.occasion) facts.push(["Occasion", w.occasion, esc(w.occasion)]);
  const details = facts.map(([k, , html]) => [k, html] as [string, string]);

  const text = [
    subject,
    `Received ${stamp(w.created_at)}`,
    "",
    ...facts.map(([k, plain]) => `${k}: ${plain}`),
    ...(items.length ? ["", "Items:", ...items.map((i) => `- ${i.qty} x ${i.name}${i.note ? ` (${i.note})` : ""}`)] : []),
    ...(w.notes ? ["", w.kind === "question" ? "Question:" : "Notes:", w.notes] : []),
    "",
    `Open it in the CRM: ${link}`,
  ].join("\n");

  const label = (s: string) =>
    `<p style="margin:0 0 10px;font:600 12px/1.4 ${SANS};letter-spacing:.04em;text-transform:uppercase;color:${C.muted}">${s}</p>`;
  const section = (inner: string) => `<tr><td style="padding:0 32px 28px">${inner}</td></tr>`;

  const detailRows = details
    .map(
      ([k, v], n) => `<tr>
<td style="padding:10px 0;${n ? `border-top:1px solid ${C.line};` : ""}width:112px;vertical-align:top;font:400 14px/1.5 ${SANS};color:${C.muted}">${esc(k)}</td>
<td style="padding:10px 0;${n ? `border-top:1px solid ${C.line};` : ""}vertical-align:top;font:500 15px/1.5 ${SANS};color:${C.ink}">${v}</td>
</tr>`,
    )
    .join("");

  const itemRows = items
    .map(
      (i, n) => `<tr>
<td style="padding:12px 0;${n ? `border-top:1px solid ${C.line};` : ""}width:44px;vertical-align:top;font:600 15px/1.5 ${SANS};color:${C.choc}">${i.qty}&times;</td>
<td style="padding:12px 0;${n ? `border-top:1px solid ${C.line};` : ""}vertical-align:top;font:500 15px/1.5 ${SANS};color:${C.ink}">${esc(i.name)}${
        i.category ? `<br><span style="font-weight:400;font-size:13px;color:${C.muted}">${esc(i.category)}${i.note ? ` &middot; ${esc(i.note)}` : ""}</span>` : i.note ? `<br><span style="font-weight:400;font-size:13px;color:${C.muted}">${esc(i.note)}</span>` : ""
      }</td>
</tr>`,
    )
    .join("");

  const button = (href: string, text: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 24px;border-radius:999px;font:600 15px/1 ${SANS};text-decoration:none;${
      primary ? `background:${C.choc};color:${C.white};border:1px solid ${C.choc}` : `background:${C.white};color:${C.ink};border:1px solid ${C.line}`
    }">${text}</a>`;
  const replyHref = w.email
    ? `mailto:${w.email}?subject=${encodeURIComponent(`Your ${kind.noun} with Kin Kitchen`)}`
    : tel;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.oat}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(
    [kind.label, w.pickup_date ? day(w.pickup_date) : "", items.length ? `${items.reduce((s, i) => s + i.qty, 0)} item(s)` : "", w.notes?.slice(0, 80) ?? ""].filter(Boolean).join(" · "),
  )}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.oat}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 20px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${esc(logo)}" width="44" height="34" alt="" style="display:block;border:0"></td>
    <td style="vertical-align:middle;padding-left:10px;font:500 15px/1.15 ${SANS};color:${C.choc}">Kin<br>Kitchen</td>
  </tr></table>
</td></tr>
<tr><td style="background:${C.white};border-radius:20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 32px 24px">
  <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${C.butter};font:600 13px/1.2 ${SANS};color:${C.choc}">${esc(kind.label)}</span>
  <h1 style="margin:14px 0 6px;font:400 28px/1.2 ${SERIF};color:${C.ink}">${esc(w.customer)}</h1>
  <p style="margin:0;font:400 14px/1.5 ${SANS};color:${C.muted}">Sent from your website &middot; ${esc(stamp(w.created_at))}</p>
</td></tr>
${details.length ? section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>`) : ""}
${items.length ? section(`${label("What they'd like")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>`) : ""}
${
  w.notes
    ? section(
        `${label(w.kind === "question" ? "Their question" : "Their note")}<div style="padding:16px 18px;border-radius:12px;background:${C.panel};font:400 15px/1.6 ${SANS};color:${C.ink};white-space:pre-line">${esc(w.notes)}</div>`,
      )
    : ""
}
<tr><td style="padding:4px 32px 26px">${button(link, "Open in the CRM", true)}${replyHref ? button(replyHref, w.email ? "Reply by email" : "Call them", false) : ""}</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 8px 0;font:400 12px/1.6 ${SANS};color:${C.muted}">Sent automatically when someone sends the order form on ${esc(siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))}. ${
    w.email ? "Replying to this email goes straight to the customer." : "They didn't leave an email, so reply by phone or message."
  }</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = body?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Send { id } of a web_orders row" }, 400);

  const to = Deno.env.get("NOTIFY_EMAIL_TO") || "rerlasan@gmail.com";
  const from = Deno.env.get("NOTIFY_EMAIL_FROM") || "info@kinkitchen.store";
  const crmUrl = Deno.env.get("CRM_URL") || "https://kin-kitchen-sigma.vercel.app";
  const siteUrl = Deno.env.get("SITE_URL") || "https://www.kinkitchen.store";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // The function secret wins; otherwise the key kept in Vault (migration 0013).
  let apiKey = Deno.env.get("BREVO_API_KEY") || "";
  if (!apiKey) {
    const { data } = await db.rpc("brevo_api_key");
    apiKey = typeof data === "string" ? data : "";
  }
  if (!apiKey) return json({ skipped: "No Brevo API key: set BREVO_API_KEY or the brevo_api_key Vault secret" });

  // Claim the row: only the first call for an un-emailed inquiry gets it back.
  const { data: row, error } = await db
    .from("web_orders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("*")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!row) return json({ skipped: "not found or already emailed" });

  const w = row as Inquiry;
  const { subject, text, html } = render(w, crmUrl, siteUrl);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Kin Kitchen", email: from },
      to: [{ email: to }],
      ...(w.email ? { replyTo: { email: w.email, name: w.customer.slice(0, 70) } } : {}),
      subject,
      textContent: text,
      htmlContent: html,
      tags: ["website-inquiry"],
    }),
  });

  if (!res.ok) {
    // Release the claim so a later call can retry.
    await db.from("web_orders").update({ notified_at: null }).eq("id", id);
    const detail = await res.text().catch(() => "");
    console.error(`Brevo answered ${res.status}: ${detail}`);
    return json({ error: `Brevo answered ${res.status}`, detail }, 502);
  }
  return json({ sent: true });
});
