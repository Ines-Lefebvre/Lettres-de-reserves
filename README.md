# Lettres de réserves - Application de validation

Application simple pour uploader et valider des lettres de réserves via n8n.

## 🚀 Démarrage

```bash
# Installation
npm install

# Développement
npm run dev

# Build production
npm run build
```

## 📁 Structure

```
src/
├── pages/
│   ├── Upload.tsx          ← Upload de fichiers
│   └── ValidationPage.tsx  ← Validation des données
├── utils/
│   ├── n8nApi.ts          ← Client API n8n
│   └── envDiagnostic.ts   ← Diagnostic des variables d'env
├── components/
│   ├── LoadingSpinner.tsx ← Spinner de chargement
│   └── ValidationErrorBoundary.tsx ← Gestion d'erreurs
└── App.tsx                 ← Routes
```

## 🔧 Configuration

L'endpoint n8n est actuellement hardcodé dans `src/utils/n8nApi.ts` :

```typescript
const N8N_ENDPOINT = 'https://n8n.srv833062.hstgr.cloud/webhook/validation';
```

**Note** : Les variables d'environnement `VITE_*` ne sont pas fonctionnelles en production pour le moment. C'est pourquoi l'endpoint est hardcodé.

Pour plus d'informations sur le problème des variables d'environnement, voir `TROUBLESHOOTING_ENV.md`.

## 📊 Workflow

1. **Upload** : L'utilisateur upload un fichier PDF
2. **Traitement n8n** : n8n extrait les données du document
3. **Validation** : Affichage des données extraites au format JSON
4. **Actions** : Possibilité de copier le JSON ou recharger les données

## 🎯 Simplicité

Ce projet suit le principe KISS (Keep It Simple, Stupid) :

- ✅ Pas de over-engineering
- ✅ Code facile à comprendre et maintenir
- ✅ Endpoint hardcodé temporairement pour débloquer la production
- ✅ Ça marche en production !

## 🔍 Diagnostic

Au démarrage de l'application, un diagnostic des variables d'environnement est automatiquement affiché dans la console du navigateur. Cela permet de vérifier quelles variables sont disponibles.

## 📝 Routes

- `/` - Page d'upload
- `/validation?requestId=XXX` - Page de validation des données

## 🛠️ Technologies

- **React** + **TypeScript**
- **React Router** pour la navigation
- **Tailwind CSS** pour le styling
- **Vite** comme build tool
- **n8n** pour le traitement backend

## 📚 Documentation Technique

- `TROUBLESHOOTING_ENV.md` - Guide de résolution des problèmes de variables d'environnement
- `src/utils/envDiagnostic.ts` - Utilitaire de diagnostic des variables d'env

## 🚨 Notes Importantes

1. **Variables d'environnement** : Actuellement non fonctionnelles en production, d'où l'endpoint hardcodé
2. **Architecture simple** : Refactorisation radicale pour une base de code maintenable
3. **Production ready** : L'application fonctionne actuellement en production avec l'endpoint hardcodé
