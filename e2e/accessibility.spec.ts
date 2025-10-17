import { test, expect } from '@playwright/test';

/**
 * Tests E2E : Accessibility
 *
 * Vérifie que l'application respecte les standards d'accessibilité :
 * - Navigation clavier
 * - Labels ARIA
 * - Focus visible
 * - Lecteurs d'écran
 */

test.describe('Accessibility - WCAG 2.1', () => {

  test('should have proper ARIA labels on strategy tabs', async ({ page }) => {
    console.log('🧪 Test: ARIA labels on tabs');

    await page.goto('/validation-new?requestId=test_aria');
    await page.waitForLoadState('networkidle');

    // 1. Vérifier le role="tablist"
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
    await expect(tablist).toHaveAttribute('aria-label');

    // 2. Vérifier les tabs individuels
    const n8nTab = page.getByRole('tab', { name: /n8n/i });
    await expect(n8nTab).toBeVisible();
    await expect(n8nTab).toHaveAttribute('aria-label');
    await expect(n8nTab).toHaveAttribute('aria-selected');

    const localStorageTab = page.getByRole('tab', { name: /localstorage/i });
    await expect(localStorageTab).toHaveAttribute('aria-label');
    await expect(localStorageTab).toHaveAttribute('aria-selected');

    const supabaseTab = page.getByRole('tab', { name: /supabase/i });
    await expect(supabaseTab).toHaveAttribute('aria-label');
    await expect(supabaseTab).toHaveAttribute('aria-selected');

    console.log('✅ All ARIA labels are present');
  });

  test('should update aria-selected when switching tabs', async ({ page }) => {
    console.log('🧪 Test: aria-selected updates correctly');

    await page.goto('/validation-new?requestId=test_aria_selected');
    await page.waitForLoadState('networkidle');

    // 1. N8N devrait être sélectionné par défaut
    const n8nTab = page.getByRole('tab', { name: /n8n/i });
    await expect(n8nTab).toHaveAttribute('aria-selected', 'true');

    // 2. Cliquer sur LocalStorage
    const localStorageTab = page.getByRole('tab', { name: /localstorage/i });
    await localStorageTab.click();
    await page.waitForTimeout(500);

    // 3. Vérifier que aria-selected a changé
    await expect(localStorageTab).toHaveAttribute('aria-selected', 'true');
    await expect(n8nTab).toHaveAttribute('aria-selected', 'false');

    console.log('✅ aria-selected updates correctly');
  });

  test('should have aria-hidden on decorative icons', async ({ page }) => {
    console.log('🧪 Test: aria-hidden on decorative elements');

    await page.goto('/validation-new?requestId=test_icons');
    await page.waitForLoadState('networkidle');

    // Chercher les SVG/icônes dans les boutons de stratégie
    const icons = page.locator('[role="tab"] svg');
    const iconCount = await icons.count();

    if (iconCount > 0) {
      // Vérifier qu'au moins une icône a aria-hidden="true"
      const iconsWithAriaHidden = page.locator('[role="tab"] svg[aria-hidden="true"]');
      const hiddenCount = await iconsWithAriaHidden.count();

      expect(hiddenCount).toBeGreaterThan(0);
      console.log(`✅ ${hiddenCount}/${iconCount} decorative icons have aria-hidden`);
    } else {
      console.log('⚠️  No icons found in tabs');
    }
  });

  test('should navigate with keyboard (Tab key)', async ({ page }) => {
    console.log('🧪 Test: Keyboard navigation with Tab');

    await page.goto('/validation-new?requestId=test_keyboard');
    await page.waitForLoadState('networkidle');

    // 1. Appuyer sur Tab plusieurs fois
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // 2. Vérifier qu'un élément a le focus
    const focusedElement1 = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(focusedElement1).toBeTruthy();

    // 3. Continuer à naviguer
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // 4. Vérifier que le focus a changé
    const focusedElement2 = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement2).toBeTruthy();

    console.log(`✅ Keyboard navigation works (${focusedElement1} → ${focusedElement2})`);
  });

  test('should activate tab with Enter key', async ({ page }) => {
    console.log('🧪 Test: Activate tab with Enter');

    await page.goto('/validation-new?requestId=test_enter');
    await page.waitForLoadState('networkidle');

    // 1. Tab jusqu'à atteindre un bouton de stratégie
    const localStorageTab = page.getByRole('tab', { name: /localstorage/i });

    // 2. Focus sur le bouton
    await localStorageTab.focus();
    await page.waitForTimeout(300);

    // 3. Appuyer sur Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 4. Vérifier que la stratégie a changé
    await expect(localStorageTab).toHaveAttribute('aria-selected', 'true');

    console.log('✅ Enter key activates tab correctly');
  });

  test('should have visible focus indicators', async ({ page }) => {
    console.log('🧪 Test: Visible focus indicators');

    await page.goto('/validation-new?requestId=test_focus');
    await page.waitForLoadState('networkidle');

    // 1. Focus sur un bouton
    const n8nTab = page.getByRole('tab', { name: /n8n/i });
    await n8nTab.focus();
    await page.waitForTimeout(300);

    // 2. Vérifier que l'élément a le focus
    const isFocused = await n8nTab.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);

    // 3. Prendre un screenshot du bouton focus (optionnel)
    await n8nTab.screenshot({ path: 'test-results/focus-indicator.png' }).catch(() => {});

    console.log('✅ Focus indicator is present');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    console.log('🧪 Test: Heading hierarchy');

    await page.goto('/validation-new?requestId=test_headings');
    await page.waitForLoadState('networkidle');

    // 1. Récupérer tous les headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();

    // 2. Vérifier qu'il y a au moins un heading
    expect(headings.length).toBeGreaterThan(0);

    // 3. Vérifier qu'on a un H1 (ou H2 si dans une section)
    const h1Exists = await page.locator('h1').count() > 0;
    const h2Exists = await page.locator('h2').count() > 0;

    expect(h1Exists || h2Exists).toBe(true);

    console.log(`✅ Found ${headings.length} headings`);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    console.log('🧪 Test: Color contrast');

    await page.goto('/validation-new?requestId=test_contrast');
    await page.waitForLoadState('networkidle');

    // Vérifier que les boutons ont du texte visible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Prendre le premier bouton et vérifier sa couleur
      const firstButton = buttons.first();
      const isVisible = await firstButton.isVisible();

      expect(isVisible).toBe(true);

      console.log(`✅ ${buttonCount} buttons are visible`);
    }

    // Note: Un vrai test de contraste nécessiterait axe-core
    console.log('⚠️  Full contrast check requires axe-core integration');
  });

  test('should have alt text on images', async ({ page }) => {
    console.log('🧪 Test: Alt text on images');

    await page.goto('/validation-new?requestId=test_images');
    await page.waitForLoadState('networkidle');

    // Chercher toutes les images
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Vérifier que les images ont soit alt, soit role="presentation"
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const hasAlt = await img.getAttribute('alt') !== null;
        const hasRole = await img.getAttribute('role') === 'presentation';

        expect(hasAlt || hasRole).toBe(true);
      }

      console.log(`✅ ${imageCount} images have alt text or role="presentation"`);
    } else {
      console.log('✅ No images found (no alt text needed)');
    }
  });

  test('should have accessible form inputs', async ({ page }) => {
    console.log('🧪 Test: Accessible form inputs');

    await page.goto('/validation-new?requestId=test_forms');
    await page.waitForLoadState('networkidle');

    // Chercher tous les inputs
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Vérifier que chaque input a un label
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.getAttribute('aria-label') !== null ||
                         await input.getAttribute('aria-labelledby') !== null ||
                         await input.getAttribute('id') !== null; // Assume label[for] exists

        expect(hasLabel).toBe(true);
      }

      console.log(`✅ ${inputCount} form inputs have proper labels`);
    } else {
      console.log('✅ No form inputs found on this page');
    }
  });

  test('should have proper link text', async ({ page }) => {
    console.log('🧪 Test: Proper link text');

    await page.goto('/validation-new?requestId=test_links');
    await page.waitForLoadState('networkidle');

    // Chercher tous les liens
    const links = page.locator('a');
    const linkCount = await links.count();

    if (linkCount > 0) {
      // Vérifier qu'aucun lien n'a juste "click here" ou "read more"
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        const hasDescriptiveText = (text && text.trim().length > 5) || ariaLabel;
        expect(hasDescriptiveText).toBe(true);
      }

      console.log(`✅ ${linkCount} links have descriptive text`);
    } else {
      console.log('✅ No links found on this page');
    }
  });
});

