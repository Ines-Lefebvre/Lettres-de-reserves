# SP-03 : Audit Détaillé - N8nValidationStrategy.ts

**Date** : 2025-10-10
**Version** : 1.0.0
**Fichiers audités** :
- `src/strategies/N8nValidationStrategy.ts` (178 lignes)
- `src/lib/api.ts` (94 lignes - fonction `fetchValidation`)
- `src/utils/normalize.ts` (133 lignes - référence)

---

## 🎯 Mission
Analyser comment la stratégie N8N récupère les données de validation depuis le webhook n8n et identifier les bugs de gestion de réponse.

---

## A. CODE COMPLET EXTRAIT

### 1. N8nValidationStrategy.ts (Complet)

```typescript
// ============================================
// src/strategies/N8nValidationStrategy.ts
// Lignes 1-178 (178 lignes au total)
// ============================================

/**
 * Stratégie de validation utilisant n8n comme source de données
 *
 * Cette stratégie récupère les données depuis un webhook n8n,
 * les valide et permet leur sauvegarde.
 *
 * FONCTIONNALITÉS:
 * - Fetch depuis endpoint n8n
 * - Parsing JSON automatique
 * - Gestion timeout et retry
 * - Validation format
 *
 * @class N8nValidationStrategy
 * @extends ValidationStrategy
 */

import { ValidationStrategy } from './ValidationStrategy';
import { fetchValidation, safeParseJson } from '../lib/api';
import type {
  ExtractedData,
  ValidationResult,
  SaveResult,
  ValidationContext
} from './types';

export class N8nValidationStrategy extends ValidationStrategy {
  readonly name = 'N8nValidationStrategy';
  readonly description = 'Récupère les données depuis un webhook n8n';
  readonly priority = 1;

  private timeout: number;
  private retryCount: number;

  // LIGNE 34-43 : CONSTRUCTEUR
  constructor(
    context: ValidationContext,
    logDebug: boolean = false,
    timeout: number = 30000,        // ← TIMEOUT PAR DÉFAUT: 30s
    retryCount: number = 3           // ← RETRY PAR DÉFAUT: 3
  ) {
    super(context, logDebug);
    this.timeout = timeout;
    this.retryCount = retryCount;
  }

  protected getSourceType(): 'n8n' | 'localStorage' | 'supabase' {
    return 'n8n';
  }

  // LIGNE 49-56 : MÉTHODE canUse()
  async canUse(): Promise<boolean> {
    const endpoint = import.meta.env.VITE_VALIDATION_ENDPOINT;
    const hasEndpoint = !!endpoint && endpoint.trim().length > 0;
    const hasRequestId = !!this.context.requestId;

    this.log('CanUse check', { hasEndpoint, hasRequestId });
    return hasEndpoint && hasRequestId;      // ← RETOURNE true SI LES 2
  }

  // LIGNE 58-122 : MÉTHODE load()
  async load(): Promise<ValidationResult> {
    this.emitLifecycleEvent('load', { requestId: this.context.requestId });
    const startTime = Date.now();

    try {
      this.log('Loading data from n8n', {
        requestId: this.context.requestId,
        sessionId: this.context.sessionId
      });

      // LIGNE 68-72 : CONSTRUCTION DES PARAMÈTRES QUERY
      const query = {
        request_id: this.context.requestId,  // ← PARAMÈTRE 1
        req_id: this.context.requestId,      // ← PARAMÈTRE 2 (DOUBLON!)
        session_id: this.context.sessionId   // ← PEUT ÊTRE undefined
      };

      // LIGNE 74 : APPEL À fetchValidation()
      const response = await fetchValidation(query);
      const duration = Date.now() - startTime;

      // LIGNE 77-84 : VÉRIFICATION RÉPONSE VIDE
      if (!response.text || response.text.trim().length === 0) {
        this.logError('Empty response from n8n');
        return {
          success: false,
          error: 'Réponse vide depuis n8n',
          metadata: this.createMetadata({ status: response.status, duration })
        };
      }

      // LIGNE 86-99 : PARSING JSON
      const parsed = safeParseJson(response.text);

      if (!parsed.ok) {
        this.logError('JSON parse failed', parsed.error);
        return {
          success: false,
          error: `JSON invalide: ${parsed.error}`,
          metadata: this.createMetadata({
            status: response.status,
            duration,
            raw: parsed.raw
          })
        };
      }

      // LIGNE 101-110 : SUCCÈS
      this.log('Data loaded successfully', { duration });

      return {
        success: true,
        data: parsed.data,                    // ← DATA BRUTE (PAS DE NORMALISATION ICI)
        metadata: this.createMetadata({
          status: response.status,
          duration
        })
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logError('Load failed', error);

      return {
        success: false,
        error: error.message || 'Erreur de chargement depuis n8n',
        metadata: this.createMetadata({ duration })
      };
    }
  }

  // LIGNE 124-133 : MÉTHODE save()
  async save(data: ExtractedData): Promise<SaveResult> {
    this.emitLifecycleEvent('save', { dataKeys: Object.keys(data) });

    this.log('Save not implemented for n8n strategy');

    return {
      success: false,
      error: 'La sauvegarde vers n8n n\'est pas supportée'
    };
  }

  // LIGNE 135-174 : MÉTHODE validate()
  async validate(data: ExtractedData): Promise<ValidationResult> {
    this.emitLifecycleEvent('validate', { dataKeys: Object.keys(data) });

    try {
      this.log('Validating data', { keys: Object.keys(data).length });

      // LIGNE 141-147 : VALIDATION TYPE
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: 'Données invalides: doit être un objet',
          metadata: this.createMetadata()
        };
      }

      // LIGNE 149-155 : VALIDATION NON VIDE
      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'Données vides',
          metadata: this.createMetadata()
        };
      }

      this.log('Validation passed');

      return {
        success: true,
        data,
        metadata: this.createMetadata()
      };

    } catch (error: any) {
      this.logError('Validation failed', error);

      return {
        success: false,
        error: error.message || 'Erreur de validation',
        metadata: this.createMetadata()
      };
    }
  }
}

export default N8nValidationStrategy;
```

