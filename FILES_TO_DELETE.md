# Fichiers à Supprimer (Phase 2)

Cette liste contient tous les fichiers qui doivent être supprimés manuellement car ils ne sont plus utilisés après le refactoring radical.

## 📁 Dossiers Complets

```bash
src/strategies/                    # Tout le système de stratégies (over-engineering)
e2e/                               # Tests E2E non utilisés
```

## 📄 Pages en Doublon

```bash
src/pages/Login.tsx
src/pages/WebhookResponse.tsx
src/pages/ValidationPageNew.tsx
src/pages/ValidationPageFullDB.tsx
src/pages/UnifiedValidationPage.tsx
```

## 🧩 Composants Inutilisés

```bash
src/components/Header.tsx
src/components/Footer.tsx
src/components/LazyVideo.tsx
src/components/RequestIdDebugPanel.tsx
src/components/AuthGuard.tsx
src/components/ValidationTestPanel.tsx
```

## 🪝 Hooks Inutilisés

```bash
src/hooks/useRequestId.ts
src/hooks/useRequestId.test.ts
src/hooks/README.md
```

## 🛠️ Utils Inutilisés

```bash
src/utils/storage.ts
src/utils/normalize.ts
src/utils/normalize.test.ts
src/utils/debugUtils.ts
src/utils/n8nApiClient.ts
src/utils/supabaseClient.ts
```

## 📚 Documentation Complexe

```bash
SP-01_INDEXATION_COMPLETE.md
SP-02_AUDIT_UPLOAD_DETAILLE.md
SP-03_AUDIT_N8N_VALIDATION_STRATEGY.md
SP-04_AUDIT_UNIFIED_VALIDATION_PAGE.md
SP-04_CORRECTIFS_APPLIQUES.md
SP-04_CORRECTIFS_VALIDATION.md
IMPLEMENTATION_COMPLETE.md
VALIDATION_STRATEGIES_IMPLEMENTATION.md
UNIFIED_VALIDATION_PAGE.md
BOLT_CORRECTION_N8N_STRATEGY.md
FINAL_INTEGRATION_REPORT.md
FINAL_SUMMARY.md
MIGRATION_REPORT.md
INTEGRATION_GUIDE.md
CORRECTIFS_APPLIQUES.md
CODE_COMPARISON_ANALYSIS.md
BUSINESS_FLOW_DESCRIPTION.md
HOOK_IMPLEMENTATION_SUMMARY.md
FICHIERS_INDEXATION_DETAILLEE.md
SESSION_COMPLETE_SUMMARY.md
E2E_TESTS.md
E2E_TESTS_COMPLETE.md
WINDSURF_BRIEF.md
colors.md
```

## 🧪 Fichiers de Test

```bash
playwright.config.ts
```

## 📝 Scripts Temporaires

```bash
cleanup.sh                         # Ce script lui-même après exécution
FILES_TO_DELETE.md                # Ce fichier après nettoyage
```

---

## ✅ Commandes de Suppression

Pour supprimer tous ces fichiers d'un coup :

```bash
# Dossiers
rm -rf src/strategies e2e

# Pages
rm -f src/pages/Login.tsx \
      src/pages/WebhookResponse.tsx \
      src/pages/ValidationPageNew.tsx \
      src/pages/ValidationPageFullDB.tsx \
      src/pages/UnifiedValidationPage.tsx

# Composants
rm -f src/components/Header.tsx \
      src/components/Footer.tsx \
      src/components/LazyVideo.tsx \
      src/components/RequestIdDebugPanel.tsx \
      src/components/AuthGuard.tsx \
      src/components/ValidationTestPanel.tsx

# Hooks
rm -rf src/hooks

# Utils
rm -f src/utils/storage.ts \
      src/utils/normalize.ts \
      src/utils/normalize.test.ts \
      src/utils/debugUtils.ts \
      src/utils/n8nApiClient.ts \
      src/utils/supabaseClient.ts

# Docs
rm -f SP-*.md \
      IMPLEMENTATION_*.md \
      VALIDATION_*.md \
      UNIFIED_*.md \
      BOLT_*.md \
      FINAL_*.md \
      MIGRATION_*.md \
      INTEGRATION_*.md \
      CORRECTIFS_*.md \
      CODE_*.md \
      BUSINESS_*.md \
      HOOK_*.md \
      FICHIERS_*.md \
      SESSION_*.md \
      E2E_*.md \
      WINDSURF_*.md \
      colors.md

# Tests
rm -f playwright.config.ts

# Nettoyage
rm -f cleanup.sh FILES_TO_DELETE.md
```

---

## 📊 Impact Estimé

- **Fichiers supprimés** : ~60 fichiers
- **Lignes de code supprimées** : ~15,000 lignes
- **Dossiers supprimés** : 3 dossiers
- **Taille libérée** : ~500 KB

---

## ⚠️ Important

Avant de supprimer, assurez-vous que :

1. ✅ Le build fonctionne (`npm run build`)
2. ✅ Les 2 routes fonctionnent (/ et /validation)
3. ✅ Aucune erreur TypeScript
4. ✅ Commit du code actuel en backup