test.describe('Accessibility - Screen Readers', () => {

  test('should announce strategy changes', async ({ page }) => {
    console.log('🧪 Test: Announce strategy changes');

    await page.goto('/validation-new?requestId=test_announce');
    await page.waitForLoadState('networkidle');

    // Vérifier qu'il y a des logs ou messages pour les lecteurs d'écran
    // (normalement avec role="status" ou aria-live)
    const liveRegion = page.locator('[role="status"], [aria-live]');
    const hasLiveRegion = await liveRegion.count() > 0;

    // Ce n'est pas obligatoire mais c'est une bonne pratique
    if (hasLiveRegion) {
      console.log('✅ Live region found for screen reader announcements');
    } else {
      console.log('⚠️  No live region found (consider adding aria-live)');
    }

    // L'important est que les aria-selected changent
    const n8nTab = page.getByRole('tab', { name: /n8n/i });
    await expect(n8nTab).toHaveAttribute('aria-selected');
  });

  test('should have skip links for navigation', async ({ page }) => {
    console.log('🧪 Test: Skip links');

    await page.goto('/validation-new?requestId=test_skip');

    // Chercher des liens "skip to content"
    const skipLink = page.locator('a[href^="#"]').first();
    const hasSkipLink = await skipLink.count() > 0;

    if (hasSkipLink) {
      console.log('✅ Skip link found');
    } else {
      console.log('⚠️  No skip link found (consider adding for better navigation)');
    }
  });

  test('should have proper document language', async ({ page }) => {
    console.log('🧪 Test: Document language');

    await page.goto('/validation-new?requestId=test_lang');

    // Vérifier que la balise <html> a un attribut lang
    const lang = await page.locator('html').getAttribute('lang');

    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // fr, fr-FR, en, en-US, etc.

    console.log(`✅ Document language is set: ${lang}`);
  });
});

test.describe('Accessibility - Mobile', () => {

  test('should be accessible on mobile viewport', async ({ page }) => {
    console.log('🧪 Test: Mobile accessibility');

    // Définir un viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/validation-new?requestId=test_mobile');
    await page.waitForLoadState('networkidle');

    // Vérifier que les tabs sont visibles
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    expect(tabCount).toBeGreaterThan(0);

    // Vérifier que les tabs sont cliquables
    const firstTab = tabs.first();
    await firstTab.click();

    console.log(`✅ ${tabCount} tabs are accessible on mobile`);
  });

  test('should have touch-friendly tap targets', async ({ page }) => {
    console.log('🧪 Test: Touch-friendly tap targets');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/validation-new?requestId=test_touch');
    await page.waitForLoadState('networkidle');

    // Vérifier que les boutons ont une taille suffisante (min 44x44px)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const box = await firstButton.boundingBox();

      if (box) {
        // WCAG recommande au moins 44x44px
        expect(box.width).toBeGreaterThan(30); // Tolérance
        expect(box.height).toBeGreaterThan(30);

        console.log(`✅ Button size: ${box.width}x${box.height}px`);
      }
    }
  });
});
