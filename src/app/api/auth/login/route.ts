import { compare } from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createSessionToken,
  setAuthCookie,
  type SessionTokenClaims,
} from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

function toStringId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as unknown;
    const parsed = LoginSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid login payload.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findOne({ email: parsed.data.email });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordMatches = await compare(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const claims: SessionTokenClaims = {
      sub: toStringId(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = await createSessionToken(claims);

    const response = NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: claims.sub,
          name: claims.name,
          email: claims.email,
          role: claims.role,
        },
      },
      { status: 200 },
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
