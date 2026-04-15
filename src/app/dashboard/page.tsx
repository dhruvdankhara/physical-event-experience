"use client";

import { DashboardOverlay } from "@/features/map/DashboardOverlay";
import { VenueMap } from "@/features/map/VenueMap";
import { useRealTimeWaitTimes } from "@/hooks/useRealTimeWaitTimes";

export default function DashboardPage() {
  useRealTimeWaitTimes();

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <VenueMap />
      <DashboardOverlay />
    </main>
  );
}