---

### 2. lib/api.ts - Fonction fetchValidation (Complet)

```typescript
// ============================================
// src/lib/api.ts - Fonction fetchValidation
// Lignes 53-94 (42 lignes)
// ============================================

export async function fetchValidation(query: Record<string, string | undefined>) {
  // LIGNE 54 : VALIDATION DES PARAMÈTRES
  validateQuery(query);

  // LIGNE 55-57 : CONSTRUCTION URLSearchParams
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null) as [string, string][]
  );

  // LIGNE 58 : CACHE BUSTER
  params.set('_cb', String(Date.now())); // anti-cache

  // LIGNE 59 : CONSTRUCTION URL FINALE
  const url = `${VALIDATION_ENDPOINT}?${params.toString()}`;

  console.log('🔍 API - Fetching validation:', {
    endpoint: VALIDATION_ENDPOINT,
    query,
    finalUrl: url
  });

  // LIGNE 67-68 : TIMEOUT AVEC AbortController
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);  // ← TIMEOUT: 20s

  try {
    // LIGNE 71-76 : FETCH
    const res = await fetch(url, {
      method: 'GET',                // ← MÉTHODE: GET
      cache: 'no-store',
      signal: ctrl.signal,          // ← TIMEOUT SIGNAL
      credentials: 'omit'
    });

    // LIGNE 77 : RÉCUPÉRATION TEXTE
    const text = await res.text();  // ⚠️ TOUJOURS APPELLE .text() (même HTTP 204)

    console.log('🔍 API - Response received:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      textLength: text?.length || 0,
      textPreview: text?.substring(0, 200)
    });

    clearTimeout(timer);

    // LIGNE 88 : RETOUR BRUT
    return { status: res.status, text };  // ← RETOURNE STATUS + TEXT BRUT

  } catch (e) {
    console.error('❌ API - Fetch failed:', e);
    clearTimeout(timer);
    throw e;                          // ← RELANCE L'EXCEPTION
  }
}
```

---

### 3. lib/api.ts - Fonction validateQuery (Lignes 30-51)

```typescript
// ============================================
// src/lib/api.ts - Fonction validateQuery
// Lignes 30-51 (22 lignes)
// ============================================

export function validateQuery(query: Record<string, string | undefined>) {
  // LIGNE 31-32 : PARAMÈTRES REQUIS
  const required = ['session_id', 'req_id'];  // ← REQUIS: session_id ET req_id
  const missing = required.filter(key => !query[key]);

  // LIGNE 34-36 : ERREUR SI MANQUANT
  if (missing.length > 0) {
    throw new Error(`Paramètres manquants : ${missing.join(', ')}`);
  }

  // LIGNE 38-48 : VALIDATION FORMAT (ANTI-INJECTION)
  const sessionId = query.session_id || '';
  const reqId = query.req_id || '';

  if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
    throw new Error('session_id invalide');
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(reqId)) {
    throw new Error('req_id invalide');
  }

  return true;
}
```

---

### 4. lib/api.ts - Fonction safeParseJson (Lignes 21-28)

```typescript
// ============================================
// src/lib/api.ts - Fonction safeParseJson
// Lignes 21-28 (8 lignes)
// ============================================

export function safeParseJson(raw: string) {
  const cleaned = raw.trim().replace(/^\s*json\s*/i, ''); // retire le préfixe "json"
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (e) {
    return { ok: false, error: String(e), raw: cleaned };
  }
}
```

---

## B. TABLEAU D'ANALYSE DE LA STRATÉGIE

