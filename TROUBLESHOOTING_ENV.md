# Troubleshooting : Variables d'Environnement

**Date** : 2025-10-10
**Status** : 🔥 **CRITIQUE - ENDPOINT HARDCODÉ EN PRODUCTION**

---

## 🔴 Problème Actuel

Les variables d'environnement `VITE_*` ne sont PAS accessibles au runtime en production.

### Symptômes

1. `import.meta.env.VITE_VALIDATION_ENDPOINT` retourne `undefined` en production
2. `N8nValidationStrategy.canUse()` retourne `false`
3. Message d'erreur : "Stratégie n8n non disponible (endpoint manquant)"
4. Impossible de charger les données depuis n8n

---

## 🔍 Diagnostic

### Vérifier dans la Console du Navigateur

Ouvre la console du navigateur sur l'environnement de production :

```javascript
console.log(import.meta.env.VITE_VALIDATION_ENDPOINT);
// Attendu : "https://n8n.srv833062.hstgr.cloud/webhook/validation"
// Réel en prod : undefined ❌
```

### Vérifier Toutes les Variables

```javascript
console.log(Object.keys(import.meta.env));
// Devrait lister toutes les variables VITE_*
```

### Diagnostic Automatique

L'application log automatiquement les variables au démarrage :

```
🔍 Diagnostic des Variables d'Environnement
  Mode: production
  Dev: false
  Prod: true
  Base URL: /

📋 Toutes les variables disponibles (clés uniquement):
  Count: 4
  Keys: ["MODE", "DEV", "PROD", "BASE_URL"]

🎯 Variables VITE_ attendues:
  ❌ VITE_VALIDATION_ENDPOINT: UNDEFINED
  ❌ VITE_SUPABASE_URL: UNDEFINED
  ❌ VITE_SUPABASE_ANON_KEY: UNDEFINED
```

---

## ✅ Solution Temporaire Actuelle (EN PRODUCTION)

### Status : 🔥 DÉPLOYÉ

**Fichier** : `src/strategies/N8nValidationStrategy.ts`

```typescript
export class N8nValidationStrategy extends ValidationStrategy {
  // 🔥 HARDCODÉ POUR DÉBLOQUER LA PRODUCTION
  private readonly ENDPOINT = 'https://n8n.srv833062.hstgr.cloud/webhook/validation';

  async canUse(): Promise<boolean> {
    // ✅ TOUJOURS TRUE (endpoint hardcodé)
    return !!this.context.requestId;
  }
}
```

### Avantages ✅
- Application fonctionnelle immédiatement
- Pas de dépendance aux variables d'environnement
- N8N accessible en production

### Inconvénients ⚠️
- Endpoint non configurable
- Nécessite un rebuild pour changer l'endpoint
- Non optimal pour les environnements multiples (dev/staging/prod)

---

## 🔧 Solutions Permanentes À Tester

### Solution 1 : Fichier `.env.production`

**Status** : 📋 À TESTER

#### Étapes

1. **Créer** `.env.production` à la racine du projet :

