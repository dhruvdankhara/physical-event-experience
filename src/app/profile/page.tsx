import Link from "next/link";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession();

  return (
    <SiteShell
      title="Profile"
      description="Manage your account context for event navigation and personalized experiences."
    >
      {!session ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to view your profile</CardTitle>
            <CardDescription>
              Profile details are available after authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{session.name}</CardTitle>
              <CardDescription>{session.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline">Role: {session.role}</Badge>
              <p className="text-sm text-muted-foreground">
                Session-backed profile is active. Ticket linking and saved
                routes can be added here next.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Continue through the live event workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/queues">Track Queues</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/alerts">Read Alerts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </SiteShell>
  );
}
