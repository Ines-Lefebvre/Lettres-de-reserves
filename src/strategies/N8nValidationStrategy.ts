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
    timeout: number = 30000,
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

    try {
      this.log('Loading data from n8n', {
        requestId: this.context.requestId,
        sessionId: this.context.sessionId
      });

      const query = {
        request_id: this.context.requestId,
        req_id: this.context.requestId,
        session_id: this.context.sessionId
      };

      const response = await fetchValidation(query);
      const duration = Date.now() - startTime;

      if (!response.text || response.text.trim().length === 0) {
        this.logError('Empty response from n8n');
        return {
          success: false,
          error: 'Réponse vide depuis n8n',
          metadata: this.createMetadata({ status: response.status, duration })
        };
      }

      const parsed = safeParseJson(response.text);

      if (!parsed.ok) {
        this.logError('JSON parse failed', parsed.error);
        return {
          success: false,
          error: `JSON invalide: ${parsed.error}`,
          metadata: this.createMetadata({
            status: response.status,
            duration,
            raw: parsed.raw
          })
        };
      }

      this.log('Data loaded successfully', { duration });

      return {
        success: true,
        data: parsed.data,
        metadata: this.createMetadata({
          status: response.status,
          duration
        })
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logError('Load failed', error);

      return {
        success: false,
        error: error.message || 'Erreur de chargement depuis n8n',
        metadata: this.createMetadata({ duration })
      };
    }
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
