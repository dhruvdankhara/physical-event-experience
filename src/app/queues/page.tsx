import { SiteShell } from "@/components/layouts/SiteShell";
import { QueuesOverview } from "@/features/queues/QueuesOverview";

export default function QueuesPage() {
  return (
    <SiteShell
      title="Live Queues"
      description="Monitor wait-time pressure across concessions, restrooms, first-aid, and exits."
    >
      <QueuesOverview />
    </SiteShell>
  );
}
