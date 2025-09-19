/**
 * Utilitaires pour la génération d'identifiants de requête
 */

/**
 * Génère un nouvel identifiant de requête unique
 * Format: req_timestamp_randomString
 * 
 * @returns Identifiant de requête unique
 * 
 * @example
 * newRequestId() // "req_1642684800000_abc123def"
 */
export function newRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Récupère le requestId existant UNIQUEMENT
 * AUCUNE GÉNÉRATION - Utiliser newRequestId() explicitement si besoin
 * 
 * @returns RequestId existant ou null
 */
export function getOrCreateRequestId(): string | null {
  const requestId = sessionStorage.getItem('current_request_id');
  console.log('REQUEST_ID DEBUGGING:', {
    source: 'getOrCreateRequestId',
    requestId: requestId,
    timestamp: Date.now()
  });
  return requestId;
}

/**
 * Force la mise à jour du requestId dans sessionStorage
 * 
 * @param requestId - Le requestId à persister
 */
export function setRequestId(requestId: string): void {
  sessionStorage.setItem('current_request_id', requestId);
  console.log('💾 RequestId mis à jour:', requestId);
}

/**
 * Récupère le requestId actuel depuis sessionStorage
 * 
 * @returns RequestId actuel ou null
 */
export function getCurrentRequestId(): string | null {
  return sessionStorage.getItem('current_request_id');
}

/**
 * Nettoie le requestId du sessionStorage
 */
export function clearRequestId(): void {
  sessionStorage.removeItem('current_request_id');
  console.log('🧹 RequestId nettoyé du sessionStorage');
}

/**
 * Génère un identifiant de session unique
 * Format: sess_timestamp_randomString
 * 
 * @returns Identifiant de session unique
 */
export function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Valide le format d'un requestId
 * 
 * @param requestId - L'identifiant à valider
 * @returns true si le format est valide
 */
export function isValidRequestId(requestId: string): boolean {
  return /^req_\d+_[a-z0-9]+$/.test(requestId);
}

/**
 * Extrait le timestamp d'un requestId
 * 
 * @param requestId - L'identifiant de requête
 * @returns Le timestamp ou null si invalide
 */
export function extractTimestampFromRequestId(requestId: string): number | null {
  const match = requestId.match(/^req_(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}