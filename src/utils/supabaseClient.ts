import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Configuration Supabase manquante');
  console.error('URL Supabase:', url || 'MANQUANT');
  console.error('Clé Anon:', key ? 'CONFIGURÉE' : 'MANQUANTE');
  console.error('Veuillez configurer les variables dans .env et redémarrer le serveur');
}

export const supabase = createClient(url, key, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: true 
  },
  global: {
    headers: {
      'X-Client-Info': 'lettres-reserves-app'
    }
  }
});