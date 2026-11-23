const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { test, expect } = require('@playwright/test');

const configPath = path.join(__dirname, '..', '..', 'supabase.local.js');
let config = null;

if (fs.existsSync(configPath)) {
  const contents = fs.readFileSync(configPath, 'utf8');
  const url = contents.match(/url:\s*["']([^"']+)["']/);
  const anonKey = contents.match(/anonKey:\s*["']([^"']+)["']/);
  if (url && anonKey && !anonKey[1].includes('REMPLACER')) {
    config = { url: url[1], anonKey: anonKey[1] };
  }
}

test('inscription, checkout Supabase et isolation entre clients', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Le scénario backend tourne une fois en desktop');
  test.skip(!config, 'Configurez supabase.local.js pour exécuter ce test');

  const createClientForUser = () => createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const createUser = async () => {
    const client = createClientForUser();
    const email = `e2e-${randomUUID()}@example.test`;
    const password = `Test-${randomUUID()}-aA1!`;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nom: 'Test', prenom: 'E2E', telephone: '90000000' } }
    });
    if (error) throw error;
    return { client, email, password, userId: data.user.id };
  };

  const secondUser = await createUser();
  const firstUser = {
    email: `e2e-${randomUUID()}@example.test`,
    password: `Test-${randomUUID()}-aA1!`
  };

  await page.goto('/#boutique');
  await expect.poll(() => page.evaluate(() => window.TogoshopSupabase.enabled)).toBe(true);
  const addButton = page.locator('#grid .ad').filter({ hasText: 'Ajouter' }).first();
  await expect(addButton).toBeVisible();
  const addAction = await addButton.getAttribute('onclick');
  const productId = Number(addAction.match(/add\((\d+)\)/)[1]);
  const { data: product, error: productError } = await secondUser.client
    .from('produit')
    .select('stock')
    .eq('id_produit', productId)
    .single();
  if (productError) throw productError;
  expect(product.stock).toBeGreaterThan(0);

  await addButton.click();
  await page.locator('.ib').filter({ hasText: 'Panier' }).click();
  await page.getByRole('button', { name: 'Passer la commande' }).click();
  await page.locator('#dlg').getByRole('button', { name: 'Inscription' }).click();
  await page.locator('#dlg input[name="prenom"]').fill('E2E');
  await page.locator('#dlg input[name="nom"]').fill('Test');
  await page.locator('#dlg input[name="telephone"]').fill('90000000');
  await page.locator('#dlg input[type="email"]').fill(firstUser.email);
  await page.locator('#dlg input[type="password"]').fill(firstUser.password);
  await page.locator('#dlg form.gp button').click();

  await expect(page.locator('#dlg form#co')).toBeVisible();
  await page.locator('#dlg input[name="adresse"]').fill('Rue de test, quartier Adidogomé');
  await page.locator('#dlg form#co').getByRole('button', { name: 'Confirmer la commande' }).click();
  await expect(page.locator('#dlg').getByText(/commande confirmée/i)).toBeVisible();

  const firstProfileId = await page.evaluate(() => S.me.id_client);
  const successMessage = await page.locator('#dlg').innerText();
  const orderId = Number(successMessage.match(/Commande n°\s*(\d+)/i)[1]);

  const { data: secondUserCannotRead, error: readError } = await secondUser.client
    .from('commande')
    .select('id_client')
    .eq('id_commande', orderId);
  if (readError) throw readError;
  expect(secondUserCannotRead).toEqual([]);

  const { error: cartError } = await secondUser.client.from('panier_ligne').insert({
    id_client: firstProfileId,
    id_produit: productId,
    quantite: 1
  });
  expect(cartError).not.toBeNull();

  await page.locator('#dlg').getByRole('button', { name: 'Continuer mes achats' }).click();
  await page.locator('#uname').click();
  await expect(page.locator('#dlg')).toContainText(`Commande n° ${orderId}`);
  await expect(page.locator('#dlg')).toContainText('Mes commandes');

  const { data: updatedProduct, error: stockError } = await secondUser.client
    .from('produit')
    .select('stock')
    .eq('id_produit', productId)
    .single();
  if (stockError) throw stockError;
  expect(updatedProduct.stock).toBe(product.stock - 1);
});
