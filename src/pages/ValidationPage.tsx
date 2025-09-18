import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, FileText, Save } from 'lucide-react';

export default function ValidationPage() {
  const [params] = useSearchParams();
  const rid = useMemo(() => params.get('rid') ?? '', [params]);
  const [payload, setPayload] = useState<any>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Récupération des données extraites depuis sessionStorage
    const cached = sessionStorage.getItem('extracted_data');
    if (cached) setPayload(JSON.parse(cached));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try { 
      setPayload(JSON.parse(e.target.value)); 
    } catch { 
      // Ignore les erreurs de parsing JSON pendant la saisie
    }
  };

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { 
      window.location.href = '/login'; 
      return; 
    }
    
    console.log('💾 Sauvegarde validation...', { requestId: rid, userId: session.user.id });
    
    try {
      // Recherche de l'upload correspondant
      const { data: upload, error: uploadFindError } = await supabase
        .from('uploads')
        .select('id')
        .eq('n8n_request_id', rid)
        .eq('user_id', session.user.id)
        .single();
      
      if (uploadFindError) {
        console.warn('⚠️ Upload non trouvé:', uploadFindError);
      } else {
        console.log('✅ Upload trouvé:', upload);
      }
      
      // Insertion dans validations
      const { data: validationData, error: validationError } = await supabase.from('validations').insert({
        upload_id: upload?.id || null,
        user_id: session.user.id,
        data: payload,
        is_confirmed: true,
        confirmed_at: new Date().toISOString()
      }).select();
      
      if (validationError) {
        console.error('❌ Erreur validation:', validationError);
        throw validationError;
      }
      
      console.log('✅ Validation sauvegardée:', validationData);
      
      // Mise à jour du statut de l'upload
      if (upload) {
        const { error: updateError } = await supabase
          .from('uploads')
          .update({ status: 'validated' })
          .eq('id', upload.id);
          
        if (updateError) {
          console.warn('⚠️ Erreur mise à jour statut:', updateError);
        } else {
          console.log('✅ Statut upload mis à jour: validated');
        }
      }
      
      // Insertion legacy dans dossiers pour compatibilité
      const { data: dossierData, error: dossierError } = await supabase.from('dossiers').insert({
        request_id: rid,
        user_id: session.user.id,
        payload
      }).select();
      
      if (dossierError) {
        console.warn('⚠️ Erreur sauvegarde dossier legacy:', dossierError);
        // Continue malgré l'erreur legacy
      } else {
        console.log('✅ Dossier legacy sauvegardé:', dossierData);
      }
      
      // Nettoyage du sessionStorage après sauvegarde réussie
      sessionStorage.removeItem('extracted_data');
      sessionStorage.removeItem('request_id');
      
      // Redirection vers la page de confirmation
      nav('/response?status=success&message=Données validées et sauvegardées avec succès');
      
    } catch (error: any) {
      setMsg(error?.message || 'Erreur lors de la sauvegarde');
    }
    
    setSaving(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />
        
        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-brand-accent" />
                </div>
                <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                  Validation des données
                </h1>
                <p className="text-gray-600 font-body">
                  Vérifiez et modifiez si nécessaire les données extraites de votre document
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Request ID Info */}
                {rid && (
                  <div className="bg-brand-light bg-opacity-30 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">ID de la demande :</span> {rid}
                    </p>
                  </div>
                )}
                
                {/* JSON Editor */}
                <div>
                  <label htmlFor="payload-editor" className="block text-sm font-medium text-gray-700 mb-2">
                    Données extraites (format JSON)
                  </label>
                  <textarea
                    id="payload-editor"
                    value={JSON.stringify(payload, null, 2)}
                    onChange={onChange}
                    className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono text-sm"
                    placeholder="Les données extraites apparaîtront ici..."
                  />
                </div>
                
                {/* Save Button */}
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Valider et enregistrer
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
                  <h3 className="font-semibold text-brand-text-dark mb-2">Instructions :</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Vérifiez que toutes les informations sont correctes</li>
                    <li>• Vous pouvez modifier le JSON directement si nécessaire</li>
                    <li>• Les données seront sauvegardées de manière sécurisée</li>
                    <li>• Cliquez sur "Valider et enregistrer" pour continuer</li>
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