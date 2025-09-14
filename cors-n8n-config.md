# Configuration CORS sécurisée pour N8N

## ⚠️ IMPORTANT
Cette configuration doit être appliquée **côté serveur N8N**, pas côté client React.

## 1. Variables d'environnement N8N

Ajoutez dans votre workflow N8N :

```javascript
// Variables d'environnement à définir dans N8N
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "https://landing-page-convers-h8da.bolt.host,https://www.mondomaine.fr,https://app.mondomaine.fr";
```

## 2. Nœud de validation CORS (à ajouter en début de workflow)

```javascript
// Nœud "Function" - Validation CORS
const allowedOrigins = $env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
const requestOrigin = $request.headers.origin;

console.log('🔒 CORS Check:', {
  requestOrigin,
  allowedOrigins,
  userAgent: $request.headers['user-agent']
});

// Vérification de l'origine
if (!requestOrigin) {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      error: "origin_not_allowed",
      message: "Origine manquante"
    }
  };
}

if (!allowedOrigins.includes(requestOrigin)) {
  console.log('❌ CORS BLOCKED:', requestOrigin);
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      error: "origin_not_allowed",
      message: "Origine non autorisée",
      requestedOrigin: requestOrigin
    }
  };
}

console.log('✅ CORS ALLOWED:', requestOrigin);

// Passer les données au nœud suivant avec origine validée
return {
  validatedOrigin: requestOrigin,
  ...($input.all() || {})
};
```

## 3. Nœud de réponse HTTP (à la fin du workflow)

```javascript
// Nœud "Respond to Webhook" - Headers CORS sécurisés
const validatedOrigin = $input.first().validatedOrigin;

// Headers CORS restrictifs
const corsHeaders = {
  'Access-Control-Allow-Origin': validatedOrigin, // JAMAIS *
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Seulement nécessaires
  'Access-Control-Allow-Headers': 'Content-Type', // Headers strictement nécessaires
  'Vary': 'Origin', // Important pour le cache
  'Content-Type': 'application/json'
};

// Pas de credentials si non requis
// 'Access-Control-Allow-Credentials': 'false' // Optionnel

return {
  statusCode: 200,
  headers: corsHeaders,
  body: {
    success: true,
    message: 'Données reçues et traitées',
    timestamp: new Date().toISOString(),
    origin: validatedOrigin
  }
};
```

## 4. Gestion des requêtes OPTIONS (Preflight)

```javascript
// Nœud conditionnel - Si méthode OPTIONS
if ($request.method === 'OPTIONS') {
  const requestOrigin = $request.headers.origin;
  const allowedOrigins = $env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  
  if (!allowedOrigins.includes(requestOrigin)) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        error: "origin_not_allowed"
      }
    };
  }
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // Cache preflight 24h
      'Vary': 'Origin'
    },
    body: ''
  };
}
```

## 5. Structure du workflow N8N recommandée

```
1. Webhook Trigger
   ↓
2. CORS Validation (Function)
   ↓
3. OPTIONS Handler (IF node)
   ↓
4. Main Processing Logic
   ↓
5. Secure Response (Respond to Webhook)
```

## 6. Tests de validation

### Test 1 : Origine autorisée
```bash
curl -X POST \
  -H "Origin: https://landing-page-convers-h8da.bolt.host" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://n8n.srv833062.hstgr.cloud/webhook-test/mistral-ocr-data
```
**Attendu :** 200 OK avec `Access-Control-Allow-Origin: https://landing-page-convers-h8da.bolt.host`

### Test 2 : Origine non autorisée
```bash
curl -X POST \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://n8n.srv833062.hstgr.cloud/webhook-test/mistral-ocr-data
```
**Attendu :** 403 Forbidden avec `{"error": "origin_not_allowed"}`

### Test 3 : Preflight OPTIONS
```bash
curl -X OPTIONS \
  -H "Origin: https://landing-page-convers-h8da.bolt.host" \
  -H "Access-Control-Request-Method: POST" \
  https://n8n.srv833062.hstgr.cloud/webhook-test/mistral-ocr-data
```
**Attendu :** 200 OK avec headers CORS appropriés

## 7. Variables d'environnement N8N à configurer

Dans votre instance N8N, définissez :
```
ALLOWED_ORIGINS=https://landing-page-convers-h8da.bolt.host,https://www.mondomaine.fr,https://app.mondomaine.fr
```

## ⚡ Points critiques

1. **Jamais `*` en production** avec credentials
2. **Toujours `Vary: Origin`** pour le cache
3. **Validation stricte** des origines
4. **Logs détaillés** pour le debugging
5. **Gestion propre** des OPTIONS preflight

## 🔧 Côté client (déjà OK)

Le code React/Vite n'a pas besoin de modification - il envoie déjà correctement l'header `Origin` automatiquement.