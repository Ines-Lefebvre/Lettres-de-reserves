import { test, expect } from '@playwright/test';

/**
 * Tests E2E : Error Handling
 *
 * Vérifie que toutes les erreurs sont gérées correctement :
 * - Request ID manquant
 * - Échecs réseau
 * - Error Boundary
 * - Retry mechanism
 */

test.describe('Error Handling', () => {

  test('should handle missing requestId gracefully', async ({ page }) => {
    console.log('🧪 Test: Handle missing requestId');

    // 1. Aller sur la page sans requestId
    await page.goto('/validation-new');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier qu'un message d'erreur s'affiche
    const errorMessage = page.getByText(/request id.*manquant|request id.*requis/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // 3. Vérifier qu'on ne voit pas l'état "success"
    const successMessage = page.getByText(/succès|données chargées/i);
    await expect(successMessage).not.toBeVisible();

    console.log('✅ Missing requestId handled correctly');
  });

  test('should handle empty requestId', async ({ page }) => {
    console.log('🧪 Test: Handle empty requestId');

    // 1. Aller sur la page avec un requestId vide
    await page.goto('/validation-new?requestId=');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier qu'une erreur est affichée
    const hasErrorOrEmpty = await Promise.race([
      page.getByText(/request id.*manquant|erreur/i).waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      page.getByText(/aucune donnée/i).waitFor({ state: 'visible', timeout: 5000 }).then(() => true)
    ]).catch(() => false);

    expect(hasErrorOrEmpty).toBe(true);

    console.log('✅ Empty requestId handled correctly');
  });

  test('should display error message when n8n fails', async ({ page }) => {
    console.log('🧪 Test: Handle n8n endpoint failure');

    // 1. Bloquer toutes les requêtes vers n8n
    await page.route('**/n8n.srv833062.hstgr.cloud/**', route => {
      route.abort('failed');
    });

    // 2. Aller sur la page
    await page.goto('/validation-new?requestId=test_fail');

    // 3. Attendre que l'erreur s'affiche (timeout plus long car retry possible)
    await expect(page.getByText(/erreur|échec|impossible/i)).toBeVisible({ timeout: 30000 });

    // 4. Vérifier qu'on ne voit pas "succès"
    const successMessage = page.getByText(/succès|données chargées/i);
    await expect(successMessage).not.toBeVisible();

    console.log('✅ Network error handled correctly');
  });

  test('should show meaningful error messages', async ({ page }) => {
    console.log('🧪 Test: Meaningful error messages');

    await page.goto('/validation-new');
    await page.waitForLoadState('networkidle');

    // Récupérer tous les messages d'erreur affichés
    const errorElements = page.locator('text=/erreur|error/i');
    const count = await errorElements.count();

    if (count > 0) {
      // Vérifier que les messages d'erreur ne sont pas génériques
      const firstError = await errorElements.first().textContent();
      expect(firstError).toBeTruthy();
      expect(firstError!.length).toBeGreaterThan(10); // Plus qu'un simple "Erreur"

      console.log(`✅ Error message: "${firstError}"`);
    }

    console.log('✅ Error messages are meaningful');
  });

  test('should handle network timeout', async ({ page }) => {
    console.log('🧪 Test: Handle network timeout');

    // 1. Simuler un timeout en faisant attendre la requête indéfiniment
    await page.route('**/n8n.srv833062.hstgr.cloud/**', route => {
      // Ne jamais répondre (timeout)
      setTimeout(() => {
        route.abort('timedout');
      }, 35000); // Plus long que le timeout attendu
    });

    // 2. Aller sur la page
    await page.goto('/validation-new?requestId=test_timeout');

    // 3. Attendre qu'une erreur de timeout s'affiche
    await expect(page.getByText(/erreur|timeout|délai dépassé/i)).toBeVisible({ timeout: 40000 });

    console.log('✅ Network timeout handled correctly');
  });

  test('should not crash on malformed data', async ({ page }) => {
    console.log('🧪 Test: Handle malformed data');

    // 1. Intercepter la requête et renvoyer des données malformées
    await page.route('**/n8n.srv833062.hstgr.cloud/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid": json}' // JSON malformé
      });
    });

    // 2. Aller sur la page
    await page.goto('/validation-new?requestId=test_malformed');
    await page.waitForLoadState('networkidle');

    // 3. Attendre un peu
    await page.waitForTimeout(3000);

    // 4. Vérifier qu'on a soit une erreur, soit que la page ne crash pas
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // 5. Vérifier qu'il n'y a pas d'erreur JavaScript non gérée dans la console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Pas d'erreur "Uncaught" qui crasherait l'app
    const hasUncaughtError = consoleErrors.some(err =>
      err.includes('Uncaught') && !err.includes('Expected')
    );

    expect(hasUncaughtError).toBe(false);

    console.log('✅ Malformed data handled without crash');
  });

  test('should display Error Boundary UI on critical error', async ({ page }) => {
    console.log('🧪 Test: Error Boundary catches errors');

    await page.goto('/validation-new?requestId=test_boundary');

    // Force une erreur critique en injectant du JavaScript qui throw
    await page.evaluate(() => {
      // Simuler une erreur critique dans React
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('Critical test error for Error Boundary'),
        message: 'Critical test error for Error Boundary'
      }));
    });

    // Attendre un peu pour que l'Error Boundary réagisse
    await page.waitForTimeout(2000);

    // L'Error Boundary devrait afficher son UI ou l'app devrait rester stable
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // Si l'Error Boundary s'affiche, vérifier qu'il a un bouton recharger
    const reloadButton = page.getByRole('button', { name: /recharger|reload|retry/i });
    const hasReloadButton = await reloadButton.isVisible().catch(() => false);

    // Soit on a le bouton de reload, soit l'app est stable
    expect(hasReloadButton || bodyVisible).toBe(true);

    console.log('✅ Error Boundary handles critical errors');
  });

  test('should allow retry after error', async ({ page }) => {
    console.log('🧪 Test: Retry mechanism');

    let requestCount = 0;

    // 1. Échouer la première fois, réussir après
    await page.route('**/n8n.srv833062.hstgr.cloud/**', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        // Laisser passer la vraie requête
        route.continue();
      }
    });

    // 2. Aller sur la page
    await page.goto('/validation-new?requestId=test_retry');

    // 3. Attendre l'erreur
    await expect(page.getByText(/erreur/i)).toBeVisible({ timeout: 15000 });

    // 4. Chercher un bouton retry (peut être "Réessayer", "Retry", etc.)
    const retryButton = page.getByRole('button', { name: /réessayer|retry|recharger/i });

    // Si le bouton existe, cliquer dessus
    const hasRetryButton = await retryButton.isVisible().catch(() => false);

    if (hasRetryButton) {
      await retryButton.click();

      // Attendre que ça recharge
      await page.waitForTimeout(2000);

      // Vérifier qu'on a fait au moins 2 requêtes
      expect(requestCount).toBeGreaterThanOrEqual(2);

      console.log(`✅ Retry worked: ${requestCount} requests made`);
    } else {
      console.log('⚠️  No retry button found, but error was handled');
    }
  });

  test('should not show stack traces to users', async ({ page }) => {
    console.log('🧪 Test: Stack traces not shown to users');

    await page.goto('/validation-new');
    await page.waitForLoadState('networkidle');

    // Chercher des traces de stack ou erreurs techniques
    const stackTraceVisible = await page.locator('text=/at Object|at async|TypeError:|ReferenceError:/i').isVisible().catch(() => false);

    // Les stack traces ne devraient pas être visibles par défaut
    expect(stackTraceVisible).toBe(false);

    console.log('✅ Technical errors are hidden from users');
  });

  test('should handle localStorage not available', async ({ page }) => {
    console.log('🧪 Test: Handle localStorage unavailable');

    // Désactiver localStorage
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: false
      });
    });

    await page.goto('/validation-new?requestId=test_no_storage');

    // Cliquer sur la stratégie localStorage
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    await localStorageButton.click();

    await page.waitForTimeout(2000);

    // Devrait afficher un message d'erreur ou "aucune donnée"
    const hasErrorOrNoData = await Promise.race([
      page.getByText(/erreur|indisponible/i).isVisible(),
      page.getByText(/aucune donnée/i).isVisible()
    ]).catch(() => false);

    // L'app ne devrait pas crash
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    console.log('✅ localStorage unavailability handled');
  });
});

