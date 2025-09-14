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
- Lecture à la demande (pas d'autoplay)
- Preload metadata uniquement
