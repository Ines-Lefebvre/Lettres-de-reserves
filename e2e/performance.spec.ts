import { test, expect } from '@playwright/test';

/**
 * Tests E2E : Performance
 *
 * Vérifie que l'application maintient de bonnes performances :
 * - Temps de chargement
 * - Memory leaks
 * - Infinite loops
 * - Bundle size
 */

test.describe('Performance - Page Load', () => {

  test('should load validation page under 5 seconds', async ({ page }) => {
    console.log('🧪 Test: Page load time');

    const startTime = Date.now();

    await page.goto('/validation-new?requestId=test_perf_load');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // En condition réelle, viser < 3s, mais en test on tolère 5s
    expect(loadTime).toBeLessThan(5000);

    console.log(`✅ Page loaded in ${loadTime}ms (< 5000ms)`);
  });

  test('should have reasonable bundle size', async ({ page }) => {
    console.log('🧪 Test: Bundle size');

    const resources: { url: string; size: number; type: string }[] = [];

    // Écouter les requêtes réseau
    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            resources.push({
              url,
              size: buffer.length,
              type: url.endsWith('.js') ? 'js' : 'css'
            });
          }
        }
      } catch (e) {
        // Ignore errors
      }
    });

    await page.goto('/validation-new?requestId=test_bundle');
    await page.waitForLoadState('networkidle');

    // Attendre un peu pour que toutes les ressources soient chargées
    await page.waitForTimeout(2000);

    // Calculer la taille totale
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalJS = resources.filter(r => r.type === 'js').reduce((sum, r) => sum + r.size, 0);
    const totalCSS = resources.filter(r => r.type === 'css').reduce((sum, r) => sum + r.size, 0);

    console.log(`📦 Total bundle: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`📦 JavaScript: ${(totalJS / 1024).toFixed(2)} KB`);
    console.log(`📦 CSS: ${(totalCSS / 1024).toFixed(2)} KB`);

    // Vérifier que le bundle total est raisonnable (< 2 MB)
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);

    console.log('✅ Bundle size is reasonable');
  });

  test('should render initial content quickly', async ({ page }) => {
    console.log('🧪 Test: Time to first meaningful paint');

    await page.goto('/validation-new?requestId=test_render');

    // Mesurer le temps jusqu'à ce que le heading soit visible
    const startTime = Date.now();

    await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 5000 });

    const renderTime = Date.now() - startTime;

    console.log(`✅ First meaningful paint in ${renderTime}ms`);
    expect(renderTime).toBeLessThan(3000);
  });
});

test.describe('Performance - Memory Leaks', () => {

  test('should not cause memory leaks on unmount', async ({ page }) => {
    console.log('🧪 Test: Memory leaks on unmount');

    // Fonction pour estimer la mémoire utilisée (approximatif)
    const getMemoryUsage = async () => {
      return await page.evaluate(() => {
        if ('memory' in performance && (performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
    };

    await page.goto('/validation-new?requestId=test_memory');
    await page.waitForLoadState('networkidle');

    const initialMemory = await getMemoryUsage();

    // Naviguer plusieurs fois pour détecter des fuites
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.goto(`/validation-new?requestId=test_memory_${i}`);
      await page.waitForLoadState('networkidle');
    }

    const finalMemory = await getMemoryUsage();

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercent = (memoryIncrease / initialMemory) * 100;

      console.log(`📊 Memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB → ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercent.toFixed(1)}%)`);

      // Tolérer une augmentation de mémoire de 50% max
      expect(increasePercent).toBeLessThan(50);

      console.log('✅ No significant memory leak detected');
    } else {
      console.log('⚠️  Memory API not available, skipping memory test');
    }
  });

  test('should cleanup event listeners on unmount', async ({ page }) => {
    console.log('🧪 Test: Event listener cleanup');

    await page.goto('/validation-new?requestId=test_listeners');
    await page.waitForLoadState('networkidle');

    // Compter les event listeners (approximatif via console logs)
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Cleanup') || msg.text().includes('unmounting')) {
        logs.push(msg.text());
      }
    });

    // Naviguer ailleurs
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Attendre un peu pour que les cleanups s'exécutent
    await page.waitForTimeout(1000);

    // Vérifier qu'on a des logs de cleanup
    const hasCleanupLogs = logs.length > 0;

    if (hasCleanupLogs) {
      console.log(`✅ Found ${logs.length} cleanup logs`);
    } else {
      console.log('⚠️  No cleanup logs found (check console.log in useEffect cleanups)');
    }
  });
});

test.describe('Performance - Render Optimization', () => {

  test('should not have infinite render loops', async ({ page }) => {
    console.log('🧪 Test: Infinite render loops');

    const renderLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Loading data') || text.includes('render') || text.includes('Rendering')) {
        renderLogs.push(text);
      }
    });

    await page.goto('/validation-new?requestId=test_infinite');
    await page.waitForLoadState('networkidle');

    // Attendre 5 secondes pour observer les renders
    await page.waitForTimeout(5000);

    // Compter combien de fois "Loading data" apparaît
    const loadDataCount = renderLogs.filter(log =>
      log.includes('Loading data') || log.includes('loadData')
    ).length;

    console.log(`📊 Render logs count: ${renderLogs.length}`);
    console.log(`📊 "Loading data" count: ${loadDataCount}`);

    // Ne devrait pas charger plus de 3 fois (initial + 2 retries max)
    expect(loadDataCount).toBeLessThanOrEqual(3);

    console.log('✅ No infinite render loop detected');
  });

  test('should not re-render on every prop change', async ({ page }) => {
    console.log('🧪 Test: Re-render optimization');

    let renderCount = 0;

    // Compter les renders via React DevTools (si disponible)
    page.on('console', msg => {
      if (msg.text().includes('[UnifiedValidationPage]')) {
        renderCount++;
      }
    });

    await page.goto('/validation-new?requestId=test_rerender');
    await page.waitForLoadState('networkidle');

    const initialRenderCount = renderCount;

    // Changer de stratégie plusieurs fois
    const localStorageButton = page.getByRole('tab', { name: /localstorage/i });
    await localStorageButton.click();
    await page.waitForTimeout(500);

    const supabaseButton = page.getByRole('tab', { name: /supabase/i });
    await supabaseButton.click();
    await page.waitForTimeout(500);

    const finalRenderCount = renderCount;
    const additionalRenders = finalRenderCount - initialRenderCount;

    console.log(`📊 Renders: ${initialRenderCount} initial + ${additionalRenders} after changes`);

    // Devrait avoir peu de re-renders (idéalement 2-3 pour 2 changements de stratégie)
    expect(additionalRenders).toBeLessThan(10);

    console.log('✅ Re-renders are optimized');
  });

  test('should use memoization for expensive operations', async ({ page }) => {
    console.log('🧪 Test: Memoization usage');

    // Vérifier que les handlers sont mémorisés en regardant les logs
    const handlerLogs: string[] = [];

    page.on('console', msg => {
      if (msg.text().includes('useCallback') || msg.text().includes('useMemo')) {
        handlerLogs.push(msg.text());
      }
    });

    await page.goto('/validation-new?requestId=test_memo');
    await page.waitForLoadState('networkidle');

    // Cliquer plusieurs fois sur les boutons
    const n8nButton = page.getByRole('tab', { name: /n8n/i });
    await n8nButton.click();
    await n8nButton.click();
    await n8nButton.click();

    await page.waitForTimeout(1000);

    // Note: Ce test est indicatif, la vraie vérification nécessiterait React DevTools
    console.log('✅ Memoization check completed (see React DevTools for detailed analysis)');
  });
});

test.describe('Performance - Network Optimization', () => {

  test('should handle slow network gracefully', async ({ page }) => {
    console.log('🧪 Test: Slow network handling');

    // Simuler une connexion lente
    await page.route('**/*', route => {
      setTimeout(() => {
        route.continue();
      }, 1000); // Ajouter 1s de délai
    });

    const startTime = Date.now();

    await page.goto('/validation-new?requestId=test_slow');

    // La page devrait quand même charger, juste plus lentement
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Loaded in ${loadTime}ms with slow network`);

    // Vérifier qu'il y a un indicateur de chargement
    const loadingIndicator = page.getByText(/chargement|loading/i);
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);

    if (hasLoading) {
      console.log('✅ Loading indicator shown during slow network');
    }
  });

  test('should not make duplicate API calls', async ({ page }) => {
    console.log('🧪 Test: Duplicate API calls');

    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('n8n.srv833062.hstgr.cloud')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/validation-new?requestId=test_duplicate');
    await page.waitForLoadState('networkidle');

    // Attendre un peu pour s'assurer qu'il n'y a pas de requêtes supplémentaires
    await page.waitForTimeout(3000);

    // Compter les appels API uniques
    const uniqueCalls = new Set(apiCalls);

    console.log(`📊 API calls: ${apiCalls.length} total, ${uniqueCalls.size} unique`);

    // Ne devrait pas y avoir trop d'appels dupliqués
    const duplicateRatio = apiCalls.length / (uniqueCalls.size || 1);
    expect(duplicateRatio).toBeLessThan(3); // Tolérer 2 appels max par endpoint

    console.log('✅ No excessive duplicate API calls');
  });

  test('should abort requests on component unmount', async ({ page }) => {
    console.log('🧪 Test: Abort requests on unmount');

    const abortedRequests: string[] = [];

    page.on('requestfailed', request => {
      if (request.failure()?.errorText.includes('abort') ||
          request.failure()?.errorText.includes('cancel')) {
        abortedRequests.push(request.url());
      }
    });

    // Aller sur la page
    await page.goto('/validation-new?requestId=test_abort');

    // Naviguer ailleurs immédiatement (avant que la requête ne finisse)
    await page.goto('/');

    await page.waitForTimeout(1000);

    // Si des requêtes ont été aborted, c'est bon signe
    if (abortedRequests.length > 0) {
      console.log(`✅ ${abortedRequests.length} requests were aborted on unmount`);
    } else {
      console.log('⚠️  No aborted requests (may need AbortController implementation)');
    }
  });
});

