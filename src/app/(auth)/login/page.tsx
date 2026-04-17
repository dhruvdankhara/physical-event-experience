"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextRoute = searchParams?.get("next") ?? "/dashboard";
  const oauthError = searchParams?.get("error");
  const googleAuthHref = `/api/auth/google?next=${encodeURIComponent(nextRoute)}`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to log in.");
      }

      router.push(nextRoute);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to log in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteShell
      title="Welcome Back"
      description="Sign in to access live routing, queues, and operations controls."
    >
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Use your Stadium Sync account credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {errorMessage && (
                <Alert variant="destructive">{errorMessage}</Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href={googleAuthHref}>Continue with Google</Link>
              </Button>

              {oauthError && !errorMessage && (
                <Alert variant="destructive">{oauthError}</Alert>
              )}

              <div className="flex items-center justify-between text-sm">
                <Link
                  href="/forgot-password"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
                <Link
                  href="/register"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Create account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <SiteShell title="Welcome Back" description="Loading login form...">
          <div className="mx-auto w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Preparing authentication form...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </SiteShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
