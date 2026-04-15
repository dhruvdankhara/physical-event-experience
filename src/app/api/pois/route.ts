import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import POI from "@/models/POI";

export async function GET() {
  try {
    await connectDB();
    const pois = await POI.find({}).lean();

    return NextResponse.json(pois, { status: 200 });
  } catch (error) {
    console.error("POI fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch POIs" },
      { status: 500 },
    );
  }
}