| Aspect | État Actuel | Code (ligne) | Verdict |
|--------|-------------|--------------|---------|
| **canUse()** | Vérifie `VITE_VALIDATION_ENDPOINT` + `requestId` | L. 49-56 | ✅ BON |
| **URL endpoint** | `VITE_VALIDATION_ENDPOINT` (env var) | L. 50 | ✅ BON (configurable) |
| **Mapping requestId** | Envoie `request_id` ET `req_id` (doublon) | L. 69-70 | 🟡 REDONDANT |
| **session_id** | Passé depuis `context.sessionId` | L. 71 | ⚠️ PEUT ÊTRE undefined |
| **Validation session_id** | Requis par `validateQuery()` | api.ts L. 31 | 🔴 STRICT (throw si manquant) |
| **Timeout** | 20s dans `fetchValidation()` | api.ts L. 68 | 🟡 TROP COURT (20s) |
| **Timeout strategy** | 30s dans constructeur (non utilisé) | L. 37 | ❌ NON UTILISÉ |
| **HTTP 204** | Pas de gestion spécifique | api.ts L. 77 | 🔴 NON GÉRÉ |
| **JSON invalide** | Géré par `safeParseJson()` | L. 86-99 | ✅ BON |
| **Réponse vide** | Détecté (`text.trim().length === 0`) | L. 77-84 | ✅ BON |
| **Classification** | Seulement `success: true/false` | L. 103-105 | 🟡 SIMPLISTE |
| **Retry logic** | Constructeur accepte `retryCount=3` (non utilisé) | L. 38 | ❌ NON IMPLÉMENTÉ |
| **Normalisation** | Pas de normalisation dans `load()` | L. 105 | ⚠️ DATA BRUTE |

---

## C. DIAGRAMME DU FLUX DE CHARGEMENT

```
[UnifiedValidationPage appelle strategy.load(requestId)]
           ↓
[N8nValidationStrategy.load()] L. 58-122
           ↓
[Construction query object] L. 68-72
           ├─ request_id: this.context.requestId
           ├─ req_id: this.context.requestId      ← DOUBLON !
           └─ session_id: this.context.sessionId  ← PEUT ÊTRE undefined
           ↓
[validateQuery(query)] ← lib/api.ts L. 54
           ├─ Vérifie ['session_id', 'req_id'] présents
           ├─ Si manquant → throw Error
           └─ Valide format regex: /^[a-zA-Z0-9-_]+$/
           ↓
[fetchValidation(query)] ← lib/api.ts L. 53-94
           ↓
[Construction URLSearchParams] L. 55-58
           ├─ Filter values != null
           ├─ Ajoute _cb (cache buster)
           └─ URL finale: VITE_VALIDATION_ENDPOINT?request_id=XXX&req_id=XXX&session_id=XXX&_cb=timestamp
           ↓
[AbortController + setTimeout(20000)] L. 67-68
           ↓
[fetch(url, { method: 'GET', signal: ctrl.signal })] L. 71-76
           ↓
    ┌──────────────────┐
    │  Réponse n8n     │
    └──────────────────┘
           ↓
    ┌──────┴──────┬──────────────┬───────────────┐
    │             │              │               │
[HTTP 200]    [HTTP 204]    [HTTP 500]     [Network Error/
    │             │              │          Timeout]
    │             │              │               │
[res.text()]  [res.text()]  [res.text()]   [catch block]
    │             │              │               │
[text != ""] [text === ""] [text = error]  [throw e]
    │             │              │               │
[return      [return          [return        [throw]
{status,     {status: 204,    {status: 500,      ↓
 text}]       text: ""}]       text: "..."}]  [N8nValidationStrategy
                                                catch L. 112-121]
    ↓             ↓              ↓               │
    │             │              │               └─> return {
    │             │              │                     success: false,
    │             │              │                     error: error.message
    │             │              │                   }
    │             │              │
    └─────────────┴──────────────┘
                  ↓
    [RETOUR à N8nValidationStrategy.load()]
                  ↓
    [Vérification text vide] L. 77-84
                  ↓
           ┌──────┴──────┐
           │             │
      [text != ""]   [text === ""]
           │             │
           │         return {
           │           success: false,
           │           error: "Réponse vide"
           │         }
           │
    [safeParseJson(text)] L. 86
           ↓
           ┌──────┴──────┐
           │             │
     [parsed.ok]   [!parsed.ok]
           │             │
           │         return {
           │           success: false,
           │           error: "JSON invalide"
           │         }
           │
    return {
      success: true,
      data: parsed.data,  ← DATA BRUTE (pas de normalisation)
      metadata: { ... }
    }
```

---

## D. BUGS IDENTIFIÉS

### 🔴 BUG #1 : session_id Requis mais Peut Être undefined

**Localisation** :
- `N8nValidationStrategy.ts` ligne 71
- `lib/api.ts` ligne 31-36

