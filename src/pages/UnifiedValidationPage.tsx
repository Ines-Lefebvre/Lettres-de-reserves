/**
 * Page de validation unifiée avec sélecteur de stratégie
 *
 * Cette page fusionne ValidationPage, ValidationPageNew et ValidationPageFullDB
 * en une interface unique avec trois modes de chargement des données :
 *
 * STRATÉGIES:
 * 1. N8N - Récupère depuis webhook n8n (ValidationPageNew)
 * 2. LocalStorage - Charge depuis le storage local (ValidationPage)
 * 3. Supabase - Charge depuis la base de données (ValidationPageFullDB)
 *
 * DÉPENDANCES:
 * - useRequestId() - Gestion du requestId
 * - RequestIdDebugPanel - Debug visuel
 * - N8nValidationStrategy - Chargement depuis n8n
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRequestId } from '../hooks/useRequestId';
import { N8nValidationStrategy } from '../strategies/N8nValidationStrategy';
import { loadValidationPayload } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import AuthGuard from '../components/AuthGuard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RequestIdDebugPanel from '../components/RequestIdDebugPanel';
import {
  FileText,
  Database,
  Cloud,
  HardDrive,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Loader2
} from 'lucide-react';

type StrategyType = 'n8n' | 'localStorage' | 'supabase';

type ValidationState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

interface ExtractedData {
  [key: string]: any;
}

export default function UnifiedValidationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestId: hookRequestId } = useRequestId({ logDebug: true });

  // État de la stratégie
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('n8n');
  const [state, setState] = useState<ValidationState>('idle');
  const [data, setData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  // Détection automatique de la stratégie depuis l'URL
  useEffect(() => {
    const strategyParam = searchParams.get('strategy');
    if (strategyParam === 'n8n' || strategyParam === 'localStorage' || strategyParam === 'supabase') {
      setSelectedStrategy(strategyParam);
    }
  }, [searchParams]);

  /**
   * Charge les données selon la stratégie sélectionnée
   */
  const loadData = useCallback(async () => {
    if (!hookRequestId) {
      setError('Request ID manquant');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      let result;

      switch (selectedStrategy) {
        case 'n8n':
          result = await loadFromN8n();
          break;

        case 'localStorage':
          result = await loadFromLocalStorage();
          break;

        case 'supabase':
          result = await loadFromSupabase();
          break;

        default:
          throw new Error(`Stratégie inconnue: ${selectedStrategy}`);
      }

      if (result.success) {
        setData(result.data || null);
        setMetadata(result.metadata);
        setState('success');
      } else {
        setError(result.error || 'Erreur de chargement');
        setState('error');
      }
    } catch (err: any) {
      console.error('[UnifiedValidation] Load error:', err);
      setError(err.message || 'Erreur inattendue');
      setState('error');
    }
  }, [hookRequestId, selectedStrategy]);

  /**
   * Charge depuis n8n webhook
   */
  const loadFromN8n = async () => {
    console.log('[UnifiedValidation] Loading from n8n');

    const strategy = new N8nValidationStrategy(
      { requestId: hookRequestId! },
      true
    );

    const canUse = await strategy.canUse();
    if (!canUse) {
      return {
        success: false,
        error: 'Stratégie n8n non disponible (endpoint manquant)'
      };
    }

    return await strategy.load();
  };

  /**
   * Charge depuis localStorage
   */
  const loadFromLocalStorage = async () => {
    console.log('[UnifiedValidation] Loading from localStorage');

    const payload = loadValidationPayload(hookRequestId!);

    if (!payload) {
      return {
        success: false,
        error: 'Aucune donnée trouvée dans localStorage'
      };
    }

    return {
      success: true,
      data: payload,
      metadata: {
        timestamp: Date.now(),
        requestId: hookRequestId!,
        source: 'localStorage' as const
      }
    };
  };

  /**
   * Charge depuis Supabase
   */
  const loadFromSupabase = async () => {
    console.log('[UnifiedValidation] Loading from Supabase');

    const recordId = searchParams.get('id') || hookRequestId;

    if (!recordId) {
      return {
        success: false,
        error: 'ID du dossier manquant'
      };
    }

    // Récupérer le record depuis Supabase
    // Note: Nécessite une table 'validations' avec RLS
    const { data: record, error: dbError } = await supabase
      .from('validations')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (dbError) {
      return {
        success: false,
        error: `Erreur Supabase: ${dbError.message}`
      };
    }

    if (!record) {
      return {
        success: false,
        error: 'Dossier introuvable'
      };
    }

    return {
      success: true,
      data: record,
      metadata: {
        timestamp: Date.now(),
        requestId: hookRequestId!,
        source: 'supabase' as const,
        recordId
      }
    };
  };

  /**
   * Charge automatiquement au montage et lors du changement de stratégie
   */
  useEffect(() => {
    let isMounted = true;

    const loadDataSafely = async () => {
      if (!hookRequestId) {
        if (isMounted) {
          setError('Request ID manquant');
          setState('error');
        }
        return;
      }

      if (isMounted) {
        setState('loading');
        setError(null);
      }

      try {
        let result;

        switch (selectedStrategy) {
          case 'n8n':
            result = await loadFromN8n();
            break;

          case 'localStorage':
            result = await loadFromLocalStorage();
            break;

          case 'supabase':
            result = await loadFromSupabase();
            break;

          default:
            throw new Error(`Stratégie inconnue: ${selectedStrategy}`);
        }

        // Vérifier si le composant est toujours monté avant setState
        if (!isMounted) {
          console.log('[UnifiedValidation] Component unmounted, skipping setState');
          return;
        }

        if (result.success) {
          setData(result.data || null);
          setMetadata(result.metadata);
          setState('success');
        } else {
          setError(result.error || 'Erreur de chargement');
          setState('error');
        }
      } catch (err: any) {
        if (!isMounted) {
          console.log('[UnifiedValidation] Component unmounted, skipping error setState');
          return;
        }

        console.error('[UnifiedValidation] Load error:', err);
        setError(err.message || 'Erreur inattendue');
        setState('error');
      }
    };

    loadDataSafely();

    // Cleanup
    return () => {
      isMounted = false;
      console.log('[UnifiedValidation] 🧹 Cleanup: Component unmounting');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookRequestId, selectedStrategy]);

  /**
   * Gère le changement de stratégie
   */
  const handleStrategyChange = useCallback((strategy: StrategyType) => {
    console.log('[UnifiedValidation] Strategy changed:', strategy);
    setSelectedStrategy(strategy);
    setState('idle');
    setData(null);
    setError(null);
  }, []);

  /**
   * Handler générique pour les clics sur les boutons de stratégie
   */
  const handleStrategyClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const strategy = e.currentTarget.dataset.strategy as StrategyType;
    handleStrategyChange(strategy);
  }, [handleStrategyChange]);

  /**
   * Retry en cas d'erreur
   */
  const handleRetry = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />

        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-6xl px-4">
            {/* En-tête */}
            <header className="mb-8 text-center">
              <div className="w-16 h-16 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-brand-accent" />
              </div>
              <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                Validation des données
              </h1>
              <p className="text-gray-600 font-body mb-4">
                Chargez et validez vos données depuis différentes sources
              </p>
              <div className="text-sm text-gray-500">
                <p>Request ID: {hookRequestId || '–'}</p>
              </div>
            </header>

            {/* Sélecteur de stratégie */}
            <div className="mb-8">
              <h2 className="font-semibold text-lg mb-4 text-center">Source de données</h2>
              <div
                className="grid md:grid-cols-3 gap-4"
                role="tablist"
                aria-label="Sources de données de validation"
              >
                {/* N8N Strategy */}
                <button
                  onClick={handleStrategyClick}
                  data-strategy="n8n"
                  className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                    selectedStrategy === 'n8n'
                      ? 'border-brand-accent bg-brand-accent bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="tab"
                  aria-label="Charger les données depuis N8N Webhook"
                  aria-selected={selectedStrategy === 'n8n'}
                  aria-controls="validation-content"
                  id="tab-n8n"
                >
                  <Cloud
                    className={`w-8 h-8 mx-auto mb-2 ${
                      selectedStrategy === 'n8n' ? 'text-brand-accent' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <h3 className="font-semibold mb-1">N8N Webhook</h3>
                  <p className="text-sm text-gray-600">
                    Récupère depuis le serveur n8n
                  </p>
                </button>

                {/* LocalStorage Strategy */}
                <button
                  onClick={handleStrategyClick}
                  data-strategy="localStorage"
                  className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                    selectedStrategy === 'localStorage'
                      ? 'border-brand-accent bg-brand-accent bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="tab"
                  aria-label="Charger les données depuis le navigateur local"
                  aria-selected={selectedStrategy === 'localStorage'}
                  aria-controls="validation-content"
                  id="tab-localStorage"
                >
                  <HardDrive
                    className={`w-8 h-8 mx-auto mb-2 ${
                      selectedStrategy === 'localStorage' ? 'text-brand-accent' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <h3 className="font-semibold mb-1">LocalStorage</h3>
                  <p className="text-sm text-gray-600">
                    Charge depuis le navigateur
                  </p>
                </button>

                {/* Supabase Strategy */}
                <button
                  onClick={handleStrategyClick}
                  data-strategy="supabase"
                  className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                    selectedStrategy === 'supabase'
                      ? 'border-brand-accent bg-brand-accent bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="tab"
                  aria-label="Charger les données depuis la base de données Supabase"
                  aria-selected={selectedStrategy === 'supabase'}
                  aria-controls="validation-content"
                  id="tab-supabase"
                >
                  <Database
                    className={`w-8 h-8 mx-auto mb-2 ${
                      selectedStrategy === 'supabase' ? 'text-brand-accent' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <h3 className="font-semibold mb-1">Supabase</h3>
                  <p className="text-sm text-gray-600">
                    Charge depuis la base de données
                  </p>
                </button>
              </div>
            </div>

            {/* État: Loading */}
            {state === 'loading' && (
              <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-brand-accent mx-auto mb-4" />
                  <h2 className="font-headline text-xl font-semibold text-brand-text-dark mb-2">
                    Chargement des données
                  </h2>
                  <p className="text-gray-600">
                    Récupération depuis {selectedStrategy}...
                  </p>
                </div>
              </div>
            )}

            {/* État: Success */}
            {state === 'success' && data && (
              <div className="bg-white rounded-lg shadow-xl border-2 border-green-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h2 className="font-headline text-xl font-semibold text-brand-text-dark">
                    Données chargées avec succès
                  </h2>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-700 mb-2">Contenu :</h3>
                  <pre className="text-xs overflow-x-auto bg-white rounded border p-3 max-h-96">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>

                {metadata && (
                  <div className="text-sm text-gray-600">
                    <p><strong>Source:</strong> {metadata.source}</p>
                    <p><strong>Timestamp:</strong> {new Date(metadata.timestamp).toLocaleString()}</p>
                    {metadata.duration && <p><strong>Durée:</strong> {metadata.duration}ms</p>}
                  </div>
                )}
              </div>
            )}

            {/* État: Error */}
            {state === 'error' && (
              <div className="bg-white rounded-lg shadow-xl border-2 border-red-300 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-headline text-xl font-semibold text-red-800 mb-2">
                    Erreur de chargement
                  </h2>
                  <p className="text-red-700 mb-4">
                    {error || 'Erreur inconnue'}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800">
                      <strong>Stratégie:</strong> {selectedStrategy}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Vérifiez que la source de données est disponible et que le requestId est valide.
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Debug info */}
            <details className="mt-8 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                Informations de debug
              </summary>
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-1">
                <p><strong>État:</strong> {state}</p>
                <p><strong>Stratégie:</strong> {selectedStrategy}</p>
                <p><strong>Request ID:</strong> {hookRequestId || 'Non défini'}</p>
                <p><strong>Erreur:</strong> {error || 'Aucune'}</p>
                <p><strong>Données:</strong> {data ? Object.keys(data).length + ' clés' : 'Aucune'}</p>
              </div>
            </details>
          </div>
        </main>

        <Footer />

        {/* Debug Panel */}
        {import.meta.env.DEV && <RequestIdDebugPanel />}
      </div>
    </AuthGuard>
  );
}
