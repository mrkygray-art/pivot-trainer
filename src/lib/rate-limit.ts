// Per-visitor limits for the public demo. Counts live in memory on each server
// instance (no database, nothing about the visitor is kept), so this is a first
// line of defense; the hard ceiling is the spend limit on the production API key.
import { RequestError } from "./api";

const LIMITS = {
  build: { max: 5, windowMs: 60 * 60 * 1000, message: "This demo builds up to 5 trainings an hour per visitor. Please try again a little later." },
  assist: { max: 40, windowMs: 60 * 60 * 1000, message: "You've reached this demo's hourly limit. Please try again a little later." },
} as const;

export type LimitKind = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

function visitorId(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

// Throws a 429 RequestError when the visitor is over the limit for this kind of call.
export function checkRateLimit(req: Request, kind: LimitKind) {
  const { max, windowMs, message } = LIMITS[kind];
  const key = `${kind}:${visitorId(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new RequestError(message, 429);
  recent.push(now);
  hits.set(key, recent);

  // Keep the map small on long-lived instances.
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k);
  }
}
