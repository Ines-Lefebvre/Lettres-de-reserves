# 📋 Indexation Détaillée des Fichiers - ReservAT

**Date** : 2025-10-10
**Version** : 1.0.0
**Scope** : Hooks, Stratégies, API, Variables ENV, RPC Functions

---

## 🎯 Vue d'Ensemble

| Catégorie | Nombre de Fichiers | Description |
|-----------|-------------------|-------------|
| **Hooks** | 2 | Hook personnalisé + tests |
| **Stratégies** | 3 | Pattern Strategy (abstract + concrete + types) |
| **API/Services** | 3 | n8n client, lib API, storage |
| **Variables ENV** | 6 | Configuration environnement |
| **RPC Functions** | 2 | Fonctions Supabase |

---

## 🪝 HOOKS

### Hook Principal : useRequestId

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/hooks/useRequestId.ts` |
| **Lignes** | 373 lignes |
| **Rôle** | Gestion unifiée et centralisée du requestId dans toute l'application |
| **Priorité de récupération** | 1. URL params → 2. sessionStorage → 3. localStorage |
| **Validation** | Format alphanumerique + tirets/underscores (5-100 chars) |

#### Fonctions Clés

| Fonction | Signature | Rôle |
|----------|-----------|------|
| **useRequestId** | `(options?: UseRequestIdOptions) => UseRequestIdReturn` | Hook principal React |
| **isValidRequestId** | `(id: string \| null \| undefined) => id is string` | Validation format sécurisé |
| **setRequestId** | `(id: string) => void` | Définir nouveau requestId |
| **clearRequestId** | `() => void` | Nettoyer toutes les sources |
| **generateRequestId** | `() => string` | Générer UUID format `req_{timestamp}_{random}` |

#### Variables ENV Utilisées

Aucune directement. Utilise les sources :
- **URL params** : `?requestId=XXX`, `?rid=XXX`, `?req_id=XXX`
- **sessionStorage** : `current_request_id`
- **localStorage** : `lastRequestId`

#### Interface de Retour

```typescript
export interface UseRequestIdReturn {
  requestId: string | null;
  setRequestId: (id: string) => void;
  clearRequestId: () => void;
  generateRequestId: () => string;
}
```

#### Utilisé Dans

- ✅ Upload.tsx
- ✅ ValidationPage.tsx
- ✅ ValidationPageNew.tsx
- ✅ ValidationPageFullDB.tsx
- ✅ UnifiedValidationPage.tsx
- ✅ WebhookResponse.tsx
- ✅ RequestIdDebugPanel.tsx

#### Tests

| Fichier | Type | Couverture Estimée |
|---------|------|-------------------|
| `src/hooks/useRequestId.test.ts` | Tests unitaires | ~60% |

---

## 🎨 STRATÉGIES (Strategy Pattern)

### 1. Interface Abstraite

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/strategies/ValidationStrategy.ts` |
| **Lignes** | 220 lignes |
| **Rôle** | Interface abstraite définissant le contrat pour les stratégies de validation |
| **Pattern** | Strategy + Template Method |

#### Méthodes Abstraites

| Méthode | Signature | Rôle |
|---------|-----------|------|
| **fetchData** | `abstract fetchData(): Promise<ValidationData>` | Récupérer données de validation |
| **transform** | `abstract transform(data: any): ValidationData` | Transformer format source → format app |
| **validate** | `abstract validate(data: ValidationData): ValidationResult` | Valider données |

#### Méthodes Concrètes

| Méthode | Signature | Rôle |
|---------|-----------|------|
| **log** | `protected log(message: string, ...args: any[]): void` | Logging uniforme |
| **handleError** | `protected handleError(error: Error): ValidationError` | Gestion erreurs commune |

#### Variables ENV Utilisées

Aucune (classe abstraite)

---

