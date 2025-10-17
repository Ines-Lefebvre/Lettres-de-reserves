/**
 * Utilitaire de diagnostic des variables d'environnement
 *
 * Permet de comprendre pourquoi les variables ne sont pas accessibles au runtime
 * et de faciliter le debugging en production.
 */

/**
 * Log un diagnostic complet des variables d'environnement
 */
export function logEnvironmentDiagnostic() {
  console.group('🔍 Diagnostic des Variables d\'Environnement');

  console.log('📊 Informations de base:');
  console.log('  Mode:', import.meta.env.MODE);
  console.log('  Dev:', import.meta.env.DEV);
  console.log('  Prod:', import.meta.env.PROD);
  console.log('  Base URL:', import.meta.env.BASE_URL);

  console.log('\n📋 Toutes les variables disponibles (clés uniquement):');
  const allKeys = Object.keys(import.meta.env);
  console.log('  Count:', allKeys.length);
  console.log('  Keys:', allKeys);

  console.log('\n🎯 Variables VITE_ attendues:');

  const expectedVars = [
    'VITE_VALIDATION_ENDPOINT',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  expectedVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (value) {
      // Masquer les secrets partiellement
      if (varName.includes('KEY') || varName.includes('SECRET')) {
        const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
        console.log(`  ✅ ${varName}: ${masked} (présente)`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`  ❌ ${varName}: UNDEFINED`);
    }
  });

  console.log('\n💡 Recommandations:');
  if (!import.meta.env.VITE_VALIDATION_ENDPOINT) {
    console.log('  ⚠️  VITE_VALIDATION_ENDPOINT est undefined');
    console.log('  → Vérifiez que .env contient: VITE_VALIDATION_ENDPOINT=...');
    console.log('  → En production, vérifiez les variables d\'environnement du service de hosting');
  }

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.log('  ⚠️  Variables Supabase manquantes');
    console.log('  → Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  }

  console.groupEnd();
}

/**
 * Vérifie si les variables critiques sont présentes
 */
export function checkCriticalEnvVars(): {
  valid: boolean;
  missing: string[];
  present: string[];
} {
  const criticalVars = [
    'VITE_VALIDATION_ENDPOINT',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missing: string[] = [];
  const present: string[] = [];

  criticalVars.forEach(varName => {
    if (import.meta.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    present
  };
}

/**
 * Retourne une version sûre des variables d'env (secrets masqués)
 */
export function getSafeEnvSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};

  Object.keys(import.meta.env).forEach(key => {
    const value = import.meta.env[key];

    if (typeof value === 'string') {
      // Masquer les secrets
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
        snapshot[key] = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      } else {
        snapshot[key] = value;
      }
    } else {
      snapshot[key] = String(value);
    }
  });

  return snapshot;
}
