import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchValidationData } from '../utils/n8nApi';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Page de validation - SIMPLE et EFFICACE
 *
 * Workflow :
 * 1. Récupère le requestId depuis l'URL
 * 2. Fetch les données depuis n8n
 * 3. Affiche les données ou une erreur
 */
export default function ValidationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get('requestId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!requestId) {
      console.warn('⚠️ No requestId in URL');
      navigate('/');
      return;
    }

    loadData();
  }, [requestId]);

  const loadData = async () => {
    if (!requestId) return;

    setLoading(true);
    setError(null);

    const result = await fetchValidationData(requestId);

    if (result.success && result.data) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error || 'Erreur inconnue');
      setData(null);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📄 Validation des données
            </h1>
            <p className="text-sm text-gray-600">
              Request ID : {requestId}
            </p>
          </div>

          {loading && (
            <div className="py-8">
              <LoadingSpinner message="Chargement des données depuis n8n..." />
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Erreur de chargement
                  </h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <button
                    onClick={loadData}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    🔄 Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <h3 className="text-lg font-semibold text-green-700">
                    Données récupérées
                  </h3>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  📋 Copier JSON
                </button>
              </div>

              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Retour à l'accueil
                </button>
                <button
                  onClick={loadData}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Recharger
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
