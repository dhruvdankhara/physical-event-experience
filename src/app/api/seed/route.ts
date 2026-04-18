import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { seedPOIsDatabase } from "@/services/poi.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });
    if (auth.error) return auth.error;

    const insertedCount = await seedPOIsDatabase();

    return NextResponse.json(
      { message: "Database seeded successfully with POIs!", count: insertedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}
