import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

type NewRequest = { artistId: string; artistName: string; contactName: string; idea: string };

/**
 * Emails the artist about a new sketch request through Resend.
 * Without RESEND_API_KEY it only logs, so local development needs no mail setup.
 */
export async function notifyNewRequest(r: NewRequest) {
  const { data } = await createAdminClient().auth.admin.getUserById(r.artistId);
  const to = data.user?.email;
  if (!to) return;

  const link = `${siteUrl()}/dashboard/requests`;
  const subject = `New sketch request from ${r.contactName}`;
  const preview = r.idea.length > 280 ? `${r.idea.slice(0, 280)}…` : r.idea;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[notify] ${to}: ${subject}\n${preview}\n${link}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "Kvali <hello@kvali.ink>",
      to,
      subject,
      text: `${r.artistName}, you have a new sketch request on Kvali.\n\n"${preview}"\n\nOpen your inbox: ${link}`,
    }),
  });
  if (!res.ok) console.error(`[notify] Resend ${res.status}: ${await res.text()}`);
}
