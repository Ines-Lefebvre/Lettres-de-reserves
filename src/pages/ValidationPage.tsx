import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';
import { dotObjectToNested } from '../utils/normalize';
import { getCurrentRequestId } from '../utils/requestId';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, FileText, Save, AlertCircle, ArrowLeft, Upload, RefreshCw } from 'lucide-react';

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
  const [isManualMode, setIsManualMode] = useState(false);
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
    // Récupération du requestId depuis state, URL params ou localStorage
    const stateRequestId = window.history.state?.requestId;
    const urlRequestId = searchParams.get('requestId') || searchParams.get('rid') || '';
    const storedRequestId = getCurrentRequestId();
    const isManual = searchParams.get('manual') === 'true' || window.history.state?.manual === true;
    
    const finalRequestId = stateRequestId || urlRequestId || storedRequestId || 'error_no_request_id';
    
    console.log('🔍 VALIDATION PAGE - REQUEST_ID DEBUGGING:', {
      source: 'validation_load',
      requestId: finalRequestId,
      stateRequestId,
      urlRequestId,
      storedRequestId,
      isManual,
      timestamp: Date.now(),
      sessionStorageKeys: Object.keys(sessionStorage)
    });
    
    const storedSessionId = sessionStorage.getItem('sessionId') || '';
    
    // Récupération du payload depuis le nouveau format
    const payloadKey = `validation:payload:${finalRequestId}`;
    const storedPayload = sessionStorage.getItem(payloadKey) || sessionStorage.getItem('ocr_payload');
    
    console.log('🔍 VALIDATION PAGE - Session Storage:', {
      hasStoredPayload: !!storedPayload,
      storedSessionId,
      payloadLength: storedPayload?.length || 0,
      payloadKey,
      isManual
    });
    
    setRequestId(finalRequestId);
    setSessionId(storedSessionId);
    
    // Définir un objet EMPTY avec les mêmes clés que le formulaire
    const EMPTY_PAYLOAD = {
      extractedData: {
        employeur: {},
        victime: {},
        accident: {},
        maladie: {},
        interim: {},
        temoin: {},
        tiers: {}
      },
      validationFields: {},
      contextualQuestions: [],
      completionStats: {
        completionRate: 0,
        totalFields: 0,
        completedFields: 0,
        missingFields: []
      },
      documentType: null,
      requestId: finalRequestId
    };
    
    if (storedPayload) {
      try {
        const rawPayload = JSON.parse(storedPayload);

        // ✅ CORRECTION : Extraire le payload imbriqué si présent
        let payload = rawPayload;
        if (rawPayload && rawPayload.payload && typeof rawPayload.payload === 'object') {
          console.log('🔧 CORRECTION : Payload imbriqué détecté - extraction');
          payload = rawPayload.payload;
        }

        // Si payload vide ou invalide, utiliser EMPTY_PAYLOAD
        payload = (payload && Object.keys(payload).length > 0) ? payload : EMPTY_PAYLOAD;

        console.log('🔍 VALIDATION PAGE - Parsed Payload:', {
          hasExtractedData: !!payload.extractedData,
          hasValidationFields: !!payload.validationFields,
          hasContextualQuestions: !!payload.contextualQuestions,
          documentType: payload.documentType,
          requestIdInPayload: payload.requestId,
          isEmpty: Object.keys(rawPayload || {}).length === 0
        });

        // Vérification cohérence requestId
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

        // Afficher bannière si mode manuel ou payload vide
        if (isManual || Object.keys(rawPayload || {}).length === 0) {
          setMsg('Aucune donnée OCR trouvée. Veuillez compléter le formulaire manuellement.');
        }

        // Extraction des données
        if (payload.extractedData) {
          setExtractedData(payload.extractedData);
          // Initialiser validatedData avec les données extraites
          setValidatedData(flattenObject(payload.extractedData));
        } else {
          // Initialiser avec EMPTY_PAYLOAD.extractedData pour afficher les formulaires vides
          setExtractedData(EMPTY_PAYLOAD.extractedData);
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
        // En cas d'erreur de parsing, utiliser EMPTY_PAYLOAD
        setOcrPayload(EMPTY_PAYLOAD);
        setExtractedData(EMPTY_PAYLOAD.extractedData);
        setMsg('Aucune donnée OCR trouvée. Veuillez compléter le formulaire manuellement.');
      }
    } else {
      console.log('ℹ️ VALIDATION PAGE - Aucun payload trouvé, initialisation en mode manuel:', {
        searchParams: Object.fromEntries(searchParams.entries()),
        sessionStorageKeys: Object.keys(sessionStorage),
        currentUrl: window.location.href
      });
      // Aucun payload trouvé, utiliser EMPTY_PAYLOAD
      setOcrPayload(EMPTY_PAYLOAD);
      setExtractedData(EMPTY_PAYLOAD.extractedData);
      setMsg('Aucune donnée OCR trouvée. Veuillez compléter le formulaire manuellement.');
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

  // Rendu des sections de données
  const renderDataSection = (sectionKey: string, sectionData: any) => {
    // Si pas de données OCR, afficher des champs vides pour saisie manuelle
    if (!sectionData || typeof sectionData !== 'object' || Object.keys(sectionData).length === 0) {
      return renderManualFormSection(sectionKey);
    }
    
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

  // Rendu des champs de formulaire manuel par section
  const renderManualFormSection = (sectionKey: string) => {
    const fieldsBySection: Record<string, Array<{key: string, label: string, required?: boolean, type?: string}>> = {
      employeur: [
        { key: 'nom_raison_sociale', label: 'Nom / Raison sociale', required: true },
        { key: 'siret', label: 'SIRET', required: true },
        { key: 'adresse', label: 'Adresse complète', required: true },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'email', label: 'Email' },
        { key: 'activite', label: 'Activité principale' },
        { key: 'effectif', label: 'Effectif', type: 'number' }
      ],
      victime: [
        { key: 'nom', label: 'Nom', required: true },
        { key: 'prenom', label: 'Prénom', required: true },
        { key: 'date_naissance', label: 'Date de naissance', type: 'date' },
        { key: 'numero_secu', label: 'Numéro de sécurité sociale', required: true },
        { key: 'adresse', label: 'Adresse' },
        { key: 'poste', label: 'Poste occupé' },
        { key: 'anciennete', label: 'Ancienneté' },
        { key: 'qualification', label: 'Qualification professionnelle' }
      ],
      accident: [
        { key: 'date', label: 'Date de l\'accident', type: 'date', required: true },
        { key: 'heure', label: 'Heure de l\'accident', type: 'time', required: true },
        { key: 'lieu', label: 'Lieu de l\'accident', required: true },
        { key: 'description', label: 'Description des circonstances', required: true },
        { key: 'nature_lesion', label: 'Nature de la lésion' },
        { key: 'siege_lesion', label: 'Siège de la lésion' },
        { key: 'temoin', label: 'Témoin(s)' },
        { key: 'arret_travail', label: 'Arrêt de travail prescrit', type: 'select' }
      ],
      maladie: [
        { key: 'date_premiere_constatation', label: 'Date de première constatation médicale', type: 'date' },
        { key: 'nature_maladie', label: 'Nature de la maladie professionnelle' },
        { key: 'agent_nocif', label: 'Agent nocif présumé' },
        { key: 'duree_exposition', label: 'Durée d\'exposition' },
        { key: 'tableau_mp', label: 'Tableau des maladies professionnelles' }
      ],
      interim: [
        { key: 'entreprise_utilisatrice', label: 'Entreprise utilisatrice' },
        { key: 'siret_utilisatrice', label: 'SIRET entreprise utilisatrice' },
        { key: 'adresse_utilisatrice', label: 'Adresse entreprise utilisatrice' },
        { key: 'mission', label: 'Nature de la mission' }
      ],
      temoin: [
        { key: 'nom_temoin', label: 'Nom du témoin' },
        { key: 'prenom_temoin', label: 'Prénom du témoin' },
        { key: 'qualite_temoin', label: 'Qualité du témoin' },
        { key: 'adresse_temoin', label: 'Adresse du témoin' }
      ],
      tiers: [
        { key: 'nom_tiers', label: 'Nom du tiers responsable' },
        { key: 'assurance_tiers', label: 'Assurance du tiers' },
        { key: 'circonstances_tiers', label: 'Circonstances impliquant le tiers' }
      ]
    };

    const fields = fieldsBySection[sectionKey] || [];
    
    if (fields.length === 0) {
      return (
        <div className="text-center text-gray-500 py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Section optionnelle</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {fields.map((field) => {
          const fieldKey = `${sectionKey}.${field.key}`;
          
          return (
            <div key={fieldKey} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'select' && field.key === 'arret_travail' ? (
                <select
                  value={validatedData[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="oui">Oui</option>
                  <option value="non">Non</option>
                  <option value="inconnu">Inconnu</option>
                </select>
              ) : field.key === 'description' ? (
                <textarea
                  value={validatedData[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  rows={3}
                  placeholder={`Saisir ${field.label.toLowerCase()}`}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={validatedData[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  placeholder={`Saisir ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };


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
            {/* Bannière d'information si aucune donnée OCR */}
            {msg && !success && (
              <div className="mb-6 p-4 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{msg}</p>
              </div>
            )}

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
              <div className="lg:col-span-2 flex">
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6 flex-1 flex flex-col">
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
                  <div className="flex-1 min-h-[400px] overflow-y-auto">
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
              <div className="flex">
                <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-6 h-full flex flex-col">
                  <h3 className="font-headline text-lg font-bold text-brand-text-dark mb-6">
                    Questions contextuelles
                  </h3>
                  
                  <form onSubmit={handleConfirm} className="space-y-6 flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-6">
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
                    </div>

                    {/* Bouton de validation */}
                    <div className="pt-6 border-t border-gray-200">
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
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            {/* Messages de succès/erreur */}
            {msg && success && (
              <div className="mt-6 p-4 rounded-lg border bg-green-50 text-green-700 border-green-200 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{msg}</p>
                  <p className="text-sm mt-1 opacity-75">
                    Redirection automatique dans quelques secondes...
                  </p>
                </div>
              </div>
            )}
            
            {/* Debug info (masqué par défaut) */}
            <details className="mt-6 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Informations de debug</summary>
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-1">
                <p><strong>Session ID:</strong> {sessionId}</p>
                <p><strong>Request ID:</strong> {requestId}</p>
                <p><strong>État:</strong> {saving ? 'Sauvegarde...' : success ? 'Succès' : 'Prêt'}</p>
              </div>
            </details>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}