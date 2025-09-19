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