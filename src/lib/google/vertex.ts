import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import {
  getGoogleAccessToken,
  getGoogleProjectConfig,
} from "@/lib/google/auth";

export type WaitTimeSnapshot = {
  name: string;
  type: string;
  currentWaitTime: number;
  status: string;
  sectionId?: string;
  blockId?: string;
};

export type WaitTimeInsights = {
  summary: string;
  hotspots: string[];
  recommendations: string[];
  confidence?: number;
};

export type StadiumChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type StadiumChatReply = {
  answer: string;
  followUps: string[];
};

const MISSING_VERTEX_CREDENTIALS_CODE = "VERTEX_MISSING_CREDENTIALS";
const VERTEX_UNIMPLEMENTED_CODE = "VERTEX_UNIMPLEMENTED";
const VERTEX_INVALID_OUTPUT_CODE = "VERTEX_INVALID_OUTPUT";

type VertexRequestError = Error & {
  code?: string;
  status?: number;
  detail?: string;
  endpoint?: string;
};

const VertexInsightsSchema = z.object({
  summary: z.string().min(1),
  hotspots: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

const VertexChatSchema = z.object({
  answer: z.string().min(1),
  followUps: z.array(z.string().min(1)).max(3).default([]),
});

function extractJsonPayload(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw createInvalidOutputError(
      "Vertex output did not contain a JSON object.",
      text,
    );
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function buildPrompt(snapshots: WaitTimeSnapshot[]) {
  const normalized = snapshots.map((snapshot) => ({
    name: snapshot.name,
    type: snapshot.type,
    wait: snapshot.currentWaitTime,
    status: snapshot.status,
    sectionId: snapshot.sectionId ?? null,
    blockId: snapshot.blockId ?? null,
  }));

  return [
    "You are a venue operations assistant for a large stadium.",
    "Analyze the wait-time snapshots and return strict JSON with this shape:",
    '{"summary":"...","hotspots":["..."],"recommendations":["..."],"confidence":0.0}',
    "Rules:",
    "- summary: max 2 concise sentences.",
    "- hotspots: short bullet-like strings naming pressure areas.",
    "- recommendations: concrete operational actions.",
    "- confidence: number between 0 and 1.",
    "Input snapshots:",
    JSON.stringify(normalized),
  ].join("\n");
}

function buildChatPrompt(params: {
  question: string;
  history: StadiumChatHistoryTurn[];
  snapshots: WaitTimeSnapshot[];
}) {
  const normalizedHistory = params.history.slice(-8).map((item) => ({
    role: item.role,
    content: item.content.slice(0, 600),
  }));

  const queueSummary = [...params.snapshots]
    .filter((snapshot) => snapshot.status !== "CLOSED")
    .sort((left, right) => right.currentWaitTime - left.currentWaitTime)
    .slice(0, 8)
    .map((snapshot) => ({
      name: snapshot.name,
      type: snapshot.type,
      wait: snapshot.currentWaitTime,
      status: snapshot.status,
      sectionId: snapshot.sectionId ?? null,
      blockId: snapshot.blockId ?? null,
    }));

  return [
    "You are Stadium Sync Assistant, helping event attendees and operations staff.",
    "Focus on venue navigation, wait times, amenities, alerts, safety, and event logistics.",
    "Return strict JSON with this exact shape:",
    '{"answer":"...","followUps":["..."]}',
    "Rules:",
    "- answer: concise and actionable, maximum 120 words.",
    "- followUps: 0 to 3 short follow-up questions users can ask next.",
    "- If a question is outside stadium experience, politely redirect to stadium-related help.",
    "- Never include markdown code fences or any text outside the JSON object.",
    "Recent conversation history:",
    JSON.stringify(normalizedHistory),
    "Live queue snapshot summary:",
    JSON.stringify(queueSummary),
    "Latest user question:",
    params.question,
  ].join("\n");
}

function hasExplicitCredentialsPath() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    return false;
  }

  return existsSync(credentialsPath);
}

function hasLocalADCFile() {
  const homeDirectory = homedir();

  if (!homeDirectory) {
    return false;
  }

  const candidatePaths = [
    join(
      homeDirectory,
      "AppData",
      "Roaming",
      "gcloud",
      "application_default_credentials.json",
    ),
    join(
      homeDirectory,
      ".config",
      "gcloud",
      "application_default_credentials.json",
    ),
  ];

  return candidatePaths.some((candidatePath) => existsSync(candidatePath));
}

function isGoogleHostedRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
    process.env.CLOUD_RUN_JOB ||
    process.env.GAE_ENV ||
    process.env.FUNCTION_TARGET,
  );
}

