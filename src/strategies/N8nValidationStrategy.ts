import { ValidationStrategy } from './ValidationStrategy';
import type { ValidationResult, ValidationData, ValidationContext } from './types';

/**
 * Stratégie de validation via webhook n8n
 *
 * ⚠️ NOTE IMPORTANTE : Endpoint hardcodé temporairement pour débloquer la production
 *
 * RAISON : Les variables d'environnement VITE_* ne sont pas accessibles au runtime
 * en production (undefined). Ce hardcode permet de débloquer immédiatement la prod.
 *
 * TODO : Refactor pour utiliser les variables d'environnement proprement une fois
 * le problème d'injection des variables résolu.
 *
 * @class N8nValidationStrategy
 * @extends ValidationStrategy
 */
export class N8nValidationStrategy extends ValidationStrategy {
  // 🔥 HARDCODÉ POUR DÉBLOQUER LA PRODUCTION
  private readonly ENDPOINT = 'https://n8n.srv833062.hstgr.cloud/webhook/validation';
  private readonly TIMEOUT = 30000; // 30 secondes

  readonly name = 'N8nValidationStrategy';
  readonly description = 'Récupère les données depuis un webhook n8n (endpoint hardcodé)';
  readonly priority = 1;

  constructor(
    context: ValidationContext,
    logDebug: boolean = false
  ) {
    super(context, logDebug);
    this.log('🔧 Initialized with HARDCODED endpoint');
    this.log('📍 Endpoint:', this.ENDPOINT);
    console.warn('[N8nValidationStrategy] ⚠️ Using hardcoded endpoint - env vars not working');
  }

  protected getSourceType(): 'n8n' | 'localStorage' | 'supabase' {
    return 'n8n';
  }

  /**
   * Vérifie si la stratégie peut être utilisée
   * ✅ TOUJOURS TRUE maintenant (endpoint hardcodé)
   */
  async canUse(): Promise<boolean> {
    const hasRequestId = !!this.context.requestId;

    this.log('✅ canUse() = TRUE (hardcoded endpoint)');
    this.log('Has requestId:', hasRequestId);

    // L'endpoint existe toujours (hardcodé), on vérifie juste le requestId
    return hasRequestId;
  }

  /**
   * Charge les données depuis n8n
   */
  async load(): Promise<ValidationResult> {
    this.emitLifecycleEvent('load', { requestId: this.context.requestId });

    const requestId = this.context.requestId;
    this.log('🔄 Loading data for:', requestId);
    this.log('📍 Using endpoint:', this.ENDPOINT);

    if (!requestId || requestId.trim() === '') {
      const error = 'Request ID est vide ou manquant';
      this.logError(error);
      return {
        success: false,
        error,
        data: null,
        metadata: this.createMetadata({ error })
      };
    }

    try {
      // Extraire session_id du requestId (format: req_SESSION_SUFFIX)
      const parts = requestId.split('_');
      const sessionId = parts.length >= 2 ? parts[1] : requestId;

      // Construire l'URL avec tous les paramètres
      const url = new URL(this.ENDPOINT);
      url.searchParams.set('session_id', sessionId);
      url.searchParams.set('req_id', requestId);
      url.searchParams.set('request_id', requestId); // Redondant mais safe
      url.searchParams.set('_cb', Date.now().toString()); // Cache busting

      this.log('🌐 Fetching:', url.toString());

      // Setup abort controller pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.log('⏱️ Request aborted (timeout)');
      }, this.TIMEOUT);

      // Effectuer la requête
      const startTime = Date.now();
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      this.log('📡 Response status:', response.status);
      this.log('⏱️ Duration:', `${duration}ms`);

      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Endpoint n8n introuvable (404)');
        } else if (response.status === 500) {
          throw new Error('Erreur serveur n8n (500)');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Lire la réponse
      const text = await response.text();
      this.log('📄 Response text length:', text.length);

      if (!text || text.trim() === '') {
        throw new Error('Réponse vide du serveur n8n');
      }

      // Parser le JSON
      let data: ValidationData;
      try {
        data = JSON.parse(text);
        this.log('✅ JSON parsed successfully');
        this.log('Data keys:', Object.keys(data));
      } catch (parseError) {
        this.logError('JSON parse error:', parseError);
        throw new Error('Réponse n8n invalide (JSON malformé)');
      }

      // Valider que les données contiennent quelque chose
      if (!data || typeof data !== 'object') {
        throw new Error('Format de données invalide (attendu: objet JSON)');
      }

      if (Object.keys(data).length === 0) {
        this.log('⚠️ Empty data object received');
      }

      this.log('🎉 Load successful');

      return {
        success: true,
        data,
        error: null,
        metadata: this.createMetadata({
          status: response.status,
          duration,
          requestId,
          sessionId,
          dataKeys: Object.keys(data).length
        })
      };

    } catch (error) {
      this.logError('❌ Load error:', error);

      let errorMessage = 'Erreur de chargement depuis n8n';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Timeout : Le serveur n8n met trop de temps à répondre (> ${this.TIMEOUT}ms)`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Impossible de contacter le serveur n8n (réseau ou CORS)';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        data: null,
        metadata: this.createMetadata({
          error: errorMessage,
          endpoint: this.ENDPOINT
        })
      };
    }
  }

  /**
   * Sauvegarde (non implémenté pour n8n)
   */
  async save(data: ValidationData): Promise<{ success: boolean; error?: string }> {
    this.emitLifecycleEvent('save', { dataKeys: Object.keys(data) });

    this.log('⚠️ Save not implemented for n8n strategy');

    return {
      success: false,
      error: 'La sauvegarde n\'est pas supportée par la stratégie n8n'
    };
  }

  /**
   * Validation (toujours valide si données présentes)
   */
  async validate(data: ValidationData): Promise<{ valid: boolean; errors: string[] }> {
    this.emitLifecycleEvent('validate', { dataKeys: Object.keys(data) });

    this.log('Validating data');

    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: ['Données invalides ou manquantes']
      };
    }

    if (Object.keys(data).length === 0) {
      this.log('⚠️ Empty data object');
      return {
        valid: false,
        errors: ['Objet de données vide']
      };
    }

    // Validation basique : si les données existent et sont un objet, c'est valide
    this.log('✅ Validation passed');
    return {
      valid: true,
      errors: []
    };
  }
}

export default N8nValidationStrategy;
