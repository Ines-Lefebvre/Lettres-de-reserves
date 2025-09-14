import React from 'react';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    if (!webhookUrl) {
      setErrorMessage('Configuration manquante : URL du webhook N8N non définie');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('timestamp', new Date().toISOString());
      formData.append('filename', selectedFile.name);
      formData.append('filesize', selectedFile.size.toString());
      formData.append('filetype', selectedFile.type);
      formData.append('user_agent', navigator.userAgent);
      
      console.log('Envoi vers webhook N8N:', {
        url: webhookUrl,
        filename: selectedFile.name,
        filesize: selectedFile.size,
        filetype: selectedFile.type,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value : `File(${value.name})`])
      });
      
      console.log('Tentative de connexion au webhook N8N...');
     
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout
     
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });
     
      clearTimeout(timeoutId);

      console.log('Réponse webhook N8N:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        redirected: response.redirected
      });

      if (response.ok) {
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          const textResponse = await response.text();
          responseData = textResponse;
          console.log('Réponse texte brute:', textResponse);
        }
        console.log('Données de réponse:', responseData);
        setUploadStatus('success');
        setTimeout(() => {
          window.location.href = '/response?status=success&message=Votre document a été traité avec succès';
        }, 2000);
      } else {
        let errorText = '';
        let errorDetails = {};
        try {
          const errorJson = await response.json();
          errorDetails = errorJson;
          errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch {
          const textError = await response.text();
          errorText = textError || `Erreur HTTP ${response.status}`;
          console.log('Réponse d\'erreur texte brute:', textError);
        }
        console.error('Erreur webhook N8N complète:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          errorDetails,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      let errorMsg = 'Erreur inconnue';
     
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMsg = 'Timeout: Le webhook N8N met trop de temps à répondre (>30s)';
        } else if (error.message === 'Failed to fetch') {
          errorMsg = 'Impossible de contacter le webhook N8N. Vérifiez votre connexion internet ou contactez le support.';
        } else {
          errorMsg = error.message;
        }
      }
     
      setErrorMessage(errorMsg);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-brand-white">
      {/* Header with background */}
      <Header hasBackground={true} />

      {/* Main Content */}
      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center py-12 mb-8">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-brand-text-dark mb-6">
              <span className="text-brand-accent">Téléversement</span> de votre déclaration
            </h1>
            <p className="text-xl text-gray-600 font-body">
              Téléversez votre déclaration d'accident du travail ou de maladie professionnelle
            </p>
          </div>
          
          {/* Upload Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-brand-text-dark mb-2">
                  Déclaration d'accident
                </h2>
                <p className="text-gray-600 font-body">
                  Format PDF uniquement • Taille max : 10 MB
                </p>
              </div>

              {/* Upload Zone */}
              <div className="mb-8">
                <label htmlFor="file-upload" className="block">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer group ${
                    selectedFile 
                      ? 'border-brand-accent bg-brand-light bg-opacity-30' 
                      : 'border-brand-accent border-opacity-50 hover:border-brand-accent hover:bg-brand-light hover:bg-opacity-30'
                  }`}>
                    <UploadIcon className="w-12 h-12 text-brand-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    {selectedFile ? (
                      <div>
                        <p className="text-lg font-semibold text-brand-text-dark mb-2">
                          Fichier sélectionné : {selectedFile.name}
                        </p>
                        <p className="text-gray-500 font-body">
                          Taille : {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-sm text-brand-accent mt-2">
                          Cliquez pour changer de fichier
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-semibold text-brand-text-dark mb-2">
                          Cliquez pour téléverser votre fichier
                        </p>
                        <p className="text-gray-500 font-body">
                          ou glissez-déposez votre PDF ici
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Status Messages */}
              {uploadStatus === 'success' && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <p className="text-green-800 font-semibold">
                      Fichier envoyé avec succès !
                    </p>
                  </div>
                  <p className="text-green-700 text-sm mt-2">
                    Vous recevrez votre lettre de réserves sous 24h.
                  </p>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-800 font-semibold">
                      Erreur lors de l'envoi
                    </p>
                  </div>
                  <p className="text-red-700 text-sm mt-2">
                    {errorMessage || 'Veuillez réessayer ou nous contacter si le problème persiste.'}
                  </p>
                  {errorMessage.includes('500') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-sm font-semibold">💡 Diagnostic d'erreur</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Causes possibles :
                      </p>
                      <ul className="text-yellow-700 text-xs mt-1 ml-4 list-disc">
                        <li>Problème de connexion internet</li>
                        <li>Serveur N8N indisponible</li>
                        <li>Workflow N8N inactif</li>
                        <li>Problème CORS</li>
                        <li>Fichier trop volumineux</li>
                      </ul>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-red-600 text-xs cursor-pointer">Détails techniques</summary>
                    <p className="text-red-600 text-xs mt-1 font-mono">
                      Webhook: {webhookUrl || 'Non configuré'}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Ouvrez la console (F12) pour voir les logs détaillés
                    </p>
                  </details>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-brand-light bg-opacity-50 rounded-lg p-4 border-l-4 border-brand-accent">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">En cas de problème :</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Vérifiez votre connexion internet</li>
                      <li>• Assurez-vous que le fichier est au format PDF</li>
                      <li>• Vérifiez que la taille ne dépasse pas 10 MB</li>
                      <li>• Contactez le support si le problème persiste</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center mt-8">
                <button
                  onClick={handleSubmit}
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-8 py-4 rounded-lg font-headline font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? 'Envoi en cours...' : 'Envoyer'}
                </button>
                {!selectedFile && (
                  <>
                    <p className="text-sm text-gray-500 mt-2 font-body">
                      Sélectionnez un fichier pour activer le bouton
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Upload;