import { expect, test } from "@playwright/test";

import { authenticatePage } from "../fixtures/auth";
import {
  blockGoogleMaps,
  mockLoginEndpoint,
  mockPoisApi,
  mockRealtimeStream,
  mockRegisterEndpoint,
} from "../fixtures/network";

test.describe("Authentication flows", () => {
  test("shows login API error when credentials are rejected", async ({
    page,
  }) => {
    await mockLoginEndpoint(page, {
      status: 401,
      body: {
        error: "Invalid email or password.",
      },
    });

    await page.goto("/login");
    await page.locator("#login-email").fill("invalid@example.test");
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("redirects to the requested next route after successful login", async ({
    page,
  }) => {
    await mockLoginEndpoint(page, {
      status: 200,
      body: {
        message: "Login successful.",
        user: {
          id: "pw-login-user",
          name: "Playwright Login User",
          email: "login@example.test",
          role: "ATTENDEE",
        },
      },
    });

    await page.goto("/login?next=%2Falerts");
    await page.locator("#login-email").fill("login@example.test");
    await page.locator("#login-password").fill("TempPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/alerts$/);
  });

  test("redirects to dashboard after successful registration", async ({
    page,
  }) => {
    await mockRegisterEndpoint(page, {
      status: 201,
      body: {
        message: "Registration successful.",
        user: {
          id: "pw-register-user",
          name: "Playwright Register User",
          email: "register@example.test",
          role: "ATTENDEE",
        },
      },
    });
    await mockPoisApi(page);
    await mockRealtimeStream(page);
    await blockGoogleMaps(page);

    await page.goto("/register");
    await page.locator("#register-name").fill("Playwright Register User");
    await page.locator("#register-email").fill("register@example.test");
    await page.locator("#register-password").fill("TempPassword123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows registration conflict error for existing email", async ({
    page,
  }) => {
    await mockRegisterEndpoint(page, {
      status: 409,
      body: {
        error: "An account with that email already exists.",
      },
    });

    await page.goto("/register");
    await page.locator("#register-name").fill("Existing User");
    await page.locator("#register-email").fill("existing@example.test");
    await page.locator("#register-password").fill("TempPassword123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("An account with that email already exists."),
    ).toBeVisible();
  });

  test("logout clears authenticated profile context", async ({ page }) => {
    await authenticatePage(page, "ATTENDEE", { uniqueSuffix: "logout" });

    await page.goto("/profile");
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: "Sign in to view your profile" }),
    ).toBeVisible();
  });
});
