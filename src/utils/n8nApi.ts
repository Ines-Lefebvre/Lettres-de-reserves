/**
 * API Client pour n8n - SIMPLE ET DIRECT
 * Pas de classes, pas de patterns complexes, juste une fonction qui marche
 */

const N8N_ENDPOINT = 'https://n8n.srv833062.hstgr.cloud/webhook/validation';
const TIMEOUT = 30000;

interface ValidationData {
  [key: string]: any;
}

interface FetchValidationResult {
  success: boolean;
  data?: ValidationData;
  error?: string;
}

/**
 * Récupère les données de validation depuis n8n
 */
export async function fetchValidationData(requestId: string): Promise<FetchValidationResult> {
  console.log('🔄 Fetching validation data for:', requestId);

  if (!requestId || requestId.trim() === '') {
    return {
      success: false,
      error: 'Request ID manquant'
    };
  }

  try {
    const parts = requestId.split('_');
    const sessionId = parts.length >= 2 ? parts[1] : requestId;

    const url = new URL(N8N_ENDPOINT);
    url.searchParams.set('session_id', sessionId);
    url.searchParams.set('req_id', requestId);
    url.searchParams.set('request_id', requestId);
    url.searchParams.set('_t', Date.now().toString());

    console.log('🌐 Fetching from:', url.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    if (!text || text.trim() === '') {
      throw new Error('Réponse vide du serveur');
    }

    const data = JSON.parse(text);

    console.log('✅ Data fetched successfully');

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('❌ Fetch error:', error);

    let errorMessage = 'Erreur de chargement';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout : Le serveur met trop de temps à répondre';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
