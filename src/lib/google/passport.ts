import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
} from "passport-google-oauth20";

export const GOOGLE_STRATEGY_NAME = "google";

export type GoogleOAuthUser = {
  googleId: string;
  email: string;
  name: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required for Google OAuth.`);
  }

  return value;
}

function toGoogleOAuthUser(profile: GoogleProfile): GoogleOAuthUser {
  const preferredEmail =
    profile.emails?.find((entry) => entry.verified)?.value ??
    profile.emails?.[0]?.value;

  if (!preferredEmail) {
    throw new Error("Google OAuth profile did not include an email address.");
  }

  const trimmedDisplayName = profile.displayName?.trim();
  const composedName =
    [profile.name?.givenName, profile.name?.familyName]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" ")
      .trim() || undefined;

  const fallbackName = preferredEmail.split("@")[0] ?? "Google User";

  return {
    googleId: profile.id,
    email: preferredEmail.trim().toLowerCase(),
    name: trimmedDisplayName || composedName || fallbackName,
  };
}

export function initializeGooglePassport() {
  const passportInternal = passport as passport.Authenticator & {
    _strategies?: Record<string, unknown>;
  };

  if (passportInternal._strategies?.[GOOGLE_STRATEGY_NAME]) {
    return;
  }

  const clientID = requiredEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const callbackURL = requiredEnv("GOOGLE_OAUTH_CALLBACK_URL");

  passport.use(
    GOOGLE_STRATEGY_NAME,
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          done(null, toGoogleOAuthUser(profile));
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );
}