**Symptôme** : Le code passe `this.context.sessionId` qui peut être `undefined`, mais `validateQuery()` exige que `session_id` soit présent.

**Preuve** :
```typescript
// N8nValidationStrategy.ts - Ligne 71
const query = {
  request_id: this.context.requestId,
  req_id: this.context.requestId,
  session_id: this.context.sessionId  // ← PEUT ÊTRE undefined
};

// lib/api.ts - Ligne 31-36
const required = ['session_id', 'req_id'];
const missing = required.filter(key => !query[key]);  // ← Si undefined, missing contient 'session_id'

if (missing.length > 0) {
  throw new Error(`Paramètres manquants : ${missing.join(', ')}`);  // ← THROW !
}
```

**Conséquence** :
- Si `context.sessionId` est `undefined` → Exception levée
- Utilisateur voit "Paramètres manquants : session_id"
- Workflow bloqué

**Test de reproduction** :
```typescript
// Dans UnifiedValidationPage.tsx
const strategy = new N8nValidationStrategy({
  requestId: 'req_123',
  sessionId: undefined  // ← CAS PROBLÉMATIQUE
});

await strategy.load();  // → Throw Error('Paramètres manquants : session_id')
```

**Correctif nécessaire** :

**Option A** : Rendre `session_id` optionnel
```typescript
// lib/api.ts - MODIFIER
const required = ['req_id'];  // Supprimer 'session_id' des requis
```

**Option B** : Générer `session_id` si manquant
```typescript
// N8nValidationStrategy.ts - MODIFIER L. 68-72
const query = {
  request_id: this.context.requestId,
  req_id: this.context.requestId,
  session_id: this.context.sessionId || `session_${Date.now()}`  // ← GÉNÉRER SI MANQUANT
};
```

**Option C** : Ne pas envoyer si `undefined`
```typescript
// N8nValidationStrategy.ts - MODIFIER L. 68-72
const query: Record<string, string> = {
  request_id: this.context.requestId!,
  req_id: this.context.requestId!
};

if (this.context.sessionId) {
  query.session_id = this.context.sessionId;
}

// ET lib/api.ts - MODIFIER
const required = ['req_id'];  // session_id devient optionnel
```

**Priorité** : 🔴 HAUTE (bloque le workflow)

---

### 🟡 BUG #2 : Doublon request_id / req_id

**Localisation** : `N8nValidationStrategy.ts` lignes 69-70

**Code actuel** :
```typescript
const query = {
  request_id: this.context.requestId,  // ← PARAMÈTRE 1
  req_id: this.context.requestId,      // ← PARAMÈTRE 2 (même valeur !)
  session_id: this.context.sessionId
};
```

**Problème** :
- Les deux paramètres `request_id` et `req_id` ont la même valeur
- Redondant et source de confusion
- URL finale : `?request_id=XXX&req_id=XXX&session_id=YYY`

**Conséquence** :
- Pas de bug fonctionnel si n8n accepte l'un des deux
- Mais pollution de l'URL
- Incohérence avec le reste du code

**Question clé** : **Quel paramètre n8n attend-il vraiment ?**

Pour le savoir, il faut :
1. Vérifier le workflow n8n (document 2 fourni)
2. Chercher le nœud "Webhook" et voir quel paramètre il lit

**Correctif nécessaire** :

**Si n8n attend `req_id`** :
```typescript
const query = {
  req_id: this.context.requestId,      // ← GARDER SEULEMENT req_id
  session_id: this.context.sessionId
};
```

**Si n8n attend `requestId`** :
```typescript
const query = {
  requestId: this.context.requestId,   // ← GARDER SEULEMENT requestId
  session_id: this.context.sessionId
};
```

**Priorité** : 🟡 MOYENNE (pas critique mais à nettoyer)

---

### 🔴 BUG #3 : HTTP 204 Non Géré

**Localisation** : `lib/api.ts` ligne 77

**Code actuel** :
```typescript
const res = await fetch(url, { method: 'GET', ... });
const text = await res.text();  // ← APPELÉ MÊME SI HTTP 204 (No Content)

// Puis dans N8nValidationStrategy.ts L. 77-84
if (!response.text || response.text.trim().length === 0) {
  return {
    success: false,
    error: 'Réponse vide depuis n8n'  // ← TRAITÉ COMME ERREUR
  };
}
```

**Problème** :
- HTTP 204 (No Content) signifie "Traitement réussi mais pas de contenu"
- n8n peut renvoyer 204 si :
  - Le traitement est terminé mais données pas encore prêtes
  - Le `requestId` est valide mais payload vide
- Le code traite 204 comme une erreur ("Réponse vide")

**Conséquence** :
- Utilisateur voit "Réponse vide depuis n8n" au lieu de "Aucune donnée disponible"
- Mauvaise expérience utilisateur

