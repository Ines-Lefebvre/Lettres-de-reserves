import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, Download, ArrowLeft, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface WebhookData {
  status: 'success' | 'error' | 'processing';
  message: string;
  documentUrl?: string;
  fileName?: string;
  processedAt?: string;
  estimatedTime?: string;
}

const WebhookResponse: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler la réception des données du webhook
    const status = searchParams.get('status') as 'success' | 'error' | 'processing';
    const message = searchParams.get('message') || '';
    const documentUrl = searchParams.get('documentUrl') || '';
    const fileName = searchParams.get('fileName') || '';
    const processedAt = searchParams.get('processedAt') || '';
    const estimatedTime = searchParams.get('estimatedTime') || '';

    // Si aucun paramètre, données par défaut pour la démo
    if (!status) {
      setWebhookData({
        status: 'success',
        message: 'Votre lettre de réserves a été générée avec succès',
        documentUrl: '#',
        fileName: 'lettre_reserves_accident_123.pdf',
        processedAt: new Date().toLocaleString('fr-FR'),
        estimatedTime: '2 minutes'
      });
    } else {
      setWebhookData({
        status,
        message,
        documentUrl: documentUrl || undefined,
        fileName: fileName || undefined,
        processedAt: processedAt || undefined,
        estimatedTime: estimatedTime || undefined
      });
    }

    setIsLoading(false);
  }, [searchParams]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleNewUpload = () => {
    navigate('/upload');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
          <p className="text-brand-text-dark font-body">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!webhookData) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-brand-text-dark mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">Aucune donnée de réponse trouvée</p>
          <button
            onClick={handleBackToHome}
            className="bg-brand-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-300"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-white">
      <Header hasBackground={true} />

      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-brand-accent hover:text-brand-dark transition-colors duration-300 font-body"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8 mb-8">
            {/* Status Header */}
            <div className="text-center mb-8">
              {webhookData.status === 'success' && (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-4">
                    <span className="text-green-600">Succès !</span>
                  </h1>
                </>
              )}

              {webhookData.status === 'error' && (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                  <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-4">
                    <span className="text-red-600">Erreur</span>
                  </h1>
                </>
              )}

              {webhookData.status === 'processing' && (
                <>
                  <div className="w-20 h-20 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-12 h-12 text-brand-accent animate-pulse" />
                  </div>
                  <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-4">
                    <span className="text-brand-accent">En cours...</span>
                  </h1>
                </>
              )}

              <p className="text-xl text-gray-600 font-body">
                {webhookData.message}
              </p>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Processing Info */}
              {webhookData.processedAt && (
                <div className="bg-brand-light bg-opacity-30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-brand-accent" />
                    <span className="font-semibold text-brand-text-dark">Informations de traitement</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Traité le :</span> {webhookData.processedAt}
                    </div>
                    {webhookData.estimatedTime && (
                      <div>
                        <span className="font-medium">Temps de traitement :</span> {webhookData.estimatedTime}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document Download */}
              {webhookData.status === 'success' && webhookData.documentUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 mb-1">
                        Document prêt au téléchargement
                      </h3>
                      <p className="text-green-700 text-sm">
                        {webhookData.fileName || 'lettre_reserves.pdf'}
                      </p>
                    </div>
                    <a
                      href={webhookData.documentUrl}
                      download={webhookData.fileName}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </a>
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {webhookData.status === 'processing' && (
                <div className="bg-brand-light bg-opacity-50 border border-brand-accent border-opacity-30 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-brand-accent animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-brand-text-dark mb-1">
                        Traitement en cours
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Votre lettre de réserves est en cours de génération. Vous recevrez un email dès qu'elle sera prête.
                      </p>
                      {webhookData.estimatedTime && (
                        <p className="text-brand-accent text-sm mt-2">
                          Temps estimé : {webhookData.estimatedTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {webhookData.status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 mb-1">
                        Erreur de traitement
                      </h3>
                      <p className="text-red-700 text-sm">
                        Une erreur s'est produite lors du traitement de votre demande. Veuillez réessayer ou nous contacter.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              {webhookData.status === 'error' && (
                <button
                  onClick={handleNewUpload}
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Réessayer
                </button>
              )}
              
              {webhookData.status === 'success' && (
                <button
                  onClick={handleNewUpload}
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Nouveau téléversement
                </button>
              )}

              <button
                onClick={handleBackToHome}
                className="border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-brand-light bg-opacity-50 rounded-lg p-6 text-center">
            <h3 className="font-headline text-lg font-semibold text-brand-text-dark mb-2">
              Besoin d'aide ?
            </h3>
            <p className="text-gray-600 font-body mb-4">
              Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à nous contacter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a href="mailto:email@renseigner.fr" className="text-brand-accent hover:text-brand-dark transition-colors duration-300">
                email@renseigner.fr
              </a>
              <a href="tel:+33000000000" className="text-brand-accent hover:text-brand-dark transition-colors duration-300">
                téléphone à renseigner
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WebhookResponse;