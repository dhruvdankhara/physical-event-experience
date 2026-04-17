import { NextResponse } from "next/server";
import { listPOIs } from "@/lib/firestore-repositories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pois = await listPOIs();

    return NextResponse.json(pois, { status: 200 });
  } catch (error) {
    console.error("POI fetch error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch POIs";
    const isFirestoreNotFound = message.includes(
      "Firestore returned NOT_FOUND",
    );

    return NextResponse.json(
      {
        error: isFirestoreNotFound
          ? "Firestore database not found. Verify FIRESTORE_PROJECT_ID/FIRESTORE_DATABASE_ID or create a Firestore database in the selected project."
          : "Failed to fetch POIs",
      },
      { status: isFirestoreNotFound ? 503 : 500 },
    );
  }
}
