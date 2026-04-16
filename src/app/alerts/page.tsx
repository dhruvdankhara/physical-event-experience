import { SiteShell } from "@/components/layouts/SiteShell";
import { AlertsFeed } from "@/features/alerts/AlertsFeed";

export default function AlertsPage() {
  return (
    <SiteShell
      title="Stadium Alerts"
      description="Active and historical venue advisories, delays, and operational announcements."
    >
      <AlertsFeed />
    </SiteShell>
  );
}
