import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadToN8n } from '../utils/api';

/**
 * Page d'upload - SIMPLIFIÉE avec gestion d'erreur CORS
 * Upload → n8n → Redirect vers /validation
 */
export default function Upload() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSelectedFile(file);

    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const requestId = `req_${timestamp}_${random}`;

      console.log('🚀 Starting upload process...');
      console.log('📝 Generated requestId:', requestId);

      await uploadToN8n(file, requestId);

      console.log('✅ Upload completed, redirecting...');

      setTimeout(() => {
        navigate(`/validation?requestId=${requestId}`);
      }, 500);

    } catch (err) {
      console.error('💥 Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const isCorsError = error?.includes('CORS');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📄 Lettres de réserves
          </h1>
          <p className="text-gray-600">
            Uploadez votre document pour validation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`block border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              uploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="text-6xl mb-4">📎</div>
            <div className="text-lg font-medium text-gray-700 mb-2">
              {uploading ? 'Upload en cours...' : 'Cliquez pour choisir un fichier'}
            </div>
            <div className="text-sm text-gray-500">
              Format accepté : PDF
            </div>
          </label>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    Erreur d'upload
                  </h3>
                  <p className="text-red-700 text-sm mb-3">{error}</p>

                  {isCorsError && (
                    <details className="text-xs text-red-600 bg-red-100 p-3 rounded mb-3">
                      <summary className="cursor-pointer font-semibold mb-2">
                        ℹ️ Comment résoudre ce problème ?
                      </summary>
                      <div className="space-y-2 mt-2">
                        <p>
                          <strong>Option 1 :</strong> Tester en local avec <code className="bg-red-200 px-1 rounded">npm run dev</code>
                        </p>
                        <p>
                          <strong>Option 2 :</strong> Configurer n8n pour autoriser ce domaine :
                        </p>
                        <ol className="list-decimal ml-4 space-y-1">
                          <li>Ouvrir n8n</li>
                          <li>Aller dans le webhook d'upload</li>
                          <li>Ajouter l'origine : <code className="bg-red-200 px-1 rounded">{window.location.origin}</code></li>
                          <li>Ou utiliser : <code className="bg-red-200 px-1 rounded">*</code> pour autoriser tous les domaines</li>
                          <li>Sauvegarder et activer le workflow</li>
                        </ol>
                      </div>
                    </details>
                  )}

                  <button
                    onClick={handleRetry}
                    className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    🔄 Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Traitement en cours...</span>
            </div>
          )}
        </div>

        {/* Info box pour développeurs */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700">
          <strong>ℹ️ Info :</strong> Si vous rencontrez une erreur CORS, cela signifie que le serveur n8n doit être configuré pour autoriser l'origine <code className="bg-blue-100 px-1 rounded">{window.location.origin}</code>
        </div>
      </div>
    </div>
  );
}
