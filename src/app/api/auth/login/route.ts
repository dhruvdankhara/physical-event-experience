import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setAuthCookie,
  type SessionTokenClaims,
} from "@/lib/auth";
import { loginUser } from "@/services/auth.service";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

type LoginPayload = z.infer<typeof LoginSchema>;

function isInvalidCredentialsError(error: unknown): error is Error {
  return (
    error instanceof Error && error.message === "Invalid email or password."
  );
}

async function buildLoginResponse(payload: LoginPayload) {
  const user = await loginUser(payload.email, payload.password);

  const claims: SessionTokenClaims = {
    sub: user._id,
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

    return await buildLoginResponse(parsed.data);
  } catch (error) {
    if (isInvalidCredentialsError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
