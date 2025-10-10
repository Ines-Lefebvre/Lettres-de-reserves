/**
 * Types et interfaces pour le système de stratégies de validation
 *
 * Ce fichier définit tous les types TypeScript utilisés par le système de stratégies,
 * garantissant une type safety complète et une documentation explicite.
 *
 * @module strategies/types
 * @version 1.0.0
 */

/**
 * État du processus de validation
 */
export type ValidationState =
  | 'idle'          // Initial, aucune action
  | 'loading'       // Chargement des données
  | 'validating'    // Validation en cours
  | 'success'       // Validation réussie
  | 'error'         // Erreur lors de la validation
  | 'empty'         // Réponse vide
  | 'invalid';      // Données invalides

/**
 * Données extraites du document (structure flexible)
 */
export interface ExtractedData {
  [key: string]: any;
}

/**
 * Résultat d'une opération de validation
 */
export interface ValidationResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
  metadata?: ValidationMetadata;
}

/**
 * Métadonnées associées à une validation
 */
export interface ValidationMetadata {
  timestamp: number;
  requestId: string;
  source: 'n8n' | 'localStorage' | 'supabase';
  duration?: number;
  status?: number;
  [key: string]: any;
}

/**
 * Options de configuration pour une stratégie
 */
export interface ValidationStrategyOptions {
  requestId: string;
  timeout?: number;
  retryCount?: number;
  logDebug?: boolean;
  validateFormat?: boolean;
}

/**
 * Contexte d'exécution d'une stratégie
 */
export interface ValidationContext {
  requestId: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Résultat de sauvegarde
 */
export interface SaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Options pour le hook useValidationStrategy
 */
export interface UseValidationStrategyOptions {
  strategyType: 'n8n' | 'localStorage' | 'supabase' | 'auto';
  autoGenerate?: boolean;
  logDebug?: boolean;
  timeout?: number;
  retryCount?: number;
}

/**
 * Retour du hook useValidationStrategy
 */
export interface UseValidationStrategyReturn {
  state: ValidationState;
  data: ExtractedData | null;
  error: string | null;
  metadata: ValidationMetadata | null;
  load: () => Promise<void>;
  save: (data: ExtractedData) => Promise<SaveResult>;
  validate: (data: ExtractedData) => Promise<ValidationResult>;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Configuration d'une stratégie de validation
 */
export interface StrategyConfig {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  options?: Record<string, any>;
}

/**
 * Événement du cycle de vie d'une stratégie
 */
export interface StrategyLifecycleEvent {
  type: 'init' | 'load' | 'save' | 'validate' | 'error' | 'cleanup';
  timestamp: number;
  strategyName: string;
  data?: any;
}
