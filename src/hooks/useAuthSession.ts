"use client";

import { useQuery } from "@tanstack/react-query";

export type AuthSessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ATTENDEE" | "STAFF" | "ADMIN";
};

export type AuthSessionResponse =
  | {
      authenticated: false;
      user?: undefined;
    }
  | {
      authenticated: true;
      user: AuthSessionUser;
    };

async function fetchAuthSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session.");
  }

  return (await response.json()) as AuthSessionResponse;
}

export function useAuthSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchAuthSession,
    staleTime: 30_000,
  });
}
