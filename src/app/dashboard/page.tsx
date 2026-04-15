import { DashboardOverlay } from "@/features/map/DashboardOverlay";
import { VenueMap } from "@/features/map/VenueMap";

export default function DashboardPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <VenueMap />
      <DashboardOverlay />
    </main>
  );
}
