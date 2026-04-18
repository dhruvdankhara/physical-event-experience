import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAllPOIs } from "@/services/poi.service";
import {
  buildFallbackWaitTimeInsights,
  generateWaitTimeInsights,
  isVertexInvalidOutputError,
  isMissingVertexCredentialsError,
  isVertexUnimplementedError,
  type WaitTimeSnapshot,
} from "@/lib/google/vertex";

export const runtime = "nodejs";

function buildFallbackWarning(error: unknown): string {
  const missingCredentials = isMissingVertexCredentialsError(error);
  const unsupportedVertexOperation = isVertexUnimplementedError(error);
  const invalidVertexOutput = isVertexInvalidOutputError(error);

  if (missingCredentials) {
    return "Google Cloud Application Default Credentials are not configured. Returned local fallback insights.";
  }

  if (unsupportedVertexOperation) {
    return "Vertex returned UNIMPLEMENTED for the configured model/location. Returned local fallback insights. Try GOOGLE_CLOUD_LOCATION=global and verify GOOGLE_VERTEX_MODEL.";
  }

  if (invalidVertexOutput) {
    return "Vertex returned non-JSON output for this prompt/model. Returned local fallback insights.";
  }

  return `Vertex API encountered an error (${error instanceof Error ? error.message : "Unknown"}). Returned local fallback insights for demo purposes.`;
}

async function fetchVertexInsights(snapshots: WaitTimeSnapshot[]) {
  try {
    const insights = await generateWaitTimeInsights(snapshots);
    return { provider: "vertex" as const, insights, warning: undefined };
  } catch (error) {
    console.warn(
      "Vertex API call failed, falling back to local insights. Error:",
      error instanceof Error ? error.message : error,
    );

    return {
      provider: "local-fallback" as const,
      insights: buildFallbackWaitTimeInsights(snapshots),
      warning: buildFallbackWarning(error),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });
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
      { status: 200 },
    );
  } catch (error) {
    console.error("Vertex wait-time error:", error);
    return NextResponse.json(
      { error: "Failed to generate wait-time insights." },
      { status: 500 },
    );
  }
}
