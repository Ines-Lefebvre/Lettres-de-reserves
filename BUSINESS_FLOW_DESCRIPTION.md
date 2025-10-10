# Description du Flux Métier - ReservAT (Lettres de Réserves)

## 📋 Vue d'ensemble

**Nom du système** : ReservAT - Plateforme de génération de lettres de réserves pour accidents du travail et maladies professionnelles

**Objectif métier** : Permettre aux entreprises de générer rapidement une lettre de réserves signée par un avocat spécialisé pour éviter des surcoûts liés aux accidents du travail.

**Contexte** : Les entreprises ont un délai légal très court pour émettre des réserves suite à un accident du travail. Le système vise à automatiser et accélérer ce processus critique.

---

## 🎯 Acteurs du système

### Utilisateur principal
- **Chef d'entreprise / RH / Gestionnaire AT-MP**
- Besoin : Générer une lettre de réserves signée par avocat en urgence
- Contexte : Délai légal court, enjeux financiers élevés

### Systèmes externes
- **n8n** : Workflow automation pour traitement des documents
- **OCR** : Service d'extraction de données des PDFs (intégré dans n8n)
- **Supabase** : Base de données et authentification
- **Stripe** : Paiement (mentionné dans schéma mais non implémenté dans code frontend)

---

## 🔄 Flux métier principal

### Phase 0 : Accès et présentation

**Point d'entrée** : Page d'accueil (`/`)

