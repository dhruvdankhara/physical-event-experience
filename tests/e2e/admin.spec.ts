import { expect, test } from "@playwright/test";

import { authenticatePage } from "../fixtures/auth";
import { mockAdminApis } from "../fixtures/network";

test.describe("Admin console", () => {
  test("redirects attendee role away from admin page", async ({ page }) => {
    await authenticatePage(page, "ATTENDEE", { uniqueSuffix: "admin-denied" });

    await page.goto("/admin");

    await expect(page).toHaveURL(
      /\/login\?next=%2Fadmin|\/login\?next=\/admin/,
    );
  });

  test("allows staff to execute operations and cloud-assisted workflows", async ({
    page,
  }) => {
    await authenticatePage(page, "STAFF", { uniqueSuffix: "admin-allowed" });
    await mockAdminApis(page);

    await page.goto("/admin");

    await expect(page.getByText("Authorized as STAFF")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Operations Controls" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Seed Stadium POIs" }).click();
    await expect(
      page.getByText("Database seeded successfully with POIs!"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Trigger Rush Event" }).click();
    await expect(page.getByText("Rush triggered successfully.")).toBeVisible();

    await page.getByLabel("Title").fill("Weather Delay Advisory");
    await page
      .getByLabel("Message")
      .fill("Please move to the nearest covered concourse immediately.");
    await page.locator("#alert-severity").selectOption("CRITICAL");
    await page.getByRole("button", { name: "Create Alert" }).click();

    await expect(page.getByText("Alert created.")).toBeVisible();
    await expect(page.locator("#alert-title")).toHaveValue("");
    await expect(page.locator("#alert-message")).toHaveValue("");

    await page.getByRole("button", { name: "Run Vertex Analysis" }).click();
    await expect(
      page.getByText(
        "Concession queues are concentrated in the north-west corridor.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Local fallback insights")).toBeVisible();

    await page
      .getByRole("button", { name: "Generate Announcement Audio" })
      .click();
    await expect(page.getByText("TTS audio generated.")).toBeVisible();
    await expect(page.locator("audio")).toBeVisible();
  });
});
