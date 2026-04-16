"use client";

import { useEffect } from "react";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              We could not complete this request. You can try again now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={reset}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
