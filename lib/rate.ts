import "server-only";
import { HttpError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

/** Throws 429 once `key` has made `max` calls to `bucket` within `window` (a Postgres interval). */
export async function limit(bucket: string, key: string, max: number, window: string) {
  const { data, error } = await createAdminClient().rpc("hit_rate", {
    p_bucket: bucket,
    p_key: key,
    p_max: max,
    p_window: window,
  });
  if (error) throw new Error(error.message);
  if (data === false) throw new HttpError(429, "Too many requests, try again later");
}
