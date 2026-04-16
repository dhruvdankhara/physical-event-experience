import { NextResponse, type NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";
import connectDB from "@/lib/db";
import {
  buildFallbackWaitTimeInsights,
  generateWaitTimeInsights,
  isMissingVertexCredentialsError,
  isVertexUnimplementedError,
} from "@/lib/google/vertex";
import POI from "@/models/POI";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });

    if (auth.error) {
      return auth.error;
    }

    await connectDB();

    const pois = await POI.find({})
      .select("name type currentWaitTime status sectionId blockId")
      .lean();

    const snapshots = pois.map((poi) => ({
      name: poi.name,
      type: poi.type,
      currentWaitTime: poi.currentWaitTime,
      status: poi.status,
      sectionId: poi.sectionId,
      blockId: poi.blockId,
    }));

    let insights;
    let provider: "vertex" | "local-fallback" = "vertex";
    let warning: string | undefined;

    try {
      insights = await generateWaitTimeInsights(snapshots);
    } catch (error) {
      const missingCredentials = isMissingVertexCredentialsError(error);
      const unsupportedVertexOperation = isVertexUnimplementedError(error);

      if (!missingCredentials && !unsupportedVertexOperation) {
        throw error;
      }

      provider = "local-fallback";
      warning = missingCredentials
        ? "Google Cloud Application Default Credentials are not configured. Returned local fallback insights."
        : "Vertex returned UNIMPLEMENTED for the configured model/location. Returned local fallback insights. Try GOOGLE_CLOUD_LOCATION=global and verify GOOGLE_VERTEX_MODEL.";
      insights = buildFallbackWaitTimeInsights(snapshots);
    }

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        generatedBy: auth.session.email,
        provider,
        warning,
        insights,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Vertex wait-time error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate wait-time insights.",
      },
      { status: 500 },
    );
  }
}
