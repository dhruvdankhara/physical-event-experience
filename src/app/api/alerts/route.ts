import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getAllAlerts, createNewAlert } from "@/services/alert.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AlertCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(1200),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"),
  audience: z.enum(["ALL", "ATTENDEE", "STAFF"]).default("ALL"),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const alerts = await getAllAlerts(50);
    return NextResponse.json({ alerts }, { status: 200 });
  } catch (error) {
    console.error("Alerts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });
    if (auth.error) return auth.error;

    const raw = (await request.json()) as unknown;
    const parsed = AlertCreateSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid alert payload.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const created = await createNewAlert({ ...parsed.data, createdBy: auth.session.sub });
    return NextResponse.json({ message: "Alert created.", alert: created }, { status: 201 });
  } catch (error) {
    console.error("Alerts POST error:", error);
    return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
  }
}
