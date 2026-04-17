import { expect, test } from "@playwright/test";

import {
  blockGoogleMaps,
  mockPoisApi,
  mockRealtimeStream,
} from "../fixtures/network";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockPoisApi(page);
    await mockRealtimeStream(page);
    await blockGoogleMaps(page);
  });

  test("renders map overlay controls with search and filters", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Stadium Navigation Console" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search food, restrooms, exits..."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Food" })).toBeVisible();

    await page
      .getByPlaceholder("Search food, restrooms, exits...")
      .fill("restroom");
    await expect(
      page.getByPlaceholder("Search food, restrooms, exits..."),
    ).toHaveValue("restroom");
  });

  test("supports staff-mode toggle and invalid seat guidance", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Staff View" }).click();
    await expect(page.getByText("Crowd Detection")).toBeVisible();

    await page.getByPlaceholder("Example: J3-R12-S18").fill("INVALID-SEAT");
    await page.getByRole("button", { name: "Find Seat Route" }).click();

    await expect(page.getByText("Seat not found")).toBeVisible();
    await expect(
      page.getByText("Use formats like J3, A4-R12, or E2-R8-S14."),
    ).toBeVisible();
  });
});
