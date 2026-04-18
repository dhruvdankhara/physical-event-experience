import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE_NAME,
  isStaffOrAdmin,
  type SessionTokenClaims,
  verifySessionToken,
} from "@/lib/auth";

export async function getServerSession(): Promise<SessionTokenClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifySessionToken(token);
}

export async function requireStaffSession(
  nextPath = "/admin",
): Promise<SessionTokenClaims> {
  const session = await getServerSession();

  if (!session || !isStaffOrAdmin(session.role)) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}
