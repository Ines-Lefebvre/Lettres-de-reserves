import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import { newRequestId } from '../utils/requestId';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Upload as UploadIcon, FileText, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRetryBanner, setShowRetryBanner] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastUploadData, setLastUploadData] = useState<{
    file: File;
    requestId: string;
    userId: string;
  } | null>(null);
  const nav = useNavigate();
  
  // URL fixe du webhook N8N
  const N8N_UPLOAD_URL = 'https://n8n.srv833062.hstgr.cloud/webhook/validation-created';

  // Fonction d'envoi vers n8n avec gestion robuste des erreurs
  const sendToN8N = async (file: File, requestId: string, userId: string): Promise<any> => {
    console.log('🚀 Envoi vers n8n:', {
      url: N8N_UPLOAD_URL,
      fileName: file.name,
      fileSize: file.size,
      requestId,
      userId
    });

    // Préparation du FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request_id', requestId);
    formData.append('user_id', userId);

    // Envoi de la requête
    const response = await fetch(N8N_UPLOAD_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: formData
      // Ne pas définir Content-Type manuellement avec FormData
    });

    // Logging pour debug
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '';
    
    console.log('📡 Réponse n8n:', {
      status,
      contentType,
      contentLength,
      statusText: response.statusText
    });

    // Vérification du statut HTTP
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${status}: ${response.statusText}`);
    }

    // Vérification des conditions pour parser JSON
    const shouldParseJson = status !== 204 && 
                           contentLength !== '0' && 
                           contentType.includes('application/json');

    if (!shouldParseJson) {
      console.warn('⚠️ Réponse vide ou non-JSON détectée:', {
        status,
        contentType,
        contentLength
      });
      throw new Error('EMPTY_BODY');
    }

    // Parse JSON seulement si les conditions sont remplies
    try {
      const data = await response.json();
      console.log('✅ Données JSON reçues:', data);
      return data;
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      throw new Error('INVALID_JSON');
    }
  };

  // Fonction de retry
  const handleRetry = async () => {
    if (!lastUploadData) return;
    
    setShowRetryBanner(false);
    setMsg(null);
    setSuccessMsg(null);
    
    // Relancer l'upload avec les mêmes données
    await onUpload(lastUploadData.file, lastUploadData.requestId, lastUploadData.userId);
  };

  // Fonction principale d'upload
  const onUpload = async (uploadFile: File, requestId: string, userId: string) => {
    try {
      setLoading(true);
      setMsg(null);
      setSuccessMsg(null);
      setShowRetryBanner(false);
      
      // Envoi vers n8n
      const data = await sendToN8N(uploadFile, requestId, userId);
      
      // Afficher le message de succès
      setSuccessMsg('Document envoyé. Traitement en cours.');
      console.log('✅ Upload réussi:', data);
      
    } catch (error: any) {
      console.error('❌ Erreur upload:', error);
      
      // Sauvegarder les données pour retry
      setLastUploadData({ file: uploadFile, requestId, userId });
      
      // Gestion des messages d'erreur spécifiques
      if (error.message === 'EMPTY_BODY') {
        setMsg('⚠️ Le serveur n\'a pas renvoyé de données. Cliquez sur « Réessayer l\'envoi ». Si le problème persiste, contactez le support.');
        setShowRetryBanner(true);
      } else {
        setMsg(`Erreur d'envoi : ${error.message}`);
        setShowRetryBanner(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!file) {
      setMsg('Veuillez sélectionner un fichier PDF');
      return;
    }
    
    // Contrôle taille fichier ≤ 40 MB
    if (file.size > 40 * 1024 * 1024) {
      setMsg('Le fichier ne doit pas dépasser 40 MB');
      return;
    }
    
    setMsg(null);
    setSuccessMsg(null);
    setShowRetryBanner(false);
    
    try {
      // Génération du request ID
      let requestId = sessionStorage.getItem('current_request_id');
      if (!requestId) {
        requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('current_request_id', requestId);
        console.log('🆕 Nouveau REQUEST_ID généré:', requestId);
      } else {
        console.log('♻️ REQUEST_ID existant réutilisé:', requestId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expirée, veuillez vous reconnecter.');

      const userId = session.user.id;
      console.log('🔐 Session utilisateur:', { userId, requestId });

      // Créer l'upload en base de données
      console.log('📝 Création upload en base...');
      const { error: uploadError } = await supabase.rpc('rpc_create_upload', {
        p_request_id: requestId,
        p_filename: file.name,
        p_filesize: file.size,
        p_file_type: file.type || 'application/pdf',
        p_upload_status: 'processing'
      });
      
      if (uploadError) {
        console.error('❌ Erreur création upload:', uploadError);
        throw new Error(`Erreur création upload: ${uploadError.message}`);
      }
      
      console.log('✅ Upload créé en base avec requestId:', requestId);
      
      // Lancer l'upload
      await onUpload(file, requestId, userId);
      
    } catch (error: any) {
      console.error('❌ Erreur préparation upload:', error);
      setMsg(error?.message || 'Erreur de préparation de l\'upload');
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />
        
        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-2xl px-4">
            <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UploadIcon className="w-8 h-8 text-brand-accent" />
                </div>
                <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                  Téléversement de document
                </h1>
                <p className="text-gray-600 font-body">
                  Téléversez votre déclaration d'accident du travail (PDF uniquement)
                </p>
              </div>
              
              {/* Banner de retry pour erreurs JSON */}
              {showRetryBanner && (
                <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-amber-800">Erreur de communication</p>
                      <p className="text-sm text-amber-700 mt-1">Une erreur s'est produite lors de l'envoi.</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleRetry}
                          disabled={loading}
                          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Réessayer l'envoi
                        </button>
                        <button
                          onClick={() => setShowRetryBanner(false)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Fermer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Message de succès */}
              {successMsg && (
                <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{successMsg}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {/* File Input */}
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner un fichier PDF
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${
                    file && file.size > 40 * 1024 * 1024 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 hover:border-brand-accent'
                  }`}>
                    <input
                      id="file-upload"
                      type="file"
                      accept="application/pdf"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <FileText className={`w-12 h-12 mb-2 ${
                        file && file.size > 40 * 1024 * 1024 ? 'text-red-400' : 'text-gray-400'
                      }`} />
                      <span className="text-sm text-gray-600">
                        {file ? file.name : 'Cliquez pour sélectionner un fichier PDF'}
                      </span>
                      {file && (
                        <div className="mt-2 space-y-1">
                          <span className={`text-xs ${
                            file.size > 40 * 1024 * 1024 ? 'text-red-600 font-semibold' : 'text-gray-500'
                          }`}>
                            {formatFileSize(file.size)}
                          </span>
                          {file.size > 40 * 1024 * 1024 && (
                            <div className="flex items-center justify-center gap-1 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Fichier trop volumineux</span>
                            </div>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={handleSend}
                  disabled={loading || !file || (file && file.size > 40 * 1024 * 1024)}
                  className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-5 h-5" />
                      Envoyer le document
                    </>
                  )}
                </button>
                
                {/* Message */}
                {msg && (
                  <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {msg}
                  </div>
                )}
                
                {/* Info */}
                <div className="bg-brand-light bg-opacity-30 rounded-lg p-4">
                  <h3 className="font-semibold text-brand-text-dark mb-2">Informations importantes :</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Seuls les fichiers PDF sont acceptés</li>
                    <li>• Taille maximum : <strong>40 MB</strong></li>
                    <li>• Le document sera analysé automatiquement par OCR</li>
                    <li>• Vous pourrez valider les données extraites à l'étape suivante</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}