import { NextResponse, type NextRequest } from "next/server";

import { readSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await readSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    },
    { status: 200 },
  );
}