function createMissingCredentialsError() {
  const error = new Error(
    "Google Cloud credentials are not configured for Vertex access in this environment.",
  ) as Error & { code?: string };

  error.code = MISSING_VERTEX_CREDENTIALS_CODE;
  return error;
}

function createInvalidOutputError(message: string, rawOutput?: string) {
  const suffix = rawOutput
    ? ` Raw output preview: ${rawOutput.slice(0, 240).replaceAll("\n", " ")}`
    : "";

  const error = new Error(`${message}${suffix}`) as VertexRequestError;
  error.code = VERTEX_INVALID_OUTPUT_CODE;
  return error;
}

function buildVertexEndpoint(
  projectId: string,
  location: string,
  model: string,
) {
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : `${location}-aiplatform.googleapis.com`;

  return `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

function isUnimplementedResponse(status: number, detail: string) {
  if (status === 501) {
    return true;
  }

  const normalizedDetail = detail.toLowerCase();

  return (
    normalizedDetail.includes('"status": "unimplemented"') ||
    normalizedDetail.includes("operation is not implemented") ||
    normalizedDetail.includes("not implemented")
  );
}

async function callVertexGenerateContent(params: {
  endpoint: string;
  accessToken: string;
  prompt: string;
}) {
  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: params.prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(
      `Vertex request failed (${response.status}): ${detail}`,
    ) as VertexRequestError;

    error.status = response.status;
    error.detail = detail;
    error.endpoint = params.endpoint;

    if (isUnimplementedResponse(response.status, detail)) {
      error.code = VERTEX_UNIMPLEMENTED_CODE;
    }

    throw error;
  }

  return (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
}

export function isMissingVertexCredentialsError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const codedError = error as Error & { code?: string };

  if (codedError.code === MISSING_VERTEX_CREDENTIALS_CODE) {
    return true;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("could not load the default credentials") ||
    message.includes("application default credentials") ||
    message.includes("google cloud credentials")
  );
}

export function isVertexUnimplementedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const codedError = error as VertexRequestError;

  if (codedError.code === VERTEX_UNIMPLEMENTED_CODE) {
    return true;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('"status": "unimplemented"') ||
    message.includes("operation is not implemented") ||
    message.includes("not implemented")
  );
}

export function isVertexInvalidOutputError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const codedError = error as VertexRequestError;

  if (codedError.code === VERTEX_INVALID_OUTPUT_CODE) {
    return true;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("did not contain a json object") ||
    message.includes("unexpected token") ||
    message.includes("invalid json") ||
    message.includes("raw output preview")
  );
}

export function buildFallbackWaitTimeInsights(
  snapshots: WaitTimeSnapshot[],
): WaitTimeInsights {
  if (snapshots.length === 0) {
    return {
      summary: "No POI snapshots are available to analyze.",
      hotspots: [],
      recommendations: ["Seed POIs or ingest live queue updates first."],
      confidence: 0,
    };
  }

  const sortedByWait = [...snapshots].sort((left, right) => {
    return right.currentWaitTime - left.currentWaitTime;
  });

  const averageWait = Math.round(
    snapshots.reduce((total, snapshot) => total + snapshot.currentWaitTime, 0) /
      snapshots.length,
  );

  const atCapacityCount = snapshots.filter(
    (snapshot) => snapshot.status === "AT_CAPACITY",
  ).length;

  const closedCount = snapshots.filter(
    (snapshot) => snapshot.status === "CLOSED",
  ).length;

  const hotspots = sortedByWait
    .filter((snapshot) => snapshot.status !== "CLOSED")
    .slice(0, 3)
    .map((snapshot) => {
      return `${snapshot.name} (${snapshot.currentWaitTime} min)`;
    });

  const recommendations: string[] = [];

  if (atCapacityCount > 0) {
    recommendations.push(
      "Deploy overflow staff to AT_CAPACITY POIs and redirect fans with alert signage.",
    );
  }

  if (averageWait >= 20) {
    recommendations.push(
      "Open temporary service points in high-pressure sections to reduce queue depth.",
    );
  }

  if (closedCount > 0) {
    recommendations.push(
      "Audit CLOSED POIs for reopening opportunities during peak intervals.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain current staffing allocation and continue monitoring the live queue feed.",
    );
  }

  return {
    summary: `Fallback analysis: average wait is ${averageWait} min across ${snapshots.length} POIs, with ${atCapacityCount} at capacity and ${closedCount} closed.`,
    hotspots,
    recommendations,
    confidence: 0.45,
  };
}

export function buildFallbackChatResponse(params: {
  question: string;
  snapshots: WaitTimeSnapshot[];
}): StadiumChatReply {
  const question = params.question.trim();
  const normalizedQuestion = question.toLowerCase();

  const busiestOpen = [...params.snapshots]
    .filter((snapshot) => snapshot.status !== "CLOSED")
    .sort((left, right) => right.currentWaitTime - left.currentWaitTime)
    .slice(0, 3);

  const queuePromptRegex =
    /wait|queue|line|restroom|concession|food|drink|merch|stand/;
  const navigationPromptRegex =
    /gate|section|seat|route|navigate|direction|entry|exit/;
  const safetyPromptRegex =
    /alert|emergency|safety|security|medical|first aid|weather/;

  if (queuePromptRegex.test(normalizedQuestion) && busiestOpen.length > 0) {
    const hotspots = busiestOpen
      .map((snapshot) => `${snapshot.name} (${snapshot.currentWaitTime} min)`)
      .join(", ");

    return {
      answer: `Current queue pressure is highest at ${hotspots}. If possible, use nearby alternatives with shorter lines and check the Queues page for live updates before moving.`,
      followUps: [
        "Which concession has the shortest queue right now?",
        "Where are the closest restrooms with lower wait times?",
      ],
    };
  }

  if (navigationPromptRegex.test(normalizedQuestion)) {
    return {
      answer:
        "For the fastest routing, open the live dashboard map and start from your current gate or section. It updates path guidance around congestion so you can avoid crowded corridors.",
      followUps: [
        "How do I navigate from my gate to my seat?",
        "Which exits are usually less crowded after the match?",
      ],
    };
  }

  if (safetyPromptRegex.test(normalizedQuestion)) {
    return {
      answer:
        "For urgent situations, follow active stadium alerts and contact nearest staff immediately. Use the Alerts page for real-time advisories and proceed to marked safe concourse areas when instructed.",
      followUps: [
        "What are the latest active alerts?",
        "Where is the nearest first-aid point?",
      ],
    };
  }

  return {
    answer:
      "I can help with stadium navigation, queue strategy, amenities, alerts, and operational guidance. Ask about wait times, gates, exits, or where to find services around your section.",
    followUps: [
      "What are the busiest queues right now?",
      "How can I reach my section faster?",
      "Where can I find food with lower wait time?",
    ],
  };
}

export async function generateWaitTimeInsights(snapshots: WaitTimeSnapshot[]) {
  if (snapshots.length === 0) {
    return {
      summary: "No POI snapshots are available to analyze.",
      hotspots: [],
      recommendations: ["Seed POIs or ingest live queue updates first."],
      confidence: 0,
    } satisfies WaitTimeInsights;
  }

  const canAttemptRemoteVertex =
    hasExplicitCredentialsPath() ||
    hasLocalADCFile() ||
    isGoogleHostedRuntime();

  if (!canAttemptRemoteVertex) {
    throw createMissingCredentialsError();
  }

  const config = getGoogleProjectConfig();
  const accessToken = await getGoogleAccessToken();
  const prompt = buildPrompt(snapshots);

  const configuredEndpoint = buildVertexEndpoint(
    config.projectId,
    config.location,
    config.vertexModel,
  );

  let payload;

  try {
    payload = await callVertexGenerateContent({
      endpoint: configuredEndpoint,
      accessToken,
      prompt,
    });
  } catch (error) {
    const shouldRetryWithGlobal =
      config.location !== "global" && isVertexUnimplementedError(error);

    if (!shouldRetryWithGlobal) {
      throw error;
    }

    const globalEndpoint = buildVertexEndpoint(
      config.projectId,
      "global",
      config.vertexModel,
    );

    payload = await callVertexGenerateContent({
      endpoint: globalEndpoint,
      accessToken,
      prompt,
    });
  }

  const modelText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!modelText) {
    throw createInvalidOutputError("Vertex returned an empty response body.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(extractJsonPayload(modelText));
  } catch (error) {
    if (isVertexInvalidOutputError(error)) {
      throw error;
    }

    throw createInvalidOutputError(
      error instanceof Error
        ? `Vertex returned malformed JSON: ${error.message}`
        : "Vertex returned malformed JSON.",
      modelText,
    );
  }

  try {
    return VertexInsightsSchema.parse(parsedJson);
  } catch (error) {
    throw createInvalidOutputError(
      error instanceof Error
        ? `Vertex JSON did not match expected schema: ${error.message}`
        : "Vertex JSON did not match expected schema.",
      modelText,
    );
  }
}

export async function generateStadiumChatResponse(params: {
  question: string;
  history?: StadiumChatHistoryTurn[];
  snapshots?: WaitTimeSnapshot[];
}): Promise<StadiumChatReply> {
  const question = params.question.trim();

  if (!question) {
    throw createInvalidOutputError("Chat question cannot be empty.");
  }

  const canAttemptRemoteVertex =
    hasExplicitCredentialsPath() ||
    hasLocalADCFile() ||
    isGoogleHostedRuntime();

  if (!canAttemptRemoteVertex) {
    throw createMissingCredentialsError();
  }

  const snapshots = params.snapshots ?? [];
  const history = params.history ?? [];

  const config = getGoogleProjectConfig();
  const accessToken = await getGoogleAccessToken();
  const prompt = buildChatPrompt({
    question,
    history,
    snapshots,
  });

  const configuredEndpoint = buildVertexEndpoint(
    config.projectId,
    config.location,
    config.vertexModel,
  );

  let payload;

  try {
    payload = await callVertexGenerateContent({
      endpoint: configuredEndpoint,
      accessToken,
      prompt,
    });
  } catch (error) {
    const shouldRetryWithGlobal =
      config.location !== "global" && isVertexUnimplementedError(error);

    if (!shouldRetryWithGlobal) {
      throw error;
    }

    const globalEndpoint = buildVertexEndpoint(
      config.projectId,
      "global",
      config.vertexModel,
    );

    payload = await callVertexGenerateContent({
      endpoint: globalEndpoint,
      accessToken,
      prompt,
    });
  }

  const modelText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!modelText) {
    throw createInvalidOutputError("Vertex returned an empty response body.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(extractJsonPayload(modelText));
  } catch (error) {
    if (isVertexInvalidOutputError(error)) {
      throw error;
    }

    throw createInvalidOutputError(
      error instanceof Error
        ? `Vertex returned malformed JSON: ${error.message}`
        : "Vertex returned malformed JSON.",
      modelText,
    );
  }

  try {
    return VertexChatSchema.parse(parsedJson);
  } catch (error) {
    throw createInvalidOutputError(
      error instanceof Error
        ? `Vertex JSON did not match expected schema: ${error.message}`
        : "Vertex JSON did not match expected schema.",
      modelText,
    );
  }
}
