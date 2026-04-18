import { randomUUID } from "node:crypto";

import { hash } from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";
import passport from "passport";

import { buildAuthCookieHeader, createSessionToken } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/repositories/user.repository";
import {
  buildGoogleOAuthFailureRedirect,
  decodeGoogleOAuthState,
  getFirstQueryValue,
} from "@/lib/google/oauth-routing";
import {
  GOOGLE_STRATEGY_NAME,
  initializeGooglePassport,
  type GoogleOAuthUser,
} from "@/lib/google/passport";

function authenticateGoogleProfile(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<GoogleOAuthUser> {
  return new Promise((resolve, reject) => {
    passport.authenticate(
      GOOGLE_STRATEGY_NAME,
      { session: false },
      (error: unknown, user: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        if (!user) {
          reject(new Error("Google authentication did not return a user."));
          return;
        }

        resolve(user as GoogleOAuthUser);
      },
    )(req, res);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const stateValue = getFirstQueryValue(req.query.state);
  const nextPath = decodeGoogleOAuthState(stateValue);

  try {
    initializeGooglePassport();

    const googleProfile = await authenticateGoogleProfile(req, res);

    let user = await getUserByEmail(googleProfile.email);

    if (!user) {
      const generatedPasswordHash = await hash(randomUUID(), 12);

      user = await createUser({
        name: googleProfile.name,
        email: googleProfile.email,
        passwordHash: generatedPasswordHash,
        role: "ATTENDEE",
      });
    }

    const token = await createSessionToken({
      sub: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.setHeader("Set-Cookie", buildAuthCookieHeader(token));
    res.redirect(302, nextPath);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect(302, buildGoogleOAuthFailureRedirect(nextPath));
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
