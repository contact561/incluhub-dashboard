import { expect, test, type Page } from "@playwright/test";

type RoleFixture = {
  role: "admin" | "student" | "educator";
  email: string | undefined;
  dashboard: string;
  forbiddenRoute: string;
};

const password = process.env.E2E_ACCOUNT_PASSWORD;
const fixtures: RoleFixture[] = [
  {
    role: "admin",
    email: process.env.E2E_ADMIN_EMAIL,
    dashboard: "/admin/dashboard",
    forbiddenRoute: "/student/dashboard",
  },
  {
    role: "student",
    email: process.env.E2E_STUDENT_EMAIL,
    dashboard: "/student/dashboard",
    forbiddenRoute: "/admin/dashboard",
  },
  {
    role: "educator",
    email: process.env.E2E_EDUCATOR_EMAIL,
    dashboard: "/educator/dashboard",
    forbiddenRoute: "/admin/dashboard",
  },
];

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("authenticated role boundaries", () => {
  for (const fixture of fixtures) {
    test(`${fixture.role} signs in and is kept inside its portal`, async ({
      page,
    }) => {
      test.skip(
        !fixture.email || !password,
        `Set E2E_${fixture.role.toUpperCase()}_EMAIL and E2E_ACCOUNT_PASSWORD`
      );

      await signIn(page, fixture.email!);
      await expect(page).toHaveURL(new RegExp(`${fixture.dashboard}$`));

      await page.goto(fixture.forbiddenRoute);
      await expect(page).toHaveURL(new RegExp(`${fixture.dashboard}$`));
    });
  }
});
