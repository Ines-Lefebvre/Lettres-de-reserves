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

export const VALIDATION_ENDPOINT = import.meta.env.VITE_VALIDATION_ENDPOINT ||
  'https://n8n.srv833062.hstgr.cloud/webhook/validation';

if (!import.meta.env.VITE_VALIDATION_ENDPOINT) {
  console.warn('VITE_VALIDATION_ENDPOINT manquant - utilisation du fallback');
}

export function safeParseJson(raw: string) {
  const cleaned = raw.trim().replace(/^\s*json\s*/i, ''); // retire le préfixe "json"
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (e) {
    return { ok: false, error: String(e), raw: cleaned };
  }
}

export function validateQuery(query: Record<string, string | undefined>) {
  // ✅ CORRECTIF #1: session_id devient optionnel
  const required = ['req_id'];
  const missing = required.filter(key => !query[key]);

  if (missing.length > 0) {
    throw new Error(`Paramètres manquants : ${missing.join(', ')}`);
  }

  // Validation des IDs (empêche injection)
  const reqId = query.req_id || '';

  if (!/^[a-zA-Z0-9-_]+$/.test(reqId)) {
    throw new Error('req_id invalide');
  }

  // Validation session_id si présent
  if (query.session_id && !/^[a-zA-Z0-9-_]+$/.test(query.session_id)) {
    throw new Error('session_id invalide');
  }

  return true;
}

export async function fetchValidation(
  query: Record<string, string | undefined>,
  timeout: number = 60000  // ✅ CORRECTIF #5: Timeout configurable (défaut 60s)
) {
  validateQuery(query);
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null) as [string, string][]
  );
  params.set('_cb', String(Date.now())); // anti-cache
  const url = `${VALIDATION_ENDPOINT}?${params.toString()}`;
  
  console.log('🔍 API - Fetching validation:', {
    endpoint: VALIDATION_ENDPOINT,
    query,
    finalUrl: url
  });
  
  const ctrl = new AbortController();
  // ✅ CORRECTIF #2 & #5: Timeout 60s pour laisser le temps à n8n (OCR ~20-30s)
  const timer = setTimeout(() => {
    console.warn(`⏱️ API - Timeout après ${timeout}ms`);
    ctrl.abort();
  }, timeout);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      credentials: 'omit'
    });

    clearTimeout(timer);

    // ✅ CORRECTIF #3: Gérer HTTP 204 No Content (valide mais pas de données)
    if (res.status === 204) {
      console.log('📭 API - HTTP 204 No Content (aucune donnée disponible)');
      return { status: 204, text: '' };
    }

    const text = await res.text();

    console.log('🔍 API - Response received:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      textLength: text?.length || 0,
      textPreview: text?.substring(0, 200)
    });

    return { status: res.status, text };
  } catch (e) {
    console.error('❌ API - Fetch failed:', e);
    clearTimeout(timer);
    throw e;
  }
}