import { expect, test } from "@playwright/test";

import {
  mockPoisApi,
  mockPoisApiError,
  mockRealtimeStream,
} from "../fixtures/network";

test.describe("Queues page", () => {
  test("renders queue summary and live priorities from deterministic POI data", async ({
    page,
  }) => {
    await mockPoisApi(page);
    await mockRealtimeStream(page);

    await page.goto("/queues");

    await expect(
      page.getByRole("heading", { name: "Live Queue Priorities" }),
    ).toBeVisible();

    await expect(page.getByText("Average Wait")).toBeVisible();
    await expect(page.getByText("13 min")).toBeVisible();

    await expect(
      page.getByRole("cell", { name: "North Food Plaza" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "East Restroom Cluster" }),
    ).toBeVisible();
    await expect(page.getByText("AT CAPACITY")).toBeVisible();
  });

  test("renders graceful fallback when queue feed fails", async ({ page }) => {
    await mockPoisApiError(page, 500);
    await mockRealtimeStream(page);

    await page.goto("/queues");

    await expect(page.getByText("Queue feed unavailable")).toBeVisible();
    await expect(
      page.getByText(
        "We were unable to load live queue data from the POI service.",
      ),
    ).toBeVisible();
  });
});
