import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { triggerWaitTimeIncrease } from "@/services/poi.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });
    if (auth.error) return auth.error;

    const updatedPoi = await triggerWaitTimeIncrease(10);

    if (!updatedPoi) {
      return NextResponse.json({ error: "No POIs available to trigger a rush." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Rush triggered successfully.",
        poiId: updatedPoi._id,
        name: updatedPoi.name,
        currentWaitTime: updatedPoi.currentWaitTime,
        status: updatedPoi.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Trigger rush error:", error);
    return NextResponse.json({ error: "Failed to trigger rush update." }, { status: 500 });
  }
}
