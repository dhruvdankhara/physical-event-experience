import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import POI from "@/models/POI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStringId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

export async function GET() {
  try {
    await connectDB();

    const allPois = await POI.find({}).select("_id").lean();

    if (allPois.length === 0) {
      return NextResponse.json(
        { error: "No POIs available to trigger a rush." },
        { status: 404 },
      );
    }

    const randomPoi = allPois[Math.floor(Math.random() * allPois.length)];

    const updatedPoi = await POI.findByIdAndUpdate(
      randomPoi._id,
      {
        $inc: { currentWaitTime: 10 },
      },
      {
        returnDocument: "after",
        projection: {
          _id: 1,
          name: 1,
          currentWaitTime: 1,
          status: 1,
        },
      },
    ).lean();

    if (!updatedPoi) {
      return NextResponse.json(
        { error: "Failed to update the selected POI." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Rush triggered successfully.",
        poiId: toStringId(updatedPoi._id),
        name: updatedPoi.name,
        currentWaitTime: updatedPoi.currentWaitTime,
        status: updatedPoi.status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Trigger rush error:", error);
    return NextResponse.json(
      { error: "Failed to trigger rush update." },
      { status: 500 },
    );
  }
}
