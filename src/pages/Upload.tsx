import React from 'react';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  
  // Refs pour la gestion du focus
  const statusMessageRef = React.useRef<HTMLDivElement>(null);
  const errorMessageRef = React.useRef<HTMLDivElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement>(null);

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    if (!webhookUrl) {
      setErrorMessage('Configuration manquante : URL du webhook N8N non définie');
      setUploadStatus('error');
      // Focus sur le message d'erreur après mise à jour
      setTimeout(() => {
        errorMessageRef.current?.focus();
      }, 100);
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
      
      console.log('📤 Envoi vers N8N:', selectedFile.name, `(${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
     
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
     
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

      console.log(`📥 Réponse N8N: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let responseData = null;
        
        try {
          if (contentType.includes('application/json')) {
            responseData = await response.json();
            console.log('✅ Données JSON reçues:', responseData);
          } else {
            responseData = await response.text();
            console.log('✅ Réponse texte reçue:', responseData.substring(0, 200) + '...');
          }
        } catch {
          console.log('⚠️ Impossible de parser la réponse');
        }
        
        setUploadStatus('success');
        // Focus sur le message de succès
        setTimeout(() => {
          statusMessageRef.current?.focus();
        }, 100);
        
        setTimeout(() => {
          window.location.href = '/response?status=success&message=Votre document a été traité avec succès';
        }, 2000);
      } else {
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = `Erreur ${response.status}`;
        
        try {
          if (contentType.includes('application/json')) {
            const errorJson = await response.json();
            errorMessage = errorJson.message || errorJson.error || `Erreur ${response.status}`;
            if (errorJson.error === 'origin_not_allowed') {
              errorMessage = 'Accès refusé : origine non autorisée';
            }
          } else {
            const errorText = await response.text();
            errorMessage = errorText || response.statusText;
          }
        } catch {
          errorMessage = response.statusText || `Erreur HTTP ${response.status}`;
        }
        
        console.error(`❌ Erreur N8N ${response.status}:`, errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur:', error);
      let userMessage = 'Erreur de connexion au serveur';
     
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          userMessage = 'Délai d\'attente dépassé (30s). Veuillez réessayer.';
        } else if (error.message === 'Failed to fetch') {
          userMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        } else if (error.message.includes('origine non autorisée')) {
          userMessage = 'Accès refusé depuis ce domaine. Contactez le support.';
        } else {
          userMessage = error.message;
        }
      }
     
      setErrorMessage(userMessage);
      setUploadStatus('error');
      // Focus sur le message d'erreur
      setTimeout(() => {
        errorMessageRef.current?.focus();
      }, 100);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-brand-white">
      {/* Header with background */}
      <Header hasBackground={true} />

      {/* Main Content */}
      <main className="min-h-screen pt-24 pb-16" role="main">
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
            <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8" role="form" aria-labelledby="upload-form-title">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 id="upload-form-title" className="font-headline text-2xl font-bold text-brand-text-dark mb-2">
                  Déclaration d'accident
                </h2>
                <p className="text-gray-800 font-body">
                  Format PDF uniquement • Taille max : 10 MB
                </p>
              </div>

              {/* Upload Zone */}
              <div className="mb-8">
                <label htmlFor="file-upload" className="block" aria-describedby="file-upload-description">
                  <span className="sr-only">Sélectionner un fichier PDF</span>
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
                        <p className="text-gray-700 font-body">
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
                        <p className="text-gray-700 font-body" id="file-upload-description">
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
                    aria-describedby="file-upload-description"
                  />
                </label>
              </div>

              {/* Status Messages */}
              <div aria-live="polite" aria-atomic="true">
              {uploadStatus === 'success' && (
                <div 
                  ref={statusMessageRef}
                  className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4" 
                  role="status"
                  tabIndex={-1}
                >
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
                <div 
                  ref={errorMessageRef}
                  className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" 
                  role="alert"
                  tabIndex={-1}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-800 font-semibold">
                      Erreur lors de l'envoi
                    </p>
                  </div>
                  <p className="text-red-700 text-sm mt-2">
                    {errorMessage}
                  </p>
                  {(errorMessage.includes('500') || errorMessage.includes('Erreur de connexion')) && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-sm font-semibold">💡 Causes possibles</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Connexion internet, serveur indisponible, ou fichier trop volumineux.
                      </p>
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Info Box */}
              <div className="bg-brand-light bg-opacity-50 rounded-lg p-4 border-l-4 border-brand-accent">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="font-semibold mb-1">En cas de problème :</p>
                    <ul className="space-y-1 text-gray-800">
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
                  ref={submitButtonRef}
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-8 py-4 rounded-lg font-headline font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedFile || isUploading}
                  aria-busy={isUploading}
                  aria-describedby={!selectedFile ? "button-help-text" : undefined}
                >
                  {isUploading ? 'Envoi en cours...' : 'Envoyer'}
                </button>
                {!selectedFile && (
                  <p id="button-help-text" className="text-sm text-gray-700 mt-2 font-body">
                    Veuillez sélectionner un fichier avant d'envoyer
                  </p>
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