**Éléments clés :**
- Présentation du problème (coût de l'inaction)
- Comparaison "Avec ReservAT" vs "Sans ReservAT"
- Vidéo d'un avocat expliquant le service
- Call-to-action : "Déposer votre dossier"

**Action utilisateur :**
- Clic sur le bouton CTA → Redirection vers `/login`

**Données présentées :**
- Tarification : 150€ HT pour lettre simple, 300€ HT pour argumentée
- Délai : Traitement en urgence
- Garantie : Lettre signée par avocat spécialisé

---

### Phase 1 : Authentification

**Route** : `/login`

**Processus :**
1. L'utilisateur arrive sur la page de connexion
2. Système d'authentification via Supabase Auth
3. Modes disponibles :
   - Connexion email/mot de passe (implémenté)
   - Inscription nouveau compte (implémenté)

**Données créées :**
```sql
-- Table auth.users (Supabase)
- id (uuid)
- email
- encrypted_password
- created_at
```

**États possibles :**
- ✅ **Succès** : Session créée → Redirection vers `/upload`
- ❌ **Échec** : Identifiants invalides → Message d'erreur, reste sur `/login`
- ⚠️ **Session expirée** : Détection via `AuthGuard` → Redirection vers `/login`

**Hypothèses :**
- L'inscription crée automatiquement un profil dans la table `profiles`
- Pas de vérification email (email confirmation désactivée)
- Pas de récupération de mot de passe visible dans le code

---

### Phase 2 : Dépôt du dossier (Upload)

**Route** : `/upload`

**Protection** : Page protégée par `AuthGuard` (nécessite authentification)

#### 2.1 Sélection du fichier

**Action utilisateur :**
- Sélectionne un fichier PDF (CERFA d'accident du travail)
- Contraintes :
  - Format : PDF uniquement
  - Taille maximale : 40 MB

**Validation client :**
```typescript
if (!file) → Erreur "Veuillez sélectionner un fichier PDF"
if (file.size > 40MB) → Erreur "Le fichier ne doit pas dépasser 40 MB"
```

#### 2.2 Génération du Request ID

**Processus automatique :**
```typescript
requestId = generateRequestId() // Format: "req_{timestamp}_{random}"
```

**Rôle du Request ID :**
- Identifiant unique du dossier
- Suit le dossier tout au long du processus
- Clé de récupération des données
- Stocké dans sessionStorage et URL

**Exemple** : `req_1706894400000_abc123def`

#### 2.3 Création du dossier en base de données

**Appel RPC Supabase :**
```sql
CALL rpc_create_upload(
  p_request_id: requestId,
  p_filename: "cerfa_at_123.pdf",
  p_filesize: 2048576,
  p_file_type: "application/pdf",
  p_upload_status: "processing"
)
```

**Table créée : `uploads`**
```
id: uuid (auto)
user_id: uuid (de la session)
request_id: "req_1706894400000_abc123def"
filename: "cerfa_at_123.pdf"
filesize: 2048576
file_type: "application/pdf"
upload_status: "processing"
created_at: timestamp
```

#### 2.4 Envoi vers n8n (Premier essai)

**Endpoint** : `POST https://n8n.srv833062.hstgr.cloud/webhook/upload`

**Données envoyées (FormData) :**
```
requestId: "req_1706894400000_abc123def"
file: [binary PDF]
filename: "cerfa_at_123.pdf"
filesize: "2048576"
timestamp: "2025-01-15T10:30:00.000Z"
token: "jwt_1706894400000_xyz789" (token basique généré)
idempotencyKey: "idem_1706894400000_def456"
```

**Traitement n8n (hypothèse) :**
1. Réception du fichier
2. Extraction OCR des données du CERFA
3. Parsing et structuration des champs
4. Retour du payload structuré

**Réponse attendue de n8n :**
```json
[{
  "ok": true,
  "requestId": "req_1706894400000_abc123def",
  "payload": {
    "nom_salarie": "DUPONT",
    "prenom_salarie": "Jean",
    "date_accident": "2025-01-10",
    "lieu_accident": "Atelier B",
    "temoins": "Marie MARTIN",
    "circonstances": "Chute d'une échelle...",
    "lesions": "Fracture bras gauche",
    "date_certificat_initial": "2025-01-10",
    "arret_travail": "oui",
    "nom_medecin": "Dr LEMOINE",
    // ... autres champs extraits
  },
  "next": {
    "url": "/validation"
  }
}]
```

#### 2.5 Scénarios de sortie du traitement upload

##### Scénario A : Succès immédiat ✅

**Condition :**
- HTTP 200/201
- Réponse JSON valide
- Champs `ok: true`, `requestId`, `payload` présents

**Actions système :**
1. Normalise les champs numériques du payload
2. Stocke le payload dans localStorage :
   ```typescript
   localStorage.setItem(
     `validation_payload_${requestId}`,
     JSON.stringify({
       payload: normalizedPayload,
       timestamp: Date.now(),
       requestId: requestId
     })
   )
   ```
3. Met à jour la table `uploads` :
   ```sql
   UPDATE uploads
   SET upload_status = 'completed',
       n8n_response = payload,
       processed_at = now()
   WHERE request_id = requestId
   ```

**Navigation :**
```
→ /validation?requestId=req_1706894400000_abc123def
```

**État** : `manual=false` (données disponibles)

---

##### Scénario B : Échec premier essai ❌ → Choix utilisateur

**Conditions d'échec possibles :**
- Erreur réseau (fetch failed)
- HTTP non-2xx (500, 502, 503, etc.)
- Réponse JSON invalide
- Champs manquants dans la réponse (`ok !== true` ou pas de `payload`)

**Actions système :**
1. Détecte l'échec
2. Met `retryCount = 0` (première tentative)
3. Affiche bannière avec 2 options :

**Bannière d'erreur :**
```
⚠️ Le traitement automatique a échoué
Que souhaitez-vous faire ?

[Bouton 1: Réessayer l'upload]  [Bouton 2: Saisir manuellement]
```

**Option 1 : Réessayer** 🔄
```typescript
handleRetryClick()
→ retryCount = 1
→ Relance onUpload() avec le même fichier et requestId
```

**Option 2 : Saisir manuellement** ✍️
```typescript
handleManualClick()
→ Stocke payload vide: storeValidationPayload(requestId, {})
→ Navigation: /validation?requestId={requestId}&manual=true
→ État: manual=true, reason="USER_MANUAL_CHOICE"
```

---

##### Scénario C : Échec deuxième essai ❌ → Saisie manuelle forcée

**Condition :**
- `retryCount = 1` (deuxième tentative)
- Échec identique au premier essai

**Actions système :**
1. Détecte que c'est le 2ème échec
2. Stocke payload vide : `storeValidationPayload(requestId, {})`
3. Navigation automatique sans choix :

```
→ /validation?requestId={requestId}&manual=true
→ État: manual=true, reason="NETWORK_ERROR" | "HTTP_500" | "INVALID_JSON_OR_NO_PAYLOAD"
```

**Hypothèse :** Après 2 échecs, le système force le mode manuel pour ne pas bloquer l'utilisateur.

---

### Phase 3 : Validation et complément des données

**Route** : `/validation` (ou `/validation-new`, `/validation-full`, selon version)

**Note** : Le système a 4 pages de validation différentes, suggérant une évolution du produit :
- `/validation` : Version legacy avec formulaire complet
- `/validation-new` : Version récupération depuis n8n
- `/validation-full` : Version avec introspection DB
- `/validation` (unified) : Version unifiée avec sélecteur de stratégie

**Protection** : Page protégée par `AuthGuard`

#### 3.1 Détection du mode et chargement des données

**Paramètres URL :**
```
requestId: Identifiant du dossier (obligatoire)
manual: boolean (true = saisie manuelle, false/absent = données OCR)
strategy: 'n8n' | 'localStorage' | 'supabase' (unified page)
```

**Stratégies de chargement :**

##### Stratégie 1 : n8n (temps réel)
```typescript
// Appel GET vers endpoint validation
GET https://n8n.srv833062.hstgr.cloud/webhook/validation
Params: {
  session_id: sessionId,
  req_id: requestId,
  request_id: requestId,
  _cb: cacheBuster
}

// Parse la réponse JSON
→ Si succès : Affiche les données extraites
→ Si vide (HTTP 204) : État "empty"
→ Si JSON invalide : État "badjson"
→ Si erreur : État "error"
```

##### Stratégie 2 : localStorage (standard)
```typescript
// Récupère depuis le navigateur
const payload = localStorage.getItem(`validation_payload_${requestId}`)
→ Si trouvé : Parse et affiche
→ Si absent : Erreur "Aucune donnée trouvée"
```

##### Stratégie 3 : Supabase (persistance)
```typescript
// Requête à la base de données
SELECT * FROM validations
WHERE id = recordId (ou request_id = requestId)
→ Si trouvé : Affiche les données validées précédemment
→ Si absent : Erreur "Dossier introuvable"
```

#### 3.2 Affichage du formulaire de validation

**Mode automatique (`manual=false`)** :
- Affiche les données extraites par OCR
- Champs pré-remplis avec les valeurs du payload
- Utilisateur peut corriger/compléter

**Mode manuel (`manual=true`)** :
- Formulaire vide
- Utilisateur saisit toutes les informations
- Message explicatif sur pourquoi le mode manuel

**Champs du formulaire (hypothèse basée sur schéma) :**

**Section 1 : Identité du salarié**
- Nom, Prénom
- Date de naissance
- Numéro de sécurité sociale
- Poste occupé

**Section 2 : Accident**
- Date de l'accident
- Heure de l'accident
- Lieu exact
- Circonstances détaillées
- Témoins éventuels

**Section 3 : Lésions**
- Nature des lésions
- Siège des lésions
- Certificat médical initial (date, médecin)
- Arrêt de travail (oui/non, durée)

**Section 4 : Employeur**
- Raison sociale
- SIRET
- Adresse
- Représentant légal

**Section 5 : Questions contextuelles**
```json
// Format stocké dans contextual_questions
[
  {
    "id": "q1",
    "category": "circonstances",
    "question": "Le salarié respectait-il les consignes de sécurité ?",
    "type": "yes_no",
    "required": true
  },
  {
    "id": "q2",
    "category": "materiel",
    "question": "Le matériel était-il en bon état ?",
    "type": "yes_no",
    "required": true
  },
  {
    "id": "q3",
    "category": "formation",
    "question": "Le salarié avait-il reçu la formation adéquate ?",
    "type": "yes_no",
    "required": true
  }
  // ... autres questions
]
```

**Validation en temps réel :**
- Champs obligatoires marqués en rouge si vides
- Format des dates vérifié (JJ/MM/AAAA)
- Cohérence des données (ex: date accident < date certificat)

#### 3.3 Statistiques de complétion

**Calcul dynamique :**
```typescript
completionStats = {
  totalFields: 25,
  filledFields: 18,
  requiredFields: 15,
  requiredFilled: 15,
  percentage: 72, // (18/25 * 100)
  isComplete: true // (requiredFilled === requiredFields)
}
```

**Affichage visuel :**
- Barre de progression
- Indicateur "15/15 champs obligatoires remplis"
- Sections complètes marquées ✓

#### 3.4 Sauvegarde brouillon

**Déclencheurs :**
- Clic sur bouton "Sauvegarder le brouillon"
- Auto-save toutes les 30 secondes (hypothèse)

**Processus :**

1. Création/mise à jour du résultat OCR :
```sql
INSERT INTO ocr_results (
  upload_id,
  user_id,
  document_type,
  extracted_fields,
  ocr_confidence,
  validation_fields,
  contextual_questions
) VALUES (
  upload.id,
  auth.uid(),
  'AT_NORMALE',
  {extracted_fields_from_ocr},
  0.85,
  {current_form_values},
  {contextual_questions_list}
)
```

2. Création/mise à jour de la validation :
```sql
CALL rpc_insert_validation(
  p_ocr_result_id: ocr_result.id,
  p_request_id: requestId,
  p_validated_fields: {current_form_values},
  p_user_corrections: {diff_between_ocr_and_user},
  p_contextual_answers: {answers_to_questions},
  p_answers: [{all_answers_array}],
  p_document_type: 'AT_NORMALE',
  p_completion_stats: completionStats,
  p_validation_status: 'draft'
)
```

**Table `validations` créée/mise à jour :**
```
id: uuid
user_id: uuid
ocr_result_id: uuid
request_id: "req_1706894400000_abc123def"
validated_fields: {données_formulaire}
user_corrections: {corrections_utilisateur}
contextual_answers: {réponses_questions}
answers: [array_réponses]
document_type: "AT_NORMALE"
completion_stats: {totalFields: 25, filledFields: 18, ...}
validation_status: "draft"
created_at: timestamp
```

**Feedback utilisateur :**
- ✅ "Brouillon sauvegardé"
- ❌ "Erreur de sauvegarde"

#### 3.5 Soumission du dossier

**Déclencheurs :**
- Clic sur "Soumettre le dossier"
- Validation : `completionStats.isComplete === true`

**Validation pré-soumission :**
```typescript
if (!completionStats.isComplete) {
  → Erreur "Veuillez compléter tous les champs obligatoires"
  → Scroll vers premier champ incomplet
  → Bloque la soumission
}
```

**Processus de soumission :**

1. Sauvegarde finale (même que brouillon mais avec statut différent) :
```sql
CALL rpc_insert_validation(
  ...,
  p_validation_status: 'submitted', -- Changement clé
  p_validated_at: now()
)
```

2. Mise à jour du statut upload :
```sql
UPDATE uploads
SET upload_status = 'completed'
WHERE request_id = requestId
```

3. (Hypothèse) Déclenchement d'un webhook/événement :
```typescript
// Notification vers n8n pour génération de la lettre
POST https://n8n.srv833062.hstgr.cloud/webhook/generate-letter
Body: {
  requestId: "req_1706894400000_abc123def",
  validationId: validation.id,
  userId: user.id,
  documentType: "AT_NORMALE",
  validatedFields: {...}
}
```

**Navigation après soumission :**
```
→ /response?status=processing&requestId={requestId}
```

---

### Phase 4 : Traitement et génération (Backend - Hypothèse)

**Note** : Cette phase n'est pas visible dans le code frontend, mais déduite du schéma et de la logique métier.

#### 4.1 Workflow n8n (hypothèse)

**Déclencheur** : Réception webhook de soumission

**Étapes présumées :**

1. **Validation des données**
   - Vérification complétude
   - Validation format des champs
   - Calcul du type de lettre (simple vs argumentée)

2. **Analyse juridique**
   - Détection des éléments de contestation
   - Identification des arguments juridiques
   - Sélection du modèle de lettre

3. **Génération du document**
   - Remplissage du template Word/PDF
   - Insertion des données validées
   - Insertion des arguments juridiques
   - Formatage final

4. **Signature électronique** (hypothèse)
   - Apposition signature avocat
   - Certification du document

5. **Notification utilisateur**
   - Email avec lien de téléchargement
   - Mise à jour statut dans DB

#### 4.2 États possibles pendant le traitement

**État : Processing** ⏳
```
- Le système traite le dossier
- Estimation : 2-5 minutes
- Utilisateur voit une page d'attente
```

**État : Success** ✅
```
- Document généré avec succès
- Lien de téléchargement disponible
- Email de notification envoyé
```

**État : Error** ❌
```
- Échec de génération
- Message d'erreur explicite
- Support contacté automatiquement
```

---

### Phase 5 : Réception du résultat

**Route** : `/response`

**Paramètres URL :**
```
status: 'success' | 'error' | 'processing'
requestId: ID du dossier
message: Message explicatif
documentUrl: URL de téléchargement (si success)
fileName: Nom du fichier généré
processedAt: Date/heure de génération
estimatedTime: Temps estimé (si processing)
```

#### 5.1 Scénario : Traitement en cours

**Affichage :**
```
⏱️ Traitement en cours
Votre dossier est en cours de traitement
Temps estimé : 2 minutes

[Animation spinner]
```

**Comportement :**
- Rafraîchissement auto toutes les 10s (hypothèse)
- Ou webhook push notification (hypothèse)

#### 5.2 Scénario : Succès

**Affichage :**
```
✅ Votre lettre de réserves est prête

Document : lettre_reserves_accident_123.pdf
Généré le : 15/01/2025 à 10:45
Signé par : Maître Jean DUPONT, Avocat spécialisé AT-MP

[Bouton : Télécharger la lettre]
[Bouton : Envoyer par email]
[Bouton : Nouveau dossier]
```

**Actions disponibles :**

1. **Télécharger** :
   ```typescript
   window.open(documentUrl, '_blank')
   // Télécharge le PDF
   ```

2. **Envoyer par email** (hypothèse) :
   ```typescript
   POST /api/send-email
   Body: {
     requestId,
     recipientEmail: user.email,
     documentUrl
   }
   ```

3. **Nouveau dossier** :
   ```typescript
   navigate('/upload')
   // Reset requestId
   // Génère nouveau requestId
   ```

#### 5.3 Scénario : Erreur

**Affichage :**
```
❌ Erreur de génération

Une erreur est survenue lors de la génération de votre lettre.

Détails : {message}

Notre équipe a été notifiée et vous contactera sous 1h.

[Bouton : Retour à l'accueil]
[Bouton : Contacter le support]
```

**Actions système :**
- Création ticket support automatique
- Email à l'équipe technique
- Log de l'erreur en base

---

## 📊 Schéma de base de données

### Tables principales et relations

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles
    ↓ user_id
    ├── uploads (1:N)
    │      ↓ id
    │   ocr_results (1:N)
    │      ↓ id
    │   validations (1:N)
    │      ↓ id
    │   payments (1:N - optionnel)
    │
    └── dossiers (legacy, 1:N)
```

### Cycle de vie d'un dossier

```
uploads.upload_status:
  pending → processing → completed | failed

validations.validation_status:
  draft → validated → submitted

payments.payment_status (hypothèse):
  pending → processing → completed | failed | refunded
```

---

## 🔐 Sécurité et contrôle d'accès

### Row Level Security (RLS)

**Principe** : Chaque utilisateur ne voit que ses propres données

**Policies appliquées (hypothèse d'après migrations) :**

```sql
-- Profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Validations
CREATE POLICY "Users can view own validations"
  ON validations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Etc.
```

### AuthGuard

**Composant** : `AuthGuard.tsx`

**Rôle** : Protéger les pages nécessitant authentification

**Mécanisme :**
```typescript
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  → Redirection vers /login
}

if (session) {
  → Affiche la page protégée
}
```

**Pages protégées :**
- `/upload`
- `/validation` (toutes versions)
- `/response` (probablement)

---

## 🔄 Gestion des identifiants

### Request ID

**Format** : `req_{timestamp}_{random}`

**Exemple** : `req_1706894400000_abc123def`

**Rôle central :**
- Identifiant unique du dossier
- Clé de stockage localStorage
- Paramètre URL pour toutes les pages
- Clé de récupération en base de données
- Tracking de bout en bout

**Cycle de vie :**
1. Génération au début de l'upload
2. Stockage dans sessionStorage
3. Passage en paramètre URL
4. Stockage en base (tables uploads, validations)
5. Utilisation pour récupération des données
6. Conservation pour historique

**Hook dédié** : `useRequestId()`
- Détection automatique (URL, sessionStorage, génération)
- Logging pour debug
- Persistance automatique
- Synchronisation cross-tabs (hypothèse)

### Session ID

**Format** : `sess_{timestamp}_{random}`

**Rôle** : Identifier la session utilisateur (distinct de l'auth)

**Utilisation** :
- Paramètre dans les appels n8n
- Stocké dans sessionStorage
- Permet de regrouper plusieurs dossiers d'une même session

---

## 🎨 États et transitions

### État global du dossier

```
[Création] → [Upload Processing] → [Validation Draft] → [Validation Submitted] → [Letter Generation] → [Completed]
    ↓              ↓                      ↓                      ↓                       ↓
[Cancelled]   [Failed]             [Correction]         [Payment Required]        [Error]
```

### États de l'interface utilisateur

**Page Upload :**
- `idle` : En attente de sélection fichier
- `uploading` : Envoi en cours vers n8n
- `RETRY_CHOICE` : Bannière erreur avec choix
- `success` : Upload réussi, navigation vers validation

**Page Validation (ValidationPageNew) :**
- `idle` : État initial
- `loading` : Récupération des données
- `ok` : Données chargées avec succès
- `empty` : Réponse vide (HTTP 204)
- `badjson` : JSON invalide
- `error` : Erreur de connexion

**Page Unified Validation :**
- `idle` : État initial
- `loading` : Chargement selon stratégie
- `success` : Données disponibles
- `error` : Erreur de chargement

**Page Response :**
- `processing` : En cours de génération
- `success` : Lettre générée
- `error` : Échec de génération

---

## 💰 Modèle économique (hypothèse)

### Tarification

**Lettre simple** : 150€ HT
- Réserves basiques
- Argumentation standard
- Délai : 2h

**Lettre argumentée** : 300€ HT
- Argumentation juridique détaillée
- Analyse approfondie
- Délai : 4h

### Processus de paiement (non visible dans code actuel)

**Hypothèse basée sur schéma DB :**

1. Soumission du dossier → Status `validation_status = 'submitted'`
2. Redirection vers page de paiement Stripe (non implémentée)
3. Paiement effectué → `payment_status = 'completed'`
4. Génération de la lettre déclenchée
5. Livraison du document

**Table `payments` présente mais non utilisée dans code frontend**

**Scénario alternatif possible :**
- Paiement après validation mais avant génération
- Ou paiement en amont (prépaiement)
- Ou facturation en différé

---

## 📧 Notifications (hypothèse)

### Emails utilisateur

**1. Confirmation d'inscription**
- Envoi : Après création compte
- Contenu : Bienvenue, accès plateforme

**2. Dossier reçu**
- Envoi : Après soumission validation
- Contenu : Confirmation réception, délai estimé

**3. Lettre prête**
- Envoi : Après génération réussie
- Contenu : Lien téléchargement, résumé dossier

**4. Erreur de traitement**
- Envoi : Si échec génération
- Contenu : Explication, contact support

### Notifications système (hypothèse)

**Slack/Email équipe :**
- Nouveau dossier soumis
- Échec de génération
- Erreur technique critique

---

## 🔍 Parcours utilisateur type (succès)

### Scénario nominal complet

```
1. [Page Accueil]
   - Utilisateur lit présentation
   - Comprend l'urgence et l'enjeu
   - Clic "Déposer votre dossier"
   → Navigation vers /login

2. [Authentification]
   - Connexion ou inscription
   - Validation email/mot de passe
   - Session créée
   → Navigation vers /upload

3. [Upload du CERFA]
   - Sélection fichier PDF (CERFA AT)
   - Clic "Envoyer"
   - Génération requestId: req_1706894400000_abc123def
   - Création dossier en base (uploads, status=processing)
   - Envoi vers n8n
   - n8n extrait les données (OCR)
   - Retour payload structuré
   - Stockage localStorage et DB (ocr_results)
   → Navigation vers /validation?requestId=req_1706894400000_abc123def

4. [Validation des données]
   - Chargement payload depuis localStorage
   - Affichage formulaire pré-rempli
   - Utilisateur vérifie/corrige les données
   - Répond aux questions contextuelles (15 questions)
   - Barre progression: 18/25 champs → 25/25 champs
   - Clic "Sauvegarder brouillon" (auto-save)
     → Création validation (status=draft)
   - Clic "Soumettre le dossier"
     → Mise à jour validation (status=submitted)
     → Création payment (status=pending)
   → Navigation vers /response?status=processing

5. [Traitement backend]
   - Workflow n8n reçoit notification
   - Analyse juridique automatique
   - Génération lettre à partir du template
   - Signature électronique avocat
   - Upload document final
   - Mise à jour payment (status=completed)
   - Envoi email notification

6. [Réception résultat]
   - Page refresh auto ou webhook push
   - Affichage success
   - Bouton téléchargement actif
   - Utilisateur télécharge PDF
   - Envoie à la CPAM dans les délais légaux

✅ Dossier complet traité en < 30 minutes
```

### Durées estimées (hypothèse)

```
Authentification:        30 secondes
Upload + OCR:            1-2 minutes
Validation formulaire:   5-10 minutes
Génération lettre:       2-5 minutes
---
Total:                   8-17 minutes
```

---

## 🚨 Parcours alternatifs (échecs)

### Échec 1 : OCR n'extrait rien

**Point d'échec** : Phase 2 (Upload)

**Symptôme** :
- n8n renvoie `ok: true` mais `payload: {}`
- Ou payload avec champs vides

**Comportement système :**
- Stocke payload vide
- Navigation vers /validation en mode normal
- Formulaire vide
- Utilisateur saisit tout manuellement

**Statut** : `manual=false` mais formulaire vide de facto

---

### Échec 2 : n8n timeout/indisponible (1er essai)

**Point d'échec** : Phase 2 (Upload)

**Symptôme** :
- Fetch timeout (>30s)
- n8n serveur down (ECONNREFUSED)
- HTTP 502/503

**Comportement système :**
1. Détecte erreur réseau
2. Affiche bannière RETRY_CHOICE
3. Utilisateur choisit :
   - **Réessayer** → Relance upload (retryCount=1)
   - **Manuel** → Navigation vers /validation?manual=true

**Avantage** : Laisse le contrôle à l'utilisateur

---

### Échec 3 : n8n échec persistant (2ème essai)

**Point d'échec** : Phase 2 (Upload) après retry

**Symptôme** :
- Même erreur qu'au 1er essai
- retryCount = 1

**Comportement système :**
1. Détecte 2ème échec
2. Force le mode manuel (pas de choix)
3. Stocke payload vide
4. Navigation auto : /validation?manual=true&reason=NETWORK_ERROR

**Justification** : Évite de bloquer l'utilisateur indéfiniment

---

### Échec 4 : Formulaire incomplet à la soumission

**Point d'échec** : Phase 3 (Validation)

**Symptôme** :
- Utilisateur clic "Soumettre"
- Mais champs obligatoires manquants

**Comportement système :**
```typescript
if (requiredFilled < requiredFields) {
  → Message erreur "Veuillez compléter tous les champs obligatoires"
  → Scroll vers premier champ vide
  → Focus sur le champ
  → Bloque la soumission
  → validation_status reste 'draft'
}
```

**Utilisateur doit** : Compléter avant de pouvoir soumettre

---

### Échec 5 : Erreur base de données

**Point d'échec** : Phase 3 (Sauvegarde)

**Symptômes possibles** :
- RPC Supabase timeout
- Contrainte violation (foreign key)
- Session expirée

**Comportement système :**
```typescript
try {
  await supabase.rpc('rpc_insert_validation', ...)
} catch (error) {
  → Message erreur "Erreur de sauvegarde"
  → Données restent dans formulaire (pas de perte)
  → Utilisateur peut réessayer
  → Log erreur côté client
}
```

**Cas critique** : Session expirée
```typescript
→ Détection par AuthGuard
→ Redirection vers /login
→ Perte potentielle des données saisies (⚠️ problème)
```

---

### Échec 6 : Génération lettre échoue

**Point d'échec** : Phase 4 (Backend)

**Symptômes possibles** :
- Template corrompu
- Données invalides
- Service signature down

**Comportement système** (hypothèse) :
1. n8n détecte l'erreur
2. Webhook vers frontend : status=error
3. Page /response affiche erreur
4. Email équipe support
5. Notification utilisateur
6. Proposition :
   - Réessai automatique
   - Contact support
   - Remboursement (si payé)

---

## 🛠️ Stratégies de récupération

### Stratégie 1 : Retry automatique

**Appliqué à** : Erreurs réseau transitoires

**Mécanisme** :
```typescript
retryCount = 0 → 1ère tentative
↓ échec
retryCount = 1 → 2ème tentative
↓ échec
→ Mode manuel forcé
```

**Limite** : 2 tentatives maximum

---

### Stratégie 2 : Mode manuel de secours

**Appliqué à** : OCR échoue, n8n indisponible

**Avantage** :
- Ne bloque jamais l'utilisateur
- Permet toujours de soumettre un dossier
- Dégradation gracieuse du service

**Inconvénient** :
- Plus lent (saisie manuelle complète)
- Plus d'erreurs de saisie possibles

---

### Stratégie 3 : Sauvegarde brouillon

**Appliqué à** : Session longue, interruption

**Mécanisme** :
- Sauvegarde manuelle "Sauvegarder brouillon"
- Auto-save périodique (hypothèse, non visible dans code)
- Données persistées en DB avec status='draft'

**Récupération** :
```typescript
// Au retour utilisateur
→ Charge validation.id depuis DB
→ Restaure les champs du formulaire
→ Reprend où il en était
```

---

### Stratégie 4 : localStorage comme cache

**Appliqué à** : Problème connexion DB temporaire

**Mécanisme** :
```typescript
// Toujours stocker dans localStorage
storeValidationPayload(requestId, payload)

// Si DB fail
→ Données toujours dans localStorage
→ Utilisateur peut continuer
→ Retry sauvegarde DB plus tard
```

**Nettoyage** :
```typescript
cleanOldPayloads() // Supprime payloads > 24h
```

---

## 📱 Expérience utilisateur

### Points forts du système

1. **Simplicité** : 4 pages principales, flux linéaire
2. **Résilience** : Multiples fallbacks en cas d'erreur
3. **Transparence** : États clairs (loading, success, error)
4. **Flexibilité** : Mode auto + mode manuel
5. **Rapidité** : OCR automatise 80% de la saisie

### Points d'amélioration identifiables

1. **Perte de données** :
   - Si session expire pendant validation
   - Solution : Auto-save + restauration session

2. **Feedback utilisateur** :
   - Pas de barre de progression pendant OCR
   - Pas d'estimation de temps

3. **Gestion paiement** :
   - Table `payments` existe mais non utilisée
   - Workflow paiement non visible

4. **Historique** :
   - Pas de page "Mes dossiers"
   - Pas d'accès aux dossiers précédents

5. **Validation avancée** :
   - Pas de validation cross-champs (ex: dates cohérentes)
   - Pas de calculs automatiques

---

## 🎯 Hypothèses et zones d'incertitude

### Hypothèses formulées

1. **Auto-save** : Non visible dans code, mais logique pour UX
2. **Paiement Stripe** : Table existe, workflow non implémenté
3. **Email notifications** : Logique mais non visible
4. **Génération lettre** : Process backend entièrement supposé
5. **Signature électronique** : Évoquée métier mais non documentée
6. **Workflow n8n détaillé** : Boîte noire, seules entrées/sorties visibles

### Questions ouvertes

1. **Quand le paiement intervient-il ?**
   - Avant validation ?
   - Après soumission ?
   - Après génération ?

2. **Délai de traitement réel ?**
   - Estimation : 2-5 minutes
   - SLA garanti ?

3. **Modèles de lettres** :
   - Combien de templates ?
   - Comment choisir simple vs argumentée ?
   - Critères de décision automatiques ?

4. **Avocat signataire** :
   - Signature automatique ?
   - Validation manuelle avocat ?
   - Responsabilité juridique ?

5. **Conformité légale** :
   - Valeur légale de la signature électronique ?
   - Archivage légal (durée, format) ?
   - RGPD : durée conservation données ?

6. **Gestion multi-dossiers** :
   - Utilisateur peut-il avoir plusieurs dossiers simultanés ?
   - Historique des dossiers passés ?
   - Export des données ?

---

## 📐 Architecture technique (résumé)

### Stack technique

**Frontend** :
- React + TypeScript
- React Router (navigation)
- Tailwind CSS (UI)
- Lucide React (icônes)

**Backend** :
- Supabase (DB + Auth)
- n8n (workflow automation)
- OCR service (intégré n8n ?)

**Stockage** :
- PostgreSQL (Supabase)
- localStorage (cache client)
- sessionStorage (requestId, sessionId)

**APIs externes** :
- n8n webhooks (upload, validation, generation)
- Stripe (paiement - hypothèse)

### Flux de données

```
Client (React)
    ↕ [HTTP/REST]
n8n (Webhooks)
    ↕ [OCR, Template, Signature]
Backend Services
    ↕ [SQL/RPC]
Supabase (PostgreSQL)
```

### Sécurité

- **Authentification** : Supabase Auth (email/password)
- **Autorisation** : Row Level Security (RLS)
- **API** : CORS configuré pour n8n
- **Tokens** : JWT via Supabase, tokens basiques pour n8n

---

## 📋 Checklist de conformité métier

### Exigences légales AT-MP (hypothèse)

- [?] Délai légal de 48h pour émettre réserves respecté
- [?] Signature avocat certifiée et valeur légale
- [?] Archivage 10 ans minimum
- [?] Traçabilité complète du dossier
- [?] Conformité RGPD (consentement, droit à l'oubli)
- [?] Mentions légales et CGV

### Exigences techniques

- [✅] Authentification sécurisée
- [✅] Protection des pages sensibles (AuthGuard)
- [✅] RLS sur toutes les tables
- [✅] Validation côté client
- [?] Validation côté serveur (non visible)
- [✅] Gestion d'erreurs gracieuse
- [✅] Logging et debug (requestId tracking)
- [?] Tests automatisés (non visibles)

### Exigences UX

- [✅] Flux linéaire et clair
- [✅] Feedback visuel à chaque étape
- [✅] Gestion des erreurs user-friendly
- [✅] Mode manuel de secours
- [⚠️] Sauvegarde brouillon (manuelle seulement ?)
- [❌] Historique des dossiers
- [❌] Barre de progression globale

---

## 🔮 Évolution du produit (visible dans code)

### Versions successives identifiables

**V1 : ValidationPage (legacy)**
- Formulaire complet intégré
- Logique complexe (1038 lignes)
- Questions contextuelles
- Sauvegarde et soumission

**V2 : ValidationPageNew**
- Séparation récupération données
- Focus sur chargement depuis n8n
- Gestion d'erreurs améliorée
- Plus léger (282 lignes)

**V3 : ValidationPageFullDB**
- Chargement depuis Supabase
- Introspection dynamique de table
- Edition de champs JSON
- Validation granulaire (773 lignes)

**V4 : UnifiedValidationPage (actuelle)**
- Fusion des 3 approches
- Sélecteur de stratégie (n8n, localStorage, Supabase)
- Interface unifiée
- Plus modulaire (420 lignes)

### Patterns d'évolution observés

1. **Séparation des concerns**
   - Récupération données ≠ Validation ≠ Soumission

2. **Stratégie pattern**
   - Abstraction des sources de données
   - Interchangeabilité n8n / localStorage / DB

3. **Résilience progressive**
   - V1: Aucun fallback
   - V4: Multiple strategies + retry + manual

4. **Refactoring itératif**
   - Code dupliqué → Hook useRequestId
   - Pages multiples → Page unifiée
   - Logique métier → Strategies

---

## 📊 Métriques business (hypothèse)

### KPIs attendus

**Taux de conversion** :
```
Visiteurs homepage → Inscription : ?%
Inscription → Upload : ?%
Upload → Validation soumise : ?%
Validation → Paiement : ?%
Paiement → Lettre téléchargée : ?%
```

**Taux de succès technique** :
```
OCR succès : ?% (objectif: >90%)
Génération lettre succès : ?% (objectif: >99%)
Délai moyen traitement : ?min (objectif: <10min)
```

**Satisfaction utilisateur** :
```
NPS : ?
Temps moyen par dossier : ?min (objectif: <15min)
Taux de retour erreur : ?% (objectif: <5%)
```

---

## 🎓 Glossaire métier

**AT** : Accident du Travail

**MP** : Maladie Professionnelle

**CERFA** : Formulaire administratif standardisé pour déclaration AT

**Lettre de réserves** : Document légal contestatnt le caractère professionnel d'un accident ou les circonstances

**OCR** : Optical Character Recognition - Extraction automatique de texte depuis PDF

**Request ID** : Identifiant unique d'un dossier (format: req_timestamp_random)

**Payload** : Ensemble des données extraites par OCR ou saisies manuellement

**Validation** : Processus de vérification et complément des données avant soumission

**RLS** : Row Level Security - Sécurité au niveau ligne en base de données

**n8n** : Outil d'automation de workflows (type Zapier open-source)

---

## 📝 Conclusion

### Flux métier prévu (synthèse)

Le système ReservAT implémente un flux métier en 5 phases principales :

1. **Authentification** : Création compte / connexion
2. **Upload** : Dépôt du CERFA PDF avec extraction OCR automatique
3. **Validation** : Vérification et complément des données extraites
4. **Génération** : Création automatique de la lettre signée par avocat
5. **Livraison** : Téléchargement du document final

**Originalité** : Double stratégie automatique (OCR) + manuelle (fallback) permettant une résilience maximale face aux échecs techniques.

**Complexité** : La gestion du requestId comme fil conducteur et les multiples stratégies de récupération de données (n8n, localStorage, Supabase) montrent une architecture résiliente mais complexe.

**Points d'attention** :
- Workflow paiement non finalisé (table existe mais non utilisée)
- Génération lettre entièrement backend (boîte noire)
- Conformité légale à vérifier (signature électronique, archivage)

**Maturité du produit** : L'évolution visible dans le code (4 versions de pages de validation) suggère un produit en phase d'itération et d'amélioration continue.

---

**Document rédigé sans modification du code, basé uniquement sur l'analyse du code source et du schéma de base de données.**

**Version** : 1.0
**Date** : 2025-10-10
**Type** : Description analytique (sans recommandations ni corrections)
