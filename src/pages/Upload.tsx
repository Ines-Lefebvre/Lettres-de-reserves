import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Page d'upload - SIMPLIFIÉE
 * Upload → n8n → Redirect vers /validation
 */
export default function Upload() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const requestId = `req_${timestamp}_${random}`;

      console.log('📤 Uploading file:', file.name, 'with requestId:', requestId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('requestId', requestId);

      const response = await fetch('https://n8n.srv833062.hstgr.cloud/webhook/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      console.log('✅ Upload successful, redirecting...');

      navigate(`/validation?requestId=${requestId}`);

    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'upload');
    } finally {
      setUploading(false);
    }
  };

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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Traitement en cours...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
