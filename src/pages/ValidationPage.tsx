import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { dotObjectToNested, cleanData } from '../utils/normalize';
import { getCurrentRequestId } from '../utils/requestId';
import AuthGuard from '../components/AuthGuard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  CheckCircle, 
  AlertCircle, 
  Save, 
  FileText, 
  ArrowLeft,
  Loader2
} from 'lucide-react';

// Types
interface ExtractedData {
  employeur?: Record<string, any>;
  victime?: Record<string, any>;
  accident?: Record<string, any>;
  maladie?: Record<string, any>;
  interim?: Record<string, any>;
  temoin?: Record<string, any>;
  tiers?: Record<string, any>;
}

interface ValidationField {
  label: string;
  value: any;
  required: boolean;
  isEmpty: boolean;
  needsValidation: boolean;
}

interface ContextualQuestion {
  id: string;
  question: string;
  type: 'boolean' | 'text' | 'select';
  category: string;
  required?: boolean;
  options?: string[];
}

interface CompletionStats {
  completionRate: number;
  totalFields: number;
  completedFields: number;
  missingFields: string[];
}

interface OCRPayload {
  extractedData?: ExtractedData;
  validationFields?: Record<string, ValidationField>;
  contextualQuestions?: ContextualQuestion[];
  completionStats?: CompletionStats;
  documentType?: string;
  requestId?: string;
}

// Fonction utilitaire pour aplatir un objet
function flattenObject(obj: any, prefix = ''): Record<string, any> {
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
}

