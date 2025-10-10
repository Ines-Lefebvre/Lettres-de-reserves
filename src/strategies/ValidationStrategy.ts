/**
 * Classe abstraite définissant le contrat pour toutes les stratégies de validation
 *
 * Cette classe implémente le pattern Strategy pour permettre différentes
 * sources de données (n8n, localStorage, Supabase) tout en maintenant
 * une interface uniforme.
 *
 * PRINCIPES:
 * - Chaque stratégie doit implémenter load(), save(), validate()
 * - Gestion d'erreur unifiée
 * - Logging centralisé
 * - Type safety complète
 *
 * @abstract
 * @class ValidationStrategy
 * @version 1.0.0
 */

import type {
  ExtractedData,
  ValidationResult,
  ValidationMetadata,
  ValidationContext,
  SaveResult,
  StrategyLifecycleEvent
} from './types';

export abstract class ValidationStrategy {
  /**
   * Nom unique de la stratégie
   */
  abstract readonly name: string;

  /**
   * Description de la stratégie
   */
  abstract readonly description: string;

  /**
   * Priorité d'exécution (plus petit = plus prioritaire)
   */
  abstract readonly priority: number;

  /**
   * Active ou désactive les logs de debug
   */
  protected logDebug: boolean = false;

  /**
   * Contexte d'exécution
   */
  protected context: ValidationContext;

  /**
   * Événements du cycle de vie
   */
  protected lifecycleEvents: StrategyLifecycleEvent[] = [];

  /**
   * Constructeur
   *
   * @param context - Contexte d'exécution
   * @param logDebug - Active les logs de debug
   */
  constructor(context: ValidationContext, logDebug: boolean = false) {
    this.context = context;
    this.logDebug = logDebug;
    this.emitLifecycleEvent('init', { context });
  }

  /**
   * Charge les données depuis la source
   *
   * @abstract
   * @returns Promise<ValidationResult>
   */
  abstract load(): Promise<ValidationResult>;

  /**
   * Sauvegarde les données vers la destination
   *
   * @abstract
   * @param data - Données à sauvegarder
   * @returns Promise<SaveResult>
   */
  abstract save(data: ExtractedData): Promise<SaveResult>;

  /**
   * Valide les données selon les règles de la stratégie
   *
   * @abstract
   * @param data - Données à valider
   * @returns Promise<ValidationResult>
   */
  abstract validate(data: ExtractedData): Promise<ValidationResult>;

  /**
   * Vérifie si la stratégie peut être utilisée
   *
   * @abstract
   * @returns Promise<boolean>
   */
  abstract canUse(): Promise<boolean>;

  /**
   * Log un message de debug
   *
   * @protected
   * @param message - Message à logger
   * @param data - Données additionnelles
   */
  protected log(message: string, data?: any): void {
    if (this.logDebug) {
      console.log(`[${this.name}] ${message}`, data || '');
    }
  }

  /**
   * Log une erreur
   *
   * @protected
   * @param message - Message d'erreur
   * @param error - Erreur d'origine
   */
  protected logError(message: string, error?: any): void {
    console.error(`[${this.name}] ❌ ${message}`, error || '');
  }

  /**
   * Crée les métadonnées pour un résultat
   *
   * @protected
   * @param additionalData - Données additionnelles
   * @returns ValidationMetadata
   */
  protected createMetadata(additionalData?: Record<string, any>): ValidationMetadata {
    return {
      timestamp: Date.now(),
      requestId: this.context.requestId,
      source: this.getSourceType(),
      ...additionalData
    };
  }

  /**
   * Retourne le type de source de la stratégie
   *
   * @protected
   * @returns 'n8n' | 'localStorage' | 'supabase'
   */
  protected abstract getSourceType(): 'n8n' | 'localStorage' | 'supabase';

  /**
   * Émet un événement du cycle de vie
   *
   * @protected
   * @param type - Type d'événement
   * @param data - Données de l'événement
   */
  protected emitLifecycleEvent(
    type: StrategyLifecycleEvent['type'],
    data?: any
  ): void {
    const event: StrategyLifecycleEvent = {
      type,
      timestamp: Date.now(),
      strategyName: this.name,
      data
    };

    this.lifecycleEvents.push(event);

    if (this.logDebug) {
      console.log(`[${this.name}] 🔄 Lifecycle: ${type}`, data || '');
    }
  }

  /**
   * Nettoie les ressources utilisées par la stratégie
   *
   * @public
   */
  public cleanup(): void {
    this.emitLifecycleEvent('cleanup');
    this.log('Cleanup completed');
  }

  /**
   * Retourne les événements du cycle de vie
   *
   * @public
   * @returns StrategyLifecycleEvent[]
   */
  public getLifecycleEvents(): StrategyLifecycleEvent[] {
    return [...this.lifecycleEvents];
  }

  /**
   * Retourne le contexte d'exécution
   *
   * @public
   * @returns ValidationContext
   */
  public getContext(): ValidationContext {
    return { ...this.context };
  }

  /**
   * Met à jour le contexte d'exécution
   *
   * @public
   * @param context - Nouveau contexte partiel
   */
  public updateContext(context: Partial<ValidationContext>): void {
    this.context = { ...this.context, ...context };
    this.log('Context updated', this.context);
  }
}

export default ValidationStrategy;
