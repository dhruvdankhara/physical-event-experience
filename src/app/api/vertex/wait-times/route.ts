import { NextResponse, type NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";
import { listPOIs } from "@/lib/firestore-repositories";
import {
  buildFallbackWaitTimeInsights,
  generateWaitTimeInsights,
  isVertexInvalidOutputError,
  isMissingVertexCredentialsError,
  isVertexUnimplementedError,
} from "@/lib/google/vertex";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });

    if (auth.error) {
      return auth.error;
    }

    const pois = await listPOIs();

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
      console.warn(
        "Vertex API call failed, falling back to local insights. Error:",
        error instanceof Error ? error.message : error,
      );

      const missingCredentials = isMissingVertexCredentialsError(error);
      const unsupportedVertexOperation = isVertexUnimplementedError(error);
      const invalidVertexOutput = isVertexInvalidOutputError(error);

      provider = "local-fallback";

      if (missingCredentials) {
        warning =
          "Google Cloud Application Default Credentials are not configured. Returned local fallback insights.";
      } else if (unsupportedVertexOperation) {
        warning =
          "Vertex returned UNIMPLEMENTED for the configured model/location. Returned local fallback insights. Try GOOGLE_CLOUD_LOCATION=global and verify GOOGLE_VERTEX_MODEL.";
      } else if (invalidVertexOutput) {
        warning =
          "Vertex returned non-JSON output for this prompt/model. Returned local fallback insights.";
      } else {
        warning = `Vertex API encountered an error (${error instanceof Error ? error.message : "Unknown"}). Returned local fallback insights for demo purposes.`;
      }

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
