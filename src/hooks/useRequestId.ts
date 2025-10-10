/**
 * Hook React personnalisé pour gérer de manière unifiée le requestId dans toute l'application
 *
 * PRIORITÉ DE RÉCUPÉRATION:
 * 1. Paramètres URL (requestId, rid, req_id)
 * 2. sessionStorage (current_request_id)
 * 3. localStorage (lastRequestId)
 *
 * FONCTIONNALITÉS:
 * - Synchronisation automatique entre toutes les sources de données
 * - Validation du format pour sécurité (alphanumerique, tirets, underscores uniquement)
 * - Génération automatique optionnelle
 * - Logging détaillé pour debugging
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { requestId, setRequestId, clearRequestId } = useRequestId();
 *
 *   // Utiliser le requestId
 *   console.log(requestId); // "req_1234567890_abc123"
 *
 *   // Définir un nouveau requestId
 *   setRequestId("req_9999_test");
 *
 *   // Nettoyer toutes les sources
 *   clearRequestId();
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Clés de stockage utilisées pour persister le requestId
 */
const STORAGE_KEYS = {
  SESSION: 'current_request_id',
  LOCAL: 'lastRequestId',
} as const;

/**
 * Paramètres URL possibles pour le requestId
 */
const URL_PARAMS = ['requestId', 'rid', 'req_id'] as const;

/**
 * Interface de retour du hook useRequestId
 */
export interface UseRequestIdReturn {
  requestId: string | null;
  setRequestId: (id: string) => void;
  clearRequestId: () => void;
  generateRequestId: () => string;
}

/**
 * Options de configuration du hook
 */
export interface UseRequestIdOptions {
  autoGenerate?: boolean;
  logDebug?: boolean;
}

/**
 * Valide le format du requestId pour éviter l'injection de code
 * Format accepté: alphanumerique, tirets, underscores uniquement
 *
 * @param id - RequestId à valider
 * @returns true si le format est valide, false sinon
 */
function isValidRequestId(id: string | null | undefined): id is string {
  if (!id || typeof id !== 'string') return false;

  // Format: lettres, chiffres, tirets et underscores uniquement
  // Longueur minimale: 5 caractères, maximale: 100 caractères
  const regex = /^[a-zA-Z0-9_-]{5,100}$/;
  return regex.test(id);
}

/**
 * Génère un nouveau requestId au format standardisé
 * Format: req_{timestamp}_{random6chars}
 *
 * @returns Nouveau requestId unique
 */
function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Récupère le requestId depuis l'URL avec support de plusieurs paramètres
 *
 * @param searchParams - Paramètres URL de react-router-dom
 * @returns RequestId trouvé ou null
 */
function getRequestIdFromUrl(searchParams: URLSearchParams): string | null {
  for (const param of URL_PARAMS) {
    const value = searchParams.get(param);
    if (isValidRequestId(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Récupère le requestId depuis sessionStorage
 *
 * @returns RequestId trouvé ou null
 */
function getRequestIdFromSessionStorage(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return isValidRequestId(value) ? value : null;
  } catch (error) {
    console.warn('[useRequestId] Erreur lecture sessionStorage:', error);
    return null;
  }
}

/**
 * Récupère le requestId depuis localStorage
 *
 * @returns RequestId trouvé ou null
 */
function getRequestIdFromLocalStorage(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.LOCAL);
    return isValidRequestId(value) ? value : null;
  } catch (error) {
    console.warn('[useRequestId] Erreur lecture localStorage:', error);
    return null;
  }
}

/**
 * Récupère le requestId avec ordre de priorité défini
 *
 * ORDRE:
 * 1. URL params (requestId, rid, req_id)
 * 2. sessionStorage (current_request_id)
 * 3. localStorage (lastRequestId)
 *
 * @param searchParams - Paramètres URL
 * @param logDebug - Active les logs de debug
 * @returns RequestId trouvé ou null
 */
function retrieveRequestId(
  searchParams: URLSearchParams,
  logDebug: boolean = false
): string | null {
  if (logDebug) {
    console.log('🔍 [useRequestId] Récupération du requestId...');
  }

  const fromUrl = getRequestIdFromUrl(searchParams);
  if (fromUrl) {
    if (logDebug) {
      console.log('✅ [useRequestId] Trouvé dans URL:', fromUrl);
    }
    return fromUrl;
  }

  const fromSession = getRequestIdFromSessionStorage();
  if (fromSession) {
    if (logDebug) {
      console.log('✅ [useRequestId] Trouvé dans sessionStorage:', fromSession);
    }
    return fromSession;
  }

  const fromLocal = getRequestIdFromLocalStorage();
  if (fromLocal) {
    if (logDebug) {
      console.log('✅ [useRequestId] Trouvé dans localStorage:', fromLocal);
    }
    return fromLocal;
  }

  if (logDebug) {
    console.log('❌ [useRequestId] Aucun requestId trouvé');
  }
  return null;
}

/**
 * Stocke le requestId dans toutes les sources (sessionStorage et localStorage)
 *
 * @param id - RequestId à stocker
 * @param logDebug - Active les logs de debug
 */
function storeRequestId(id: string, logDebug: boolean = false): void {
  if (!isValidRequestId(id)) {
    console.error('[useRequestId] Tentative de stockage d\'un requestId invalide:', id);
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, id);
    localStorage.setItem(STORAGE_KEYS.LOCAL, id);

    if (logDebug) {
      console.log('💾 [useRequestId] RequestId stocké:', id);
    }
  } catch (error) {
    console.error('[useRequestId] Erreur de stockage:', error);
  }
}

