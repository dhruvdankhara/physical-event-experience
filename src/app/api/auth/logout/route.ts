import { NextResponse, type NextRequest } from "next/server";

import { clearAuthCookie, rejectUntrustedOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = rejectUntrustedOrigin(request);

  if (originError) {
    return originError;
  }

  const response = NextResponse.json(
    { message: "Logged out." },
    { status: 200 },
  );
  clearAuthCookie(response);
  return response;
}
