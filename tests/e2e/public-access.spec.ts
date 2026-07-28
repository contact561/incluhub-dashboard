import { expect, test } from "@playwright/test";

test.describe("public authentication experience", () => {
  test("application health endpoint is available without exposing secrets", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      checks: { application: "ok" },
    });
  });

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

  test("invalid or expired reset sessions fail safely", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: "Choose a new password" })
    ).toBeVisible();
    await expect(
      page.getByText(/reset link is invalid or has expired/i)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request a new reset link" })
    ).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByLabel("New password")).toHaveCount(0);
  });

  test("successful password reset returns a clear login state", async ({
    page,
  }) => {
    await page.goto("/login?status=password_reset");

    await expect(
      page.getByText("Your password was updated. Sign in with your new password.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  const protectedPaths = [
    "/admin/dashboard",
    "/admin/activity-logs",
    "/admin/educators",
    "/admin/external-members",
    "/admin/institutes",
    "/admin/institutes/create",
    "/admin/moodboards",
    "/admin/notifications",
    "/admin/portfolio-approvals",
    "/admin/portfolio-approvals/test-portfolio-id",
    "/admin/programs",
    "/admin/programs/create",
    "/admin/programs/test-program-id",
    "/admin/project-approvals",
    "/admin/stages",
    "/admin/students",
    "/admin/studio-schedule",
    "/admin/teams",
    "/admin/teams/create",
    "/admin/teams/test-team-id",
    "/admin/users",
    "/admin/users/create",
    "/student/dashboard",
    "/student/brand-opportunity",
    "/student/ecosystem",
    "/student/my-stage",
    "/student/my-team",
    "/student/notifications",
    "/student/portfolio",
    "/student/studio",
    "/educator/dashboard",
    "/educator/my-students",
    "/educator/my-teams",
    "/educator/notifications",
    "/educator/portfolio-reviews",
    "/educator/portfolio-reviews/test-portfolio-id",
    "/external/dashboard",
  ];

  for (const protectedPath of protectedPaths) {
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
