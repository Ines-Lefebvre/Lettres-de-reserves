import React from 'react';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Upload: React.FC = () => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Fichier sélectionné:', file.name);
      // Logique de téléversement à implémenter
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
                  <div className="border-2 border-dashed border-brand-accent border-opacity-50 rounded-lg p-8 text-center hover:border-brand-accent hover:bg-brand-light hover:bg-opacity-30 transition-all duration-300 cursor-pointer group">
                    <UploadIcon className="w-12 h-12 text-brand-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <p className="text-lg font-semibold text-brand-text-dark mb-2">
                      Cliquez pour téléverser votre fichier
                    </p>
                    <p className="text-gray-500 font-body">
                      ou glissez-déposez votre PDF ici
                    </p>
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
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-8 py-4 rounded-lg font-headline font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={true}
                >
                  Envoyer
                </button>
                <p className="text-sm text-gray-500 mt-2 font-body">
                  Le bouton s'activera après téléversement du fichier
                </p>
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