export default function ValidationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ocrPayload, setOcrPayload] = useState<OCRPayload>({});
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [validationFields, setValidationFields] = useState<Record<string, ValidationField>>({});
  const [contextualQuestions, setContextualQuestions] = useState<ContextualQuestion[]>([]);
  const [completionStats, setCompletionStats] = useState<CompletionStats>({
    completionRate: 0,
    totalFields: 0,
    completedFields: 0,
    missingFields: []
  });
  
  // États du formulaire
  const [validatedData, setValidatedData] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // États UI
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Récupération des paramètres
  const requestId = searchParams.get('requestId') || searchParams.get('request_id') || getCurrentRequestId();
  const isManualMode = searchParams.get('manual') === 'true';
  const finalRequestId = requestId || `manual_${Date.now()}`;

  // Définir EMPTY_PAYLOAD avec la structure complète
  const EMPTY_PAYLOAD: OCRPayload = {
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

  // Chargement des données
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 VALIDATION PAGE - Chargement des données:', {
          requestId: finalRequestId,
          isManualMode,
          searchParams: Object.fromEntries(searchParams.entries())
        });

        // Tentative de récupération du payload depuis sessionStorage
        const payloadKey = `validation:payload:${finalRequestId}`;
        const fallbackKey = 'ocr_payload';
        
        let storedPayload = sessionStorage.getItem(payloadKey) || sessionStorage.getItem(fallbackKey);
        
        console.log('🔍 VALIDATION PAGE - SessionStorage check:', {
          payloadKey,
          fallbackKey,
          hasPayload: !!storedPayload,
          payloadLength: storedPayload?.length || 0
        });

        if (storedPayload) {
          try {
            const rawPayload = JSON.parse(storedPayload);
            
            console.log('🔍 VALIDATION PAGE - Raw payload parsed:', {
              type: typeof rawPayload,
              keys: Object.keys(rawPayload || {}),
              hasPayloadProperty: !!(rawPayload?.payload)
            });
            
            // Extraction du payload imbriqué si présent
            let payload = rawPayload;
            if (rawPayload.payload && typeof rawPayload.payload === 'object') {
              console.log('🔧 Extraction du payload imbriqué détecté');
              payload = rawPayload.payload;
            }
            
            // Si payload vide ou invalide, utiliser EMPTY_PAYLOAD
            const finalPayload = (payload && Object.keys(payload).length > 0) ? payload : EMPTY_PAYLOAD;
            
            console.log('🔍 VALIDATION PAGE - Final payload:', {
              hasExtractedData: !!(finalPayload.extractedData),
              hasValidationFields: !!(finalPayload.validationFields),
              hasQuestions: !!(finalPayload.contextualQuestions),
              payloadKeys: Object.keys(finalPayload)
            });
            
            setOcrPayload(finalPayload);
            
            if (finalPayload.extractedData) {
              setExtractedData(finalPayload.extractedData);
              setValidatedData(flattenObject(finalPayload.extractedData));
            }
            
            if (finalPayload.validationFields) {
              setValidationFields(finalPayload.validationFields);
            }
            
            if (finalPayload.contextualQuestions) {
              setContextualQuestions(finalPayload.contextualQuestions);
            }
            
            if (finalPayload.completionStats) {
              setCompletionStats(finalPayload.completionStats);
            }
            
            setMsg('Données OCR chargées avec succès');
            
          } catch (error) {
            console.error('❌ VALIDATION PAGE - Erreur parsing payload:', error, {
              rawPayload: storedPayload?.substring(0, 200) + '...'
            });
            setOcrPayload(EMPTY_PAYLOAD);
            setMsg('Erreur de chargement des données. Mode saisie manuelle activé.');
          }
        } else {
          console.warn('⚠️ VALIDATION PAGE - Aucun payload trouvé, mode manuel');
          setOcrPayload(EMPTY_PAYLOAD);
          setMsg('Aucune donnée OCR trouvée. Veuillez compléter manuellement.');
        }

      } catch (error) {
        console.error('❌ VALIDATION PAGE - Erreur générale:', error);
        setError('Erreur lors du chargement des données');
        setOcrPayload(EMPTY_PAYLOAD);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [finalRequestId, isManualMode, searchParams]);

  // Gestion des changements de champs
  const handleFieldChange = (fieldKey: string, value: any) => {
    setValidatedData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Gestion des réponses aux questions contextuelles
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Confirmation et sauvegarde
  const handleConfirm = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }

      const userId = session.user.id;

      // Transformation des données en format nested
      const nestedData = dotObjectToNested(validatedData);
      const cleanedData = cleanData(nestedData);

      console.log('💾 VALIDATION PAGE - Sauvegarde:', {
        userId,
        requestId: finalRequestId,
        dataKeys: Object.keys(cleanedData),
        answersCount: Object.keys(answers).length
      });

      // Appel RPC pour créer la validation
      const { data: validationData, error: validationError } = await supabase
        .rpc('rpc_create_validation', {
          p_request_id: finalRequestId,
          p_validated_fields: cleanedData,
          p_contextual_answers: answers,
          p_completion_stats: completionStats,
          p_document_type: ocrPayload.documentType || 'AT_NORMALE'
        });

      if (validationError) {
        console.error('❌ VALIDATION PAGE - Erreur RPC:', validationError);
        throw new Error(`Erreur lors de la sauvegarde: ${validationError.message}`);
      }

      console.log('✅ VALIDATION PAGE - Validation créée:', validationData);
      setSuccess('Données validées et sauvegardées avec succès');

      // Redirection après succès
      setTimeout(() => {
        navigate('/upload');
      }, 2000);

    } catch (error: any) {
      console.error('❌ VALIDATION PAGE - Erreur confirmation:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Rendu d'une section de données
  const renderDataSection = (title: string, data: Record<string, any>) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">Aucune donnée disponible</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleFieldChange(`${title.toLowerCase()}.${key}`, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                placeholder={`Saisir ${key.replace(/_/g, ' ')}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // État de chargement
  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-brand-white">
          <Header hasBackground={true} />
          <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-brand-accent mx-auto mb-4" />
              <p className="text-brand-text-dark font-body">Chargement des données...</p>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-white">
        <Header hasBackground={true} />
        
        <main className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto max-w-6xl px-4">
            {/* En-tête */}
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
                <p className="text-gray-600 font-body mb-4">
                  Vérifiez et complétez les informations extraites du document
                </p>
                <div className="text-sm text-gray-500">
                  Request ID: {finalRequestId}
                  {isManualMode && <span className="ml-2 text-amber-600">(Mode manuel)</span>}
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-lg border border-green-200 bg-green-50 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-700">{success}</p>
              </div>
            )}

            {msg && (
              <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-blue-700">{msg}</p>
              </div>
            )}

            {/* Sections de données */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {extractedData.employeur && renderDataSection('Employeur', extractedData.employeur)}
              {extractedData.victime && renderDataSection('Victime', extractedData.victime)}
              {extractedData.accident && renderDataSection('Accident', extractedData.accident)}
              {extractedData.maladie && renderDataSection('Maladie', extractedData.maladie)}
            </div>

            {/* Questions contextuelles */}
            {contextualQuestions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h2 className="font-headline text-xl font-bold text-brand-text-dark mb-4">
                  Questions contextuelles
                </h2>
                <div className="space-y-4">
                  {contextualQuestions.map((question) => (
                    <div key={question.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              onChange={(e) => handleAnswerChange(question.id, e.target.value === 'true')}
                              className="mr-2"
                            />
                            Oui
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={question.id}
                              value="false"
                              onChange={(e) => handleAnswerChange(question.id, e.target.value === 'true')}
                              className="mr-2"
                            />
                            Non
                          </label>
                        </div>
                      ) : question.type === 'select' && question.options ? (
                        <select
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                        >
                          <option value="">Sélectionner...</option>
                          {question.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                          placeholder="Votre réponse..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistiques de completion */}
            {completionStats.totalFields > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h3 className="font-semibold text-gray-800 mb-3">Progression</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionStats.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {completionStats.completionRate}% ({completionStats.completedFields}/{completionStats.totalFields})
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="bg-brand-accent hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Confirmer et sauvegarder
                  </>
                )}
              </button>
            </div>

            {/* Debug info */}
            <details className="mt-8 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Informations de debug</summary>
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-1">
                <p><strong>Request ID:</strong> {finalRequestId}</p>
                <p><strong>Mode manuel:</strong> {isManualMode ? 'Oui' : 'Non'}</p>
                <p><strong>Données extraites:</strong> {Object.keys(extractedData).length} sections</p>
                <p><strong>Questions:</strong> {contextualQuestions.length}</p>
                <p><strong>Champs validés:</strong> {Object.keys(validatedData).length}</p>
              </div>
            </details>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}