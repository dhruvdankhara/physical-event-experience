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
