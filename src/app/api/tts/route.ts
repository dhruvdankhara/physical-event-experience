import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { synthesizeAnnouncementAudio } from "@/lib/google/tts";

export const runtime = "nodejs";

const TTSRequestSchema = z.object({
  text: z.string().trim().min(3).max(400),
  languageCode: z.string().trim().min(2).max(20).optional(),
  voiceName: z.string().trim().min(2).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, {
      roles: ["STAFF", "ADMIN"],
      requireTrustedOrigin: true,
    });

    if (auth.error) {
      return auth.error;
    }

    const raw = (await request.json()) as unknown;
    const parsed = TTSRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid TTS payload.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { audioBuffer, mimeType } = await synthesizeAnnouncementAudio(
      parsed.data,
    );

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="announcement.mp3"',
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      {
        error: "Failed to process text-to-speech request.",
      },
      { status: 500 },
    );
  }
}
