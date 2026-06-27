import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { ConflictError, NotFoundError } from "./errors";

/** Standard JSON success response. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Standard JSON error response (never leaks internal details). */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Guard for all /api/cms/* routes. Returns the session if authenticated,
 * otherwise a 401 response to return immediately.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, response: fail("Unauthorized", 401) };
  }
  return { session, response: null };
}

/**
 * Wrap a route handler with auth + uniform error handling so individual
 * routes stay small and never expose raw DB errors to the client.
 */
export function handler(
  fn: (ctx: { req: Request; params: Record<string, string> }) => Promise<Response>
) {
  return async (req: Request, context: { params: Promise<Record<string, string>> }) => {
    const { response: authError } = await requireSession();
    if (authError) return authError;

    try {
      const params = (await context?.params) ?? {};
      return await fn({ req, params });
    } catch (err) {
      if (err instanceof ZodError) {
        return fail("Validation failed", 422, err.flatten());
      }
      if (err instanceof NotFoundError) {
        return fail(err.message, 404);
      }
      if (err instanceof ConflictError) {
        return fail(err.message, 409);
      }
      console.error("[cms] route error:", err);
      return fail("Something went wrong", 500);
    }
  };
}

export { ConflictError, NotFoundError } from "./errors";
