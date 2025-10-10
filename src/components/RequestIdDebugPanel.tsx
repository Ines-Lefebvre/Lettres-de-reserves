/**
 * Panneau de debug pour visualiser et tester le hook useRequestId
 *
 * Ce composant affiche:
 * - Le requestId actuel
 * - Les valeurs dans sessionStorage et localStorage
 * - Des boutons pour tester les différentes fonctions du hook
 *
 * Usage: Ajouter ce composant en bas de n'importe quelle page pour debugging
 */

import React, { useState, useEffect } from 'react';
import { useRequestId } from '../hooks/useRequestId';
import { Eye, EyeOff, RefreshCw, Trash2, Plus, Copy, Check } from 'lucide-react';

export default function RequestIdDebugPanel() {
  const {
    requestId,
    setRequestId,
    clearRequestId,
    generateRequestId
  } = useRequestId({ logDebug: true });

  const [isVisible, setIsVisible] = useState(false);
  const [customId, setCustomId] = useState('');
  const [copied, setCopied] = useState(false);

  const [sessionValue, setSessionValue] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionValue(sessionStorage.getItem('current_request_id'));
      setLocalValue(localStorage.getItem('lastRequestId'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleGenerate = () => {
    const newId = generateRequestId();
    setRequestId(newId);
  };

  const handleSetCustom = () => {
    if (customId.trim()) {
      setRequestId(customId.trim());
      setCustomId('');
    }
  };

  const handleCopy = async () => {
    if (requestId) {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all duration-300 z-50"
        title="Ouvrir le panneau de debug RequestId"
      >
        <Eye className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-800">RequestId Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Fermer"
        >
          <EyeOff className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">RequestId Actuel</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-blue-900 break-all flex-1">
              {requestId || <span className="text-gray-400 italic">Aucun</span>}
            </code>
            {requestId && (
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors"
                title="Copier"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-blue-600" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Sources de données</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">sessionStorage:</p>
              <code className="text-xs font-mono text-gray-800 break-all block bg-white px-2 py-1 rounded border">
                {sessionValue || <span className="text-gray-400 italic">Vide</span>}
              </code>
            </div>
            <div>
              <p className="text-xs text-gray-600">localStorage:</p>
              <code className="text-xs font-mono text-gray-800 break-all block bg-white px-2 py-1 rounded border">
                {localValue || <span className="text-gray-400 italic">Vide</span>}
              </code>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">Actions rapides</p>

          <button
            onClick={handleGenerate}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Générer nouveau RequestId
          </button>

          <button
            onClick={clearRequestId}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Nettoyer tout
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recharger la page
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">RequestId personnalisé</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="req_custom_12345"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleSetCustom()}
            />
            <button
              onClick={handleSetCustom}
              disabled={!customId.trim()}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300"
            >
              Définir
            </button>
          </div>
          <p className="text-xs text-gray-500 italic">
            Format: alphanumerique, tirets, underscores (5-100 caractères)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-yellow-800 mb-2">Ordre de priorité</p>
          <ol className="text-xs text-yellow-900 space-y-1">
            <li>1. Paramètres URL (requestId, rid, req_id)</li>
            <li>2. sessionStorage (current_request_id)</li>
            <li>3. localStorage (lastRequestId)</li>
          </ol>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
            Informations techniques
          </summary>
          <div className="mt-2 space-y-1 text-gray-600">
            <p><strong>Hook version:</strong> 1.0.0</p>
            <p><strong>Debug logs:</strong> Activés (voir console)</p>
            <p><strong>Validation:</strong> Automatique</p>
            <p><strong>Synchronisation:</strong> Temps réel</p>
          </div>
        </details>
      </div>
    </div>
  );
}