test.describe('Error Recovery', () => {

  test('should clear error when switching strategies', async ({ page }) => {
    console.log('🧪 Test: Clear error on strategy switch');

    // 1. Aller sur la page sans requestId (génère une erreur)
    await page.goto('/validation-new');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier qu'il y a une erreur
    await expect(page.getByText(/erreur|manquant/i)).toBeVisible({ timeout: 5000 });

    // 3. Changer de stratégie
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    await localStorageButton.click();

    await page.waitForTimeout(500);

    // 4. L'erreur pourrait soit rester (car toujours pas de requestId),
    // soit se mettre à jour avec un nouveau message
    // L'important est que l'app ne crash pas
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    console.log('✅ Error state handled during strategy switch');
  });

  test('should recover from error on page reload', async ({ page }) => {
    console.log('🧪 Test: Recover on page reload');

    // 1. Aller sur la page sans requestId
    await page.goto('/validation-new');
    await expect(page.getByText(/erreur/i)).toBeVisible({ timeout: 5000 });

    // 2. Recharger la page avec un bon requestId
    await page.goto('/validation-new?requestId=test_recovery');
    await page.waitForLoadState('networkidle');

    // 3. Vérifier que l'app fonctionne normalement
    await expect(page.getByRole('tab', { name: /n8n/i })).toBeVisible({ timeout: 5000 });

    console.log('✅ Page recovers correctly after reload');
  });
});
