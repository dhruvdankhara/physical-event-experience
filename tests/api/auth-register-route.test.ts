import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/register/route";
import { createSessionToken, setAuthCookie } from "@/lib/auth";
import { registerUser } from "@/services/auth.service";
import type { UserRecord } from "@/types/models";

jest.mock("@/services/auth.service", () => ({
  registerUser: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  createSessionToken: jest.fn(),
  setAuthCookie: jest.fn(),
}));

const mockedRegisterUser = registerUser as jest.MockedFunction<
  typeof registerUser
>;
const mockedCreateSessionToken = createSessionToken as jest.MockedFunction<
  typeof createSessionToken
>;
const mockedSetAuthCookie = setAuthCookie as jest.MockedFunction<
  typeof setAuthCookie
>;

function buildRequest(payload: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    _id: "user-2",
    name: "Riley Fan",
    email: "riley@example.com",
    passwordHash: "stored-hash",
    role: "ATTENDEE",
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      buildRequest({ name: "A", email: "bad", password: "short" }),
    );

    const body = (await response.json()) as {
      error: string;
      details?: Record<string, string[]>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid registration payload.");
    expect(body.details).toBeDefined();
  });

  it("returns 409 when the email is already registered", async () => {
    mockedRegisterUser.mockRejectedValue(
      new Error("An account with that email already exists."),
    );

    const response = await POST(
      buildRequest({
        name: "Riley Fan",
        email: "riley@example.com",
        password: "Secret123!",
      }),
    );

    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("An account with that email already exists.");
    expect(mockedCreateSessionToken).not.toHaveBeenCalled();
    expect(mockedSetAuthCookie).not.toHaveBeenCalled();
  });

  it("returns 201 and sets auth cookie when registration succeeds", async () => {
    const user = buildUser();
    mockedRegisterUser.mockResolvedValue(user);
    mockedCreateSessionToken.mockResolvedValue("session-token");

    const response = await POST(
      buildRequest({
        name: user.name,
        email: user.email,
        password: "Secret123!",
      }),
    );

    const body = (await response.json()) as {
      message: string;
      user: { id: string; name: string; email: string; role: string };
    };

    expect(response.status).toBe(201);
    expect(body.message).toBe("Registration successful.");
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

  it("returns 500 when registration fails unexpectedly", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedRegisterUser.mockRejectedValue(new Error("database offline"));

    try {
      const response = await POST(
        buildRequest({
          name: "Riley Fan",
          email: "riley@example.com",
          password: "Secret123!",
        }),
      );

      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to register user.");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
