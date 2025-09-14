import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const src = resolve('public-dev');
const dst = resolve('public');

// Copier les assets de dev uniquement si on n'est pas en production
if (process.env.NODE_ENV !== 'production') {
  if (!existsSync(src)) {
    console.log('[dev-assets] Dossier public-dev non trouvé, ignoré');
    process.exit(0);
  }
  
  // Créer le dossier public s'il n'existe pas
  mkdirSync(dst, { recursive: true });
  
  // Copier récursivement tous les fichiers
  cpSync(src, dst, { recursive: true });
  
  console.log('[dev-assets] ✅ Copied public-dev → public');
} else {
  console.log('[dev-assets] Mode production détecté, assets de dev ignorés');
}