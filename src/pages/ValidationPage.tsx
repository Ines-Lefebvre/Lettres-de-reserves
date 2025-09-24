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

interface ContextualForm {
  q1_out_of_hours: 'oui' | 'non' | '';
  q2_time_exact: string;
  q3_not_on_mission: 'oui' | 'non' | '';
  q4_prior_pain: 'oui' | 'non' | '';
  q4_prior_pain_duration: string;
  q5_med_docs: 'oui' | 'non' | '';
  q6_internal_inquiry: 'oui' | 'non' | '';
  q6_inquiry_conclusions: string;
  q7_summary_circumstances: string;
  q8_free_comment: string;
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
  
  // État du formulaire contextuel
  const [contextualForm, setContextualForm] = useState<ContextualForm>({
    q1_out_of_hours: '',
    q2_time_exact: '',
    q3_not_on_mission: '',
    q4_prior_pain: '',
    q4_prior_pain_duration: '',
    q5_med_docs: '',
    q6_internal_inquiry: '',
    q6_inquiry_conclusions: '',
    q7_summary_circumstances: '',
    q8_free_comment: ''
  });
  
  const [contextualErrors, setContextualErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Récupération des données depuis URL et sessionStorage
    const rid = searchParams.get('rid') || '';
    
    // 🔧 AUCUNE GÉNÉRATION - RÉCUPÉRATION UNIQUEMENT
    const finalRequestId = sessionStorage.getItem('current_request_id') || rid || 'error_no_request_id';
    
    console.log('🔍 VALIDATION PAGE - REQUEST_ID DEBUGGING:', {
      source: 'validation_load',
      requestId: finalRequestId,
      ridFromUrl: rid,
      timestamp: Date.now(),
      sessionStorageKeys: Object.keys(sessionStorage),
      hasOcrPayload: !!sessionStorage.getItem('ocr_payload')
    });
    
    const storedSessionId = sessionStorage.getItem('sessionId') || '';
    const storedPayload = sessionStorage.getItem('ocr_payload');
    
    console.log('🔍 VALIDATION PAGE - Session Storage:', {
      hasStoredPayload: !!storedPayload,
      storedSessionId,
      payloadLength: storedPayload?.length || 0
    });
    
    setRequestId(finalRequestId);
    setSessionId(storedSessionId);
    
    if (storedPayload) {
      try {
        const payload = JSON.parse(storedPayload);
        
        console.log('🔍 VALIDATION PAGE - Parsed Payload:', {
          hasExtractedData: !!payload.extractedData,
          hasValidationFields: !!payload.validationFields,
          hasContextualQuestions: !!payload.contextualQuestions,
          documentType: payload.documentType,
          requestIdInPayload: payload.requestId
        });
        
        // 🔧 VÉRIFICATION COHÉRENCE (PAS DE GÉNÉRATION)
        if (payload.requestId && payload.requestId !== finalRequestId) {
          console.warn('⚠️ REQUEST_ID INCOHÉRENT DANS PAYLOAD:', {
            payloadRequestId: payload.requestId,
            finalRequestId: finalRequestId
          });
          payload.requestId = finalRequestId;
          sessionStorage.setItem('ocr_payload', JSON.stringify(payload));
          console.log('🔧 PAYLOAD CORRIGÉ AVEC REQUEST_ID:', finalRequestId);
        }
        
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
          questionsCount: (payload.contextualQuestions || []).length,
          requestIdInPayload: payload.requestId
        });
        
      } catch (error) {
        console.error('❌ VALIDATION PAGE - Erreur parsing OCR payload:', error, {
          rawPayload: storedPayload?.substring(0, 200) + '...'
        });
        setMsg('Erreur lors du chargement des données OCR');
      }
    } else {
      console.error('❌ VALIDATION PAGE - Aucune donnée OCR trouvée:', {
        searchParams: Object.fromEntries(searchParams.entries()),
        sessionStorageKeys: Object.keys(sessionStorage),
        currentUrl: window.location.href
      });
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

  // Validation du formulaire contextuel
  const validateContextualForm = (form: ContextualForm): Record<string, string> => {
    const e: Record<string, string> = {};

    // Toggles requis
    if (!form.q1_out_of_hours) e.q1_out_of_hours = "Sélectionnez Oui ou Non.";
    if (!form.q3_not_on_mission) e.q3_not_on_mission = "Sélectionnez Oui ou Non.";
    if (!form.q4_prior_pain) e.q4_prior_pain = "Sélectionnez Oui ou Non.";
    if (!form.q5_med_docs) e.q5_med_docs = "Sélectionnez Oui ou Non.";
    if (!form.q6_internal_inquiry) e.q6_internal_inquiry = "Sélectionnez Oui ou Non.";

    // Dépendances
    if (form.q4_prior_pain === 'oui') {
      if (!form.q4_prior_pain_duration?.trim() || form.q4_prior_pain_duration.trim().length < 3) {
        e.q4_prior_pain_duration = "Veuillez préciser la durée (jours/semaines/mois).";
      }
    }
    if (form.q6_internal_inquiry === 'oui') {
      if (!form.q6_inquiry_conclusions?.trim() || form.q6_inquiry_conclusions.trim().length < 10) {
        e.q6_inquiry_conclusions = "Veuillez résumer les conclusions principales de l'enquête.";
      }
    }

    return e;
  };

  // Gestion des changements dans le formulaire contextuel
  const handleContextualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setContextualForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Si on change un parent toggle de "oui" à "non", vider le champ dépendant
      if (name === 'q4_prior_pain' && value === 'non') {
        newForm.q4_prior_pain_duration = '';
      }
      if (name === 'q6_internal_inquiry' && value === 'non') {
        newForm.q6_inquiry_conclusions = '';
      }
      
      return newForm;
    });
    
    // Recalculer les erreurs immédiatement
    setTimeout(() => {
      const newForm = { ...contextualForm, [name]: value };
      if (name === 'q4_prior_pain' && value === 'non') {
        newForm.q4_prior_pain_duration = '';
      }
      if (name === 'q6_internal_inquiry' && value === 'non') {
        newForm.q6_inquiry_conclusions = '';
      }
      setContextualErrors(validateContextualForm(newForm));
    }, 0);
  };

  // Vérifier si le formulaire contextuel est valide
  const isContextualFormValid = Object.keys(contextualErrors).length === 0;

  // Sauvegarde directe dans Supabase
  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validation finale du formulaire contextuel
    const finalErrors = validateContextualForm(contextualForm);
    setContextualErrors(finalErrors);
    
    if (Object.keys(finalErrors).length > 0) {
      // Scroll vers la première erreur
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setSaving(true);
      setMsg(null);
      setSuccess(false);

      // 1) Vérification session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expirée. Reconnectez-vous.');

      // 2) RÉCUPÉRATION REQUEST_ID (AUCUNE GÉNÉRATION)
      const finalRequestId = sessionStorage.getItem('current_request_id') || '';
      const sessionId = sessionStorage.getItem('sessionId') || '';
      
      if (!finalRequestId || finalRequestId === 'error_no_request_id') {
        throw new Error('Request ID introuvable ou invalide.');
      }
      
      console.log('REQUEST_ID DEBUGGING:', {
        source: 'validation_save',
        requestId: finalRequestId,
        timestamp: Date.now()
      });

      const payload = JSON.parse(sessionStorage.getItem('ocr_payload') || '{}');
      const documentType = payload?.documentType ?? null;
      const completionStats = payload?.completionStats ?? {};

      // 3) Normalisation des données
      const normalized = dotObjectToNested(validatedData);
      
      // Ajouter les réponses contextuelles
      const contextualAnswers = Object.entries(contextualForm)
        .filter(([key, value]) => value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);

      // 4) Insérer la validation (la RPC résout elle-même ocr_result_id)
      const { error: validationError } = await supabase.rpc('rpc_insert_validation', {
        p_request_id: finalRequestId,
        p_validated_fields: normalized,
        p_answers: answers || [],
        p_contextual_answers: contextualAnswers,
        p_completion_stats: completionStats,
        p_document_type: documentType,
        p_session_id: sessionId,
        p_source: 'mistral_ocr'
      });
      
      if (validationError) {
        console.error('❌ Erreur RPC validation:', validationError);
        throw new Error(`Erreur validation: ${validationError.message}`);
      }

      setSuccess(true);
      setMsg('Données validées et sauvegardées avec succès !');
      console.log('✅ Validation sauvegardée via RPC avec succès');
      
      // Nettoyage du sessionStorage après sauvegarde réussie
      setTimeout(() => {
        sessionStorage.removeItem('current_request_id');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('ocr_payload');
        
        navigate('/response?status=success&message=Données validées avec succès');
      }, 2000);

    } catch (e: any) {
      console.error('❌ Erreur sauvegarde validation:', e);
      setMsg(e?.message || 'Erreur inattendue.');
    } finally {
      setSaving(false);
    }
  };

  // Recalculer les erreurs à chaque changement
  React.useEffect(() => {
    setContextualErrors(validateContextualForm(contextualForm));
  }, [contextualForm]);

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

                {/* Nouveau panneau Questions contextuelles */}
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6">
                  <h3 className="font-headline text-lg font-bold text-brand-text-dark mb-6">
                    Questions contextuelles obligatoires
                  </h3>
                  
                  <form onSubmit={handleConfirm} className="space-y-6">
                    {/* Q1 - Hors horaires */}
                    <fieldset id="q1_out_of_hours" className="space-y-2">
                      <legend className="font-medium text-gray-700">
                        L'accident s'est-il produit en dehors des heures de travail prévues au planning ?
                        <span className="text-red-500 ml-1">*</span>
                      </legend>
                      <div className="flex gap-6">
                        <label htmlFor="q1_out_of_hours-yes" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q1_out_of_hours-yes" 
                            name="q1_out_of_hours" 
                            value="oui"
                            checked={contextualForm.q1_out_of_hours === 'oui'}
                            aria-invalid={!!contextualErrors.q1_out_of_hours}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Oui
                        </label>
                        <label htmlFor="q1_out_of_hours-no" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q1_out_of_hours-no" 
                            name="q1_out_of_hours" 
                            value="non"
                            checked={contextualForm.q1_out_of_hours === 'non'}
                            aria-invalid={!!contextualErrors.q1_out_of_hours}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Non
                        </label>
                      </div>
                      {contextualErrors.q1_out_of_hours && (
                        <p className="text-sm text-red-600 mt-1" data-error="true">
                          {contextualErrors.q1_out_of_hours}
                        </p>
                      )}
                    </fieldset>

                    {/* Q2 - Heure exacte */}
                    <div className="space-y-2">
                      <label htmlFor="q2_time_exact" className="block font-medium text-gray-700">
                        À quelle heure exacte l'accident s'est-il produit ?
                      </label>
                      <textarea
                        id="q2_time_exact"
                        name="q2_time_exact"
                        value={contextualForm.q2_time_exact}
                        onChange={handleContextualChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                        rows={2}
                        placeholder="Ex: 14h30, en fin de pause déjeuner..."
                      />
                    </div>

                    {/* Q3 - Pas en mission */}
                    <fieldset id="q3_not_on_mission" className="space-y-2">
                      <legend className="font-medium text-gray-700">
                        Disposez-vous d'éléments prouvant que le salarié n'était pas en mission ou astreinte à ce moment-là ?
                        <span className="text-red-500 ml-1">*</span>
                      </legend>
                      <div className="flex gap-6">
                        <label htmlFor="q3_not_on_mission-yes" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q3_not_on_mission-yes" 
                            name="q3_not_on_mission" 
                            value="oui"
                            checked={contextualForm.q3_not_on_mission === 'oui'}
                            aria-invalid={!!contextualErrors.q3_not_on_mission}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Oui
                        </label>
                        <label htmlFor="q3_not_on_mission-no" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q3_not_on_mission-no" 
                            name="q3_not_on_mission" 
                            value="non"
                            checked={contextualForm.q3_not_on_mission === 'non'}
                            aria-invalid={!!contextualErrors.q3_not_on_mission}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Non
                        </label>
                      </div>
                      {contextualErrors.q3_not_on_mission && (
                        <p className="text-sm text-red-600 mt-1" data-error="true">
                          {contextualErrors.q3_not_on_mission}
                        </p>
                      )}
                    </fieldset>

                    {/* Q4 - Douleurs antérieures */}
                    <fieldset id="q4_prior_pain" className="space-y-2">
                      <legend className="font-medium text-gray-700">
                        Le salarié se plaignait-il déjà de douleurs ou d'un problème de santé avant l'accident ?
                        <span className="text-red-500 ml-1">*</span>
                      </legend>
                      <div className="flex gap-6">
                        <label htmlFor="q4_prior_pain-yes" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q4_prior_pain-yes" 
                            name="q4_prior_pain" 
                            value="oui"
                            checked={contextualForm.q4_prior_pain === 'oui'}
                            aria-invalid={!!contextualErrors.q4_prior_pain}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Oui
                        </label>
                        <label htmlFor="q4_prior_pain-no" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q4_prior_pain-no" 
                            name="q4_prior_pain" 
                            value="non"
                            checked={contextualForm.q4_prior_pain === 'non'}
                            aria-invalid={!!contextualErrors.q4_prior_pain}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Non
                        </label>
                      </div>
                      {contextualErrors.q4_prior_pain && (
                        <p className="text-sm text-red-600 mt-1" data-error="true">
                          {contextualErrors.q4_prior_pain}
                        </p>
                      )}
                      
                      {/* Champ dépendant Q4 */}
                      {contextualForm.q4_prior_pain === 'oui' && (
                        <div className="mt-3 ml-4 space-y-2">
                          <label htmlFor="q4_prior_pain_duration" className="block font-medium text-gray-700">
                            Si oui, depuis combien de jours/semaines/mois ?
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <textarea
                            id="q4_prior_pain_duration"
                            name="q4_prior_pain_duration"
                            value={contextualForm.q4_prior_pain_duration}
                            onChange={handleContextualChange}
                            aria-invalid={!!contextualErrors.q4_prior_pain_duration}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            rows={2}
                            placeholder="Ex: 3 semaines, 2 mois..."
                          />
                          {contextualErrors.q4_prior_pain_duration && (
                            <p className="text-sm text-red-600 mt-1" data-error="true">
                              {contextualErrors.q4_prior_pain_duration}
                            </p>
                          )}
                        </div>
                      )}
                    </fieldset>

                    {/* Q5 - Documents médicaux */}
                    <fieldset id="q5_med_docs" className="space-y-2">
                      <legend className="font-medium text-gray-700">
                        Disposez-vous de documents médicaux ou témoignages attestant de ces plaintes antérieures ?
                        <span className="text-red-500 ml-1">*</span>
                      </legend>
                      <div className="flex gap-6">
                        <label htmlFor="q5_med_docs-yes" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q5_med_docs-yes" 
                            name="q5_med_docs" 
                            value="oui"
                            checked={contextualForm.q5_med_docs === 'oui'}
                            aria-invalid={!!contextualErrors.q5_med_docs}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Oui
                        </label>
                        <label htmlFor="q5_med_docs-no" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q5_med_docs-no" 
                            name="q5_med_docs" 
                            value="non"
                            checked={contextualForm.q5_med_docs === 'non'}
                            aria-invalid={!!contextualErrors.q5_med_docs}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Non
                        </label>
                      </div>
                      {contextualErrors.q5_med_docs && (
                        <p className="text-sm text-red-600 mt-1" data-error="true">
                          {contextualErrors.q5_med_docs}
                        </p>
                      )}
                    </fieldset>

                    {/* Q6 - Enquête interne */}
                    <fieldset id="q6_internal_inquiry" className="space-y-2">
                      <legend className="font-medium text-gray-700">
                        Une enquête interne a-t-elle été réalisée ?
                        <span className="text-red-500 ml-1">*</span>
                      </legend>
                      <div className="flex gap-6">
                        <label htmlFor="q6_internal_inquiry-yes" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q6_internal_inquiry-yes" 
                            name="q6_internal_inquiry" 
                            value="oui"
                            checked={contextualForm.q6_internal_inquiry === 'oui'}
                            aria-invalid={!!contextualErrors.q6_internal_inquiry}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Oui
                        </label>
                        <label htmlFor="q6_internal_inquiry-no" className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            id="q6_internal_inquiry-no" 
                            name="q6_internal_inquiry" 
                            value="non"
                            checked={contextualForm.q6_internal_inquiry === 'non'}
                            aria-invalid={!!contextualErrors.q6_internal_inquiry}
                            onChange={handleContextualChange}
                            className="text-brand-accent focus:ring-brand-accent"
                          />
                          Non
                        </label>
                      </div>
                      {contextualErrors.q6_internal_inquiry && (
                        <p className="text-sm text-red-600 mt-1" data-error="true">
                          {contextualErrors.q6_internal_inquiry}
                        </p>
                      )}
                      
                      {/* Champ dépendant Q6 */}
                      {contextualForm.q6_internal_inquiry === 'oui' && (
                        <div className="mt-3 ml-4 space-y-2">
                          <label htmlFor="q6_inquiry_conclusions" className="block font-medium text-gray-700">
                            Quelles conclusions principales en ressortent sur le lien avec le travail ?
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <textarea
                            id="q6_inquiry_conclusions"
                            name="q6_inquiry_conclusions"
                            value={contextualForm.q6_inquiry_conclusions}
                            onChange={handleContextualChange}
                            aria-invalid={!!contextualErrors.q6_inquiry_conclusions}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            rows={3}
                            placeholder="Résumez les conclusions principales..."
                          />
                          {contextualErrors.q6_inquiry_conclusions && (
                            <p className="text-sm text-red-600 mt-1" data-error="true">
                              {contextualErrors.q6_inquiry_conclusions}
                            </p>
                          )}
                        </div>
                      )}
                    </fieldset>

                    {/* Q7 - Résumé circonstances */}
                    <div className="space-y-2">
                      <label htmlFor="q7_summary_circumstances" className="block font-medium text-gray-700">
                        Pouvez-vous résumer les circonstances exactes ayant conduit à l'accident selon l'enquête ?
                      </label>
                      <textarea
                        id="q7_summary_circumstances"
                        name="q7_summary_circumstances"
                        value={contextualForm.q7_summary_circumstances}
                        onChange={handleContextualChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                        rows={4}
                        placeholder="Décrivez les circonstances exactes..."
                      />
                    </div>

                    {/* Q8 - Commentaire libre */}
                    <div className="space-y-2">
                      <label htmlFor="q8_free_comment" className="block font-medium text-gray-700">
                        Souhaitez-vous ajouter un commentaire libre avant la génération de la lettre ?
                      </label>
                      <textarea
                        id="q8_free_comment"
                        name="q8_free_comment"
                        value={contextualForm.q8_free_comment}
                        onChange={handleContextualChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                        rows={3}
                        placeholder="Commentaire libre..."
                      />
                    </div>

                    {/* Bouton de validation */}
                    <button
                      id="btn_validate_context"
                      type="submit"
                      disabled={!isContextualFormValid}
                      className={`w-full rounded-lg px-4 py-3 font-semibold shadow transition-all duration-300 flex items-center justify-center gap-2 ${
                        isContextualFormValid 
                          ? 'bg-brand-accent hover:bg-opacity-90 text-white' 
                          : 'bg-brand-accent text-white opacity-50 cursor-not-allowed'
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
                  </form>
                </div>

                {/* Bouton de validation */}
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6" style={{ display: 'none' }}>
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