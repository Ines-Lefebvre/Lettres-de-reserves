/**
 * Stratégie de validation utilisant n8n comme source de données
 *
 * Cette stratégie récupère les données depuis un webhook n8n,
 * les valide et permet leur sauvegarde.
 *
 * FONCTIONNALITÉS:
 * - Fetch depuis endpoint n8n
 * - Parsing JSON automatique
 * - Gestion timeout et retry
 * - Validation format
 *
 * @class N8nValidationStrategy
 * @extends ValidationStrategy
 */

import { ValidationStrategy } from './ValidationStrategy';
import { fetchValidation, safeParseJson } from '../lib/api';
import { dotObjectToNested } from '../utils/normalize';  // ✅ CORRECTIF #4
import type {
  ExtractedData,
  ValidationResult,
  SaveResult,
  ValidationContext
} from './types';

export class N8nValidationStrategy extends ValidationStrategy {
  readonly name = 'N8nValidationStrategy';
  readonly description = 'Récupère les données depuis un webhook n8n';
  readonly priority = 1;

  private timeout: number;
  private retryCount: number;

  constructor(
    context: ValidationContext,
    logDebug: boolean = false,
    timeout: number = 60000,  // ✅ CORRECTIF #5: Défaut 60s (cohérent avec api.ts)
    retryCount: number = 3
  ) {
    super(context, logDebug);
    this.timeout = timeout;
    this.retryCount = retryCount;
  }

  protected getSourceType(): 'n8n' | 'localStorage' | 'supabase' {
    return 'n8n';
  }

  async canUse(): Promise<boolean> {
    const endpoint = import.meta.env.VITE_VALIDATION_ENDPOINT;
    const hasEndpoint = !!endpoint && endpoint.trim().length > 0;
    const hasRequestId = !!this.context.requestId;

    this.log('CanUse check', { hasEndpoint, hasRequestId });
    return hasEndpoint && hasRequestId;
  }

  async load(): Promise<ValidationResult> {
    this.emitLifecycleEvent('load', { requestId: this.context.requestId });
    const startTime = Date.now();

    // ✅ CORRECTIF #6: Boucle de retry avec backoff exponentiel
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        this.log(`Retry ${attempt}/${this.retryCount} après ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const result = await this.attemptLoad(startTime, attempt);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logError(`Tentative ${attempt + 1} échouée`, lastError.message);

        // Ne pas retry si erreur de validation de query
        if (lastError.message.includes('Paramètres manquants') ||
            lastError.message.includes('invalide')) {
          throw lastError;
        }
      }
    }

    // Toutes les tentatives ont échoué
    const duration = Date.now() - startTime;
    this.logError(`Échec après ${this.retryCount} retries`);

    return {
      success: false,
      error: lastError?.message || 'Erreur de chargement après plusieurs tentatives',
      metadata: this.createMetadata({ duration, attempts: this.retryCount + 1 })
    };
  }

  /**
   * Tentative unique de chargement
   * @private
   */
  private async attemptLoad(startTime: number, attempt: number): Promise<ValidationResult> {
    this.log('Loading data from n8n', {
      requestId: this.context.requestId,
      sessionId: this.context.sessionId,
      attempt: attempt + 1
    });

    // ✅ CORRECTIF #1: Supprime doublon request_id, session_id optionnel
    const query: Record<string, string> = {
      req_id: this.context.requestId
    };

    // N'ajouter session_id que s'il existe
    if (this.context.sessionId) {
      query.session_id = this.context.sessionId;
    }

    // ✅ CORRECTIF #5: Passer this.timeout à fetchValidation
    const response = await fetchValidation(query, this.timeout);
    const duration = Date.now() - startTime;

    // ✅ CORRECTIF #3: Gérer HTTP 204 (pas de données disponibles)
    if (response.status === 204) {
      this.log('HTTP 204 - Données non encore disponibles (traitement en cours?)');
      return {
        success: true,
        data: null,
        metadata: this.createMetadata({
          status: 204,
          duration,
          message: 'Processing in progress or no content available',
          attempt: attempt + 1
        })
      };
    }

    if (!response.text || response.text.trim().length === 0) {
      this.logError('Empty response from n8n');
      throw new Error('Réponse vide depuis n8n');
    }

    const parsed = safeParseJson(response.text);

    if (!parsed.ok) {
      this.logError('JSON parse failed', parsed.error);
      throw new Error(`JSON invalide: ${parsed.error}`);
    }

    this.log('Data loaded successfully', { duration });

    // ✅ CORRECTIF #4: Normaliser les données (dot notation → objet imbriqué)
    const normalized = dotObjectToNested(parsed.data);
    this.log('Data normalized', { keys: Object.keys(normalized) });

    return {
      success: true,
      data: normalized,
      metadata: this.createMetadata({
        status: response.status,
        duration,
        normalized: true,
        attempt: attempt + 1
      })
    };
  }

  async save(data: ExtractedData): Promise<SaveResult> {
    this.emitLifecycleEvent('save', { dataKeys: Object.keys(data) });

    this.log('Save not implemented for n8n strategy');

    return {
      success: false,
      error: 'La sauvegarde vers n8n n\'est pas supportée'
    };
  }

  async validate(data: ExtractedData): Promise<ValidationResult> {
    this.emitLifecycleEvent('validate', { dataKeys: Object.keys(data) });

    try {
      this.log('Validating data', { keys: Object.keys(data).length });

      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: 'Données invalides: doit être un objet',
          metadata: this.createMetadata()
        };
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'Données vides',
          metadata: this.createMetadata()
        };
      }

      this.log('Validation passed');

      return {
        success: true,
        data,
        metadata: this.createMetadata()
      };

    } catch (error: any) {
      this.logError('Validation failed', error);

      return {
        success: false,
        error: error.message || 'Erreur de validation',
        metadata: this.createMetadata()
      };
    }
  }
}

export default N8nValidationStrategy;
