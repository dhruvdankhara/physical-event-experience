"use client";

import { DashboardOverlay } from "@/features/map/DashboardOverlay";
import { StadiumMap } from "@/features/map/StadiumMap";
import { useRealTimeWaitTimes } from "@/hooks/useRealTimeWaitTimes";
import { SiteShell } from "@/components/layouts/SiteShell";

export default function DashboardPage() {
  useRealTimeWaitTimes();

  return (
    <SiteShell fullBleed>
      <main className="relative h-[calc(100dvh-5rem)] min-h-[560px] w-full overflow-hidden">
        <StadiumMap />
        <DashboardOverlay />
      </main>
    </SiteShell>
  );
}
