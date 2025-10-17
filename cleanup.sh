#!/bin/bash

echo "🗑️  PHASE 2 : NETTOYAGE COMPLET"
echo ""

# Supprimer le dossier strategies
echo "Suppression src/strategies/..."
rm -rf src/strategies

# Supprimer les pages en doublon
echo "Suppression pages en doublon..."
rm -f src/pages/Login.tsx
rm -f src/pages/WebhookResponse.tsx
rm -f src/pages/ValidationPageNew.tsx
rm -f src/pages/ValidationPageFullDB.tsx
rm -f src/pages/UnifiedValidationPage.tsx

# Supprimer les composants inutilisés
echo "Suppression composants inutilisés..."
rm -f src/components/Header.tsx
rm -f src/components/Footer.tsx
rm -f src/components/LazyVideo.tsx
rm -f src/components/RequestIdDebugPanel.tsx
rm -f src/components/AuthGuard.tsx
rm -f src/components/ValidationTestPanel.tsx

# Supprimer les hooks inutilisés
echo "Suppression hooks inutilisés..."
rm -f src/hooks/useRequestId.ts
rm -f src/hooks/useRequestId.test.ts

# Supprimer les utils inutilisés
echo "Suppression utils inutilisés..."
rm -f src/utils/storage.ts
rm -f src/utils/normalize.ts
rm -f src/utils/normalize.test.ts
rm -f src/utils/debugUtils.ts
rm -f src/utils/n8nApiClient.ts
rm -f src/utils/supabaseClient.ts

# Supprimer la documentation complexe
echo "Suppression documentation complexe..."
rm -f SP-01_INDEXATION_COMPLETE.md
rm -f SP-02_AUDIT_UPLOAD_DETAILLE.md
rm -f SP-03_AUDIT_N8N_VALIDATION_STRATEGY.md
rm -f SP-04_AUDIT_UNIFIED_VALIDATION_PAGE.md
rm -f SP-04_CORRECTIFS_APPLIQUES.md
rm -f SP-04_CORRECTIFS_VALIDATION.md
rm -f IMPLEMENTATION_COMPLETE.md
rm -f VALIDATION_STRATEGIES_IMPLEMENTATION.md
rm -f UNIFIED_VALIDATION_PAGE.md
rm -f BOLT_CORRECTION_N8N_STRATEGY.md
rm -f FINAL_INTEGRATION_REPORT.md
rm -f FINAL_SUMMARY.md
rm -f MIGRATION_REPORT.md
rm -f INTEGRATION_GUIDE.md
rm -f CORRECTIFS_APPLIQUES.md
rm -f CODE_COMPARISON_ANALYSIS.md
rm -f BUSINESS_FLOW_DESCRIPTION.md
rm -f HOOK_IMPLEMENTATION_SUMMARY.md
rm -f FICHIERS_INDEXATION_DETAILLEE.md
rm -f SESSION_COMPLETE_SUMMARY.md
rm -f E2E_TESTS.md
rm -f E2E_TESTS_COMPLETE.md
rm -f WINDSURF_BRIEF.md
rm -f colors.md

# Supprimer les tests E2E
echo "Suppression tests E2E..."
rm -rf e2e/
rm -f playwright.config.ts

# Supprimer le dossier hooks s'il est vide
echo "Nettoyage dossiers vides..."
rmdir src/hooks 2>/dev/null || true

echo ""
echo "✅ Nettoyage terminé !"