/**
 * Nettoie le requestId de toutes les sources
 *
 * @param logDebug - Active les logs de debug
 */
function removeRequestId(logDebug: boolean = false): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.LOCAL);

    if (logDebug) {
      console.log('🧹 [useRequestId] RequestId nettoyé de toutes les sources');
    }
  } catch (error) {
    console.error('[useRequestId] Erreur de nettoyage:', error);
  }
}

/**
 * Hook React personnalisé pour gérer le requestId de manière unifiée
 *
 * CARACTÉRISTIQUES:
 * - Récupération prioritaire: URL > sessionStorage > localStorage
 * - Synchronisation automatique entre les sources
 * - Validation de format pour sécurité
 * - Génération automatique optionnelle
 *
 * @param options - Options de configuration
 * @returns Interface avec requestId et méthodes de gestion
 */
export function useRequestId(options: UseRequestIdOptions = {}): UseRequestIdReturn {
  const { autoGenerate = false, logDebug = false } = options;

  const [searchParams] = useSearchParams();
  const [requestId, setRequestIdState] = useState<string | null>(null);

  /**
   * EFFET: Initialisation et récupération du requestId au montage du composant
   *
   * COMPORTEMENT:
   * - Récupère le requestId avec ordre de priorité
   * - Génère automatiquement si autoGenerate=true et aucun ID trouvé
   * - Synchronise dans toutes les sources si trouvé dans URL uniquement
   */
  useEffect(() => {
    const retrieved = retrieveRequestId(searchParams, logDebug);

    if (retrieved) {
      setRequestIdState(retrieved);

      const fromSession = getRequestIdFromSessionStorage();
      const fromLocal = getRequestIdFromLocalStorage();

      if (!fromSession || !fromLocal) {
        storeRequestId(retrieved, logDebug);
      }
    } else if (autoGenerate) {
      const generated = generateRequestId();
      setRequestIdState(generated);
      storeRequestId(generated, logDebug);

      if (logDebug) {
        console.log('🆕 [useRequestId] RequestId généré automatiquement:', generated);
      }
    }
  }, []);

  /**
   * EFFET: Synchronisation avec les changements de paramètres URL
   *
   * COMPORTEMENT:
   * - Écoute les changements de searchParams
   * - Met à jour l'état local si un nouveau requestId apparaît dans l'URL
   * - Synchronise dans les autres sources
   */
  useEffect(() => {
    const fromUrl = getRequestIdFromUrl(searchParams);

    if (fromUrl && fromUrl !== requestId) {
      setRequestIdState(fromUrl);
      storeRequestId(fromUrl, logDebug);

      if (logDebug) {
        console.log('🔄 [useRequestId] RequestId mis à jour depuis URL:', fromUrl);
      }
    }
  }, [searchParams, requestId, logDebug]);

  /**
   * MÉTHODE: Définir un nouveau requestId
   *
   * COMPORTEMENT:
   * - Valide le format avant stockage
   * - Met à jour l'état local
   * - Synchronise dans sessionStorage et localStorage
   * - Log l'opération si debug activé
   *
   * @param id - Nouveau requestId à définir
   */
  const setRequestId = useCallback((id: string): void => {
    if (!isValidRequestId(id)) {
      console.error('[useRequestId] Format de requestId invalide:', id);
      console.error('[useRequestId] Format attendu: alphanumerique, tirets, underscores (5-100 caractères)');
      return;
    }

    setRequestIdState(id);
    storeRequestId(id, logDebug);

    if (logDebug) {
      console.log('✅ [useRequestId] RequestId défini:', id);
    }
  }, [logDebug]);

  /**
   * MÉTHODE: Nettoyer le requestId de toutes les sources
   *
   * COMPORTEMENT:
   * - Efface sessionStorage
   * - Efface localStorage
   * - Réinitialise l'état local à null
   * - Log l'opération si debug activé
   */
  const clearRequestId = useCallback((): void => {
    setRequestIdState(null);
    removeRequestId(logDebug);

    if (logDebug) {
      console.log('🗑️ [useRequestId] RequestId complètement nettoyé');
    }
  }, [logDebug]);

  /**
   * MÉTHODE: Générer un nouveau requestId
   *
   * COMPORTEMENT:
   * - Génère un ID au format standardisé
   * - Ne stocke PAS automatiquement (utiliser setRequestId ensuite)
   *
   * @returns Nouveau requestId généré
   */
  const generateNewRequestId = useCallback((): string => {
    const newId = generateRequestId();

    if (logDebug) {
      console.log('🎲 [useRequestId] Nouveau requestId généré:', newId);
    }

    return newId;
  }, [logDebug]);

  return {
    requestId,
    setRequestId,
    clearRequestId,
    generateRequestId: generateNewRequestId,
  };
}

export default useRequestId;
