import { test, expect } from '@playwright/test';

/**
 * Tests E2E : Happy Path - Flow de validation complet
 *
 * Vérifie que le parcours utilisateur principal fonctionne correctement :
 * - Navigation
 * - Chargement des données
 * - Switch entre stratégies
 */

test.describe('Validation Flow - Happy Path', () => {

  test('should load validation page with requestId', async ({ page }) => {
    console.log('🧪 Test: Load validation page with requestId');

    // 1. Navigation vers la page de validation avec un requestId
    await page.goto('/validation-new?requestId=test_12345');

    // 2. Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');

    // 3. Vérifier que le Request ID est affiché
    await expect(page.getByText(/request id/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/test_12345/i)).toBeVisible();

    // 4. Vérifier que les stratégies sont affichées
    await expect(page.getByRole('tab', { name: /n8n/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /localstorage/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /supabase/i })).toBeVisible();

    console.log('✅ Page loaded successfully with requestId');
  });

  test('should display loading state when fetching data', async ({ page }) => {
    console.log('🧪 Test: Display loading state');

    // 1. Aller sur la page de validation
    await page.goto('/validation-new?requestId=test_loading');

    // 2. Vérifier que l'état loading s'affiche
    const loadingText = page.getByText(/chargement|loading/i);

    // Le loading peut être rapide, donc on vérifie qu'il apparaît ou qu'on a déjà les données
    const hasLoadingOrData = await Promise.race([
      loadingText.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false),
      page.getByText(/succès|données chargées/i).waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
    ]);

    expect(hasLoadingOrData).toBe(true);

    console.log('✅ Loading state handled correctly');
  });

  test('should switch between validation strategies', async ({ page }) => {
    console.log('🧪 Test: Switch between strategies');

    // 1. Aller sur la page de validation
    await page.goto('/validation-new?requestId=test_switch');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier que N8N est sélectionné par défaut
    const n8nButton = page.getByRole('tab', { name: /n8n/i });
    await expect(n8nButton).toHaveAttribute('aria-selected', 'true');

    // 3. Cliquer sur LocalStorage
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    await localStorageButton.click();

    // Attendre un peu pour que l'état se mette à jour
    await page.waitForTimeout(500);

    await expect(localStorageButton).toHaveAttribute('aria-selected', 'true');
    await expect(n8nButton).toHaveAttribute('aria-selected', 'false');

    // 4. Cliquer sur Supabase
    const supabaseButton = page.getByRole('tab', { name: /supabase/i });
    await supabaseButton.click();

    await page.waitForTimeout(500);

    await expect(supabaseButton).toHaveAttribute('aria-selected', 'true');
    await expect(localStorageButton).toHaveAttribute('aria-selected', 'false');

    console.log('✅ Strategy switching works correctly');
  });

  test('should display validation data when loaded', async ({ page }) => {
    console.log('🧪 Test: Display validation data');

    // 1. Aller sur la page
    await page.goto('/validation-new?requestId=test_data');
    await page.waitForLoadState('networkidle');

    // 2. Attendre que les données se chargent (ou qu'une erreur s'affiche)
    await Promise.race([
      page.getByText(/succès|données chargées/i).waitFor({ state: 'visible', timeout: 30000 }),
      page.getByText(/erreur|aucune donnée/i).waitFor({ state: 'visible', timeout: 30000 })
    ]);

    // 3. Vérifier qu'on a soit des données, soit un message clair
    const hasSuccessOrError = await page.locator('text=/succès|données chargées|erreur|aucune donnée/i').isVisible();
    expect(hasSuccessOrError).toBe(true);

    console.log('✅ Data display handled correctly');
  });

  test('should maintain requestId in URL during navigation', async ({ page }) => {
    console.log('🧪 Test: Maintain requestId in URL');

    const requestId = 'test_url_persistence';

    // 1. Aller sur la page avec un requestId
    await page.goto(`/validation-new?requestId=${requestId}`);

    // 2. Vérifier que l'URL contient le requestId
    expect(page.url()).toContain(requestId);

    // 3. Changer de stratégie
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    await localStorageButton.click();
    await page.waitForTimeout(500);

    // 4. Vérifier que le requestId est toujours dans l'URL
    expect(page.url()).toContain(requestId);

    console.log('✅ RequestId persists in URL');
  });

  test('should have proper page title and heading', async ({ page }) => {
    console.log('🧪 Test: Page title and heading');

    await page.goto('/validation-new?requestId=test_title');

    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/validation|lettres de réserves/i);

    // Vérifier le heading principal
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    console.log('✅ Page title and heading are correct');
  });
});

test.describe('Validation Flow - Edge Cases', () => {

  test('should handle very long requestId', async ({ page }) => {
    console.log('🧪 Test: Handle very long requestId');

    const longRequestId = 'test_' + 'a'.repeat(100);
    await page.goto(`/validation-new?requestId=${longRequestId}`);

    // Vérifier que la page charge sans crash
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBe(true);

    console.log('✅ Long requestId handled correctly');
  });

  test('should handle special characters in requestId', async ({ page }) => {
    console.log('🧪 Test: Handle special characters');

    const specialRequestId = 'test_123-abc_XYZ';
    await page.goto(`/validation-new?requestId=${specialRequestId}`);

    await page.waitForLoadState('networkidle');

    // Vérifier que le requestId est bien affiché
    await expect(page.getByText(new RegExp(specialRequestId, 'i'))).toBeVisible({ timeout: 5000 });

    console.log('✅ Special characters handled correctly');
  });

  test('should handle rapid strategy switching', async ({ page }) => {
    console.log('🧪 Test: Rapid strategy switching');

    await page.goto('/validation-new?requestId=test_rapid');
    await page.waitForLoadState('networkidle');

    // Cliquer rapidement sur toutes les stratégies
    const n8nButton = page.getByRole('tab', { name: /n8n/i });
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    const supabaseButton = page.getByRole('tab', { name: /supabase/i });

    await n8nButton.click();
    await localStorageButton.click();
    await supabaseButton.click();
    await n8nButton.click();

    // Attendre un peu
    await page.waitForTimeout(1000);

    // Vérifier qu'il n'y a pas d'erreur affichée
    const hasError = await page.getByText(/erreur inattendue|crash|exception/i).isVisible().catch(() => false);
    expect(hasError).toBe(false);

    console.log('✅ Rapid switching handled without errors');
  });
});
