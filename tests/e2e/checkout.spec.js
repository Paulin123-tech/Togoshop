const { test, expect } = require('@playwright/test');

test('ajoute un produit au panier', async ({ page }) => {
  await page.goto('/#boutique');
  await page.locator('#grid .ad').filter({ hasText: 'Ajouter' }).first().click();
  await expect(page.locator('#nc')).toHaveText('1');
  await page.locator('.ib').filter({ hasText: 'Panier' }).click();
  await expect(page.locator('#dr')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.ln').first()).toBeVisible();
});
