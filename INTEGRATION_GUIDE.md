# Guide d'intégration du Hook useRequestId

Ce guide explique comment intégrer le hook `useRequestId` dans vos composants existants et nouveaux.

## 🚀 Démarrage rapide

### 1. Import du hook

```typescript
import { useRequestId } from '../hooks/useRequestId';
```

### 2. Utilisation basique

```typescript
function MyComponent() {
  const { requestId } = useRequestId();

  return <div>Request ID: {requestId}</div>;
}
```

### 3. Activation du debug (recommandé en développement)

```typescript
const { requestId } = useRequestId({ logDebug: true });
```

## 📋 Cas d'usage par composant

### Upload.tsx ✅ (Déjà intégré)

**Situation :** Besoin de générer ou réutiliser un requestId pour tracer l'upload

```typescript
import { useRequestId } from '../hooks/useRequestId';

export default function UploadPage() {
  const { requestId, setRequestId, generateRequestId } = useRequestId({ logDebug: true });

  const handleUpload = async () => {
    // Utiliser ou générer un requestId
    const currentId = requestId || generateRequestId();
    if (!requestId) {
      setRequestId(currentId);
    }

    // Utiliser currentId pour l'upload
    const { error } = await supabase.rpc('rpc_create_upload', {
      p_request_id: currentId,
      // ...
    });
  };

  return (
    <div>
      {/* Interface d'upload */}
    </div>
  );
}
```

### ValidationPage.tsx ✅ (Déjà intégré)

**Situation :** Besoin de récupérer le requestId depuis l'URL ou le storage

```typescript
import { useRequestId } from '../hooks/useRequestId';

export default function ValidationPage() {
  const { requestId: hookRequestId } = useRequestId({ logDebug: true });

  useEffect(() => {
    if (!hookRequestId) {
      console.error('Aucun requestId trouvé');
      return;
    }

    // Charger les données avec le requestId
    const payload = loadValidationPayload(hookRequestId);
    // ...
  }, [hookRequestId]);

  return (
    <div>
      <h1>Validation - Request ID: {hookRequestId}</h1>
      {/* Interface de validation */}
    </div>
  );
}
```

### ValidationPageNew.tsx ⏳ (À intégrer)

**Avant :**
```typescript
const query = useMemo(() => {
  const u = new URL(window.location.href);
  return {
    req_id: u.searchParams.get('req_id') || u.searchParams.get('RequestID') || undefined,
  };
}, []);
```

**Après :**
```typescript
import { useRequestId } from '../hooks/useRequestId';

export default function ValidationPageNew() {
  const { requestId } = useRequestId({ logDebug: true });

  useEffect(() => {
    if (!requestId) {
      setState('error');
      setMeta({ error: 'Request ID manquant' });
      return;
    }

    // Utiliser directement requestId
    fetchValidation({ req_id: requestId });
  }, [requestId]);
}
```

### ValidationPageFullDB.tsx ⏳ (À intégrer)

**Avant :**
```typescript
const recordId = searchParams.get('id');
```

**Après :**
```typescript
import { useRequestId } from '../hooks/useRequestId';

export default function ValidationPageFullDB() {
  const { requestId } = useRequestId({ logDebug: true });
  const recordId = searchParams.get('id') || requestId;

  // Utiliser recordId pour charger les données
}
```

### WebhookResponse.tsx ⏳ (À intégrer si nécessaire)

```typescript
import { useRequestId } from '../hooks/useRequestId';

export default function WebhookResponsePage() {
  const { requestId } = useRequestId();

  return (
    <div>
      <h1>Réponse Webhook</h1>
      <p>Request ID: {requestId || 'Non disponible'}</p>
    </div>
  );
}
```

## 🔧 Panneau de debug

### Ajouter le panneau dans App.tsx (recommandé pour développement)

```typescript
import RequestIdDebugPanel from './components/RequestIdDebugPanel';

function App() {
  const isDevelopment = import.meta.env.DEV;

  return (
    <Routes>
      {/* Vos routes */}
    </Routes>

    {/* Panneau de debug uniquement en développement */}
    {isDevelopment && <RequestIdDebugPanel />}
  );
}
```

