import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import connectDB from "@/lib/db";
import Alert from "@/models/Alert";

export const runtime = "nodejs";

const AlertPatchSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    message: z.string().trim().min(5).max(1200).optional(),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
    audience: z.enum(["ALL", "ATTENDEE", "STAFF"]).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await connectDB();

    const alert = await Alert.findById(id).lean();

    if (!alert) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ alert }, { status: 200 });
  } catch (error) {
    console.error("Alert GET by id error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    const raw = (await request.json()) as unknown;
    const parsed = AlertPatchSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid alert update payload.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const updated = await Alert.findByIdAndUpdate(id, parsed.data, {
      returnDocument: "after",
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Alert updated.", alert: updated });
  } catch (error) {
    console.error("Alert PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update alert." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    await connectDB();

    const deleted = await Alert.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Alert deleted." }, { status: 200 });
  } catch (error) {
    console.error("Alert DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert." },
      { status: 500 },
    );
  }
}
