import {
  buildGoogleOAuthFailureRedirect,
  buildGoogleOAuthState,
  decodeGoogleOAuthState,
  getFirstQueryValue,
  sanitizeOAuthRedirectPath,
} from "@/lib/google/oauth-routing";

describe("lib/google/oauth-routing", () => {
  it("sanitizes redirect paths and rejects open redirects", () => {
    expect(sanitizeOAuthRedirectPath(undefined)).toBe("/dashboard");
    expect(sanitizeOAuthRedirectPath("")).toBe("/dashboard");
    expect(sanitizeOAuthRedirectPath("https://evil.test")).toBe("/dashboard");
    expect(sanitizeOAuthRedirectPath("//evil.test")).toBe("/dashboard");
    expect(sanitizeOAuthRedirectPath(["/queues", "/admin"])).toBe("/queues");
    expect(sanitizeOAuthRedirectPath("/profile")).toBe("/profile");
  });

  it("round-trips OAuth state through base64url encoding", () => {
    const state = buildGoogleOAuthState("/queues");
    expect(decodeGoogleOAuthState(state)).toBe("/queues");
  });

  it("falls back when state is missing or malformed", () => {
    expect(decodeGoogleOAuthState(undefined)).toBe("/dashboard");
    expect(decodeGoogleOAuthState("not-base64")).toBe("/dashboard");
    expect(decodeGoogleOAuthState(Buffer.from("{}").toString("base64url"))).toBe(
      "/dashboard",
    );
  });

  it("extracts the first query value", () => {
    expect(getFirstQueryValue(undefined)).toBeUndefined();
    expect(getFirstQueryValue("a")).toBe("a");
    expect(getFirstQueryValue(["b", "c"])).toBe("b");
  });

  it("builds a login failure redirect with context", () => {
    const url = buildGoogleOAuthFailureRedirect("/dashboard");
    expect(url.startsWith("/login?")).toBe(true);
    expect(url).toContain(encodeURIComponent("/dashboard"));
    expect(url).toContain("error=");
  });
});
