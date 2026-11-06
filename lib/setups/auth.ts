// Shared-secret checks for the cron route (CRON_SECRET, sent by Supabase
// Cron) and the reviewer route (ADMIN_SECRET). Both expect
// `Authorization: Bearer <secret>`.

import { timingSafeEqual } from "node:crypto";

export function hasBearerSecret(request: Request, envName: "CRON_SECRET" | "ADMIN_SECRET"): boolean {
  const secret = process.env[envName];
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
