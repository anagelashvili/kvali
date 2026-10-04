import { createClient } from "@supabase/supabase-js";

// Browser client, used only to upload files to signed upload URLs.
let client: ReturnType<typeof createClient> | null = null;

export function browserStorage() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  return client.storage;
}

/** Gets a ticket from /api/uploads and uploads the file straight to storage; returns its path. */
export async function uploadFile(kind: "work" | "avatar" | "reference", file: File): Promise<string> {
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  const ticket = await res.json();
  if (!res.ok) throw new Error(ticket.error ?? "Upload failed");
  const { error } = await browserStorage()
    .from("incoming")
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  if (error) throw new Error(error.message.includes("mime") ? "Use a JPEG, PNG or WebP image" : "Upload failed");
  return ticket.path;
}
