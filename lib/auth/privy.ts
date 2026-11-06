// Server-side Privy checks for protected routes. Reads PRIVY_APP_SECRET; never import from client code.
import { createRemoteJWKSet, jwtVerify } from "jose";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const appId = () => {
  const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!id) throw new HttpError(500, "NEXT_PUBLIC_PRIVY_APP_ID is not set");
  return id;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/** Verifies the Privy access token (Authorization: Bearer, or the privy-token cookie) and returns the Privy user ID. */
export async function requireUser(req: Request): Promise<string> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)privy-token=([^;]+)/)?.[1];
  const token = bearer || cookie;
  if (!token) throw new HttpError(401, "Not signed in");
  jwks ??= createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId()}/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: "privy.io", audience: appId() });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }
}

/** Confirms `address` is a wallet linked to this Privy user. */
export async function assertWalletOwner(userId: string, address: string): Promise<void> {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) throw new HttpError(500, "PRIVY_APP_SECRET is not set");
  const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(userId)}`, {
    headers: {
      authorization: `Basic ${Buffer.from(`${appId()}:${secret}`).toString("base64")}`,
      "privy-app-id": appId(),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new HttpError(502, "Could not load Privy user");
  const user = (await res.json()) as { linked_accounts?: { type: string; address?: string }[] };
  const owned = user.linked_accounts?.some(
    (a) => a.type === "wallet" && a.address?.toLowerCase() === address.toLowerCase(),
  );
  if (!owned) throw new HttpError(403, "Wallet does not belong to the signed-in user");
}

/** Wraps a route handler so HttpError and FlashError become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500;
      const message = e instanceof Error ? e.message : "Unexpected error";
      if (status >= 500) console.error(e);
      return Response.json({ error: message }, { status });
    }
  };
}
