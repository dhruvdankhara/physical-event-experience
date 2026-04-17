import { GoogleAuth } from "google-auth-library";

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const analyticsAuth = new GoogleAuth({ scopes: [ANALYTICS_SCOPE] });

export type AnalyticsOverviewReport = {
  propertyId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalUsers: number;
    newUsers: number;
    sessions: number;
    eventCount: number;
    engagementRate: number;
  };
  generatedAt: string;
};

type RunReportResponse = {
  rows?: Array<{
    metricValues?: Array<{
      value?: string;
    }>;
  }>;
};

function normalizePropertyId(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("properties/")) {
    return trimmed.slice("properties/".length);
  }

  return trimmed;
}

function getGoogleAnalyticsPropertyId() {
  const rawPropertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

  if (!rawPropertyId) {
    throw new Error(
      "GOOGLE_ANALYTICS_PROPERTY_ID is required for Google Analytics API.",
    );
  }

  const propertyId = normalizePropertyId(rawPropertyId);

  if (!/^\d+$/.test(propertyId)) {
    throw new Error(
      "GOOGLE_ANALYTICS_PROPERTY_ID must be a numeric GA4 property id (for example: 123456789).",
    );
  }

  return propertyId;
}

async function getGoogleAnalyticsAccessToken() {
  const client = await analyticsAuth.getClient();
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error("Unable to resolve an Analytics API access token.");
  }

  return token.token;
}

function parseMetric(
  metrics: Array<{ value?: string }> | undefined,
  index: number,
) {
  const raw = metrics?.[index]?.value;

  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function generateAnalyticsOverview(input?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsOverviewReport> {
  const propertyId = getGoogleAnalyticsPropertyId();
  const startDate = input?.startDate ?? "7daysAgo";
  const endDate = input?.endDate ?? "today";
  const accessToken = await getGoogleAnalyticsAccessToken();

  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "eventCount" },
        { name: "engagementRate" },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Google Analytics API request failed (${response.status}): ${detail}`,
    );
  }

  const payload = (await response.json()) as RunReportResponse;
  const metricValues = payload.rows?.[0]?.metricValues;

  return {
    propertyId,
    dateRange: {
      startDate,
      endDate,
    },
    totals: {
      totalUsers: Math.round(parseMetric(metricValues, 0)),
      newUsers: Math.round(parseMetric(metricValues, 1)),
      sessions: Math.round(parseMetric(metricValues, 2)),
      eventCount: Math.round(parseMetric(metricValues, 3)),
      engagementRate: parseMetric(metricValues, 4),
    },
    generatedAt: new Date().toISOString(),
  };
}
