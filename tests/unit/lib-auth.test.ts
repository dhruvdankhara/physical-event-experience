import { NextRequest, NextResponse } from "next/server";

const mockJwtVerify = jest.fn();
const signMock = jest.fn();

jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setSubject: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: signMock,
  })),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import {
  AUTH_COOKIE_NAME,
  buildAuthCookieHeader,
  clearAuthCookie,
  createSessionToken,
  isStaffOrAdmin,
  readSessionFromRequest,
  rejectUntrustedOrigin,
  requireSession,
  resolveAuthCookieName,
  setAuthCookie,
  verifySessionToken,
} from "@/lib/auth";

describe("lib/auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signMock.mockResolvedValue("signed.jwt.token");
  });

  it("creates a session token via jose SignJWT", async () => {
    const token = await createSessionToken({
      sub: "user-99",
      email: "fan@example.com",
      role: "ATTENDEE",
      name: "Casey Fan",
    });

    expect(token).toBe("signed.jwt.token");
    expect(signMock).toHaveBeenCalled();
  });

  it("maps a verified JWT payload into session claims", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "STAFF",
        name: "Casey Staff",
      },
    });

    const session = await verifySessionToken("any.token");

    expect(session).toEqual({
      sub: "user-99",
      email: "fan@example.com",
      role: "STAFF",
      name: "Casey Staff",
    });
  });

  it("returns null when jwtVerify rejects", async () => {
    mockJwtVerify.mockRejectedValue(new Error("bad signature"));

    expect(await verifySessionToken("bad.token")).toBeNull();
  });

  it("returns null when required claims are missing", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user-99" },
    });

    expect(await verifySessionToken("incomplete.token")).toBeNull();
  });

  it("returns null when the role is not a known AppRole", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "GUEST",
        name: "Casey",
      },
    });

    expect(await verifySessionToken("bad-role.token")).toBeNull();
  });

  it("returns null when jwtVerify throws synchronously", async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error("verify boom");
    });

    expect(await verifySessionToken("throws.token")).toBeNull();
  });

  it("throws when AUTH_JWT_SECRET is too short", async () => {
    const previous = process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_SECRET = "short";
    try {
      await expect(
        createSessionToken({
          sub: "1",
          email: "a@b.com",
          role: "ATTENDEE",
          name: "A",
        }),
      ).rejects.toThrow("AUTH_JWT_SECRET");
    } finally {
      process.env.AUTH_JWT_SECRET = previous;
    }
  });

  it("returns null from readSessionFromRequest when the cookie is absent", async () => {
    const request = new NextRequest("http://localhost/");
    expect(await readSessionFromRequest(request)).toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it("reads a session from the incoming cookie", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "STAFF",
        name: "Casey Staff",
      },
    });

    const request = new NextRequest("http://localhost/dashboard", {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent("cookie-token")}`,
      },
    });

    const session = await readSessionFromRequest(request);
    expect(session?.role).toBe("STAFF");
    expect(mockJwtVerify).toHaveBeenCalled();
  });

  it("returns 401 from requireSession when unauthenticated", async () => {
    const request = new NextRequest("http://localhost/api/pois");
    const result = await requireSession(request);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("returns the session when authentication and role checks pass", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "ADMIN",
        name: "Casey Admin",
      },
    });

    const request = new NextRequest("http://localhost/api/admin", {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent("cookie-token")}`,
      },
    });

    const result = await requireSession(request, { roles: ["ADMIN", "STAFF"] });

    expect("session" in result).toBe(true);
    if ("session" in result) {
      expect(result.session.role).toBe("ADMIN");
    }
  });

  it("returns 403 when the role is not allowed", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "ATTENDEE",
        name: "Casey Fan",
      },
    });

    const request = new NextRequest("http://localhost/api/admin", {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent("cookie-token")}`,
      },
    });

    const result = await requireSession(request, { roles: ["ADMIN"] });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it("blocks cross-origin requests when trusted origin is required", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "ADMIN",
        name: "Casey Admin",
      },
    });

    const request = new NextRequest("http://localhost/api/admin", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent("cookie-token")}`,
      },
    });

    const result = await requireSession(request, {
      roles: ["ADMIN"],
      requireTrustedOrigin: true,
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
      await expect(result.error.json()).resolves.toEqual({
        error: "Cross-origin request blocked.",
      });
    }
  });

  it("allows same-origin requests when trusted origin is required", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-99",
        email: "fan@example.com",
        role: "STAFF",
        name: "Casey Staff",
      },
    });

    const request = new NextRequest("http://localhost/api/admin", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent("cookie-token")}`,
      },
    });

    const result = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });

    expect("session" in result).toBe(true);
    if ("session" in result) {
      expect(result.session.role).toBe("STAFF");
    }
  });

  it("builds a Set-Cookie header without Secure outside production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const header = buildAuthCookieHeader("abc.def.ghi");
      expect(header).toContain(`${AUTH_COOKIE_NAME}=`);
      expect(header).not.toContain("Secure");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("adds Secure to buildAuthCookieHeader in production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const header = buildAuthCookieHeader("abc.def.ghi");
      expect(header).toContain("Secure");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("sets the auth cookie on a response", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const response = NextResponse.json({ ok: true });
      setAuthCookie(response, "token-value");
      expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBe("token-value");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("identifies staff and admin roles", () => {
    expect(isStaffOrAdmin("STAFF")).toBe(true);
    expect(isStaffOrAdmin("ADMIN")).toBe(true);
    expect(isStaffOrAdmin("ATTENDEE")).toBe(false);
  });

  it("allows requests without an Origin header or with a same-origin header", () => {
    expect(
      rejectUntrustedOrigin(new NextRequest("http://localhost/api/alerts")),
    ).toBeNull();
    expect(
      rejectUntrustedOrigin(
        new NextRequest("http://localhost/api/alerts", {
          headers: { origin: "http://localhost" },
        }),
      ),
    ).toBeNull();
  });

  it("returns a 403 response for cross-origin requests", async () => {
    const response = rejectUntrustedOrigin(
      new NextRequest("http://localhost/api/alerts", {
        headers: { origin: "https://evil.example" },
      }),
    );

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      error: "Cross-origin request blocked.",
    });
  });

  it("resolves the auth cookie name from the environment when present", () => {
    const previous = process.env.AUTH_COOKIE_NAME;
    process.env.AUTH_COOKIE_NAME = " custom_session_cookie ";

    try {
      expect(resolveAuthCookieName()).toBe("custom_session_cookie");
    } finally {
      process.env.AUTH_COOKIE_NAME = previous;
    }
  });

  it("clears the auth cookie on the response", () => {
    const response = NextResponse.json({ ok: true });
    clearAuthCookie(response);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBe("");
  });

  it("reads a custom AUTH_COOKIE_NAME when the module is loaded", async () => {
    const previous = process.env.AUTH_COOKIE_NAME;
    process.env.AUTH_COOKIE_NAME = "custom_session_cookie";

    try {
      jest.resetModules();

      await jest.isolateModulesAsync(async () => {
        const authModule = await import("@/lib/auth");
        expect(authModule.AUTH_COOKIE_NAME).toBe("custom_session_cookie");
      });
    } finally {
      process.env.AUTH_COOKIE_NAME = previous;
      jest.resetModules();
    }
  });
});
