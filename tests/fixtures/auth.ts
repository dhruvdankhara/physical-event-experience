import { SignJWT } from "jose";
import type { BrowserContext, Page } from "@playwright/test";

export type TestRole = "ATTENDEE" | "STAFF" | "ADMIN";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: TestRole;
};

const DEFAULT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const DEFAULT_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ?? "stadium_sync_session";

function getAuthSecret() {
  const secret =
    process.env.AUTH_JWT_SECRET ?? "playwright-local-auth-secret-1234567890";

  if (secret.length < 16) {
    throw new Error("AUTH_JWT_SECRET must be at least 16 characters long.");
  }

  return secret;
}

export function buildSessionUser(
  role: TestRole,
  uniqueSuffix = Date.now().toString(),
): SessionUser {
  const normalizedRole = role.toLowerCase();

  return {
    id: `pw-${normalizedRole}-${uniqueSuffix}`,
    name: `Playwright ${role}`,
    email: `playwright.${normalizedRole}.${uniqueSuffix}@example.test`,
    role,
  };
}

export async function createSessionToken(
  user: SessionUser,
  ttlSeconds = 60 * 60,
) {
  const secret = new TextEncoder().encode(getAuthSecret());

  return await new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function addAuthenticatedSession(
  context: BrowserContext,
  user: SessionUser,
  options?: {
    baseURL?: string;
    cookieName?: string;
  },
) {
  const token = await createSessionToken(user);
  const baseURL = options?.baseURL ?? DEFAULT_BASE_URL;
  const cookieName = options?.cookieName ?? DEFAULT_COOKIE_NAME;

  await context.addCookies([
    {
      name: cookieName,
      value: token,
      url: baseURL,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  return user;
}

export async function authenticatePage(
  page: Page,
  role: TestRole = "ATTENDEE",
  options?: {
    baseURL?: string;
    cookieName?: string;
    uniqueSuffix?: string;
  },
) {
  const user = buildSessionUser(role, options?.uniqueSuffix);
  await addAuthenticatedSession(page.context(), user, options);
  return user;
}
