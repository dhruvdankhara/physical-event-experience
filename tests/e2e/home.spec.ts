import { expect, test } from "@playwright/test";

import {
  blockGoogleMaps,
  mockPoisApi,
  mockRealtimeStream,
} from "../fixtures/network";

test.describe("Home page", () => {
  test("renders core value proposition and primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "Stadium Sync" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Physical Event Experience for 50K\+ live attendees\./,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Live Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create Account" }),
    ).toBeVisible();
  });

  test("navigates to register route from CTA", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
  });

  test("navigates to dashboard route from CTA", async ({ page }) => {
    await mockPoisApi(page);
    await mockRealtimeStream(page);
    await blockGoogleMaps(page);

    await page.goto("/");

    await page.getByRole("link", { name: "Open Live Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Stadium Navigation Console" }),
    ).toBeVisible();
  });
});