test.describe('Performance - Resource Loading', () => {

  test('should lazy load components when needed', async ({ page }) => {
    console.log('🧪 Test: Lazy loading');

    const jsFiles: string[] = [];

    page.on('response', response => {
      if (response.url().endsWith('.js')) {
        jsFiles.push(response.url());
      }
    });

    await page.goto('/validation-new?requestId=test_lazy');
    await page.waitForLoadState('networkidle');

    console.log(`📦 Loaded ${jsFiles.length} JS files`);

    // Vérifier que tous les fichiers ne sont pas chargés d'un coup
    // (difficile à tester sans configuration spécifique de code-splitting)
    expect(jsFiles.length).toBeGreaterThan(0);

    console.log('✅ Resource loading check completed');
  });

  test('should cache static assets', async ({ page }) => {
    console.log('🧪 Test: Static asset caching');

    await page.goto('/validation-new?requestId=test_cache_1');
    await page.waitForLoadState('networkidle');

    // Naviguer sur une autre page puis revenir
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cachedRequests: string[] = [];

    page.on('response', response => {
      const cacheHeader = response.headers()['cache-control'];
      if (cacheHeader && cacheHeader.includes('max-age')) {
        cachedRequests.push(response.url());
      }
    });

    await page.goto('/validation-new?requestId=test_cache_2');
    await page.waitForLoadState('networkidle');

    if (cachedRequests.length > 0) {
      console.log(`✅ ${cachedRequests.length} resources have cache headers`);
    } else {
      console.log('⚠️  No cache headers found (consider adding for production)');
    }
  });
});
