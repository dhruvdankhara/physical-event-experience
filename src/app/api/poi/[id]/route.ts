import { NextResponse, type NextRequest } from "next/server";

import connectDB from "@/lib/db";
import POI from "@/models/POI";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await connectDB();

    const poi = await POI.findById(id).lean();

    if (!poi) {
      return NextResponse.json({ error: "POI not found." }, { status: 404 });
    }

    return NextResponse.json(poi, { status: 200 });
  } catch (error) {
    console.error("POI by id error:", error);
    return NextResponse.json(
      { error: "Failed to fetch POI." },
      { status: 500 },
    );
  }
}
