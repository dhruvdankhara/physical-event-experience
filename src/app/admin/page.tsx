import { SiteShell } from "@/components/layouts/SiteShell";
import { Badge } from "@/components/ui/badge";
import { AdminConsole } from "@/features/admin/AdminConsole";
import { requireStaffSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireStaffSession("/admin");

  return (
    <SiteShell
      title="Operations Console"
      description="Staff and admin controls for queue simulations, alert publishing, and Google Cloud analysis workflows."
    >
      <div className="mb-4 flex items-center gap-2">
        <Badge variant="secondary">Authorized as {session.role}</Badge>
      </div>

      <AdminConsole />
    </SiteShell>
  );
}
