import { hash } from "bcryptjs";
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

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
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
    const parsed = RegisterSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid registration payload.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email: parsed.data.email })
      .select("_id")
      .lean();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);

    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "ATTENDEE",
    });

    const claims: SessionTokenClaims = {
      sub: toStringId(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = await createSessionToken(claims);

    const response = NextResponse.json(
      {
        message: "Registration successful.",
        user: {
          id: claims.sub,
          name: claims.name,
          email: claims.email,
          role: claims.role,
        },
      },
      { status: 201 },
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to register user." },
      { status: 500 },
    );
  }
}
