import type { NextApiRequest, NextApiResponse } from "next";
import passport from "passport";

import {
  buildGoogleOAuthState,
  sanitizeOAuthRedirectPath,
} from "@/lib/google/oauth-routing";
import {
  GOOGLE_STRATEGY_NAME,
  initializeGooglePassport,
} from "@/lib/google/passport";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    initializeGooglePassport();

    const nextPath = sanitizeOAuthRedirectPath(req.query.next);

    passport.authenticate(GOOGLE_STRATEGY_NAME, {
      scope: ["profile", "email"],
      session: false,
      prompt: "select_account",
      state: buildGoogleOAuthState(nextPath),
    })(req, res);
  } catch (error) {
    console.error("Google OAuth start error:", error);
    res.status(500).json({ error: "Failed to start Google OAuth." });
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
