"use client";

import { DashboardOverlay } from "@/features/map/DashboardOverlay";
import { StadiumMap } from "@/features/map/StadiumMap";
import { useRealTimeWaitTimes } from "@/hooks/useRealTimeWaitTimes";

export default function DashboardPage() {
  useRealTimeWaitTimes();

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <StadiumMap />
      <DashboardOverlay />
    </main>
  );
}
