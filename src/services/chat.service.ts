import {
  buildFallbackChatResponse,
  generateStadiumChatResponse,
  isMissingVertexCredentialsError,
  isVertexInvalidOutputError,
  isVertexUnimplementedError,
  type StadiumChatHistoryTurn,
  type WaitTimeSnapshot,
} from "@/lib/google/vertex";
import { getAllPOIs } from "@/services/poi.service";
import type { ChatMessage, ChatProvider } from "@/types/chat";

export type GenerateChatReplyInput = {
  message: string;
  history: ChatMessage[];
};

export type GenerateChatReplyResult = {
  provider: ChatProvider;
  answer: string;
  followUps: string[];
  warning?: string;
};

function normalizeHistory(history: ChatMessage[]): StadiumChatHistoryTurn[] {
  return history.slice(-10).map((message) => ({
    role: message.role,
    content: message.content.trim().slice(0, 1200),
  }));
}

async function getQueueContext(): Promise<WaitTimeSnapshot[]> {
  try {
    const pois = await getAllPOIs();

    return pois.map((poi) => ({
      name: poi.name,
      type: poi.type,
      currentWaitTime: poi.currentWaitTime,
      status: poi.status,
      sectionId: poi.sectionId,
      blockId: poi.blockId,
    }));
  } catch (error) {
    console.warn(
      "Chat queue-context fetch failed, continuing without live POI context:",
      error instanceof Error ? error.message : error,
    );

    return [];
  }
}

export async function generateChatReply(
  input: GenerateChatReplyInput,
): Promise<GenerateChatReplyResult> {
  const snapshots = await getQueueContext();
  const history = normalizeHistory(input.history);

  try {
    const response = await generateStadiumChatResponse({
      question: input.message,
      history,
      snapshots,
    });

    return {
      provider: "vertex",
      answer: response.answer,
      followUps: response.followUps,
    };
  } catch (error) {
    console.warn(
      "Vertex chat call failed, falling back to local assistant response. Error:",
      error instanceof Error ? error.message : error,
    );

    const missingCredentials = isMissingVertexCredentialsError(error);
    const unsupportedVertexOperation = isVertexUnimplementedError(error);
    const invalidVertexOutput = isVertexInvalidOutputError(error);

    let warning: string;
    if (missingCredentials) {
      warning =
        "Google Cloud Application Default Credentials are not configured. Returned local fallback response.";
    } else if (unsupportedVertexOperation) {
      warning =
        "Vertex returned UNIMPLEMENTED for the configured model/location. Returned local fallback response. Try GOOGLE_CLOUD_LOCATION=global and verify GOOGLE_VERTEX_MODEL.";
    } else if (invalidVertexOutput) {
      warning =
        "Vertex returned non-JSON output for this prompt/model. Returned local fallback response.";
    } else {
      warning = `Vertex API encountered an error (${error instanceof Error ? error.message : "Unknown"}). Returned local fallback response.`;
    }

    const fallback = buildFallbackChatResponse({
      question: input.message,
      snapshots,
    });

    return {
      provider: "local-fallback",
      answer: fallback.answer,
      followUps: fallback.followUps,
      warning,
    };
  }
}