### 2. Stratégie Concrète : N8nValidationStrategy

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/strategies/N8nValidationStrategy.ts` |
| **Lignes** | 177 lignes |
| **Rôle** | Implémentation concrète pour récupération depuis n8n webhook |
| **Extends** | `ValidationStrategy` |

#### Fonctions Clés

| Fonction | Signature | Rôle |
|----------|-----------|------|
| **constructor** | `(requestId: string, sessionId?: string)` | Initialisation avec requestId |
| **fetchData** | `async fetchData(): Promise<ValidationData>` | Fetch depuis n8n webhook |
| **transform** | `transform(data: any): ValidationData` | Conversion dot notation → nested JSON |
| **validate** | `validate(data: ValidationData): ValidationResult` | Validation spécifique n8n |
| **parseQuestions** | `private parseQuestions(questions: any[]): Question[]` | Parser questions contextuelles |

#### Variables ENV Utilisées

| Variable | Valeur par défaut | Usage |
|----------|-------------------|-------|
| `VITE_VALIDATION_ENDPOINT` | `https://n8n.srv833062.hstgr.cloud/webhook/validation` | Endpoint fetch validation n8n |

#### Dépendances

- `normalize.ts` : `dotObjectToNested()` pour transformation
- `lib/api.ts` : `fetchValidation()` pour requête HTTP

#### Utilisé Dans

- ✅ UnifiedValidationPage.tsx (stratégie "n8n")

---