### Ajouter le panneau dans une page spécifique

```typescript
import RequestIdDebugPanel from '../components/RequestIdDebugPanel';

export default function MyPage() {
  return (
    <div>
      <h1>Ma Page</h1>
      {/* Contenu */}

      {/* Panneau de debug */}
      <RequestIdDebugPanel />
    </div>
  );
}
```

### Variante conditionnelle basée sur une query string

```typescript
import { useSearchParams } from 'react-router-dom';
import RequestIdDebugPanel from '../components/RequestIdDebugPanel';

export default function MyPage() {
  const [searchParams] = useSearchParams();
  const showDebug = searchParams.get('debug') === 'true';

  return (
    <div>
      <h1>Ma Page</h1>
      {/* Contenu */}

      {/* Panneau de debug si ?debug=true dans l'URL */}
      {showDebug && <RequestIdDebugPanel />}
    </div>
  );
}
```

## 📝 Patterns recommandés

### Pattern 1 : Génération automatique

Pour les pages qui créent toujours un nouveau requestId :

```typescript
const { requestId } = useRequestId({ autoGenerate: true, logDebug: true });
```

### Pattern 2 : Vérification stricte

Pour les pages qui nécessitent absolument un requestId :

```typescript
const { requestId } = useRequestId({ logDebug: true });

useEffect(() => {
  if (!requestId) {
    navigate('/upload', { state: { error: 'Request ID manquant' } });
  }
}, [requestId, navigate]);
```

### Pattern 3 : Synchronisation avec état local

Pour les pages qui ont besoin de garder une copie locale :

```typescript
const { requestId } = useRequestId({ logDebug: true });
const [localRequestId, setLocalRequestId] = useState<string | null>(null);

useEffect(() => {
  if (requestId && requestId !== localRequestId) {
    setLocalRequestId(requestId);
    console.log('RequestId mis à jour:', requestId);
  }
}, [requestId, localRequestId]);
```

### Pattern 4 : Génération conditionnelle

Pour les pages qui génèrent un requestId seulement si nécessaire :

```typescript
const { requestId, setRequestId, generateRequestId } = useRequestId({ logDebug: true });

const ensureRequestId = useCallback(() => {
  if (!requestId) {
    const newId = generateRequestId();
    setRequestId(newId);
    return newId;
  }
  return requestId;
}, [requestId, setRequestId, generateRequestId]);

const handleAction = async () => {
  const id = ensureRequestId();
  // Utiliser id pour l'action
};
```

## 🧹 Nettoyage du code existant

### Fichiers à nettoyer

#### 1. Upload.tsx ✅
- ✅ Supprimé : `import { newRequestId, setRequestId } from '../utils/requestId'`
- ✅ Supprimé : État local `lastRequestId`
- ✅ Supprimé : Fonction `storeRequestId`
- ✅ Remplacé : Logique de génération manuelle par le hook

#### 2. ValidationPage.tsx ✅
- ✅ Supprimé : `import { getCurrentRequestId } from '../utils/requestId'`
- ✅ Supprimé : Logique de récupération prioritaire manuelle
- ✅ Remplacé : Par `useRequestId`

#### 3. requestId.ts (À évaluer)
Vérifier si ce fichier est encore utilisé ailleurs :

```bash
# Chercher les imports de requestId.ts
grep -r "from '../utils/requestId'" src/
grep -r "from './utils/requestId'" src/
```

Si plus utilisé, le fichier peut être supprimé ou marqué comme deprecated.

## 📊 Checklist d'intégration

Pour chaque page qui utilise requestId :

- [ ] Importer le hook `useRequestId`
- [ ] Remplacer la logique manuelle de récupération
- [ ] Supprimer les accès directs à sessionStorage/localStorage
- [ ] Activer `logDebug: true` en développement
- [ ] Tester les scénarios : URL → sessionStorage → localStorage
- [ ] Vérifier que le build passe sans erreurs TypeScript
- [ ] Ajouter le RequestIdDebugPanel pour tester (optionnel)

