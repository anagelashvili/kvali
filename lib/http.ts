import "server-only";
import { createHash } from "node:crypto";
import { z, type ZodType } from "zod";
import { getUser } from "@/lib/supabase/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Wraps a route handler so thrown HttpErrors and Postgres errors become JSON responses. */
export function route<C>(handler: (request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json({ error: error.message, details: error.details }, { status: error.status });
      }
      console.error(error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function readBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
  return parse(raw, schema);
}

export function parse<T>(raw: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(422, "Invalid input", z.flattenError(result.error).fieldErrors);
  return result.data;
}

type PgError = { code?: string; message: string; details?: string | null } | null;

/** Turns a Supabase/Postgres error into the matching HTTP error. */
export function check(error: PgError, what = "Request"): void {
  if (!error) return;
  switch (error.code) {
    case "23505":
      throw new HttpError(409, `${what} already exists`, error.details);
    case "23503":
    case "23514":
    case "22P02":
      throw new HttpError(422, "Invalid input", error.message);
    case "42501":
      throw new HttpError(403, "Not allowed");
    case "PGRST116":
      throw new HttpError(404, `${what} not found`);
  }
  throw new Error(error.message);
}

export async function requireUser() {
  const { supabase, user } = await getUser();
  if (!user) throw new HttpError(401, "Sign in required");
  return { supabase, user };
}

/** Signed-in user who has already created an artist profile. */
export async function requireArtist() {
  const { supabase, user } = await requireUser();
  const { data: artist, error } = await supabase.from("artists").select("*").eq("id", user.id).maybeSingle();
  check(error);
  if (!artist) throw new HttpError(409, "Create your artist profile first");
  return { supabase, user, artist };
}

/** Hashed client IP for rate limiting; the raw IP is never stored. */
export function clientKey(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT ?? "kvali"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}