**Correctif nécessaire** :
```typescript
// lib/api.ts - MODIFIER L. 71-88
const res = await fetch(url, { method: 'GET', ... });

// AJOUTER DÉTECTION HTTP 204
if (res.status === 204) {
  clearTimeout(timer);
  return { status: 204, text: '' };  // ← RETOUR EXPLICITE POUR 204
}

const text = await res.text();

clearTimeout(timer);
return { status: res.status, text };
```

**Et dans N8nValidationStrategy.ts** :
```typescript
// MODIFIER L. 77-84
if (response.status === 204) {
  this.log('No content available (HTTP 204)');
  return {
    success: true,  // ← SUCCÈS car pas d'erreur
    data: null,     // ← DATA NULL
    metadata: this.createMetadata({
      status: 204,
      duration,
      message: 'No content available'
    })
  };
}

if (!response.text || response.text.trim().length === 0) {
  // Réponse vide sur un autre status (200, 500, etc.)
  this.logError('Empty response with status', response.status);
  return {
    success: false,
    error: `Réponse vide (HTTP ${response.status})`
  };
}
```

**Priorité** : 🔴 HAUTE (mauvaise UX)

---

### 🟡 BUG #4 : Timeout Non Utilisé dans Constructeur

**Localisation** : `N8nValidationStrategy.ts` lignes 37-42

**Code actuel** :
```typescript
constructor(
  context: ValidationContext,
  logDebug: boolean = false,
  timeout: number = 30000,        // ← ACCEPTE UN TIMEOUT
  retryCount: number = 3
) {
  super(context, logDebug);
  this.timeout = timeout;         // ← STOCKÉ MAIS JAMAIS UTILISÉ
  this.retryCount = retryCount;   // ← STOCKÉ MAIS JAMAIS UTILISÉ
}
```

**Problème** :
- Le constructeur accepte `timeout` et `retryCount`
- Ces valeurs sont stockées dans `this.timeout` et `this.retryCount`
- Mais **jamais utilisées** dans `load()` ou ailleurs
- Le timeout réel est hardcodé à 20s dans `lib/api.ts` ligne 68

**Conséquence** :
- Fausse impression de configurabilité
- Le timeout de 30s passé au constructeur est ignoré
- Le timeout réel est 20s (plus court que l'attendu)

**Correctif nécessaire** :

**Option A** : Passer `this.timeout` à `fetchValidation()`
```typescript
// MODIFIER lib/api.ts - Ajouter paramètre timeout
export async function fetchValidation(
  query: Record<string, string | undefined>,
  timeout: number = 20000  // ← PARAMÈTRE AVEC DÉFAUT
) {
  validateQuery(query);
  const params = new URLSearchParams(...);
  const url = `${VALIDATION_ENDPOINT}?${params.toString()}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);  // ← UTILISER LE PARAMÈTRE

  // ... reste du code
}

