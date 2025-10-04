export const VALIDATION_ENDPOINT = import.meta.env.VITE_VALIDATION_ENDPOINT;

if (!VALIDATION_ENDPOINT) {
  throw new Error('VITE_VALIDATION_ENDPOINT manquant dans .env');
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
  const required = ['session_id', 'req_id'];
  const missing = required.filter(key => !query[key]);

  if (missing.length > 0) {
    throw new Error(`Paramètres manquants : ${missing.join(', ')}`);
  }

  // Validation des IDs (empêche injection)
  const sessionId = query.session_id || '';
  const reqId = query.req_id || '';

  if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
    throw new Error('session_id invalide');
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(reqId)) {
    throw new Error('req_id invalide');
  }

  return true;
}

export async function fetchValidation(query: Record<string, string | undefined>) {
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
  const timer = setTimeout(() => ctrl.abort(), 20000);
  
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      cache: 'no-store', 
      signal: ctrl.signal, 
      credentials: 'omit' 
    });
    const text = await res.text();
    
    console.log('🔍 API - Response received:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      textLength: text?.length || 0,
      textPreview: text?.substring(0, 200)
    });
    
    clearTimeout(timer);
    return { status: res.status, text };
  } catch (e) {
    console.error('❌ API - Fetch failed:', e);
    clearTimeout(timer);
    throw e;
  }
}