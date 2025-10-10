import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import { normalizeNumericFields } from '../utils/normalize';
import { storeValidationPayload, cleanOldPayloads, loadValidationPayload } from '../utils/storage';
import { useRequestId } from '../hooks/useRequestId';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Upload as UploadIcon, FileText, AlertCircle, RefreshCw, X } from 'lucide-react';

type N8nUploadResponse = {
  ok?: boolean;
  requestId?: string;
  next?: { url?: string };
  payload?: any;
  statusCode?: number;
  error?: string;
  [k: string]: any;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const nav = useNavigate();
  const hasNavigatedRef = useRef(false);
  
  const [retryCount, setRetryCount] = useState(0);               // 0 = première tentative, 1 = après "Réessayer"
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastFileRef, setLastFileRef] = useState<File | null>(null); // garde le fichier sélectionné

  const [uploading, setUploading] = useState(false);

  // Utiliser le hook personnalisé pour gérer le requestId
  const { requestId: currentRequestId, setRequestId: updateRequestId, generateRequestId } = useRequestId({ logDebug: true });
  
  // URL fixe du webhook N8N
  const N8N_UPLOAD_URL = import.meta.env.VITE_N8N_UPLOAD_URL ?? 'https://n8n.srv833062.hstgr.cloud/webhook/upload';

  function safeNavigateOnce(path: string, state?: any) {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    nav(path, { state, replace: false });
  }

  function setPayloadInSession(requestId: string, payload: any) {
    try {
      const normalizedPayload = payload ? normalizeNumericFields(payload) : {};

      const stored = storeValidationPayload(requestId, normalizedPayload);

      if (!stored) {
        console.error('❌ [Upload] Échec du stockage du payload');
        throw new Error('Échec du stockage du payload');
      }

      console.log('💾 [Upload] Payload normalisé et stocké');
      console.log('  📋 RequestID:', requestId);
      console.log('  📊 Données:', normalizedPayload);
    } catch (e) {
      console.error('❌ [Upload] Erreur stockage payload:', e);
      throw e;
    }
  }

  async function parseN8nResponse(res: Response): Promise<N8nUploadResponse | null> {
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    try {
      const raw = isJson ? await res.json() : await res.text();

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          return null;
        }
      }

      // N8n renvoie un tableau avec un seul objet: [{ ok: true, requestId: "...", payload: {...} }]
      const data = Array.isArray(raw) ? raw[0] : raw;
      return data as N8nUploadResponse;
    } catch { return null; }
  }

  function isSuccess(d: N8nUploadResponse | null): d is N8nUploadResponse {
    return !!(d && d.ok === true && typeof d.requestId === "string" && d.requestId && d.payload && typeof d.payload === "object");
  }

  
  // Handler d'envoi principal
  async function onUpload() {
    setUploadError(null);
    setUploading(true);

    // garde la sélection
    const uploadFile = lastFileRef ?? file;
    if (!uploadFile) {
      setUploadError("Aucun fichier sélectionné.");
      setUploading(false);
      return;
    }

    // Utiliser ou générer un requestId via le hook
    const reqId = currentRequestId || generateRequestId();
    if (!currentRequestId) {
      updateRequestId(reqId);
    }

    // construit FormData pour N8N
    const form = new FormData();
    form.append("requestId", reqId);
    form.append("file", uploadFile);
    form.append("filename", uploadFile.name);
    form.append("filesize", uploadFile.size.toString());
    form.append("timestamp", new Date().toISOString());
    
    // Ajouter un token d'authentification basique
    form.append("token", `jwt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
    form.append("idempotencyKey", `idem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

    console.log('🚀 Envoi vers N8N:', {
      url: N8N_UPLOAD_URL,
      requestId: reqId,
      filename: uploadFile.name,
      filesize: uploadFile.size
    });

    let res: Response;
    try {
      res = await fetch(N8N_UPLOAD_URL, { 
        method: "POST", 
        body: form,
        mode: 'cors'
      });
      
      console.log('📡 Réponse N8N:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries())
      });
      
    } catch {
      // Échec réseau
      console.error('❌ Erreur réseau vers N8N');
      if (retryCount === 0) {
        setUploadError("RETRY_CHOICE"); // affiche la bannière avec 2 boutons
        setUploading(false);
        return;
      } else {
        // 2e échec -> redirection auto en manuel
        setPayloadInSession(reqId, {}); // stocke payload vide
        safeNavigateOnce(`/validation?requestId=${encodeURIComponent(reqId)}&manual=true`, {
          requestId: reqId, manual: true, reason: "NETWORK_ERROR"
        });
        setUploading(false);
        return;
      }
    }

    // HTTP non-2xx
    if (!res.ok) {
      console.error('❌ Erreur HTTP N8N:', res.status, res.statusText);
      if (retryCount === 0) {
        setUploadError("RETRY_CHOICE");
        setUploading(false);
        return;
      } else {
        setPayloadInSession(reqId, {});
        safeNavigateOnce(`/validation?requestId=${encodeURIComponent(reqId)}&manual=true`, {
          requestId: reqId, manual: true, reason: `HTTP_${res.status}`
        });
        setUploading(false);
        return;
      }
    }

    // Parse / validation de la réponse
    const data = await parseN8nResponse(res);
    
    console.log('📋 Données reçues de N8N:', data);

    if (!isSuccess(data)) {
      console.error('❌ Réponse N8N invalide:', data);
      if (retryCount === 0) {
        setUploadError("RETRY_CHOICE");
        setUploading(false);
        return;
      } else {
        setPayloadInSession(reqId, {});
        safeNavigateOnce(`/validation?requestId=${encodeURIComponent(reqId)}&manual=true`, {
          requestId: reqId, manual: true, reason: data?.error || "INVALID_JSON_OR_NO_PAYLOAD"
        });
        setUploading(false);
        return;
      }
    }

    // SUCCÈS : stocke et navigue
    console.log('✅ [Upload] Succès N8N, stockage du payload');
    setPayloadInSession(data.requestId!, data.payload);

    await new Promise(resolve => setTimeout(resolve, 100));

    const verification = loadValidationPayload(data.requestId!);
    if (!verification) {
      console.error('❌ [Upload] Vérification échouée après stockage');
      throw new Error('Payload non disponible après stockage');
    }

    console.log('🚀 [Upload] Navigation vers validation');
    const target = (data.next?.url && typeof data.next.url === "string") ? data.next.url : "/validation";
    safeNavigateOnce(target, { requestId: data.requestId, manual: false });
    setUploading(false);
  }

  // Handlers des boutons
  async function handleRetryClick() {
    if (retryCount === 0) setRetryCount(1);
    await onUpload(); // relance avec le même fichier et le même requestId
  }

  function handleManualClick() {
    const reqId = currentRequestId || generateRequestId();
    if (!currentRequestId) {
      updateRequestId(reqId);
    }
    setPayloadInSession(reqId, {}); // payload vide
    safeNavigateOnce(`/validation?requestId=${encodeURIComponent(reqId)}&manual=true`, {
      requestId: reqId, manual: true, reason: "USER_MANUAL_CHOICE"
    });
  }

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

    // Reset navigation guard pour un nouvel upload
    hasNavigatedRef.current = false;
    setMsg(null);
    setSuccessMsg(null);
    setUploadError(null);

    // Reset du compteur de tentatives pour un nouvel envoi
    setRetryCount(0);

    cleanOldPayloads();

    try {
      // Utiliser ou générer un requestId via le hook
      const requestId = currentRequestId || generateRequestId();
      if (!currentRequestId) {
        updateRequestId(requestId);
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
      await onUpload();
      
    } catch (error: any) {
      console.error('❌ Erreur préparation upload:', error);
      setMsg(error?.message || 'Erreur de préparation de l\'upload');
      setUploading(false);
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
              
              {/* Bannière d'erreur professionnelle avec CTA */}
              {uploadError === "RETRY_CHOICE" && (
                <div role="alert" className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                  <div className="flex flex-col gap-2">
                    <strong className="text-amber-800 font-medium">Données manquantes</strong>
                    <span className="text-amber-700">Plusieurs utilisateurs envoient leurs documents en même temps. Vous pouvez réessayer ou passer au remplissage manuel.</span>
                    <small className="opacity-80 text-amber-600">Votre fichier reste sélectionné et vos informations sont préservées.</small>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleRetryClick} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300">Réessayer l'envoi</button>
                      <button onClick={handleManualClick} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300">Continuer en mode manuel</button>
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
                      onChange={e => { const selectedFile = e.target.files?.[0] ?? null; setFile(selectedFile); setLastFileRef(selectedFile); }}
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
                  disabled={uploading || !file || (file && file.size > 40 * 1024 * 1024)}
                  className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
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