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

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Page not found</CardTitle>
            <CardDescription>
              The requested route does not exist in this deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
