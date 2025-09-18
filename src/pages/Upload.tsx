import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Upload as UploadIcon, FileText } from 'lucide-react';

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
    
    setMsg(null);
    setLoading(true);
    
    // Récupération du token utilisateur pour l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMsg('Session expirée, veuillez vous reconnecter');
      nav('/login');
      return;
    }
    
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    fd.append('filesize', file.size.toString());
    fd.append('requestId', crypto.randomUUID());
    fd.append('timestamp', new Date().toISOString());
    fd.append('token', `jwt_${session.access_token.substring(0, 20)}`); // Token simplifié pour N8N
    
    try {
      console.log('🚀 Envoi vers N8N:', N8N_UPLOAD_URL);
      console.log('📁 Fichier:', { name: file.name, size: file.size, type: file.type });
      
      const res = await fetch(N8N_UPLOAD_URL, {
        method: 'POST', 
        body: fd, 
        headers: {
          'Accept': 'application/json',
          // ne pas fixer 'Content-Type' quand on envoie FormData
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      
      const data = await res.json();
      
      console.log('📡 Réponse N8N:', data);
      
      // Vérification de la réponse N8N : {ok, requestId, next, data?}
      if (data?.ok && data?.next) {
        console.log('✅ N8N OK, sauvegarde dans Supabase...');
        
        // Enregistrement de l'upload dans Supabase
        const { data: uploadData, error: uploadError } = await supabase.from('uploads').insert({
          user_id: session.user.id,
          n8n_request_id: data.requestId,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          status: 'ocr_done'
        }).select();
        
        if (uploadError) {
          console.warn('⚠️ Erreur sauvegarde upload:', uploadError);
          // Continue malgré l'erreur de sauvegarde
        } else {
          console.log('✅ Upload sauvegardé:', uploadData);
          
          // Sauvegarder aussi les résultats OCR si présents
          if (data.data && uploadData?.[0]?.id) {
            const { data: ocrData, error: ocrError } = await supabase.from('ocr_results').insert({
              upload_id: uploadData[0].id,
              data: data.data
            }).select();
            
            if (ocrError) {
              console.warn('⚠️ Erreur sauvegarde OCR:', ocrError);
            } else {
              console.log('✅ OCR sauvegardé:', ocrData);
            }
          }
        }
        
        // Stocker les données extraites pour la page de validation
        if (data.data) {
          sessionStorage.setItem('extracted_data', JSON.stringify(data.data));
        }
        if (data.requestId) {
          sessionStorage.setItem('request_id', data.requestId);
        }
        
        // Redirection vers /validation
        nav(data.next);
      } else {
        setMsg(data?.message || 'Réponse inattendue du serveur');
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-accent transition-colors duration-300">
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
                      <FileText className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {file ? file.name : 'Cliquez pour sélectionner un fichier PDF'}
                      </span>
                      {file && (
                        <span className="text-xs text-gray-500 mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </label>
                  </div>
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={onSend}
                  disabled={loading || !file}
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
                  <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                    {msg}
                  </div>
                )}
                
                {/* Info */}
                <div className="bg-brand-light bg-opacity-30 rounded-lg p-4">
                  <h3 className="font-semibold text-brand-text-dark mb-2">Informations importantes :</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Seuls les fichiers PDF sont acceptés</li>
                    <li>• Taille maximum : 15 MB</li>
                    <li>• Le document sera analysé automatiquement</li>
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