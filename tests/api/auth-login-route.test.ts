import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/login/route";
import { createSessionToken, setAuthCookie } from "@/lib/auth";
import { loginUser } from "@/services/auth.service";
import type { UserRecord } from "@/types/models";

jest.mock("@/services/auth.service", () => ({
  loginUser: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  createSessionToken: jest.fn(),
  setAuthCookie: jest.fn(),
}));

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockedCreateSessionToken = createSessionToken as jest.MockedFunction<
  typeof createSessionToken
>;
const mockedSetAuthCookie = setAuthCookie as jest.MockedFunction<
  typeof setAuthCookie
>;

function buildRequest(payload: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    _id: "user-1",
    name: "Jordan Fan",
    email: "jordan@example.com",
    passwordHash: "stored-hash",
    role: "ATTENDEE",
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      buildRequest({ email: "not-an-email", password: "" }),
    );

    const body = (await response.json()) as {
      error: string;
      details?: Record<string, string[]>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid login payload.");
    expect(body.details).toBeDefined();
  });

  it("returns 401 when credentials are invalid", async () => {
    mockedLoginUser.mockRejectedValue(new Error("Invalid email or password."));

    const response = await POST(
      buildRequest({ email: "jordan@example.com", password: "wrong" }),
    );

    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid email or password.");
    expect(mockedCreateSessionToken).not.toHaveBeenCalled();
    expect(mockedSetAuthCookie).not.toHaveBeenCalled();
  });

  it("returns 200 and sets auth cookie when login succeeds", async () => {
    const user = buildUser();
    mockedLoginUser.mockResolvedValue(user);
    mockedCreateSessionToken.mockResolvedValue("session-token");

    const response = await POST(
      buildRequest({ email: user.email, password: "correct-password" }),
    );

    const body = (await response.json()) as {
      message: string;
      user: { id: string; name: string; email: string; role: string };
    };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Login successful.");
    expect(body.user).toEqual({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    expect(mockedCreateSessionToken).toHaveBeenCalledTimes(1);
    expect(mockedSetAuthCookie).toHaveBeenCalledTimes(1);
    const [responseArg, tokenArg] = mockedSetAuthCookie.mock.calls[0] ?? [];
    expect(responseArg).toBe(response);
    expect(tokenArg).toBe("session-token");
  });
});
