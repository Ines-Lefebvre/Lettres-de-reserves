export const VALIDATION_ENDPOINT = import.meta.env.VITE_VALIDATION_ENDPOINT || 'https://n8n.srv833062.hstgr.cloud/webhook/validation';

export function safeParseJson(raw: string) {
  const cleaned = raw.trim().replace(/^\s*json\s*/i, ''); // retire le préfixe "json"
  try { 
    return { ok: true, data: JSON.parse(cleaned) }; 
  } catch (e) { 
    return { ok: false, error: String(e), raw: cleaned }; 
  }
}

export async function fetchValidation(query: Record<string, string | undefined>) {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null) as [string, string][]
  );
  params.set('_cb', String(Date.now())); // anti-cache
  const url = `${VALIDATION_ENDPOINT}?${params.toString()}`;
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
    clearTimeout(timer);
    return { status: res.status, text };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}