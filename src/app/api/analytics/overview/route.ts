import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { generateAnalyticsOverview } from "@/services/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DateValueSchema = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/, {
  message: "Date values may contain only letters, numbers, underscore, and hyphen.",
});

const AnalyticsQuerySchema = z.object({
  startDate: DateValueSchema.optional(),
  endDate: DateValueSchema.optional(),
});

function parseQueryParams(request: NextRequest) {
  const raw = {
    startDate: request.nextUrl.searchParams.get("startDate") ?? undefined,
    endDate: request.nextUrl.searchParams.get("endDate") ?? undefined,
  };
  return AnalyticsQuerySchema.safeParse(raw);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });
    if (auth.error) return auth.error;

    const parsed = parseQueryParams(request);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid analytics query parameters.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const report = await generateAnalyticsOverview(parsed.data);

    return NextResponse.json({ generatedBy: auth.session.email, report }, { status: 200 });
  } catch (error) {
    console.error("Google Analytics overview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Google Analytics overview." },
      { status: 500 }
    );
  }
}
