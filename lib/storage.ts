import "server-only";
import { supabaseUrl } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

// Raw uploads land in the private "incoming" bucket through signed upload URLs.
// Artists' files live under art/<user id>/, visitors' reference images under ref/.
export type UploadKind = "work" | "avatar" | "reference";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function incomingPrefix(kind: UploadKind, userId: string | null) {
  return kind === "reference" ? "ref" : `art/${userId}`;
}

export async function createUploadTicket(kind: UploadKind, userId: string | null) {
  const path = `${incomingPrefix(kind, userId)}/${crypto.randomUUID()}`;
  const { data, error } = await createAdminClient().storage.from("incoming").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");
  return { bucket: "incoming", path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/** Downloads a raw upload after checking it belongs to `prefix`. */
export async function readIncoming(path: string, prefix: string): Promise<Buffer> {
  if (!new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${UUID}$`).test(path)) {
    throw new HttpError(422, "Unknown upload");
  }
  const { data, error } = await createAdminClient().storage.from("incoming").download(path);
  if (error || !data) throw new HttpError(422, "Upload not found; upload the file first");
  return Buffer.from(await data.arrayBuffer());
}

export async function removeIncoming(paths: string[]) {
  if (paths.length) await createAdminClient().storage.from("incoming").remove(paths);
}

export async function put(bucket: string, path: string, data: Buffer) {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, data, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
}

export async function remove(bucket: string, paths: string[]) {
  if (paths.length) await createAdminClient().storage.from(bucket).remove(paths);
}

export function publicUrl(bucket: "works" | "avatars", path: string | null): string | null {
  return path ? `${supabaseUrl()}/storage/v1/object/public/${bucket}/${path}` : null;
}

/** Short-lived links to a request's reference images, for the artist's inbox. */
export async function signedReferenceUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await createAdminClient().storage.from("references").createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  return data.map((d) => d.signedUrl).filter(Boolean) as string[];
}
