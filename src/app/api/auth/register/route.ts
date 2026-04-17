import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setAuthCookie,
  type SessionTokenClaims,
} from "@/lib/auth";
import { registerUser } from "@/services/auth.service";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

type RegisterPayload = z.infer<typeof RegisterSchema>;

function isDuplicateEmailError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    error.message === "An account with that email already exists."
  );
}

async function buildRegisterResponse(payload: RegisterPayload) {
  const user = await registerUser({
    name: payload.name,
    email: payload.email,
    passwordHash: payload.password,
    role: "ATTENDEE",
  });

  const claims: SessionTokenClaims = {
    sub: user._id,
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

    return await buildRegisterResponse(parsed.data);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to register user." },
      { status: 500 },
    );
  }
}