// ET dans N8nValidationStrategy.ts L. 74
const response = await fetchValidation(query, this.timeout);  // ← PASSER this.timeout
```

**Option B** : Supprimer les paramètres inutilisés
```typescript
// MODIFIER N8nValidationStrategy.ts L. 34-43
constructor(
  context: ValidationContext,
  logDebug: boolean = false
  // Supprimer timeout et retryCount
) {
  super(context, logDebug);
  // Supprimer this.timeout et this.retryCount
}
```

**Priorité** : 🟡 MOYENNE (confusion code)

---

### 🔴 BUG #5 : Timeout Trop Court (20s)

**Localisation** : `lib/api.ts` ligne 68

**Code actuel** :
```typescript
const timer = setTimeout(() => ctrl.abort(), 20000);  // ← TIMEOUT: 20s
```

**Problème** :
- Timeout hardcodé à **20 secondes**
- D'après le cahier des charges, n8n peut prendre **20-30s** pour traiter (OCR + extraction)
- Si n8n prend 25s → timeout frontend avant la réponse

**Conséquence** :
- Utilisateur voit "Erreur de chargement depuis n8n"
- Alors que n8n traite encore le document
- L'utilisateur clique "Réessayer" → Duplication du traitement

**Correctif nécessaire** :
```typescript
// lib/api.ts - MODIFIER L. 68
const timer = setTimeout(() => ctrl.abort(), 60000);  // ← PASSER À 60s
```

**Priorité** : 🔴 HAUTE (timeout prématuré)

---

### 🟡 BUG #6 : Pas de Retry Automatique

**Localisation** : `N8nValidationStrategy.ts` ligne 112-121

**Code actuel** :
```typescript
catch (error: any) {
  const duration = Date.now() - startTime;
  this.logError('Load failed', error);

  return {
    success: false,
    error: error.message || 'Erreur de chargement depuis n8n',
    metadata: this.createMetadata({ duration })
  };
}
```

**Problème** :
- Le constructeur accepte `retryCount = 3` (ligne 38)
- Mais aucune logique de retry n'est implémentée
- Si `fetchValidation()` échoue (timeout, network error) → erreur immédiate

**Conséquence** :
- Pas de tentative de récupération automatique
- Utilisateur doit manuellement réessayer

**Correctif nécessaire** :
```typescript
// N8nValidationStrategy.ts - MODIFIER load() L. 58-122
async load(): Promise<ValidationResult> {
  this.emitLifecycleEvent('load', { requestId: this.context.requestId });
  const startTime = Date.now();

  // AJOUTER RETRY LOOP
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < this.retryCount; attempt++) {
    try {
      this.log(`Loading data from n8n (attempt ${attempt + 1}/${this.retryCount})`);

      const query = { ... };
      const response = await fetchValidation(query, this.timeout);

      // ... reste du code de parsing

      return {
        success: true,
        data: parsed.data,
        metadata: this.createMetadata({ status: response.status, duration, attempt })
      };

    } catch (error: any) {
      lastError = error;
      this.logError(`Load failed (attempt ${attempt + 1}/${this.retryCount})`, error);

      // Si pas la dernière tentative, attendre avant de réessayer
      if (attempt < this.retryCount - 1) {
        const delay = 1000 * (attempt + 1);  // 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Toutes les tentatives échouées
  const duration = Date.now() - startTime;
  return {
    success: false,
    error: lastError?.message || 'Erreur de chargement après plusieurs tentatives',
    metadata: this.createMetadata({ duration, attempts: this.retryCount })
  };
}
```

**Priorité** : 🟡 MOYENNE (amélioration UX)

---

### 🟢 BUG #7 : Pas de Normalisation dans load()

**Localisation** : `N8nValidationStrategy.ts` ligne 105

**Code actuel** :
```typescript
return {
  success: true,
  data: parsed.data,  // ← DATA BRUTE (pas de normalisation)
  metadata: this.createMetadata({ ... })
};
```

**Problème** :
- `parsed.data` contient les données brutes de n8n
- Pas de normalisation (ex: conversion dot notation → nested)
- La normalisation doit être faite par l'appelant (UnifiedValidationPage)

**Conséquence** :
- Responsabilité de normalisation déléguée
- Risque d'oubli ou d'incohérence

**Correctif nécessaire** :
```typescript
// N8nValidationStrategy.ts - MODIFIER L. 17
import { dotObjectToNested } from '../utils/normalize';

// ET MODIFIER L. 101-110
const parsed = safeParseJson(response.text);

if (!parsed.ok) { ... }

// AJOUTER NORMALISATION
const normalized = dotObjectToNested(parsed.data);  // ← NORMALISER ICI

this.log('Data loaded successfully', { duration });

return {
  success: true,
  data: normalized,  // ← DATA NORMALISÉE
  metadata: this.createMetadata({ ... })
};
```

**Priorité** : 🟢 BASSE (amélioration architecture)

---

### 🟢 BUG #8 : Classification Simpliste (success: true/false)

**Localisation** : `N8nValidationStrategy.ts` lignes 103-110

**Code actuel** :
```typescript
return {
  success: true,  // OU false
  data: parsed.data,
  metadata: { ... }
};
```

**Problème** :
- La classification est binaire : `success: true` ou `false`
- Pas de distinction entre :
  - Succès avec données complètes
  - Succès avec données partielles
  - Données vides (204)
  - Erreur temporaire (timeout)
  - Erreur permanente (404)

**Conséquence** :
- L'appelant ne peut pas adapter son comportement selon le type d'erreur
- Par exemple : retry automatique sur timeout, pas sur 404

**Correctif nécessaire** :
```typescript
// types.ts - AJOUTER
export type ValidationStatus =
  | 'success'      // Données complètes
  | 'empty'        // HTTP 204 ou payload vide
  | 'partial'      // Données incomplètes
  | 'timeout'      // Timeout
  | 'network'      // Erreur réseau
  | 'error';       // Autre erreur

export interface ValidationResult {
  status: ValidationStatus;  // ← REMPLACER success: boolean
  data?: ExtractedData;
  error?: string;
  metadata: ValidationMetadata;
}

// ET dans N8nValidationStrategy.ts
// Remplacer tous les return par:
return { status: 'success', data, metadata };
return { status: 'empty', metadata };
return { status: 'timeout', error, metadata };
// etc.
```

**Priorité** : 🟢 BASSE (amélioration architecture)

---

## E. COMPARAISON AVEC LE WORKFLOW N8N

### Attentes du Workflow n8n

**D'après le workflow n8n fourni (document 2), le nœud "Webhook Validation" attend :**

```json
// GET /webhook/validation?req_id=XXX&session_id=YYY

// Paramètres attendus (à vérifier dans le JSON du workflow)
{
  "req_id": "req_123...",        // ← NOM DU PARAMÈTRE ?
  "session_id": "session_456..." // ← OBLIGATOIRE ?
}
```

**Questions critiques** :
1. ❓ Le workflow n8n attend-il `req_id`, `requestId`, ou `request_id` ?
2. ❓ Le `session_id` est-il obligatoire dans n8n ?
3. ❓ Que renvoie n8n si `session_id` est absent ?

**Pour répondre** :
- Ouvrir le fichier JSON du workflow n8n (document 2)
- Chercher le nœud "Webhook" avec path `/validation`
- Lire la configuration des paramètres

**Extrait hypothétique du workflow n8n** :
```json
{
  "name": "Webhook Validation",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "validation",
    "httpMethod": "GET",
    "responseMode": "responseNode",
    "options": {
      "queryString": "req_id,session_id"  // ← PARAMÈTRES ATTENDUS
    }
  }
}
```

**Si le workflow montre** :
- `queryString: "req_id,session_id"` → Les deux sont attendus
- `queryString: "req_id"` → Seul `req_id` est requis

---

### Incohérence Frontend ↔ n8n

| Frontend envoie | n8n attend | Verdict |
|-----------------|------------|---------|
| `request_id=XXX` | `req_id=XXX` ? | 🔴 INCOHÉRENT |
| `req_id=XXX` | `req_id=XXX` | ✅ OK |
| `session_id=YYY` | `session_id=YYY` ? | ❓ À VÉRIFIER |
| `session_id=undefined` | Requis ? | 🔴 BLOQUE SI REQUIS |

**Correctif recommandé** :
1. Vérifier le workflow n8n pour identifier les paramètres exacts
2. Ajuster `N8nValidationStrategy.ts` pour envoyer uniquement les bons paramètres
3. Rendre `session_id` optionnel si n8n l'accepte

---

## F. RECOMMANDATIONS DE CORRECTIFS

### 🔴 Correctif 1 : Résoudre session_id undefined

**Fichiers à modifier** :
- `lib/api.ts` ligne 31
- `N8nValidationStrategy.ts` ligne 68-72

**Code** :
```typescript
// lib/api.ts - OPTION A: Rendre session_id optionnel
const required = ['req_id'];  // Supprimer 'session_id'

// OU OPTION B: Ne pas envoyer si undefined
// N8nValidationStrategy.ts
const query: Record<string, string> = {
  req_id: this.context.requestId!
};

if (this.context.sessionId) {
  query.session_id = this.context.sessionId;
}
```

---

### 🔴 Correctif 2 : Gérer HTTP 204

**Fichiers à modifier** :
- `lib/api.ts` ligne 71-88
- `N8nValidationStrategy.ts` ligne 77-84

**Code** :
```typescript
// lib/api.ts
if (res.status === 204) {
  clearTimeout(timer);
  return { status: 204, text: '' };
}

// N8nValidationStrategy.ts
if (response.status === 204) {
  return {
    success: true,
    data: null,
    metadata: this.createMetadata({ status: 204, message: 'No content' })
  };
}
```

---

### 🔴 Correctif 3 : Augmenter Timeout à 60s

**Fichiers à modifier** :
- `lib/api.ts` ligne 68

**Code** :
```typescript
const timer = setTimeout(() => ctrl.abort(), 60000);  // 60s au lieu de 20s
```

---

### 🟡 Correctif 4 : Supprimer Doublon request_id/req_id

**Fichiers à modifier** :
- `N8nValidationStrategy.ts` ligne 68-72

**Code** :
```typescript
const query = {
  req_id: this.context.requestId,  // Garder SEULEMENT req_id (ou requestId selon n8n)
  ...(this.context.sessionId && { session_id: this.context.sessionId })
};
```

---

### 🟡 Correctif 5 : Implémenter Retry Automatique

**Fichiers à modifier** :
- `N8nValidationStrategy.ts` méthode `load()`

**Code** : Voir Bug #6 ci-dessus (boucle retry avec delay)

---

### 🟢 Correctif 6 : Ajouter Normalisation

**Fichiers à modifier** :
- `N8nValidationStrategy.ts` ligne 101-110

**Code** :
```typescript
import { dotObjectToNested } from '../utils/normalize';

// Dans load()
const parsed = safeParseJson(response.text);
if (!parsed.ok) { ... }

const normalized = dotObjectToNested(parsed.data);

return {
  success: true,
  data: normalized,
  metadata: { ... }
};
```

---

## G. RÉPONSES AUX QUESTIONS CRITIQUES

### 1. Quel nom de paramètre est utilisé pour le requestId ?

**Réponse** : **Les deux** : `request_id` ET `req_id` (doublon !)

```typescript
// N8nValidationStrategy.ts ligne 69-70
const query = {
  request_id: this.context.requestId,
  req_id: this.context.requestId      // ← MÊME VALEUR
};
```

**Problème** : Redondance inutile

**Action** : Vérifier le workflow n8n pour savoir lequel est réellement utilisé, puis supprimer l'autre

---

### 2. Le session_id est-il obligatoire pour n8n ?

**Réponse du code** : **OUI** (selon `validateQuery()`)

```typescript
// lib/api.ts ligne 31
const required = ['session_id', 'req_id'];
```

**Mais** : Le code passe `this.context.sessionId` qui **peut être undefined**

**Conséquence** : Exception si `sessionId` est `undefined`

**Action** :
1. Vérifier dans le workflow n8n si `session_id` est obligatoire
2. Si NON → Retirer de `required`
3. Si OUI → Générer une valeur par défaut ou valider dans `canUse()`

---

### 3. Quel est le timeout actuel dans lib/api.ts ?

**Réponse** : **20 secondes** (ligne 68)

```typescript
// lib/api.ts ligne 68
const timer = setTimeout(() => ctrl.abort(), 20000);
```

**Problème** : Trop court si n8n prend 20-30s

**Action** : Passer à 60s

---

### 4. Comment le code gère-t-il HTTP 204 ?

**Réponse** : **Pas de gestion spécifique**

- `res.text()` est appelé même si HTTP 204 → `text === ""`
- Détecté comme "Réponse vide" (ligne 77)
- Traité comme erreur : `success: false, error: "Réponse vide depuis n8n"`

**Problème** : HTTP 204 devrait être `success: true, data: null`

**Action** : Ajouter détection `if (res.status === 204)` avant `res.text()`

---

### 5. Y a-t-il un retry automatique ?

**Réponse** : **NON** (pas implémenté)

- Le constructeur accepte `retryCount: number = 3`
- Mais `this.retryCount` n'est jamais utilisé
- Si `fetchValidation()` échoue → erreur immédiate

**Action** : Implémenter boucle retry dans `load()` (voir Bug #6)

---

### 6. La normalisation est-elle toujours appliquée ?

**Réponse** : **NON** (pas du tout appliquée dans `load()`)

```typescript
// N8nValidationStrategy.ts ligne 105
return {
  success: true,
  data: parsed.data  // ← DATA BRUTE (pas de dotObjectToNested)
};
```

**Problème** : La normalisation doit être faite par l'appelant

**Action** : Appeler `dotObjectToNested(parsed.data)` avant le return

---

## H. RÉSUMÉ EXÉCUTIF

### ✅ Points Forts

1. **Architecture propre** : Pattern Strategy bien appliqué
2. **Validation robuste** : `validateQuery()` empêche injection SQL/XSS
3. **Parsing JSON safe** : `safeParseJson()` gère les erreurs
4. **Logging détaillé** : Logs utiles pour debug
5. **Métadonnées riches** : Timing, status, source

### 🔴 Points Critiques (Bugs)

1. **session_id undefined** : Bloque le workflow si manquant
2. **HTTP 204 non géré** : Traité comme erreur au lieu de succès
3. **Timeout 20s** : Trop court (risque timeout prématuré)
4. **Doublon request_id/req_id** : Redondance inutile
5. **Retry non implémenté** : Paramètre accepté mais pas utilisé
6. **Timeout constructeur non utilisé** : Confusion

### 📊 Score Global

| Aspect | Score | Note |
|--------|-------|------|
| **Architecture** | 9/10 | Très propre |
| **Gestion erreurs** | 6/10 | Manque HTTP 204, retry |
| **Configuration** | 4/10 | Paramètres inutilisés |
| **Robustesse** | 5/10 | Timeout court, session_id strict |
| **Normalisation** | 3/10 | Absente |
| **Global** | **5.4/10** | Besoin d'améliorations |

---

## I. PROCHAINES ÉTAPES

### Immédiat (Cette session)
1. ✅ Rapport SP-03 créé
2. ⏭️ Passer à **SP-04** : Audit `UnifiedValidationPage.tsx`

### À Faire (Corrections)
1. 🔴 Rendre `session_id` optionnel ou générer valeur par défaut
2. 🔴 Gérer HTTP 204 correctement
3. 🔴 Augmenter timeout à 60s
4. 🟡 Supprimer doublon `request_id`/`req_id`
5. 🟡 Implémenter retry automatique
6. 🟢 Ajouter normalisation dans `load()`

---

**Rapport généré le** : 2025-10-10
**Par** : Claude Code Assistant
**Version** : 1.0.0
**Fichier audité** : `src/strategies/N8nValidationStrategy.ts` (178 lignes)
**Bugs identifiés** : 8 (3 critiques, 3 moyens, 2 faibles)

---

*Ce rapport détaille l'implémentation actuelle de N8nValidationStrategy, identifie les bugs et fournit des correctifs concrets pour chaque problème.*
