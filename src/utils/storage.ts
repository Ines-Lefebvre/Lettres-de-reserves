/**
 * Module de gestion du stockage du payload de validation
 * Garantit la cohérence des clés entre Upload et Validation
 */

export interface ValidationPayload {
  success: boolean;
  sessionId: string;
  documentType: string;
  extractedData: {
    employeur: any;
    victime: any;
    accident?: any;
    maladie?: any;
    interim?: any;
    temoin: any;
    tiers: any;
  };
  validationFields: Record<string, any>;
  contextualQuestions: Array<{
    id: string;
    question: string;
    type: string;
    context: string;
    category: string;
  }>;
  completionStats: {
    totalFields: number;
    filledFields: number;
    completionRate: number;
    requiredFields: number;
    filledRequiredFields: number;
    requiredCompletionRate: number;
  };
  nextStep: string;
  instructions: any;
  metadata: any;
}

/**
 * Génère la clé de stockage cohérente pour un requestId
 */
export function getValidationStorageKey(requestId: string): string {
  return `accidoc_validation_${requestId}`;
}

/**
 * Stocke le payload de validation dans localStorage
 * @returns true si succès, false si échec
 */
export function storeValidationPayload(
  requestId: string,
  payload: ValidationPayload | any
): boolean {
  const key = getValidationStorageKey(requestId);

  console.log('💾 [Storage] Tentative de stockage');
  console.log('  📋 RequestID:', requestId);
  console.log('  🔑 Clé:', key);

  try {
    const serialized = JSON.stringify(payload);
    console.log('  📊 Taille:', serialized.length, 'bytes');

    localStorage.setItem(key, serialized);
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());

    const verification = localStorage.getItem(key);
    if (!verification) {
      console.error('❌ [Storage] Échec de vérification');
      return false;
    }

    console.log('✅ [Storage] Stockage réussi');
    return true;

  } catch (error: any) {
    console.error('❌ [Storage] Erreur:', error);

    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ [Storage] localStorage plein, nettoyage...');
      cleanOldPayloads();

      try {
        localStorage.setItem(key, JSON.stringify(payload));
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        console.log('✅ [Storage] Réussi après nettoyage');
        return true;
      } catch {
        console.error('❌ [Storage] Échec même après nettoyage');
        return false;
      }
    }

    return false;
  }
}

/**
 * Charge le payload de validation depuis localStorage
 * @returns Le payload ou null si non trouvé
 */
export function loadValidationPayload(
  requestId: string
): ValidationPayload | any | null {
  const key = getValidationStorageKey(requestId);

  console.log('🔍 [Storage] Tentative de chargement');
  console.log('  📋 RequestID:', requestId);
  console.log('  🔑 Clé:', key);

  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      console.error('❌ [Storage] Aucune donnée trouvée');

      console.log('📦 [Storage] Clés disponibles:');
      for (let i = 0; i < localStorage.length; i++) {
        const existingKey = localStorage.key(i);
        if (existingKey?.startsWith('accidoc_')) {
          console.log(`  - ${existingKey}`);
        }
      }

      return null;
    }

    const payload = JSON.parse(stored);

    console.log('✅ [Storage] Chargement réussi');
    console.log('  📄 Type:', payload.documentType);
    console.log('  🆔 Session:', payload.sessionId);

    return payload;

  } catch (error) {
    console.error('❌ [Storage] Erreur de parsing:', error);
    return null;
  }
}

/**
 * Nettoie les payloads de plus d'1 heure
 */
export function cleanOldPayloads(): void {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  let cleaned = 0;

  console.log('🧹 [Storage] Nettoyage...');

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);

    if (key?.startsWith('accidoc_validation_')) {
      const timestampKey = `${key}_timestamp`;
      const timestamp = localStorage.getItem(timestampKey);

      if (timestamp) {
        const age = now - parseInt(timestamp);

        if (age > ONE_HOUR) {
          localStorage.removeItem(key);
          localStorage.removeItem(timestampKey);
          cleaned++;
          console.log(`  🗑️ Supprimé: ${key}`);
        }
      }
    }
  }

  console.log(`✅ [Storage] ${cleaned} élément(s) nettoyé(s)`);
}
