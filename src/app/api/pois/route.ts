import { NextResponse } from "next/server";
import { getAllPOIs } from "@/services/poi.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pois = await getAllPOIs();
    return NextResponse.json(pois, { status: 200 });
  } catch (error) {
    console.error("POI fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch POIs",
      },
      { status: 500 }
    );
  }
}
