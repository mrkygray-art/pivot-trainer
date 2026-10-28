import { ClaudeError } from "./claude";

// A problem with what the browser sent; shown to the user as-is.
export class RequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof ClaudeError || err instanceof RequestError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong on the server." }, { status: 500 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function cleanRequest(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, 500);
  return v.length >= 3 ? v : null;
}
