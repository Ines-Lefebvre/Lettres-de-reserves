import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchValidation, safeParseJson } from '../lib/api';
import AuthGuard from '../components/AuthGuard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { AlertCircle, RefreshCw, CheckCircle, FileText } from 'lucide-react';

export default function ValidationPageNew() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'badjson' | 'error'>('idle');
  const [payload, setPayload] = useState<any>(null);
  const [meta, setMeta] = useState<{ status?: number, raw?: string, error?: string }>({});
  const scrolled = useRef(false);

  const query = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const u = new URL(window.location.href);
    return {
      session_id: u.searchParams.get('session_id') || u.searchParams.get('SessionID') || undefined,
      req_id: u.searchParams.get('req_id') || u.searchParams.get('RequestID') || undefined,
      request_id: u.searchParams.get('request_id') || undefined,
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setState('loading');
      try {
        const res = await fetchValidation(query);
        if (!mounted) return;
        
        if (!res.text || res.text.trim().length === 0 || res.status === 204) {
          setState('empty'); 
          setMeta({ status: res.status, raw: res.text }); 
          return;
        }
        
        const parsed = safeParseJson(res.text);
        if (!parsed.ok) {
          setState('badjson'); 
          setMeta({ status: res.status, raw: parsed.raw, error: parsed.error }); 
          return;
        }
        
        setPayload(parsed.data);
        setState('ok');
      } catch (e: any) {
        if (!mounted) return;
        setState('error'); 
        setMeta({ error: String(e) });
      }
    }
    run();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!scrolled.current && (state === 'empty' || state === 'badjson' || state === 'error')) {
      scrolled.current = true;
      document.getElementById('debug')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state]);

  const handleRetry = () => {
    scrolled.current = false;
    setState('idle');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />
        
        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-4xl px-4">
            <header className="mb-8 text-center">
              <div className="w-16 h-16 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-brand-accent" />
              </div>
              <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                Validation des données
              </h1>
              <p className="text-gray-600 font-body mb-4">
                Récupération des données depuis le serveur de traitement
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Session: {query.session_id ?? '–'}</p>
                <p>Requête: {(query.req_id || query.request_id) ?? '–'}</p>
              </div>
            </header>

            {/* Loading State */}
            {state === 'loading' && (
              <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
                  <h2 className="font-headline text-xl font-semibold text-brand-text-dark mb-2">
                    Chargement des données
                  </h2>
                  <p className="text-gray-600">
                    Récupération des informations depuis le serveur de traitement...
                  </p>
                </div>
              </div>
            )}

            {/* Success State */}
            {state === 'ok' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h2 className="font-headline text-xl font-semibold text-brand-text-dark">
                      Données reçues avec succès
                    </h2>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Contenu reçu :</h3>
                    <pre className="text-xs overflow-x-auto bg-white rounded border p-3 max-h-96">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Prochaine étape :</strong> Intégrer ici l'interface de validation/édition des données extraites.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty Response State */}
            {state === 'empty' && (
              <div id="debug" className="bg-white rounded-lg shadow-xl border-2 border-amber-300 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="font-headline text-xl font-semibold text-amber-800 mb-2">
                    Aucun contenu reçu
                  </h2>
                  <p className="text-amber-700 mb-4">
                    Le serveur n8n a répondu mais sans données (HTTP {meta.status ?? '—'}).
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800">
                      <strong>Diagnostic :</strong> Corps de réponse vide ou statut 204. 
                      Vérifier que le node <em>"Respond to Webhook"</em> dans n8n renvoie un JSON non vide.
                    </p>
                  </div>
                  <button 
                    onClick={handleRetry}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Bad JSON State */}
            {state === 'badjson' && (
              <div id="debug" className="bg-white rounded-lg shadow-xl border-2 border-red-300 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-headline text-xl font-semibold text-red-800 mb-2">
                    Réponse non parsable
                  </h2>
                  <p className="text-red-700 mb-4">
                    Le serveur a répondu mais le JSON est invalide.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 mb-2">
                      <strong>Erreur :</strong> {meta.error}
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">Voir la réponse brute</summary>
                      <pre className="mt-2 overflow-x-auto bg-white rounded border p-2 max-h-32">
                        {meta.raw}
                      </pre>
                    </details>
                  </div>
                  <button 
                    onClick={handleRetry}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Error State */}
            {state === 'error' && (
              <div id="debug" className="bg-white rounded-lg shadow-xl border-2 border-red-300 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-headline text-xl font-semibold text-red-800 mb-2">
                    Erreur de connexion
                  </h2>
                  <p className="text-red-700 mb-4">
                    Impossible de récupérer les données depuis le serveur.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800">
                      <strong>Détails :</strong> {meta.error}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Causes possibles : CORS, timeout, serveur indisponible, ou problème réseau.
                    </p>
                  </div>
                  <button 
                    onClick={handleRetry}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Debug Info */}
            <div className="mt-8 text-center">
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer">Informations de debug</summary>
                <div className="mt-2 bg-gray-50 rounded p-3 text-left">
                  <p><strong>État :</strong> {state}</p>
                  <p><strong>Endpoint :</strong> {import.meta.env.VITE_VALIDATION_ENDPOINT || 'Non défini'}</p>
                  <p><strong>Query params :</strong> {JSON.stringify(query)}</p>
                  <p><strong>Meta :</strong> {JSON.stringify(meta)}</p>
                </div>
              </details>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}