import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SiteShell } from "@/components/layouts/SiteShell";
import { Badge } from "@/components/ui/badge";
import { AdminConsole } from "@/features/admin/AdminConsole";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isAllowed =
    session && (session.role === "STAFF" || session.role === "ADMIN");

  if (!isAllowed) {
    redirect("/login?next=/admin");
  }

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
