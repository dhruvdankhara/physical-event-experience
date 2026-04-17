import type { Page, Route } from "@playwright/test";

import {
  TEST_ALERTS,
  TEST_POIS,
  TEST_VERTEX_RESPONSE,
  type TestAlert,
  type TestPOI,
} from "./test-data";

async function fulfillJson(route: Route, status: number, payload: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function mockPoisApi(page: Page, pois: TestPOI[] = TEST_POIS) {
  await page.route("**/api/pois", async (route) => {
    await fulfillJson(route, 200, pois);
  });
}

export async function mockPoisApiError(page: Page, status = 500) {
  await page.route("**/api/pois", async (route) => {
    await fulfillJson(route, status, {
      error: "Failed to fetch POIs",
    });
  });
}

export async function mockAlertsApi(
  page: Page,
  alerts: TestAlert[] = TEST_ALERTS,
) {
  await page.route("**/api/alerts", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await fulfillJson(route, 200, { alerts });
  });
}

export async function mockAlertsApiError(page: Page, status = 500) {
  await page.route("**/api/alerts", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await fulfillJson(route, status, {
      error: "Failed to fetch alerts.",
    });
  });
}

export async function mockRealtimeStream(page: Page) {
  await page.route("**/api/stream", async (route) => {
    const body = `retry: 60000\ndata: ${JSON.stringify({
      type: "poi.wait-time.patch",
      poiId: TEST_POIS[0]?._id ?? "poi-concession-1",
      currentWaitTime: 27,
      status: "AT_CAPACITY",
      timestamp: "2026-04-17T12:00:00.000Z",
    })}\n\n`;

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body,
    });
  });
}

export async function blockGoogleMaps(page: Page) {
  await page.route("**/maps.googleapis.com/**", async (route) => {
    await route.abort();
  });

  await page.route("**/maps.gstatic.com/**", async (route) => {
    await route.abort();
  });
}

export async function mockLoginEndpoint(
  page: Page,
  options: {
    status: number;
    body: Record<string, unknown>;
  },
) {
  await page.route("**/api/auth/login", async (route) => {
    await fulfillJson(route, options.status, options.body);
  });
}

export async function mockRegisterEndpoint(
  page: Page,
  options: {
    status: number;
    body: Record<string, unknown>;
  },
) {
  await page.route("**/api/auth/register", async (route) => {
    await fulfillJson(route, options.status, options.body);
  });
}

export async function mockAdminApis(page: Page) {
  await page.route("**/api/seed", async (route) => {
    await fulfillJson(route, 200, {
      message: "Database seeded successfully with POIs!",
      count: TEST_POIS.length,
    });
  });

  await page.route("**/api/trigger-rush", async (route) => {
    await fulfillJson(route, 200, {
      message: "Rush triggered successfully.",
      poiId: TEST_POIS[0]?._id ?? "poi-concession-1",
      name: TEST_POIS[0]?.name ?? "North Food Plaza",
      currentWaitTime: 40,
      status: "AT_CAPACITY",
    });
  });

  await page.route("**/api/alerts", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await fulfillJson(route, 201, {
      message: "Alert created.",
      alert: {
        _id: "alert-created-1",
        title: "Synthetic Alert",
      },
    });
  });

  await page.route("**/api/tts", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
      body: Buffer.from("ID3PLAYWRIGHTAUDIO", "utf-8"),
    });
  });

  await page.route("**/api/vertex/wait-times", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await fulfillJson(route, 200, TEST_VERTEX_RESPONSE);
  });
}
