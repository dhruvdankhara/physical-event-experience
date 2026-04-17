import { expect, test } from "@playwright/test";

import { authenticatePage } from "../fixtures/auth";

test.describe("Profile page", () => {
  test("shows sign-in prompt when no session is present", async ({ page }) => {
    await page.goto("/profile");

    await expect(
      page.getByRole("heading", { name: "Sign in to view your profile" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  });

  test("shows user identity and role when authenticated", async ({ page }) => {
    const user = await authenticatePage(page, "ADMIN", {
      uniqueSuffix: "profile",
    });

    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: user.name })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.getByText(`Role: ${user.role}`)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Track Queues" }),
    ).toBeVisible();
  });
});
