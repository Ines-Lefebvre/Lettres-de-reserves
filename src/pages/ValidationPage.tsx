import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  User, 
  Building, 
  MapPin, 
  Eye,
  Save,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Star
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthGuard from '../components/AuthGuard';

// Types pour les données
interface ValidationData {
  success: boolean;
  sessionId: string;
  documentType: 'AT_NORMALE' | 'AT_INTERIM' | 'MALADIE_PROFESSIONNELLE';
  extractedData: {
    employeur: {
      nom_raison_sociale: string;
      siret: string;
      adresse: string;
      telephone?: string;
      email?: string;
    };
    victime: {
      nom: string;
      prenom: string;
      numero_secu: string;
      date_naissance: string;
      adresse?: string;
      telephone?: string;
    };
    accident?: {
      date: string;
      heure: string;
      lieu: string;
      description?: string;
    };
    maladie?: {
      date: string;
      lieu: string;
      description?: string;
    };
    interim?: {
      entreprise_travail_temporaire: string;
      adresse?: string;
    };
    temoin: {
      nom: string;
      adresse: string;
      telephone?: string;
    };
    tiers: {
      implique: boolean;
      nom?: string;
      adresse?: string;
    };
  };
  validationFields: Record<string, {
    label: string;
    value: string;
    required: boolean;
    isEmpty: boolean;
    needsValidation: boolean;
  }>;
  contextualQuestions: Array<{
    id: string;
    question: string;
    type: 'boolean' | 'text' | 'textarea';
    category: string;
    required?: boolean;
  }>;
  completionStats: {
    completionRate: number;
    requiredCompletionRate: number;
  };
}

interface QuestionResponse {
  [key: string]: boolean | string;
}

const ValidationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse>({});
  const [completionRate, setCompletionRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Données de démonstration
  const demoData: ValidationData = {
    success: true,
    sessionId: "validation_123456_abc",
    documentType: "AT_NORMALE",
    extractedData: {
      employeur: {
        nom_raison_sociale: "ACME Corporation",
        siret: "12345678901234",
        adresse: "123 Rue de la Paix, 75001 Paris",
        telephone: "01 23 45 67 89",
        email: "contact@acme-corp.fr"
      },
      victime: {
        nom: "MARTIN",
        prenom: "Jean",
        numero_secu: "123456789012345",
        date_naissance: "1985-03-15",
        adresse: "456 Avenue des Champs, 75008 Paris",
        telephone: "06 12 34 56 78"
      },
      accident: {
        date: "2024-01-15",
        heure: "14:30",
        lieu: "Atelier de production",
        description: "Chute d'une échelle lors de maintenance"
      },
      temoin: {
        nom: "DUPONT Pierre",
        adresse: "789 Boulevard Saint-Germain, 75007 Paris",
        telephone: "06 98 76 54 32"
      },
      tiers: {
        implique: false,
        nom: "",
        adresse: ""
      }
    },
    validationFields: {
      "employeur.nom_raison_sociale": {
        label: "Raison sociale employeur",
        value: "ACME Corporation",
        required: true,
        isEmpty: false,
        needsValidation: false
      },
      "employeur.siret": {
        label: "SIRET",
        value: "12345678901234",
        required: true,
        isEmpty: false,
        needsValidation: true
      },
      "victime.nom": {
        label: "Nom de la victime",
        value: "MARTIN",
        required: true,
        isEmpty: false,
        needsValidation: false
      },
      "victime.numero_secu": {
        label: "Numéro de sécurité sociale",
        value: "123456789012345",
        required: true,
        isEmpty: false,
        needsValidation: true
      }
    },
    contextualQuestions: [
      {
        id: "hors_horaires_1",
        question: "L'accident s'est-il produit en dehors des heures de travail ?",
        type: "boolean",
        category: "hors_horaires",
        required: true
      },
      {
        id: "hors_lieu_1",
        question: "L'accident s'est-il produit en dehors du lieu de travail habituel ?",
        type: "boolean",
        category: "hors_lieu"
      },
      {
        id: "tiers_responsable_1",
        question: "Un tiers est-il responsable de l'accident ?",
        type: "boolean",
        category: "tiers_responsable"
      },
      {
        id: "tiers_details",
        question: "Si oui, précisez les détails du tiers responsable :",
        type: "textarea",
        category: "tiers_responsable"
      },
      {
        id: "pathologie_preexistante",
        question: "La victime avait-elle des pathologies préexistantes ?",
        type: "boolean",
        category: "pathologies"
      },
      {
        id: "enquete_interne",
        question: "Une enquête interne a-t-elle été menée ?",
        type: "boolean",
        category: "enquete"
      },
      {
        id: "commentaire_libre",
        question: "Commentaires ou observations particulières :",
        type: "textarea",
        category: "commentaires"
      }
    ],
    completionStats: {
      completionRate: 75,
      requiredCompletionRate: 90
    }
  };

  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => {
      setValidationData(demoData);
      setFormData(demoData.extractedData);
      setCompletionRate(demoData.completionStats.completionRate);
      
      // Charger les données sauvegardées localement
      const savedData = localStorage.getItem(`validation_${demoData.sessionId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData(parsed.formData || demoData.extractedData);
        setQuestionResponses(parsed.questionResponses || {});
      }
      
      setIsLoading(false);
    }, 1000);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!validationData || isLoading) return;
    
    setHasUnsavedChanges(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const dataToSave = {
        formData,
        questionResponses,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(`validation_${validationData.sessionId}`, JSON.stringify(dataToSave));
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, questionResponses, validationData, isLoading]);

  // Calcul du taux de completion
  useEffect(() => {
    if (!validationData) return;
    
    const requiredFields = Object.entries(validationData.validationFields)
      .filter(([_, field]) => field.required);
    
    const completedFields = requiredFields.filter(([key, _]) => {
      const value = getNestedValue(formData, key);
      return value && value.toString().trim() !== '';
    });
    
    const requiredQuestions = validationData.contextualQuestions
      .filter(q => q.required);
    
    const answeredQuestions = requiredQuestions.filter(q => 
      questionResponses[q.id] !== undefined && questionResponses[q.id] !== ''
    );
    
    const totalRequired = requiredFields.length + requiredQuestions.length;
    const totalCompleted = completedFields.length + answeredQuestions.length;
    
    const newRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;
    setCompletionRate(newRate);
  }, [formData, questionResponses, validationData]);

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  const handleFieldChange = (path: string, value: string) => {
    const newFormData = { ...formData };
    setNestedValue(newFormData, path, value);
    setFormData(newFormData);
  };

  const handleQuestionResponse = (questionId: string, response: boolean | string) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  // Navigation intelligente
  const handleNext = () => {
    if (activeTab === 0) {
      // Dans l'onglet "Données Extraites"
      if (activeSubTab < dataSubTabs.length - 1) {
        // Passer au sous-onglet suivant
        setActiveSubTab(activeSubTab + 1);
      } else {
        // Dernier sous-onglet, passer à l'onglet principal suivant
        setActiveTab(1);
        setActiveSubTab(0);
      }
    } else if (activeTab < tabs.length - 1) {
      // Autres onglets principaux
      setActiveTab(activeTab + 1);
    }
  };

  const handlePrevious = () => {
    if (activeTab === 0) {
      // Dans l'onglet "Données Extraites"
      if (activeSubTab > 0) {
        // Revenir au sous-onglet précédent
        setActiveSubTab(activeSubTab - 1);
      }
      // Si on est au premier sous-onglet, on ne peut pas aller plus loin
    } else if (activeTab === 1) {
      // Depuis "Questions", revenir au dernier sous-onglet de "Données"
      setActiveTab(0);
      setActiveSubTab(dataSubTabs.length - 1);
    } else if (activeTab > 0) {
      // Autres onglets principaux
      setActiveTab(activeTab - 1);
    }
  };

  const canGoNext = () => {
    if (activeTab === 0) {
      // Dans "Données Extraites", on peut toujours avancer
      return true;
    } else if (activeTab < tabs.length - 1) {
      // Autres onglets (sauf le dernier)
      return true;
    }
    return false;
  };

  const canGoPrevious = () => {
    if (activeTab === 0) {
      // Dans "Données Extraites", on peut reculer si pas au premier sous-onglet
      return activeSubTab > 0;
    } else if (activeTab > 0) {
      // Autres onglets
      return true;
    }
    return false;
  };

  const validateField = (path: string, value: string): boolean => {
    if (path.includes('siret')) {
      return /^\d{14}$/.test(value);
    }
    if (path.includes('numero_secu')) {
      return /^\d{15}$/.test(value);
    }
    if (path.includes('email')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (path.includes('date')) {
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }
    return true;
  };

  const getFieldStatus = (path: string, value: string, field: any) => {
    if (!value || value.trim() === '') {
      return field.required ? 'error' : 'empty';
    }
    if (!validateField(path, value)) {
      return 'invalid';
    }
    return 'valid';
  };

  const handleValidateAndContinue = () => {
    if (!validationData) return;
    
    const outputData = {
      sessionId: validationData.sessionId,
      documentType: validationData.documentType,
      validatedData: formData,
      questionResponses,
      validationStats: {
        fieldsModified: [], // À implémenter si nécessaire
        completionRate,
        userValidated: true
      },
      readyForPayment: completionRate >= validationData.completionStats.requiredCompletionRate
    };
    
    console.log('Données validées:', outputData);
    
    // Rediriger vers la page de paiement ou suivante
    navigate('/payment', { 
      state: { validationData: outputData }
    });
  };

  const tabs = [
    { id: 'data', label: 'Données Extraites', icon: FileText },
    { id: 'questions', label: 'Questions de Contestation', icon: AlertCircle },
    { id: 'summary', label: 'Récapitulatif', icon: Eye }
  ];

  const dataSubTabs = [
    { id: 'employeur', label: 'Employeur', icon: Building },
    { id: 'victime', label: 'Victime', icon: User },
    { 
      id: validationData?.documentType === 'MALADIE_PROFESSIONNELLE' ? 'maladie' : 'accident', 
      label: validationData?.documentType === 'MALADIE_PROFESSIONNELLE' ? 'Maladie' : 'Accident', 
      icon: MapPin 
    },
    ...(validationData?.documentType === 'AT_INTERIM' ? [{ id: 'interim', label: 'Intérim', icon: Building }] : []),
    { id: 'temoin', label: 'Témoin', icon: User },
    { id: 'tiers', label: 'Tiers', icon: User }
  ];

  const questionCategories = [
    { id: 'hors_horaires', label: 'Hors horaires de travail' },
    { id: 'hors_lieu', label: 'Hors lieu de travail' },
    { id: 'tiers_responsable', label: 'Tiers responsable' },
    { id: 'pathologies', label: 'Pathologies préexistantes' },
    { id: 'enquete', label: 'Enquête interne' },
    { id: 'commentaires', label: 'Commentaires' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Header hasBackground={true} />
        <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
            <p className="text-text-primary font-body">Chargement des données...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!validationData) {
    return (
      <div className="min-h-screen bg-surface">
        <Header hasBackground={true} />
        <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text-primary mb-4">Erreur</h1>
            <p className="text-text-muted mb-6">Aucune donnée de validation trouvée</p>
            <button
              onClick={() => navigate('/')}
              className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-300"
            >
              Retour à l'accueil
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderField = (path: string, field: any, type: string = 'text') => {
    const value = getNestedValue(formData, path) || '';
    const status = getFieldStatus(path, value, field);
    
    const statusColors = {
      error: 'border-red-500 bg-red-50',
      invalid: 'border-red-500 bg-red-50',
      empty: 'border-gray-300 bg-gray-50',
      valid: 'border-green-500 bg-green-50'
    };
    
    const statusIcons = {
      error: <AlertCircle className="w-4 h-4 text-red-500" />,
      invalid: <AlertCircle className="w-4 h-4 text-red-500" />,
      empty: null,
      valid: <CheckCircle className="w-4 h-4 text-green-500" />
    };

    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold text-text-primary mb-2">
          {field.label}
          {field.required && <Star className="w-3 h-3 text-red-500 inline ml-1" />}
        </label>
        <div className="relative">
          {type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(path, e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 ${statusColors[status]}`}
              rows={3}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => handleFieldChange(path, e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 ${statusColors[status]}`}
            />
          )}
          {statusIcons[status] && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {statusIcons[status]}
            </div>
          )}
        </div>
        {status === 'invalid' && (
          <p className="text-red-500 text-xs mt-1">Format invalide</p>
        )}
        {status === 'error' && field.required && (
          <p className="text-red-500 text-xs mt-1">Ce champ est obligatoire</p>
        )}
      </div>
    );
  };

  const renderDataTab = () => {
    const currentSubTab = dataSubTabs[activeSubTab];
    
    return (
      <div>
        {/* Sub-tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {dataSubTabs.map((subTab, index) => {
              const Icon = subTab.icon;
              return (
                <button
                  key={subTab.id}
                  onClick={() => setActiveSubTab(index)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeSubTab === index
                      ? 'border-secondary text-secondary'
                      : 'border-transparent text-text-muted hover:text-text-primary hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {subTab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {currentSubTab.id === 'employeur' && (
            <>
              {renderField('employeur.nom_raison_sociale', { label: 'Raison sociale', required: true })}
              {renderField('employeur.siret', { label: 'SIRET', required: true })}
              {renderField('employeur.adresse', { label: 'Adresse', required: true }, 'textarea')}
              {renderField('employeur.telephone', { label: 'Téléphone', required: false }, 'tel')}
              {renderField('employeur.email', { label: 'Email', required: false }, 'email')}
            </>
          )}
          
          {currentSubTab.id === 'victime' && (
            <>
              {renderField('victime.nom', { label: 'Nom', required: true })}
              {renderField('victime.prenom', { label: 'Prénom', required: true })}
              {renderField('victime.numero_secu', { label: 'Numéro de sécurité sociale', required: true })}
              {renderField('victime.date_naissance', { label: 'Date de naissance', required: true }, 'date')}
              {renderField('victime.adresse', { label: 'Adresse', required: false }, 'textarea')}
              {renderField('victime.telephone', { label: 'Téléphone', required: false }, 'tel')}
            </>
          )}
          
          {currentSubTab.id === 'accident' && validationData.documentType !== 'MALADIE_PROFESSIONNELLE' && (
            <>
              {renderField('accident.date', { label: 'Date de l\'accident', required: true }, 'date')}
              {renderField('accident.heure', { label: 'Heure de l\'accident', required: true }, 'time')}
              {renderField('accident.lieu', { label: 'Lieu de l\'accident', required: true })}
              {renderField('accident.description', { label: 'Description de l\'accident', required: false }, 'textarea')}
            </>
          )}
          
          {currentSubTab.id === 'maladie' && validationData.documentType === 'MALADIE_PROFESSIONNELLE' && (
            <>
              {renderField('maladie.date', { label: 'Date de première constatation', required: true }, 'date')}
              {renderField('maladie.lieu', { label: 'Lieu d\'exposition', required: true })}
              {renderField('maladie.description', { label: 'Description de la maladie', required: false }, 'textarea')}
            </>
          )}
          
          {currentSubTab.id === 'interim' && validationData.documentType === 'AT_INTERIM' && (
            <>
              {renderField('interim.entreprise_travail_temporaire', { label: 'Entreprise de travail temporaire', required: true })}
              {renderField('interim.adresse', { label: 'Adresse de l\'entreprise', required: false }, 'textarea')}
            </>
          )}
          
          {currentSubTab.id === 'temoin' && (
            <>
              {renderField('temoin.nom', { label: 'Nom du témoin', required: false })}
              {renderField('temoin.adresse', { label: 'Adresse du témoin', required: false }, 'textarea')}
              {renderField('temoin.telephone', { label: 'Téléphone du témoin', required: false }, 'tel')}
            </>
          )}
          
          {currentSubTab.id === 'tiers' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Tiers impliqué
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tiers_implique"
                      checked={formData.tiers?.implique === true}
                      onChange={() => handleFieldChange('tiers.implique', 'true')}
                      className="mr-2"
                    />
                    Oui
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tiers_implique"
                      checked={formData.tiers?.implique === false}
                      onChange={() => handleFieldChange('tiers.implique', 'false')}
                      className="mr-2"
                    />
                    Non
                  </label>
                </div>
              </div>
              
              {formData.tiers?.implique && (
                <>
                  {renderField('tiers.nom', { label: 'Nom du tiers', required: false })}
                  {renderField('tiers.adresse', { label: 'Adresse du tiers', required: false }, 'textarea')}
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionsTab = () => {
    return (
      <div className="space-y-8">
        {questionCategories.map(category => {
          const categoryQuestions = validationData.contextualQuestions.filter(
            q => q.category === category.id
          );
          
          if (categoryQuestions.length === 0) return null;
          
          return (
            <div key={category.id} className="bg-surface-muted rounded-lg p-6">
              <h3 className="font-headline text-lg font-semibold text-text-primary mb-4">
                {category.label}
              </h3>
              
              <div className="space-y-4">
                {categoryQuestions.map(question => (
                  <div key={question.id} className="bg-surface rounded-lg p-4">
                    <label className="block text-sm font-semibold text-text-primary mb-3">
                      {question.question}
                      {question.required && <Star className="w-3 h-3 text-red-500 inline ml-1" />}
                    </label>
                    
                    {question.type === 'boolean' && (
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={question.id}
                            checked={questionResponses[question.id] === true}
                            onChange={() => handleQuestionResponse(question.id, true)}
                            className="mr-2"
                          />
                          Oui
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={question.id}
                            checked={questionResponses[question.id] === false}
                            onChange={() => handleQuestionResponse(question.id, false)}
                            className="mr-2"
                          />
                          Non
                        </label>
                      </div>
                    )}
                    
                    {question.type === 'text' && (
                      <input
                        type="text"
                        value={questionResponses[question.id] as string || ''}
                        onChange={(e) => handleQuestionResponse(question.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50"
                      />
                    )}
                    
                    {question.type === 'textarea' && (
                      <textarea
                        value={questionResponses[question.id] as string || ''}
                        onChange={(e) => handleQuestionResponse(question.id, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSummaryTab = () => {
    const requiredFieldsCount = Object.values(validationData.validationFields).filter(f => f.required).length;
    const completedFieldsCount = Object.entries(validationData.validationFields)
      .filter(([key, field]) => field.required && getNestedValue(formData, key))
      .length;
    
    const requiredQuestionsCount = validationData.contextualQuestions.filter(q => q.required).length;
    const answeredQuestionsCount = validationData.contextualQuestions
      .filter(q => q.required && questionResponses[q.id] !== undefined)
      .length;

    return (
      <div className="space-y-8">
        {/* Statistiques de completion */}
        <div className="bg-surface-muted rounded-lg p-6">
          <h3 className="font-headline text-lg font-semibold text-text-primary mb-4">
            Statistiques de completion
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary mb-1">
                {completionRate}%
              </div>
              <div className="text-text-muted text-sm">Completion globale</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-1">
                {completedFieldsCount}/{requiredFieldsCount}
              </div>
              <div className="text-text-muted text-sm">Champs obligatoires</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-1">
                {answeredQuestionsCount}/{requiredQuestionsCount}
              </div>
              <div className="text-text-muted text-sm">Questions obligatoires</div>
            </div>
          </div>
        </div>

        {/* Résumé des données */}
        <div className="bg-surface-muted rounded-lg p-6">
          <h3 className="font-headline text-lg font-semibold text-text-primary mb-4">
            Résumé des données validées
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-text-primary mb-2">Employeur</h4>
              <p className="text-text-muted">{formData.employeur?.nom_raison_sociale}</p>
              <p className="text-text-muted text-sm">{formData.employeur?.siret}</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-text-primary mb-2">Victime</h4>
              <p className="text-text-muted">{formData.victime?.prenom} {formData.victime?.nom}</p>
              <p className="text-text-muted text-sm">{formData.victime?.numero_secu}</p>
            </div>
          </div>
        </div>

        {/* Réponses aux questions */}
        <div className="bg-surface-muted rounded-lg p-6">
          <h3 className="font-headline text-lg font-semibold text-text-primary mb-4">
            Réponses aux questions contextuelles
          </h3>
          
          <div className="space-y-3">
            {Object.entries(questionResponses).map(([questionId, response]) => {
              const question = validationData.contextualQuestions.find(q => q.id === questionId);
              if (!question) return null;
              
              return (
                <div key={questionId} className="flex justify-between items-start">
                  <span className="text-text-muted text-sm flex-1 mr-4">
                    {question.question}
                  </span>
                  <span className="text-text-primary font-medium">
                    {typeof response === 'boolean' ? (response ? 'Oui' : 'Non') : response}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface">
        <Header hasBackground={true} />

        <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Modifications non sauvegardées</span>
                </div>
              )}
              
              {lastSaved && !hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-green-600">
                  <Save className="w-4 h-4" />
                  <span className="text-sm">
                    Sauvegardé à {lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Validation des données extraites
            </h1>
            <p className="text-text-muted font-body">
              Vérifiez et complétez les informations extraites automatiquement
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 bg-surface-muted rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-text-primary">
                Progression globale
              </span>
              <span className="text-sm text-text-muted">
                {completionRate}% / {validationData.completionStats.requiredCompletionRate}% requis
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  completionRate >= validationData.completionStats.requiredCompletionRate
                    ? 'bg-green-500'
                    : 'bg-secondary'
                }`}
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-surface rounded-lg shadow-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(index)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors duration-300 ${
                        activeTab === index
                          ? 'border-secondary text-secondary bg-secondary bg-opacity-5'
                          : 'border-transparent text-text-muted hover:text-text-primary hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 0 && renderDataTab()}
              {activeTab === 1 && renderQuestionsTab()}
              {activeTab === 2 && renderSummaryTab()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              {canGoPrevious() && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground rounded-lg font-semibold transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Précédent
                </button>
              )}
              
              {canGoNext() && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground hover:bg-opacity-90 rounded-lg font-semibold transition-all duration-300"
                >
                  {activeTab === 0 && activeSubTab < dataSubTabs.length - 1 ? 'Suivant' : 
                   activeTab === 0 && activeSubTab === dataSubTabs.length - 1 ? 'Valider et passer aux Questions' :
                   'Suivant'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeTab === tabs.length - 1 && (
              <button
                onClick={handleValidateAndContinue}
                disabled={completionRate < validationData.completionStats.requiredCompletionRate}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-300"
              >
                <CreditCard className="w-4 h-4" />
                Valider et Continuer vers le Paiement
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Aide :</p>
                <ul className="space-y-1">
                  <li>• Les champs marqués d'une étoile (*) sont obligatoires</li>
                  <li>• Vos modifications sont sauvegardées automatiquement</li>
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
};

export default ValidationPage;