import { expect, test } from "@playwright/test";

test.describe("public authentication experience", () => {
  test("root leads to the branded login page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "IncluHub Dashboard" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Go to Login" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("img", { name: "IncluHub" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Education Management System" })
    ).toBeVisible();
    await expect(
      page.getByText("Education Management System")
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("select")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
    await expect(
      page.getByText(/contact your IncluHub Administrator/i)
    ).toBeVisible();
  });

  test("forgot-password page is available from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(
      page.getByRole("heading", { name: "Reset Password" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset link" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to login" })).toBeVisible();
  });

  for (const protectedPath of [
    "/admin/dashboard",
    "/student/dashboard",
    "/educator/dashboard",
    "/external/dashboard",
  ]) {
    test(`unauthenticated access to ${protectedPath} redirects to login`, async ({
      page,
    }) => {
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("login remains usable without horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );

    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
