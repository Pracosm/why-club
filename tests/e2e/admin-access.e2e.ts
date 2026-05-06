import { expect, test } from "@playwright/test";

test("unauthenticated users do not see the admin dashboard", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByText(/sign in|login|access|admin/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /overview|dashboard/i })).toHaveCount(0);
});