## 🔍 Testing manuel

### Scénario 1 : Navigation normale
1. Ouvrir `/upload`
2. Téléverser un fichier
3. Vérifier que le requestId est généré
4. Naviguer vers `/validation?requestId=XXX`
5. Vérifier que le requestId de l'URL est utilisé

### Scénario 2 : Rafraîchissement de page
1. Ouvrir `/validation?requestId=req_test_123`
2. Le requestId devrait être `req_test_123`
3. Rafraîchir la page (F5)
4. Le requestId devrait rester `req_test_123`

### Scénario 3 : Fermeture/réouverture navigateur
1. Ouvrir `/upload` et générer un requestId
2. Noter le requestId
3. Fermer le navigateur complètement
4. Rouvrir le navigateur et aller sur `/validation`
5. Le requestId devrait être récupéré depuis localStorage

### Scénario 4 : Nettoyage
1. Ouvrir le RequestIdDebugPanel
2. Cliquer sur "Nettoyer tout"
3. Vérifier que toutes les sources sont vides
4. Rafraîchir la page
5. Un nouveau requestId devrait être généré (si autoGenerate: true)

## 🐛 Debugging

### Problème : RequestId undefined
```typescript
// Vérifier les logs
const { requestId } = useRequestId({ logDebug: true });

// Vérifier manuellement les sources
console.log('URL:', new URL(window.location.href).searchParams.get('requestId'));
console.log('Session:', sessionStorage.getItem('current_request_id'));
console.log('Local:', localStorage.getItem('lastRequestId'));
```

### Problème : RequestId non synchronisé
```typescript
// Forcer la synchronisation
const { requestId, setRequestId } = useRequestId({ logDebug: true });

useEffect(() => {
  if (requestId) {
    // Vérifier que les sources sont synchronisées
    console.log('Hook:', requestId);
    console.log('Session:', sessionStorage.getItem('current_request_id'));
    console.log('Local:', localStorage.getItem('lastRequestId'));
  }
}, [requestId]);
```

### Problème : Format invalide
```typescript
// Le hook rejette automatiquement les formats invalides
setRequestId('invalid format!'); // ❌ Erreur loggée

// Format accepté
setRequestId('req_1234567890_abc123'); // ✅ OK
```

## 📚 Ressources

- **Documentation complète :** `src/hooks/README.md`
- **Tests unitaires :** `src/hooks/useRequestId.test.ts`
- **Résumé d'implémentation :** `HOOK_IMPLEMENTATION_SUMMARY.md`
- **Code source du hook :** `src/hooks/useRequestId.ts`
- **Composant de debug :** `src/components/RequestIdDebugPanel.tsx`

## 🎯 Prochaines étapes

1. **Intégrer dans les pages restantes**
   - ValidationPageNew.tsx
   - ValidationPageFullDB.tsx
   - WebhookResponse.tsx (si nécessaire)

2. **Nettoyer le code obsolète**
   - Évaluer si `utils/requestId.ts` peut être supprimé
   - Supprimer les accès directs à sessionStorage/localStorage

3. **Tester en conditions réelles**
   - Avec plusieurs onglets ouverts
   - Avec rafraîchissements fréquents
   - Avec navigation avant/arrière

4. **Monitorer en production**
   - Ajouter des analytics sur l'utilisation
   - Logger les erreurs de validation
   - Mesurer les performances

## ✅ Validation finale

Avant de considérer l'intégration terminée :

- [ ] Toutes les pages utilisant requestId ont été migrées
- [ ] Le code obsolète a été nettoyé
- [ ] Les tests manuels passent tous
- [ ] Le build passe sans erreurs
- [ ] La documentation est à jour
- [ ] L'équipe a été formée sur l'utilisation du hook

---

**Version :** 1.0.0
**Date :** 2025-01-XX
**Status :** Prêt pour intégration complète
