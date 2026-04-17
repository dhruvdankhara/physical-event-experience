import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { generateChatReply } from "@/services/chat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(ChatMessageSchema).max(12).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (auth.error) {
      return auth.error;
    }

    const raw = (await request.json()) as unknown;
    const parsed = ChatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid chat payload.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await generateChatReply({
      message: parsed.data.message,
      history: parsed.data.history ?? [],
    });

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        generatedBy: auth.session.email,
        provider: result.provider,
        warning: result.warning,
        answer: result.answer,
        followUps: result.followUps,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate chat response.",
      },
      { status: 500 },
    );
  }
}
