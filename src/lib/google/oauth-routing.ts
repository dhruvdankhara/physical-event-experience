/**
 * Shared Google OAuth redirect/state helpers used by Pages API routes.
 * Kept pure and framework-agnostic for unit testing and reuse.
 */

export function sanitizeOAuthRedirectPath(
  input: string | string[] | undefined,
): string {
  const value = Array.isArray(input) ? input[0] : input;

  if (!value || typeof value !== "string") {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function buildGoogleOAuthState(nextPath: string): string {
  const payload = JSON.stringify({ next: nextPath });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function getFirstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function decodeGoogleOAuthState(rawState: string | undefined): string {
  if (!rawState) {
    return "/dashboard";
  }

  try {
    const decoded = Buffer.from(rawState, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { next?: unknown };

    if (typeof parsed.next !== "string") {
      return "/dashboard";
    }

    return sanitizeOAuthRedirectPath(parsed.next);
  } catch {
    return "/dashboard";
  }
}

export function buildGoogleOAuthFailureRedirect(nextPath: string): string {
  const params = new URLSearchParams({
    next: nextPath,
    error: "Google sign-in failed. Please try again.",
  });

  return `/login?${params.toString()}`;
}
