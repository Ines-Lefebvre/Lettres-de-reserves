import React from 'react';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('timestamp', new Date().toISOString());
      formData.append('filename', selectedFile.name);
      formData.append('filesize', selectedFile.size.toString());

      const response = await fetch('https://webhook.site/your-webhook-url', {
      const response = await fetch('https://n8n.srv833062.hstgr.cloud/webhook-test/dc2b297e-19c2-44cc-9e68-93d06abe4822', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('success');
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur:', error);
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
                    Veuillez réessayer ou nous contacter si le problème persiste.
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-brand-light bg-opacity-50 rounded-lg p-4 border-l-4 border-brand-accent">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-accent mt-0.5 flex-shrink-0" />
                  <div className="font-body text-sm text-brand-text-dark">
                    <p className="font-semibold mb-1">Informations importantes :</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Votre déclaration doit être au format PDF</li>
                      <li>• Les données sont traitées de manière confidentielle</li>
                      <li>• Vous recevrez votre lettre de réserves sous 24h</li>
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
                  <p className="text-sm text-gray-500 mt-2 font-body">
                    Sélectionnez un fichier pour activer le bouton
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