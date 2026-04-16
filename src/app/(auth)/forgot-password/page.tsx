import Link from "next/link";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <SiteShell
      title="Password Recovery"
      description="For this prototype, password reset is handled by support staff."
    >
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Need help signing in?</CardTitle>
            <CardDescription>
              Contact event support to reset your account credentials securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/login">Back to login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Create new account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
