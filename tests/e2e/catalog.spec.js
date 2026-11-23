const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('affiche la page d’accueil', async ({ page }) => {
  await expect(page).toHaveTitle(/Togoshop/i);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('ouvre la boutique et filtre les smartphones', async ({ page }) => {
  await page.getByRole('button', { name: 'Découvrir la boutique' }).click();
  await expect(page.locator('#shop')).toBeVisible();
  await page.getByRole('button', { name: 'Smartphones', exact: true }).click();
  await expect(page.locator('#ti')).toContainText('Smartphones');
});

test('ouvre une fiche produit', async ({ page }) => {
  await page.getByRole('button', { name: 'Découvrir la boutique' }).click();
  await page.locator('#grid .lk').first().click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('.inf2 h2')).toBeVisible();
});
