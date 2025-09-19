import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import { newRequestId } from '../utils/requestId';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  
  // URL du webhook N8N pour l'upload
  const N8N_UPLOAD_URL = import.meta.env.VITE_N8N_UPLOAD_URL;

  const onSend = async () => {
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
    setLoading(true);
    
    try {
      // 🔧 SEUL ENDROIT DE GÉNÉRATION DE REQUEST_ID
      let requestId = sessionStorage.getItem('current_request_id');
      if (!requestId) {
        requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('current_request_id', requestId);
        console.log('🆕 NOUVEAU REQUEST_ID GÉNÉRÉ (UPLOAD):', requestId);
      } else {
        console.log('♻️ REQUEST_ID EXISTANT RÉUTILISÉ (UPLOAD):', requestId);
      }
      
      console.log('REQUEST_ID DEBUGGING:', {
        source: 'upload',
        requestId: requestId,
        timestamp: Date.now()
      });
      

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expirée, veuillez vous reconnecter.');

      console.log('🔐 Session utilisateur:', { userId: session.user.id, requestId });

      // 1) Créer/mettre à jour la ligne uploads côté DB
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
      
      console.log('🚀 Envoi vers N8N:', N8N_UPLOAD_URL);
      console.log('📁 Fichier:', { name: file.name, size: file.size, type: file.type });
      
      const fd = new FormData();
      fd.append('file', file);
      fd.append('requestId', requestId);
      fd.append('timestamp', new Date().toISOString());
      fd.append('filename', file.name);
      fd.append('filesize', file.size.toString());
      fd.append('filetype', file.type || 'application/pdf');
      
      const res = await fetch(N8N_UPLOAD_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 
          'Accept': 'application/json'
          // Ne pas fixer Content-Type avec FormData
        },
        body: fd,
      });
      
      if (!res.ok) {
        throw new Error(`Upload échoué (${res.status})`);
      }
      
      const data = await res.json();
      console.log('📡 Réponse N8N:', data);
      
      if (!data.ok) {
        throw new Error('Réponse OCR invalide');
      }
      
      // Stockage en sessionStorage et traitement OCR
      const payload = data.payload || {};
      
      // 🔧 CORRECTION: Vérifier que N8N retourne le même requestId
      const returnedRequestId = payload.requestId || data.requestId;
      if (returnedRequestId && returnedRequestId !== requestId) {
        console.warn('⚠️ RequestId différent retourné par N8N:', {
          sent: requestId,
          received: returnedRequestId
        });
        // FORCER l'utilisation du requestId original pour maintenir la cohérence
        payload.requestId = requestId;
        console.log('🔧 RequestId corrigé dans payload:', requestId);
      } else {
        console.log('✅ RequestId cohérent entre envoi et réception:', requestId);
      }
      
      sessionStorage.setItem('ocr_payload', JSON.stringify(payload));
      sessionStorage.setItem('sessionId', payload.sessionId || '');
      
      console.log('✅ Données OCR reçues:', {
        requestId,
        sessionId: payload.sessionId,
        documentType: payload.documentType,
        hasExtractedData: !!payload.extractedData
      });
      
      // 2) Enregistrer le résultat OCR côté DB (lié à l'upload créé)
      console.log('💾 Sauvegarde résultat OCR...');
      const { error: ocrError } = await supabase.rpc('rpc_upsert_ocr_result', {
        p_request_id: requestId,
        p_document_type: payload.documentType || 'AT_NORMALE',
        p_extracted_fields: payload.extractedData || {},
        p_validation_fields: payload.validationFields || {},
        p_contextual_questions: payload.contextualQuestions || [],
        p_ocr_confidence: payload.ocr_confidence ?? null
      });
      
      if (ocrError) {
        console.error('❌ Erreur sauvegarde OCR:', ocrError);
        // Ne pas bloquer le processus, juste logger
        console.warn('⚠️ Continuant malgré l\'erreur OCR...');
      } else {
        console.log('✅ Résultat OCR sauvegardé en base');
      }
      
      // Redirection vers next (fourni par n8n)
      if (data.next) {
        console.log('🔄 Redirection vers:', data.next);
        window.location.href = data.next;
      } else {
        // Fallback si pas de next
        nav('/validation');
      }
      
    } catch (error: any) {
      console.error('❌ Erreur upload:', error);
      setMsg(error?.message || 'Erreur de connexion au serveur');
    } finally {
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
                  onClick={onSend}
                  disabled={loading || !file || (file && file.size > 40 * 1024 * 1024)}
                  className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Analyse en cours...
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