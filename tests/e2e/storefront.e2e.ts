import { expect, test } from "@playwright/test";

test("storefront core pages load", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/WhÿClub|WhyClub/i);

  const productLink = page
    .getByRole("link", { name: /tee|shop|product|collection/i })
    .first();
  await expect(productLink).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /cart/i })).toBeVisible();

  await page.goto("/checkout");
  await expect(page.locator("main")).toContainText(/checkout|cart is empty|order summary/i);
});
