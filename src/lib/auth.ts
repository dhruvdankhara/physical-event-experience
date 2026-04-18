import { SignJWT, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

export type AppRole = "ATTENDEE" | "STAFF" | "ADMIN";

export type SessionTokenClaims = {
  sub: string;
  email: string;
  role: AppRole;
  name: string;
};

export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 8;

export function resolveAuthCookieName() {
  const configuredName = process.env.AUTH_COOKIE_NAME?.trim();

  return configuredName || "stadium_sync_session";
}

export const AUTH_COOKIE_NAME = resolveAuthCookieName();

function authSecret() {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_JWT_SECRET must be defined and at least 16 characters long.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  claims: SessionTokenClaims,
  ttlSeconds = AUTH_SESSION_TTL_SECONDS,
) {
  return await new SignJWT({
    email: claims.email,
    role: claims.role,
    name: claims.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(authSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecret());

    const subject = payload.sub;
    const email = payload.email;
    const role = payload.role;
    const name = payload.name;

    if (
      typeof subject !== "string" ||
      typeof email !== "string" ||
      (role !== "ATTENDEE" && role !== "STAFF" && role !== "ADMIN") ||
      typeof name !== "string"
    ) {
      return null;
    }

    return {
      sub: subject,
      email,
      role,
      name,
    } satisfies SessionTokenClaims;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_SESSION_TTL_SECONDS,
  });
}

export function buildAuthCookieHeader(token: string) {
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${AUTH_SESSION_TTL_SECONDS}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifySessionToken(token);
}

export function isStaffOrAdmin(role: AppRole) {
  return role === "STAFF" || role === "ADMIN";
}

export function rejectUntrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || origin === request.nextUrl.origin) {
    return null;
  }

  return NextResponse.json(
    { error: "Cross-origin request blocked." },
    { status: 403 },
  );
}

type SessionCheckResult =
  | { session: SessionTokenClaims; error?: never }
  | { session?: never; error: NextResponse };

export async function requireSession(
  request: NextRequest,
  options?: { roles?: AppRole[]; requireTrustedOrigin?: boolean },
): Promise<SessionCheckResult> {
  if (options?.requireTrustedOrigin) {
    const originError = rejectUntrustedOrigin(request);

    if (originError) {
      return { error: originError };
    }
  }

  const session = await readSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (options?.roles && !options.roles.includes(session.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}