```bash
# .env.production
VITE_VALIDATION_ENDPOINT=https://n8n.srv833062.hstgr.cloud/webhook/validation
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **Build** :

```bash
npm run build
```

3. **Vérifier** que les variables sont injectées :

```bash
grep -r "VITE_VALIDATION_ENDPOINT" dist/assets/*.js
# Devrait afficher la valeur réelle
```

#### Test de Validation

```javascript
// Ouvre dist/index.html dans un navigateur
console.log(import.meta.env.VITE_VALIDATION_ENDPOINT);
// Doit afficher : "https://n8n.srv833062.hstgr.cloud/webhook/validation"
```

---

### Solution 2 : Configuration Netlify

**Status** : 📋 À TESTER (si hosting = Netlify)

#### Option A : netlify.toml

**Créer/Modifier** `netlify.toml` :

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_VALIDATION_ENDPOINT = "https://n8n.srv833062.hstgr.cloud/webhook/validation"
  VITE_SUPABASE_URL = "https://xxx.supabase.co"
  VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Option B : Dashboard Netlify

1. Dashboard Netlify → Site settings
2. Build & deploy → Environment variables
3. Ajouter :
   - `VITE_VALIDATION_ENDPOINT`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Redéployer le site

---

### Solution 3 : Configuration Vercel

**Status** : 📋 À TESTER (si hosting = Vercel)

#### Dashboard Vercel

1. Dashboard Vercel → Projet → Settings
2. Environment Variables
3. Ajouter pour **Production** :
   - `VITE_VALIDATION_ENDPOINT` = `https://n8n.srv833062.hstgr.cloud/webhook/validation`
   - `VITE_SUPABASE_URL` = `https://xxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOi...`

4. Redéployer

#### vercel.json (optionnel)

```json
{
  "buildCommand": "npm run build",
  "env": {
    "VITE_VALIDATION_ENDPOINT": "https://n8n.srv833062.hstgr.cloud/webhook/validation"
  }
}
```

---

### Solution 4 : Build-time Injection (Vite Config)

**Status** : 📋 À TESTER

#### Modifier `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Injection build-time avec fallback
  define: {
    'import.meta.env.VITE_VALIDATION_ENDPOINT': JSON.stringify(
      process.env.VITE_VALIDATION_ENDPOINT ||
      'https://n8n.srv833062.hstgr.cloud/webhook/validation'
    ),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
      'https://xxx.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    )
  }
});
```

#### Avantages
- Fallback si les variables ne sont pas définies
- Fonctionne sur tous les services de hosting

---

## 🎯 Plan de Migration

### Phase 1 : IMMÉDIAT ✅ (ACTUEL)

**Status** : 🔥 EN PRODUCTION

- Endpoint hardcodé dans `N8nValidationStrategy.ts`
- Application fonctionnelle
- Déblocage production immédiat

### Phase 2 : Court terme (1 semaine) 📋

**Objectif** : Tester les 4 solutions et identifier celle qui fonctionne

1. Tester `.env.production` (Solution 1)
2. Tester config hosting (Solution 2 ou 3)
3. Tester injection Vite (Solution 4)
4. Documenter la solution retenue

**Checklist de Test** :

```bash
# 1. Build
npm run build

# 2. Vérifier que les variables sont dans le bundle
grep -r "n8n.srv833062.hstgr.cloud" dist/assets/*.js

# 3. Preview local
npm run preview
# Ouvrir http://localhost:4173
# Console : vérifier import.meta.env.VITE_VALIDATION_ENDPOINT

# 4. Déployer sur staging/production

# 5. Vérifier en production
# Console : vérifier import.meta.env.VITE_VALIDATION_ENDPOINT
```

### Phase 3 : Moyen terme (1 mois) 🎯

**Objectif** : Refactor propre

1. Supprimer le hardcode de `N8nValidationStrategy.ts`
2. Restaurer le code original avec `import.meta.env.VITE_VALIDATION_ENDPOINT`
3. Ajouter des tests pour vérifier les variables au build
4. Documenter la solution finale

---

## 📊 Checklist de Validation

Après chaque tentative de solution :

- [ ] `npm run build` réussit sans erreur
- [ ] Variables présentes dans `dist/assets/*.js`
- [ ] `npm run preview` → Variables accessibles dans console
- [ ] Déploiement → Variables accessibles en production
- [ ] `N8nValidationStrategy.canUse()` retourne `true`
- [ ] Chargement des données fonctionne
- [ ] Pas d'erreur "endpoint manquant"
- [ ] Logs dans console montrent l'endpoint correct

---

## 🚨 Debugging Avancé

### Cas 1 : Variables présentes en dev mais pas en prod

**Cause possible** : Les variables ne sont pas injectées au build

**Solution** :
1. Vérifier `.gitignore` (`.env*` ne doit pas bloquer `.env.production`)
2. Utiliser Solution 4 (injection Vite) pour forcer les valeurs

### Cas 2 : Variables dans le bundle mais undefined au runtime

**Cause possible** : Minification ou tree-shaking supprime les variables

**Solution** :
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: false // Temporairement pour debug
  }
});
```

### Cas 3 : CORS errors avec n8n

**Cause** : n8n ne permet pas les requêtes cross-origin

**Solution** : Vérifier les headers CORS de n8n :
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## 📚 Ressources

### Documentation Vite
- [Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Build Configuration](https://vitejs.dev/config/build-options.html)

### Services de Hosting
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## 🎯 État Actuel

| Composant | Status | Note |
|-----------|--------|------|
| **N8nValidationStrategy** | 🔥 Hardcodé | Endpoint: `https://n8n.srv833062...` |
| **Variables d'environnement** | ❌ Non accessibles | `undefined` en production |
| **Application** | ✅ Fonctionnelle | Grâce au hardcode |
| **Solution permanente** | 📋 À implémenter | Tests en cours |

---

## 📞 Support

Si aucune solution ne fonctionne :

1. Vérifier les logs de build du service de hosting
2. Vérifier que `VITE_*` est bien le prefix utilisé (pas `REACT_APP_*`, pas `NEXT_PUBLIC_*`)
3. Essayer de hardcoder directement dans `vite.config.ts` (Solution 4)
4. En dernier recours : garder le hardcode actuel (fonctionne)

---

**Dernière mise à jour** : 2025-10-10
**Status** : 🔥 ENDPOINT HARDCODÉ - PRODUCTION FONCTIONNELLE
**Prochaine étape** : Tester Solution 1 (`.env.production`)
