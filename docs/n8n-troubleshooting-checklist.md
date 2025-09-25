# 🔧 N8N Troubleshooting Checklist - JSON Response Issues

## 🚨 Problème Identifié
**Erreur Frontend:** `Failed to execute 'json' on 'Response': Unexpected end of JSON input`

**Cause Racine:** Le webhook n8n renvoie une réponse vide ou malformée alors que le frontend s'attend à du JSON valide.

---

## ✅ Checklist de Vérification N8N

### 1. **Vérification du Node "Respond to Webhook"**

#### 🔍 Headers HTTP Obligatoires
- [ ] **Content-Type:** Doit être `application/json`
- [ ] **Access-Control-Allow-Origin:** Configuré pour le domaine frontend
- [ ] **Access-Control-Allow-Methods:** Inclut `POST, OPTIONS`
- [ ] **Access-Control-Allow-Headers:** Inclut `Content-Type, Authorization`

#### 📝 Corps de Réponse JSON
- [ ] **Toujours renvoyer du JSON valide**, même en cas d'erreur
- [ ] **Minimum requis pour les erreurs:**
  ```json
  {
    "ok": false,
    "error": "error_code",
    "message": "Description de l'erreur"
  }
  ```
- [ ] **Minimum requis pour les succès:**
  ```json
  {
    "ok": true,
    "requestId": "req_123456789",
    "next": "/validation",
    "payload": { ... }
  }
  ```

#### ⚠️ Cas Problématiques à Éviter
- [ ] **Réponse vide** (status 204 ou body vide)
- [ ] **Réponse HTML** au lieu de JSON (erreurs 500 non catchées)
- [ ] **JSON malformé** (virgules manquantes, guillemets non fermés)
- [ ] **Headers manquants** causant des erreurs CORS

---

### 2. **Vérification des Timeouts**

#### 🕐 Timeouts N8N
- [ ] **Workflow timeout:** Vérifier dans Settings > Execution timeout
- [ ] **Node timeout:** Vérifier chaque node OCR/processing
- [ ] **Webhook timeout:** Généralement 30s par défaut

#### 🌐 Timeouts Infrastructure
- [ ] **Reverse Proxy (NGINX):** `proxy_read_timeout`, `proxy_connect_timeout`
- [ ] **Cloudflare:** Timeout de 100s pour les plans gratuits
- [ ] **Load Balancer:** Vérifier les timeouts upstream

#### 📊 Monitoring des Timeouts
```bash
# Logs NGINX pour timeouts
grep "upstream timed out" /var/log/nginx/error.log

# Logs N8N pour executions échouées
docker logs n8n-container | grep "execution failed"
```

---

### 3. **Diagnostic des Logs N8N**

#### 🔍 Logs à Examiner
```bash
# Logs généraux N8N
docker logs n8n-container --tail=100 -f

# Logs spécifiques aux webhooks
docker logs n8n-container | grep "webhook"

# Logs d'erreurs uniquement
docker logs n8n-container | grep "ERROR"
```

#### 📋 Points de Contrôle dans les Logs
- [ ] **Réception du webhook:** `Webhook received`
- [ ] **Traitement OCR:** Logs des nodes de traitement
- [ ] **Erreurs de parsing:** `JSON parse error`, `Invalid JSON`
- [ ] **Timeouts:** `execution timed out`, `upstream timeout`
- [ ] **Réponse envoyée:** `Response sent` avec status code

---

### 4. **Tests de Validation**

#### 🧪 Test Manuel du Webhook
```bash
# Test basique avec curl
curl -X POST "https://your-n8n-instance.com/webhook/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.pdf" \
  -F "requestId=test_123" \
  -v

# Vérifier la réponse:
# - Status code 200
# - Content-Type: application/json
# - Body JSON valide
```

#### 🔧 Test avec Postman/Insomnia
- [ ] **Upload réussi:** Vérifier JSON de réponse
- [ ] **Upload échoué:** Vérifier que l'erreur est en JSON
- [ ] **Timeout simulé:** Tester avec un gros fichier
- [ ] **CORS:** Tester depuis le domaine frontend

---

### 5. **Configuration N8N Recommandée**

#### ⚙️ Node "Respond to Webhook" - Configuration Type
```javascript
// Configuration recommandée
{
  "respondWith": "json",
  "responseBody": "={{ $json }}",
  "options": {
    "responseHeaders": {
      "entries": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Access-Control-Allow-Origin",
          "value": "https://your-frontend-domain.com"
        },
        {
          "name": "Access-Control-Allow-Methods",
          "value": "POST, OPTIONS"
        },
        {
          "name": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-Requested-With"
        }
      ]
    }
  }
}
```

#### 🛡️ Node de Gestion d'Erreur
Ajouter un node "On Error" qui renvoie toujours du JSON:
```javascript
// Node "On Error" - Code JavaScript
return {
  ok: false,
  error: "processing_failed",
  message: "Une erreur s'est produite lors du traitement",
  details: $input.first().error?.message || "Erreur inconnue"
};
```

---

### 6. **Monitoring et Alertes**

#### 📊 Métriques à Surveiller
- [ ] **Taux d'erreur des webhooks** (> 5% = problème)
- [ ] **Temps de réponse moyen** (> 30s = risque timeout)
- [ ] **Réponses vides** (> 1% = configuration incorrecte)
- [ ] **Erreurs CORS** (bloquent les requêtes frontend)

#### 🚨 Alertes Recommandées
```yaml
# Exemple configuration Prometheus/Grafana
- alert: N8NWebhookErrors
  expr: rate(n8n_webhook_errors_total[5m]) > 0.05
  for: 2m
  annotations:
    summary: "Taux d'erreur élevé sur les webhooks N8N"

- alert: N8NWebhookTimeout
  expr: histogram_quantile(0.95, rate(n8n_webhook_duration_seconds_bucket[5m])) > 25
  for: 5m
  annotations:
    summary: "Timeouts fréquents sur les webhooks N8N"
```

---

## 🔄 Plan d'Action Immédiat

### Phase 1: Diagnostic (15 min)
1. [ ] Vérifier les logs N8N des dernières 24h
2. [ ] Tester le webhook manuellement avec curl
3. [ ] Vérifier la configuration du node "Respond to Webhook"

### Phase 2: Correction (30 min)
1. [ ] Ajouter/corriger les headers JSON obligatoires
2. [ ] Implémenter la gestion d'erreur avec JSON
3. [ ] Tester la correction avec un upload réel

### Phase 3: Validation (15 min)
1. [ ] Tester plusieurs scénarios (succès, erreur, timeout)
2. [ ] Vérifier que le frontend ne reçoit plus d'erreurs JSON
3. [ ] Documenter la correction pour l'équipe

---

## 📞 Escalade Support

Si le problème persiste après ces vérifications:

1. **Logs à collecter:**
   - Logs N8N complets de l'incident
   - Logs reverse proxy/load balancer
   - Headers et body de la requête/réponse

2. **Informations à fournir:**
   - Version N8N utilisée
   - Configuration infrastructure (Docker, K8s, etc.)
   - Fréquence du problème (% d'uploads affectés)

3. **Tests de reproduction:**
   - Fichier PDF de test qui reproduit l'erreur
   - Étapes exactes pour reproduire
   - Environnement de test disponible