### 3. Types Partagés

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/strategies/types.ts` |
| **Lignes** | 129 lignes |
| **Rôle** | Types TypeScript partagés entre stratégies |

#### Types Principaux

```typescript
export interface ValidationData {
  extractedFields: Record<string, any>;
  questions: Question[];
  metadata: ValidationMetadata;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface ValidationMetadata {
  source: 'n8n' | 'localStorage' | 'supabase';
  confidence: number;
  timestamp: string;
  requestId: string;
  sessionId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export type StrategyType = 'n8n' | 'localStorage' | 'supabase';
export type ValidationState = 'idle' | 'loading' | 'success' | 'error' | 'empty';
```

#### Variables ENV Utilisées

Aucune (types uniquement)

---

## 🌐 API & SERVICES

### 1. Client n8n

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/utils/n8nApiClient.ts` |
| **Lignes** | 195 lignes |
| **Rôle** | Client API pour communication avec n8n webhooks (upload uniquement) |
| **Export** | `export const n8nApi = new N8nApiClient()` (singleton) |

#### Fonctions Clés

| Fonction | Signature | Rôle |
|----------|-----------|------|
| **uploadFile** | `async uploadFile(file: File): Promise<ApiResponse<UploadResponse>>` | Upload PDF vers n8n pour OCR |
| **generateRequestId** | `private generateRequestId(): string` | Génère `req_{timestamp}_{random}` |
| **generateIdempotencyKey** | `private generateIdempotencyKey(): string` | Génère clé idempotence |

#### Variables ENV Utilisées

| Variable | Valeur par défaut | Usage |
|----------|-------------------|-------|
| `VITE_N8N_UPLOAD_URL` | `/webhook/upload` | Endpoint upload n8n |

#### Interfaces

```typescript
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  next?: string;
}

export interface UploadResponse {
  ok: boolean;
  requestId: string;
  next: '/validation';
  data: {
    extractedFields: Record<string, any>;
    ocrConfidence: number;
    documentType: string;
  };
}
```

#### Utilisé Dans

- ✅ Upload.tsx (upload fichier)
- ⚠️ Potentiellement dans N8nValidationStrategy (indirect)

#### Tests

❌ Aucun test (À CRÉER)

---

### 2. Lib API (Validation Endpoint)

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/lib/api.ts` |
| **Lignes** | ~150 lignes |
| **Rôle** | Fonctions helpers pour fetch validation depuis n8n |
| **⚠️ Sécurité** | URL publique exposée dans bundle JS |

#### Fonctions Clés

| Fonction | Signature | Rôle |
|----------|-----------|------|
| **fetchValidation** | `async (query: Record<string, string \| undefined>) => Promise<{status: number, text: string}>` | Fetch données validation n8n |
| **safeParseJson** | `(raw: string) => {ok: boolean, data?: any, error?: string}` | Parse JSON avec gestion erreurs |
| **validateQuery** | `(query: Record<string, string \| undefined>) => boolean` | Valide params query (anti-injection) |

#### Variables ENV Utilisées

| Variable | Valeur par défaut | Usage |
|----------|-------------------|-------|
| `VITE_VALIDATION_ENDPOINT` | `https://n8n.srv833062.hstgr.cloud/webhook/validation` | Endpoint validation n8n |

#### Validation Sécurité

```typescript
// Paramètres requis
required = ['session_id', 'req_id']

// Validation format (anti-injection SQL/XSS)
/^[a-zA-Z0-9-_]+$/.test(sessionId)
/^[a-zA-Z0-9-_]+$/.test(reqId)
```

#### Utilisé Dans

- ✅ ValidationPageNew.tsx (fetch direct)
- ✅ N8nValidationStrategy.ts (via stratégie)
- ✅ WebhookResponse.tsx (affichage debug)

#### Tests

❌ Aucun test (À CRÉER)

#### ⚠️ Note Sécurité

```javascript
/**
 * ⚠️ ATTENTION SÉCURITÉ
 *
 * Ce fichier utilise VITE_VALIDATION_ENDPOINT qui est PUBLIC dans le bundle JavaScript.
 * Toute personne peut voir cette URL en ouvrant la console développeur.
 *
 * Protection actuelle : Validation des paramètres uniquement
 * TODO : Implémenter une des solutions suivantes :
 * 1. Proxy Netlify/Vercel Functions
 * 2. Authentification Header Auth dans n8n
 * 3. Rate limiting côté n8n
 */
```

---

### 3. Storage (localStorage)

| Aspect | Détails |
|--------|---------|
| **Fichier** | `src/utils/storage.ts` |
| **Lignes** | 174 lignes |
| **Rôle** | Gestion centralisée du stockage localStorage pour payloads validation |
| **Clé Format** | `accidoc_validation_{requestId}` |

#### Fonctions Clés

| Fonction | Signature | Rôle |
|----------|-----------|------|
| **storeValidationPayload** | `(requestId: string, payload: ValidationPayload \| any) => boolean` | Stocke payload dans localStorage |
| **loadValidationPayload** | `(requestId: string) => ValidationPayload \| null` | Charge payload depuis localStorage |
| **getValidationStorageKey** | `(requestId: string) => string` | Génère clé cohérente `accidoc_validation_{requestId}` |
| **cleanOldPayloads** | `() => void` | Nettoie anciens payloads (TTL expirés) |

#### Variables ENV Utilisées

Aucune (stockage local navigateur)

#### Interface ValidationPayload

```typescript
export interface ValidationPayload {
  success: boolean;
  sessionId: string;
  documentType: string;
  extractedData: {
    employeur: any;
    victime: any;
    accident?: any;
    maladie?: any;
    interim?: any;
    temoin: any;
    tiers: any;
  };
  validationFields: Record<string, any>;
  contextualQuestions: Array<{
    id: string;
    question: string;
    type: string;
    context: string;
    category: string;
  }>;
  completionStats: {
    totalFields: number;
    filledFields: number;
    completionRate: number;
    requiredFields: number;
    filledRequiredFields: number;
    requiredCompletionRate: number;
  };
  nextStep: string;
  instructions: any;
  metadata: any;
}
```

#### Utilisé Dans

- ✅ Upload.tsx (stockage après upload)
- ✅ ValidationPage.tsx (chargement)
- ✅ ValidationPageFullDB.tsx (chargement)
- ✅ UnifiedValidationPage.tsx (stratégie localStorage)

#### Tests

❌ Aucun test (À CRÉER)

---

## 🔧 VARIABLES D'ENVIRONNEMENT

### Fichier `.env`

```bash
VITE_SUPABASE_URL=https://rwzqnaqaapgitjjsuokf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_N8N_UPLOAD_URL=https://n8n.srv833062.hstgr.cloud/webhook/webhook/upload
VITE_SITE_URL=https://landing-page-convers-h8da.bolt.host
```

### Tableau des Variables

| Variable | Valeur (Production) | Fallback | Utilisé Dans | Rôle |
|----------|---------------------|----------|--------------|------|
| **VITE_SUPABASE_URL** | `https://rwzqnaqaapgitjjsuokf.supabase.co` | ❌ Requis | `supabaseClient.ts` | URL instance Supabase |
| **VITE_SUPABASE_ANON_KEY** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ❌ Requis | `supabaseClient.ts` | Clé publique Supabase |
| **VITE_N8N_UPLOAD_URL** | `https://n8n.srv833062.hstgr.cloud/webhook/webhook/upload` | `/webhook/upload` | `n8nApiClient.ts` | Endpoint upload n8n |
| **VITE_VALIDATION_ENDPOINT** | Non défini dans .env | `https://n8n.srv833062.hstgr.cloud/webhook/validation` | `lib/api.ts` | Endpoint validation n8n |
| **VITE_SITE_URL** | `https://landing-page-convers-h8da.bolt.host` | - | App config | URL site production |
| **NODE_ENV** / **VITE_DEV** | `development` / `production` | - | Debug utils | Mode environnement |

### ⚠️ Notes Sécurité

| Variable | Visibilité | Risque | Mitigation |
|----------|------------|--------|------------|
| **VITE_SUPABASE_ANON_KEY** | 🔴 Publique (bundle JS) | Faible (clé anon RLS) | ✅ RLS activé sur toutes tables |
| **VITE_N8N_UPLOAD_URL** | 🔴 Publique (bundle JS) | Moyen (webhook exposé) | ⚠️ À sécuriser (auth header) |
| **VITE_VALIDATION_ENDPOINT** | 🔴 Publique (bundle JS) | Moyen (webhook exposé) | ⚠️ À sécuriser (rate limit) |
| **VITE_SITE_URL** | 🟢 Publique (OK) | Aucun | - |

### Recommandations

1. ✅ **Supabase** : RLS bien configuré, clé anon sécurisée
2. ⚠️ **n8n Upload** : Ajouter authentification (Header Auth) ou proxy
3. ⚠️ **n8n Validation** : Implémenter rate limiting + validation IP
4. 💡 **Alternative** : Utiliser Netlify/Vercel Functions comme proxy pour cacher endpoints n8n

---

## 🗄️ SUPABASE RPC FUNCTIONS

### 1. rpc_create_upload

| Aspect | Détails |
|--------|---------|
| **Nom RPC** | `rpc_create_upload` |
| **Fichier SQL** | `supabase/migrations/20250919070154_fading_dune.sql` |
| **Rôle** | Créer entrée upload + ocr_result dans transaction atomique |

#### Signature

```sql
CREATE OR REPLACE FUNCTION rpc_create_upload(
  p_user_id uuid,
  p_request_id text,
  p_filename text,
  p_filesize bigint,
  p_file_type text,
  p_n8n_response jsonb,
  p_document_type text DEFAULT 'AT_NORMALE',
  p_extracted_fields jsonb DEFAULT '{}'::jsonb,
  p_ocr_confidence decimal(3,2) DEFAULT 0.0
)
RETURNS jsonb
```

#### Retour

```json
{
  "upload_id": "uuid",
  "ocr_result_id": "uuid",
  "success": true
}
```

#### Utilisé Dans

| Fichier | Ligne | Code |
|---------|-------|------|
| **Upload.tsx** | ~250 | `const { error: uploadError } = await supabase.rpc('rpc_create_upload', {...})` |

#### Paramètres Passés

```typescript
{
  p_user_id: userId,
  p_request_id: requestId,
  p_filename: file.name,
  p_filesize: file.size,
  p_file_type: file.type,
  p_n8n_response: n8nResponse, // JSONB brut
  p_document_type: documentType || 'AT_NORMALE',
  p_extracted_fields: extractedFields, // JSONB
  p_ocr_confidence: ocrConfidence || 0.0
}
```

#### Transaction

1. INSERT INTO `uploads` → Retourne `upload_id`
2. INSERT INTO `ocr_results` (avec `upload_id`) → Retourne `ocr_result_id`
3. RETURN JSON `{ upload_id, ocr_result_id, success: true }`

---

### 2. rpc_insert_validation

| Aspect | Détails |
|--------|---------|
| **Nom RPC** | `rpc_insert_validation` |
| **Fichier SQL** | `supabase/migrations/20250919070154_fading_dune.sql` |
| **Rôle** | Insérer/mettre à jour validation avec données complètes |

#### Signature

```sql
CREATE OR REPLACE FUNCTION rpc_insert_validation(
  p_ocr_result_id uuid,
  p_user_id uuid,
  p_validated_fields jsonb,
  p_contextual_answers jsonb,
  p_answers jsonb,
  p_completion_stats jsonb,
  p_request_id text,
  p_session_id text,
  p_document_type text,
  p_validation_status text DEFAULT 'draft'
)
RETURNS jsonb
```

#### Retour

```json
{
  "validation_id": "uuid",
  "success": true
}
```

#### Utilisé Dans

| Fichier | Ligne | Code |
|---------|-------|------|
| **ValidationPage.tsx** | ~800 | `const { error: validationError } = await supabase.rpc('rpc_insert_validation', {...})` |

#### Paramètres Passés

```typescript
{
  p_ocr_result_id: ocrResultId,
  p_user_id: userId,
  p_validated_fields: validatedFields, // JSONB nested
  p_contextual_answers: contextualAnswers, // JSONB object
  p_answers: answers, // JSONB array
  p_completion_stats: completionStats, // JSONB
  p_request_id: requestId,
  p_session_id: sessionId,
  p_document_type: documentType,
  p_validation_status: 'draft' | 'validated' | 'submitted'
}
```

#### Logique

1. CHECK si validation existe déjà (par `request_id`)
2. Si existe : UPDATE
3. Sinon : INSERT
4. RETURN `{ validation_id, success: true }`

---

## 📊 TABLEAU RÉCAPITULATIF PAR CATÉGORIE

### 🗂️ PAGES (Fichiers appelants)

| Fichier | Rôle | Fonctions Clés | Variables ENV Utilisées |
|---------|------|---------------|------------------------|
| **Upload.tsx** | Upload fichier CERFA + OCR | `handleUpload()`, `sendToN8n()`, `storeValidationPayload()` | `VITE_N8N_UPLOAD_URL`, `VITE_SUPABASE_URL` |
| **ValidationPage.tsx** | Validation complète (legacy) | `loadValidationPayload()`, `saveValidation()`, `submitValidation()` | `VITE_SUPABASE_URL` |
| **ValidationPageNew.tsx** | Récupération n8n | `fetchValidation()`, `safeParseJson()` | `VITE_VALIDATION_ENDPOINT` |
| **ValidationPageFullDB.tsx** | Chargement DB | `loadFromSupabase()`, `saveToSupabase()` | `VITE_SUPABASE_URL` |
| **UnifiedValidationPage.tsx** | Validation unifiée (3 stratégies) | `new N8nValidationStrategy()`, `loadValidationPayload()` | `VITE_VALIDATION_ENDPOINT`, `VITE_SUPABASE_URL` |

---

### 🪝 HOOKS

| Fichier | Rôle | Fonctions Clés | Variables ENV Utilisées |
|---------|------|---------------|------------------------|
| **useRequestId.ts** | Gestion requestId centralisée | `useRequestId()`, `generateRequestId()`, `setRequestId()`, `clearRequestId()` | Aucune (URL/storage uniquement) |
| **useRequestId.test.ts** | Tests unitaires | Tests du hook | Aucune |

---

### 🎨 STRATÉGIES

| Fichier | Rôle | Fonctions Clés | Variables ENV Utilisées |
|---------|------|---------------|------------------------|
| **ValidationStrategy.ts** | Interface abstraite | `fetchData()`, `transform()`, `validate()` (abstract) | Aucune |
| **N8nValidationStrategy.ts** | Implémentation n8n | `fetchData()`, `transform()`, `parseQuestions()` | `VITE_VALIDATION_ENDPOINT` |
| **types.ts** | Types partagés | Types TypeScript uniquement | Aucune |

---

### 🌐 SERVICES / UTILS

| Fichier | Rôle | Fonctions Clés | Variables ENV Utilisées |
|---------|------|---------------|------------------------|
| **n8nApiClient.ts** | Client API n8n | `uploadFile()`, `generateRequestId()`, `generateIdempotencyKey()` | `VITE_N8N_UPLOAD_URL` |
| **lib/api.ts** | Helpers fetch validation | `fetchValidation()`, `safeParseJson()`, `validateQuery()` | `VITE_VALIDATION_ENDPOINT` |
| **storage.ts** | Gestion localStorage | `storeValidationPayload()`, `loadValidationPayload()`, `cleanOldPayloads()` | Aucune |
| **supabaseClient.ts** | Client Supabase | `supabase` (singleton) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **normalize.ts** | Normalisation données | `dotObjectToNested()`, `normalizeNumericFields()` | Aucune |
| **debugUtils.ts** | Utils debug | `logWithTimestamp()`, `formatJSON()` | `NODE_ENV` / `VITE_DEV` |

---

### 🗄️ RPC FUNCTIONS (Supabase)

| Nom RPC | Fichier SQL | Rôle | Utilisé Dans |
|---------|------------|------|--------------|
| **rpc_create_upload** | `20250919070154_fading_dune.sql` | INSERT uploads + ocr_results (atomique) | Upload.tsx |
| **rpc_insert_validation** | `20250919070154_fading_dune.sql` | INSERT/UPDATE validations | ValidationPage.tsx |

---

## 🔗 GRAPHE DE DÉPENDANCES

```
📄 Upload.tsx
  ├─> 🪝 useRequestId
  ├─> 🌐 n8nApiClient (uploadFile)
  ├─> 🌐 storage (storeValidationPayload)
  ├─> 🗄️ supabaseClient
  └─> 🗄️ RPC: rpc_create_upload

📄 UnifiedValidationPage.tsx
  ├─> 🪝 useRequestId
  ├─> 🎨 N8nValidationStrategy
  │     ├─> 🎨 ValidationStrategy (abstract)
  │     ├─> 🌐 lib/api (fetchValidation)
  │     └─> 🌐 normalize (dotObjectToNested)
  ├─> 🌐 storage (loadValidationPayload)
  └─> 🗄️ supabaseClient

📄 ValidationPage.tsx (legacy)
  ├─> 🪝 useRequestId
  ├─> 🌐 storage (loadValidationPayload)
  ├─> 🗄️ supabaseClient
  └─> 🗄️ RPC: rpc_insert_validation

📄 ValidationPageNew.tsx
  ├─> 🪝 useRequestId
  └─> 🌐 lib/api (fetchValidation, safeParseJson)

🎨 N8nValidationStrategy
  ├─> 🌐 lib/api (fetchValidation)
  └─> 🌐 normalize (dotObjectToNested)

🌐 n8nApiClient
  └─> ENV: VITE_N8N_UPLOAD_URL

🌐 lib/api
  └─> ENV: VITE_VALIDATION_ENDPOINT

🗄️ supabaseClient
  └─> ENV: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## 📈 STATISTIQUES

### Par Catégorie

| Catégorie | Fichiers | Lignes Totales | Tests |
|-----------|----------|----------------|-------|
| **Hooks** | 2 | 373 + tests | ✅ 1 fichier |
| **Stratégies** | 3 | 526 | ❌ 0 |
| **Services/Utils** | 6 | ~650 | ✅ 1 (normalize) |
| **RPC Functions** | 2 | SQL (migrations) | ❌ 0 |
| **Total** | 13 | ~1,549 | 2 fichiers |

### Variables ENV

| Variable | Publique (Bundle JS) | Fichiers Utilisateurs | Critique |
|----------|---------------------|---------------------|----------|
| `VITE_SUPABASE_URL` | ✅ Oui | 10+ fichiers | 🟡 Moyen (RLS protège) |
| `VITE_SUPABASE_ANON_KEY` | ✅ Oui | 1 fichier | 🟢 Faible (clé anon) |
| `VITE_N8N_UPLOAD_URL` | ✅ Oui | 2 fichiers | 🔴 Élevé (webhook exposé) |
| `VITE_VALIDATION_ENDPOINT` | ✅ Oui | 2 fichiers | 🔴 Élevé (webhook exposé) |
| `VITE_SITE_URL` | ✅ Oui | Config | 🟢 Aucun |

---

## 🎯 RECOMMANDATIONS

### Tests Manquants (Priorité Haute)

| Fichier | Tests Actuels | À Créer | Impact |
|---------|--------------|---------|--------|
| **storage.ts** | ❌ Aucun | `storage.test.ts` | 🔴 Haute (utilisé partout) |
| **n8nApiClient.ts** | ❌ Aucun | `n8nApiClient.test.ts` | 🔴 Haute (upload critical) |
| **lib/api.ts** | ❌ Aucun | `api.test.ts` | 🟡 Moyenne (fetch validation) |
| **N8nValidationStrategy.ts** | ❌ Aucun | `N8nValidationStrategy.test.ts` | 🟡 Moyenne (stratégie) |

### Sécurité ENV (Priorité Haute)

| Variable | Problème | Solution Recommandée |
|----------|----------|---------------------|
| `VITE_N8N_UPLOAD_URL` | Endpoint public exposé | 1. Proxy Netlify Functions<br>2. Auth Header n8n<br>3. Rate limiting |
| `VITE_VALIDATION_ENDPOINT` | Endpoint public exposé | 1. Proxy Netlify Functions<br>2. Auth Header n8n<br>3. Rate limiting |

### Refactorisation (Priorité Moyenne)

| Action | Gain | Effort |
|--------|------|--------|
| Simplifier `useRequestId.ts` (373 → 150L) | Lisibilité | 🟡 Moyen |
| Unifier appels n8n (api.ts + n8nApiClient.ts) | -50 lignes dupliquées | 🟢 Faible |
| Créer hooks métier (`useValidationData`) | Réutilisabilité | 🟡 Moyen |

---

## 📚 RÉFÉRENCES

### Fichiers Documentation Associés

- `SP-01_INDEXATION_COMPLETE.md` - Indexation complète du dépôt
- `CODE_COMPARISON_ANALYSIS.md` - Analyse comparative et duplications
- `BUSINESS_FLOW_DESCRIPTION.md` - Description flux métier
- `VALIDATION_STRATEGIES_IMPLEMENTATION.md` - Doc stratégies

### Migrations SQL Pertinentes

- `20250919070154_fading_dune.sql` - RPC functions (rpc_create_upload, rpc_insert_validation)
- `20250918150803_divine_swamp.sql` - Schéma initial tables

---

**Rapport généré le** : 2025-10-10
**Par** : Claude Code Assistant
**Version** : 1.0.0
**Format** : Markdown

---

*Ce rapport détaille l'ensemble des hooks, stratégies, services API et variables d'environnement du projet ReservAT, servant de référence pour l'intégration et le développement.*
