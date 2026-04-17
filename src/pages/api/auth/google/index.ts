import type { NextApiRequest, NextApiResponse } from "next";
import passport from "passport";

import {
  GOOGLE_STRATEGY_NAME,
  initializeGooglePassport,
} from "@/lib/google/passport";

function sanitizeNextPath(input: string | string[] | undefined) {
  const value = Array.isArray(input) ? input[0] : input;

  if (!value || typeof value !== "string") {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function buildState(nextPath: string) {
  const payload = JSON.stringify({ next: nextPath });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    initializeGooglePassport();

    const nextPath = sanitizeNextPath(req.query.next);

    passport.authenticate(GOOGLE_STRATEGY_NAME, {
      scope: ["profile", "email"],
      session: false,
      prompt: "select_account",
      state: buildState(nextPath),
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
