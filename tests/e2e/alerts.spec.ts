import { expect, test } from "@playwright/test";

import { mockAlertsApi, mockAlertsApiError } from "../fixtures/network";

test.describe("Alerts feed", () => {
  test("shows active alerts first and archived alerts in all tab", async ({
    page,
  }) => {
    await mockAlertsApi(page);

    await page.goto("/alerts");

    await expect(
      page.getByRole("heading", { name: "Severe Weather Advisory" }),
    ).toBeVisible();
    await expect(page.getByText("Gate Opening Update")).toHaveCount(0);

    await page.getByRole("tab", { name: "All Alerts" }).click();

    await expect(
      page.getByRole("heading", { name: "Gate Opening Update" }),
    ).toBeVisible();
    await expect(page.getByText("Archived")).toBeVisible();
  });

  test("shows empty state when no active alerts are available", async ({
    page,
  }) => {
    await mockAlertsApi(page, [
      {
        _id: "archived-only",
        title: "Resolved Incident",
        message: "Incident has been fully resolved.",
        severity: "INFO",
        audience: "ALL",
        active: false,
        createdAt: "2026-04-17T10:00:00.000Z",
      },
    ]);

    await page.goto("/alerts");

    await expect(
      page.getByRole("heading", { name: "No alerts" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "There are currently no active stadium-wide announcements.",
      ),
    ).toBeVisible();
  });

  test("shows error fallback when alerts feed request fails", async ({
    page,
  }) => {
    await mockAlertsApiError(page, 500);

    await page.goto("/alerts");

    await expect(
      page.getByRole("heading", { name: "Alerts unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText("The notification feed could not be loaded right now."),
    ).toBeVisible();
  });
});
