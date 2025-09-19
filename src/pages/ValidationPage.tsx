import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import { dotObjectToNested } from '../utils/normalize';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, FileText, Save, AlertCircle, ArrowLeft, Upload } from 'lucide-react';

interface ExtractedData {
  [key: string]: any;
}

interface ValidationField {
  label: string;
  value: string;
  required?: boolean;
  isEmpty?: boolean;
  needsValidation?: boolean;
}

interface ContextualQuestion {
  id: string;
  question: string;
  type: 'boolean' | 'text' | 'select';
  category?: string;
  required?: boolean;
  options?: string[];
}

interface CompletionStats {
  completionRate: number;
  totalFields: number;
  completedFields: number;
  missingFields: string[];
}

export default function ValidationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Données de session
  const [requestId, setRequestId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [ocrPayload, setOcrPayload] = useState<any>(null);
  
  // Données extraites
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [validationFields, setValidationFields] = useState<Record<string, ValidationField>>({});
  const [contextualQuestions, setContextualQuestions] = useState<ContextualQuestion[]>([]);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  
  // État de l'interface
  const [activeTab, setActiveTab] = useState<string>('employeur');
  const [validatedData, setValidatedData] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Récupération des données depuis URL et sessionStorage
    const rid = searchParams.get('rid') || '';
    const storedRequestId = sessionStorage.getItem('requestId') || '';
    const storedSessionId = sessionStorage.getItem('sessionId') || '';
    const storedPayload = sessionStorage.getItem('ocr_payload');
    
    console.log('🔍 Chargement validation:', {
      ridFromUrl: rid,
      requestIdFromStorage: storedRequestId,
      sessionIdFromStorage: storedSessionId,
      hasStoredPayload: !!storedPayload
    });
    
    setRequestId(rid || storedRequestId);
    setSessionId(storedSessionId);
    
    if (storedPayload) {
      try {
        const payload = JSON.parse(storedPayload);
        setOcrPayload(payload);
        
        // Extraction des données
        if (payload.extractedData) {
          setExtractedData(payload.extractedData);
          // Initialiser validatedData avec les données extraites
          setValidatedData(flattenObject(payload.extractedData));
        }
        
        if (payload.validationFields) {
          setValidationFields(payload.validationFields);
        }
        
        if (payload.contextualQuestions) {
          setContextualQuestions(payload.contextualQuestions);
        }
        
        if (payload.completionStats) {
          setCompletionStats(payload.completionStats);
        }
        
        console.log('✅ Données OCR chargées:', {
          documentType: payload.documentType,
          hasExtractedData: !!payload.extractedData,
          validationFieldsCount: Object.keys(payload.validationFields || {}).length,
          questionsCount: (payload.contextualQuestions || []).length
        });
        
      } catch (error) {
        console.error('❌ Erreur parsing OCR payload:', error);
        setMsg('Erreur lors du chargement des données OCR');
      }
    } else {
      setMsg('Aucune donnée OCR trouvée. Veuillez recommencer l\'upload.');
    }
  }, [searchParams]);

  // Fonction utilitaire pour aplatir un objet nested
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  };

  // Gestion des changements de valeurs
  const handleFieldChange = (fieldKey: string, value: any) => {
    setValidatedData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Sauvegarde directe dans Supabase
  const handleConfirm = async () => {
    try {
      setSaving(true);
      setMsg(null);
      setSuccess(false);

      // 1) Session & user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      const userId = session.user.id;

      // 2) Contexte
      const requestId = sessionStorage.getItem('requestId') || null;
      const sessionId = sessionStorage.getItem('sessionId') || null;

      const payloadRaw = sessionStorage.getItem('ocr_payload');
      if (!payloadRaw) {
        throw new Error('Aucune donnée OCR en mémoire.');
      }
      const payload = JSON.parse(payloadRaw);

      const documentType = payload?.documentType || null;
      const completionStats = payload?.completionStats || {};
      const ocrSource = 'mistral_ocr';

      // 3) Normaliser les champs validés ("section.champ" -> objet imbriqué)
      const normalized = dotObjectToNested(validatedData);

      console.log('💾 Sauvegarde validation Supabase:', {
        userId,
        requestId,
        sessionId,
        documentType,
        normalizedDataKeys: Object.keys(normalized),
        answersCount: (answers || []).length,
        ocrSource
      });

      // 4) (Optionnel) Upsert profil à la première validation
      await supabase.from('profiles').upsert({
        user_id: userId,
        email: session.user.email
      }, { onConflict: 'user_id' });

      // 5) Insert propre dans validations
      const { error } = await supabase
        .from('validations')
        .insert([{
          user_id: userId,
          ocr_result_id: null, // Pas d'OCR result séparé dans ce flow
          request_id: requestId,
          session_id: sessionId,
          document_type: documentType,
          validated_fields: normalized,            // <-- pas "data"
          user_corrections: {},                    // Corrections utilisateur (vide pour l'instant)
          contextual_answers: answers || {},       // Réponses aux questions contextuelles
          validation_status: 'validated',          // Status: draft, validated, submitted
          completion_stats: completionStats,
          source: ocrSource,                       // Source OCR
          validated_at: new Date().toISOString()
        }]);

      if (error) {
        throw new Error(error.message || 'Échec de l\'enregistrement.');
      }

      console.log('✅ Validation sauvegardée avec succès');

      // 6) Succès → feedback + suite
      setSuccess(true);
      setMsg('Données validées et sauvegardées avec succès !');
      
      // Nettoyage du sessionStorage après sauvegarde réussie
      setTimeout(() => {
        sessionStorage.removeItem('requestId');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('ocr_payload');
        
        // Option: rediriger vers paiement ou page de succès
        // navigate('/paiement?rid=' + requestId);
        navigate('/response?status=success&message=Données validées avec succès');
      }, 2000);

    } catch (e: any) {
      console.error('❌ Erreur sauvegarde validation:', e);
      setMsg(e?.message || 'Erreur inattendue lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // Ancien handler n8n (gardé en commentaire pour référence)
  const onValidateN8N = async () => {
    setSaving(true);
    setMsg(null);
    
    try {
      const payload = {
        requestId,
        sessionId,
        validatedData,
        answers: Object.entries(answers).map(([id, value]) => ({ id, value }))
      };
      
      console.log('📤 Envoi validation vers N8N:', payload);
      
      const response = await fetch('https://n8n.srv833062.hstgr.cloud/webhook/webhook/validate-data', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur validation (${response.status})`);
      }
      
      const data = await response.json();
      console.log('✅ Réponse validation N8N:', data);
      
      if (data.ok) {
        // Nettoyage du sessionStorage
        sessionStorage.removeItem('requestId');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('ocr_payload');
        
        // Redirection vers next ou page de succès
        if (data.next) {
          window.location.href = data.next;
        } else {
          navigate('/response?status=success&message=Données validées avec succès');
        }
      } else {
        throw new Error(data.message || 'Erreur lors de la validation');
      }
      
    } catch (error: any) {
      console.error('❌ Erreur validation:', error);
      setMsg(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  // Rendu des sections de données
  const renderDataSection = (sectionKey: string, sectionData: any) => {
    if (!sectionData || typeof sectionData !== 'object') return null;
    
    return (
      <div className="space-y-4">
        {Object.entries(sectionData).map(([key, value]) => {
          const fieldKey = `${sectionKey}.${key}`;
          const validationField = validationFields[fieldKey];
          
          return (
            <div key={fieldKey} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {validationField?.label || key}
                {validationField?.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={validatedData[fieldKey] || value || ''}
                onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
                  validationField?.isEmpty ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={validationField?.isEmpty ? 'Champ requis' : ''}
              />
              {validationField?.needsValidation && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  À vérifier
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Si pas de données OCR, afficher CTA retour upload
  if (!ocrPayload) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-brand-white">
          <Header hasBackground={true} />
          
          <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
            <div className="container mx-auto max-w-md px-4">
              <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="font-headline text-2xl font-bold text-brand-text-dark mb-4">
                  Données manquantes
                </h1>
                <p className="text-gray-600 font-body mb-6">
                  Aucune donnée OCR trouvée. Veuillez recommencer l'upload de votre document.
                </p>
                <button
                  onClick={() => navigate('/upload')}
                  className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                >
                  <Upload className="w-5 h-5" />
                  Revenir à l'upload
                </button>
              </div>
            </div>
          </main>
          
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  const tabs = [
    { key: 'employeur', label: 'Employeur' },
    { key: 'victime', label: 'Victime' },
    { key: 'accident', label: 'Accident' },
    { key: 'maladie', label: 'Maladie' },
    { key: 'interim', label: 'Intérim' },
    { key: 'temoin', label: 'Témoin' },
    { key: 'tiers', label: 'Tiers' }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />
        
        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-6xl px-4">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 text-brand-accent hover:text-brand-dark transition-colors duration-300 font-body mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'upload
              </button>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-accent bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-brand-accent" />
                </div>
                <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                  Validation des données
                </h1>
                <p className="text-gray-600 font-body">
                  Vérifiez et complétez les données extraites de votre document
                </p>
                
                {/* Stats de completion */}
                {completionStats && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-brand-light bg-opacity-30 rounded-full px-4 py-2">
                    <div className="w-4 h-4 bg-brand-accent rounded-full relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-green-500 transition-all duration-300"
                        style={{ width: `${completionStats.completionRate * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(completionStats.completionRate * 100)}% complété
                    </span>
                    <span className="text-xs text-gray-500">
                      ({completionStats.completedFields}/{completionStats.totalFields} champs)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Données extraites */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6">
                  <h2 className="font-headline text-xl font-bold text-brand-text-dark mb-6">
                    Données extraites
                  </h2>
                  
                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6 border-b">
                    {tabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-t-lg font-medium transition-all duration-300 ${
                          activeTab === tab.key
                            ? 'bg-brand-accent text-white border-b-2 border-brand-accent'
                            : 'text-gray-600 hover:text-brand-accent hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Contenu de l'onglet actif */}
                  <div className="min-h-[300px]">
                    {extractedData[activeTab] ? (
                      renderDataSection(activeTab, extractedData[activeTab])
                    ) : (
                      <div className="text-center text-gray-500 py-12">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée trouvée pour cette section</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions contextuelles */}
              <div className="space-y-6">
                {/* Questions */}
                {contextualQuestions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6">
                    <h3 className="font-headline text-lg font-bold text-brand-text-dark mb-4">
                      Questions contextuelles
                    </h3>
                    
                    <div className="space-y-4">
                      {contextualQuestions.map(question => (
                        <div key={question.id} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          
                          {question.type === 'boolean' ? (
                            <div className="flex gap-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value="true"
                                  checked={answers[question.id] === true}
                                  onChange={() => handleAnswerChange(question.id, true)}
                                  className="mr-2"
                                />
                                Oui
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value="false"
                                  checked={answers[question.id] === false}
                                  onChange={() => handleAnswerChange(question.id, false)}
                                  className="mr-2"
                                />
                                Non
                              </label>
                            </div>
                          ) : question.type === 'select' && question.options ? (
                            <select
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            >
                              <option value="">Sélectionner...</option>
                              {question.options.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <textarea
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                              rows={3}
                              placeholder="Votre réponse..."
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton de validation */}
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6">
                  <button
                    onClick={handleConfirm}
                    disabled={saving || success}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      success 
                        ? 'bg-green-600 text-white' 
                        : 'bg-brand-accent hover:bg-opacity-90 text-white'
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Données validées !
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Valider les données
                      </>
                    )}
                  </button>
                  
                  {msg && (
                    <div className={`mt-4 p-3 rounded-md text-sm border flex items-center gap-2 ${
                      success 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {success ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      {msg}
                    </div>
                  )}
                  
                  {success && (
                    <div className="mt-4 text-xs text-green-600 text-center">
                      <p>Redirection automatique dans quelques secondes...</p>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    <p>Session ID: {sessionId}</p>
                    <p>Request ID: {requestId}</p>
                  </div>
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