import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAllPOIs } from "@/services/poi.service";
import {
  buildFallbackWaitTimeInsights,
  generateWaitTimeInsights,
  isVertexInvalidOutputError,
  isMissingVertexCredentialsError,
  isVertexUnimplementedError,
} from "@/lib/google/vertex";

export const runtime = "nodejs";

async function fetchVertexInsights(snapshots: any[]) {
  try {
    const insights = await generateWaitTimeInsights(snapshots);
    return { provider: "vertex" as const, insights, warning: undefined };
  } catch (error) {
    console.warn("Vertex API call failed, falling back to local insights. Error:", error instanceof Error ? error.message : error);

    const missingCredentials = isMissingVertexCredentialsError(error);
    const unsupportedVertexOperation = isVertexUnimplementedError(error);
    const invalidVertexOutput = isVertexInvalidOutputError(error);

    let warning: string;
    if (missingCredentials) {
      warning = "Google Cloud Application Default Credentials are not configured. Returned local fallback insights.";
    } else if (unsupportedVertexOperation) {
      warning = "Vertex returned UNIMPLEMENTED for the configured model/location. Returned local fallback insights. Try GOOGLE_CLOUD_LOCATION=global and verify GOOGLE_VERTEX_MODEL.";
    } else if (invalidVertexOutput) {
      warning = "Vertex returned non-JSON output for this prompt/model. Returned local fallback insights.";
    } else {
      warning = `Vertex API encountered an error (${error instanceof Error ? error.message : "Unknown"}). Returned local fallback insights for demo purposes.`;
    }

    return { provider: "local-fallback" as const, insights: buildFallbackWaitTimeInsights(snapshots), warning };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });
    if (auth.error) return auth.error;

    const pois = await getAllPOIs();
    const snapshots = pois.map((poi) => ({
      name: poi.name,
      type: poi.type,
      currentWaitTime: poi.currentWaitTime,
      status: poi.status,
      sectionId: poi.sectionId,
      blockId: poi.blockId,
    }));

    const result = await fetchVertexInsights(snapshots);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        generatedBy: auth.session.email,
        provider: result.provider,
        warning: result.warning,
        insights: result.insights,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Vertex wait-time error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate wait-time insights." },
      { status: 500 }
    );
  }
}
