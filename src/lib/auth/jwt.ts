import { SignJWT, jwtVerify } from "jose";

// Edge-safe (used by middleware): no Node APIs, no Prisma runtime.
// The token only proves identity; role, name and active status are read fresh from the DB (see session.ts).

export const SESSION_COOKIE = "fh_session";
export const SESSION_DAYS = 7;
// Readable by page scripts, unlike the session cookie. It only hints "this browser has signed in before",
// so public pages know to ask /api/session; it grants nothing by itself.
export const ADMIN_HINT_COOKIE = "sb_admin";

export interface SessionToken {
  adminId: string;
  ver: number; // must match Admin.sessionVersion, so bumping it revokes all of an admin's sessions
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(secret);
}

export function signSession(token: SessionToken): Promise<string> {
  return new SignJWT({ ver: token.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(token.adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.ver !== "number") return null;
    return { adminId: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}
