"use client";

import { DashboardOverlay } from "@/features/map/DashboardOverlay";
import { StadiumMap } from "@/features/map/StadiumMap";
import { useRealTimeWaitTimes } from "@/hooks/useRealTimeWaitTimes";
import { SiteShell } from "@/components/layouts/SiteShell";

export default function DashboardPage() {
  useRealTimeWaitTimes();

  return (
    <SiteShell fullBleed>
      <h1 className="sr-only">Live Dashboard</h1>
      <section
        aria-label="Live stadium map"
        className="relative h-[calc(100dvh-5rem)] min-h-140 w-full overflow-hidden"
      >
        <StadiumMap />
        <DashboardOverlay />
      </section>
    </SiteShell>
  );
}
