import React from 'react';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthGuard from '../components/AuthGuard';
import { n8nApi } from '../utils/n8nApiClient';

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error' | 'validating'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [uploadProgress, setUploadProgress] = React.useState(0);
  
  // Refs pour la gestion du focus
  const statusMessageRef = React.useRef<HTMLDivElement>(null);
  const errorMessageRef = React.useRef<HTMLDivElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement>(null);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validation immédiate côté client
      if (file.type !== 'application/pdf') {
        setErrorMessage('Seuls les fichiers PDF sont acceptés');
        setUploadStatus('error');
        return;
      }
      
      if (file.size > 15 * 1024 * 1024) { // 15MB
        setErrorMessage('Le fichier ne doit pas dépasser 15 MB');
        setUploadStatus('error');
        return;
      }
      
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadProgress(0);

    try {
      // Simulation du progrès d'upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log('📤 Upload vers N8N:', selectedFile.name, `(${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const result = await n8nApi.uploadFile(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.ok && result.data) {
        // Stocker les données extraites pour la page de validation
        if (result.data.data) {
          n8nApi.setExtractedData(result.data.data);
        }
        
        setUploadStatus('success');
        // Focus sur le message de succès
        setTimeout(() => {
          statusMessageRef.current?.focus();
        }, 100);
        
        // Redirection vers la validation après 2 secondes
        setTimeout(() => {
          window.location.href = result.data?.next || '/validation';
        }, 2000);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur:', error);
      
      let userMessage = 'Erreur de connexion au serveur';
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          userMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
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
      setUploadProgress(0);
    }
  };


  return (
    <AuthGuard>
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
                  Format PDF uniquement • Taille max : 15 MB
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
                          ou glissez-déposez votre PDF ici (max 15MB)
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
              {uploadStatus === 'validating' && (
                <div 
                  className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4" 
                  role="status"
                >
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <p className="text-blue-800 font-semibold">
                      Analyse du document en cours...
                    </p>
                  </div>
                  <p className="text-blue-700 text-sm mt-2">
                    Extraction des données par OCR, veuillez patienter.
                  </p>
                </div>
              )}

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
                      Document analysé avec succès !
                    </p>
                  </div>
                  <p className="text-green-700 text-sm mt-2">
                    Redirection vers la validation des données...
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

              {/* Progress Bar */}
              {isUploading && uploadProgress > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-brand-text-dark">
                      {uploadProgress < 90 ? 'Upload en cours...' : 'Analyse du document...'}
                    </span>
                    <span className="text-sm text-gray-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-brand-light bg-opacity-50 rounded-lg p-4 border-l-4 border-brand-accent">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="font-semibold mb-1">En cas de problème :</p>
                    <ul className="space-y-1 text-gray-800">
                      <li>• Vérifiez votre connexion internet</li>
                      <li>• Assurez-vous que le fichier est au format PDF uniquement</li>
                      <li>• Vérifiez que la taille ne dépasse pas 15 MB</li>
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
                  {isUploading ? (
                    uploadProgress < 90 ? 'Upload en cours...' : 'Analyse en cours...'
                  ) : 'Analyser le document'}
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
    </AuthGuard>
  );
};

export default Upload;