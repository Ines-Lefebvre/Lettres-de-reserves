Lettres-de-reserves

## Optimisations vidéo

### Fichiers vidéo requis
Placez les fichiers suivants dans le dossier `public/` :

- `lawyer-video-720.mp4` - Version mobile (720p)
- `lawyer-video-1080.mp4` - Version desktop (1080p) 
- `posters/lawyer-video-poster.jpg` - Image poster de la vidéo

### Performances
- Lazy loading avec IntersectionObserver
- Sources adaptées mobile/desktop
- Autoplay intelligent (desktop uniquement, respecte prefers-reduced-motion)
- Preload metadata uniquement

## Configuration des variables d'environnement

### Variables requises pour la validation
- `VITE_VALIDATION_ENDPOINT` - Endpoint n8n pour la récupération des données de validation (méthode GET)
  - Exemple: `https://n8n.srv833062.hstgr.cloud/webhook/validation`
  - Doit accepter les paramètres: `session_id`, `req_id`, `request_id`
  - Doit retourner un JSON valide avec les données de validation

### Gestion des erreurs de validation
- Page `/validation-new` : Version robuste avec gestion d'erreurs explicites
- Gestion des réponses vides, JSON invalides, erreurs CORS
- Requêtes GET simples pour éviter les préflight OPTIONS
- Anti-cache automatique avec paramètre `_cb`