import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layouts/SiteHeader";
import { cn } from "@/lib/utils";

type SiteShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  fullBleed?: boolean;
  className?: string;
};

export function SiteShell({
  children,
  title,
  description,
  fullBleed = false,
  className,
}: SiteShellProps) {
  return (
    <div className="min-h-dvh bg-linear-to-b from-background via-background to-muted/20">
      <SiteHeader />

      <main
        className={cn(
          "pb-10",
          fullBleed ? "px-0" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          className,
        )}
      >
        {(title || description) && (
          <section
            className={cn(
              "mx-auto w-full pt-6",
              fullBleed ? "max-w-7xl px-4 sm:px-6 lg:px-8" : "",
            )}
          >
            {title && (
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </section>
        )}

        <section className={cn(title || description ? "mt-5" : "pt-6")}>
          {children}
        </section>
      </main>
    </div>
  );
}
