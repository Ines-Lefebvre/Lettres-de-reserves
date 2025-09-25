import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import AuthGuard from '../components/AuthGuard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Eye, 
  EyeOff, 
  FileText, 
  ArrowLeft,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

// Types pour la structure de données
interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
}

interface ValidationRecord {
  [key: string]: any;
}

interface FieldChecks {
  [fieldName: string]: boolean;
}

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
  fieldName: string;
  isValid: boolean;
  onValidityChange: (isValid: boolean) => void;
}

// Composant éditeur JSON
const JsonEditor: React.FC<JsonEditorProps> = ({ 
  value, 
  onChange, 
  fieldName, 
  isValid, 
  onValidityChange 
}) => {
  const [textValue, setTextValue] = useState('');
  const [localIsValid, setLocalIsValid] = useState(true);

  useEffect(() => {
    try {
      const formatted = JSON.stringify(value, null, 2);
      setTextValue(formatted);
      setLocalIsValid(true);
      onValidityChange(true);
    } catch (e) {
      setTextValue(String(value || '{}'));
      setLocalIsValid(false);
      onValidityChange(false);
    }
  }, [value, onValidityChange]);

  const handleChange = (newText: string) => {
    setTextValue(newText);
    
    try {
      const parsed = JSON.parse(newText);
      onChange(parsed);
      setLocalIsValid(true);
      onValidityChange(true);
    } catch (e) {
      setLocalIsValid(false);
      onValidityChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={textValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
          localIsValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
        }`}
        rows={6}
        placeholder={`JSON valide pour ${fieldName}`}
      />
      {!localIsValid && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          JSON invalide
        </p>
      )}
    </div>
  );
};

export default function ValidationPageFullDB() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [record, setRecord] = useState<ValidationRecord | null>(null);
  const [fieldChecks, setFieldChecks] = useState<FieldChecks>({});
  const [formData, setFormData] = useState<ValidationRecord>({});
  const [jsonValidities, setJsonValidities] = useState<Record<string, boolean>>({});
  const [hiddenFields, setHiddenFields] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ID du record à valider
  const recordId = searchParams.get('id');

  // Fonction pour humaniser les noms de colonnes
  const humanizeColumnName = (columnName: string): string => {
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fonction pour masquer les champs sensibles
  const maskSensitiveValue = (value: string): string => {
    if (!value || typeof value !== 'string') return value;
    if (value.length <= 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  };

  // Champs considérés comme sensibles
  const sensitiveFields = ['user_id', 'request_id', 'session_id', 'id', 'ocr_result_id'];

  // Chargement de la structure de la table et du record
  const loadData = useCallback(async () => {
    if (!recordId) {
      setError('Aucun dossier sélectionné. Veuillez fournir un ID de validation.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Introspection de la structure de la table
      const { data: columnsData, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default, udt_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'validations')
        .order('ordinal_position');

      if (columnsError) {
        throw new Error(`Erreur lors de l'introspection: ${columnsError.message}`);
      }

      if (!columnsData || columnsData.length === 0) {
        throw new Error('Impossible de récupérer la structure de la table validations');
      }

      setColumns(columnsData);

      // 2. Chargement du record
      const { data: recordData, error: recordError } = await supabase
        .from('validations')
        .select('*')
        .eq('id', recordId)
        .single();

      if (recordError) {
        if (recordError.code === 'PGRST116') {
          throw new Error('Dossier non trouvé ou accès non autorisé');
        }
        throw new Error(`Erreur lors du chargement: ${recordError.message}`);
      }

      setRecord(recordData);
      setFormData({ ...recordData });

      // Initialiser les validités JSON
      const initialJsonValidities: Record<string, boolean> = {};
      columnsData.forEach(col => {
        if (col.udt_name === 'jsonb') {
          initialJsonValidities[col.column_name] = true;
        }
      });
      setJsonValidities(initialJsonValidities);

      // Initialiser les champs masqués
      const initialHiddenFields: Record<string, boolean> = {};
      sensitiveFields.forEach(field => {
        initialHiddenFields[field] = true;
      });
      setHiddenFields(initialHiddenFields);

      console.log('✅ Données chargées:', {
        columns: columnsData.length,
        record: recordData.id,
        status: recordData.validation_status
      });

    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestion des changements de valeurs
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setIsDirty(true);
  };

  // Gestion des cases à cocher
  const handleCheckChange = (fieldName: string, checked: boolean) => {
    setFieldChecks(prev => ({
      ...prev,
      [fieldName]: checked
    }));
  };

  // Tout cocher
  const handleCheckAll = () => {
    const allChecks: FieldChecks = {};
    columns.forEach(col => {
      allChecks[col.column_name] = true;
    });
    setFieldChecks(allChecks);
  };

  // Vérifier si tous les champs sont cochés
  const allFieldsChecked = useMemo(() => {
    return columns.every(col => fieldChecks[col.column_name] === true);
  }, [columns, fieldChecks]);

  // Vérifier si tous les JSON sont valides
  const allJsonValid = useMemo(() => {
    return Object.values(jsonValidities).every(valid => valid);
  }, [jsonValidities]);

  // Sauvegarde
  const handleSave = async () => {
    if (!record || !allJsonValid) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('validations')
        .update(formData)
        .eq('id', record.id);

      if (updateError) {
        throw new Error(`Erreur lors de la sauvegarde: ${updateError.message}`);
      }

      setSuccess('Données sauvegardées avec succès');
      setIsDirty(false);
      
      // Recharger les données
      await loadData();

    } catch (err: any) {
      console.error('❌ Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Validation du dossier
  const handleValidate = async () => {
    if (!record || !allFieldsChecked || !allJsonValid) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updateData = {
        ...formData,
        validation_status: 'validated',
        validated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('validations')
        .update(updateData)
        .eq('id', record.id);

      if (updateError) {
        throw new Error(`Erreur lors de la validation: ${updateError.message}`);
      }

      setSuccess('Dossier validé avec succès');
      setIsDirty(false);
      
      // Recharger les données
      await loadData();

    } catch (err: any) {
      console.error('❌ Erreur validation:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setSaving(false);
    }
  };

  // Soumission du dossier
  const handleSubmit = async () => {
    if (!record || record.validation_status !== 'validated') return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('validations')
        .update({ validation_status: 'submitted' })
        .eq('id', record.id);

      if (updateError) {
        throw new Error(`Erreur lors de la soumission: ${updateError.message}`);
      }

      setSuccess('Dossier soumis avec succès');
      
      // Recharger les données
      await loadData();

    } catch (err: any) {
      console.error('❌ Erreur soumission:', err);
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSaving(false);
    }
  };

  // Rendu d'un champ selon son type
  const renderField = (column: ColumnInfo, value: any) => {
    const fieldName = column.column_name;
    const dataType = column.udt_name || column.data_type;
    const isReadOnly = ['id', 'created_at', 'validated_at'].includes(fieldName);
    const isSensitive = sensitiveFields.includes(fieldName);
    const isHidden = hiddenFields[fieldName];

    // Valeur à afficher
    let displayValue = value;
    if (isSensitive && isHidden && value) {
      displayValue = maskSensitiveValue(String(value));
    }

    // Rendu selon le type
    switch (dataType) {
      case 'jsonb':
        return (
          <JsonEditor
            value={value || {}}
            onChange={(newValue) => handleFieldChange(fieldName, newValue)}
            fieldName={fieldName}
            isValid={jsonValidities[fieldName] !== false}
            onValidityChange={(isValid) => 
              setJsonValidities(prev => ({ ...prev, [fieldName]: isValid }))
            }
          />
        );

      case 'timestamptz':
      case 'timestamp':
        return (
          <input
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value ? new Date(e.target.value).toISOString() : null)}
            readOnly={isReadOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
              isReadOnly ? 'bg-gray-50 text-gray-500' : ''
            }`}
          />
        );

      case 'int4':
      case 'int8':
      case 'numeric':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value ? Number(e.target.value) : null)}
            readOnly={isReadOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
              isReadOnly ? 'bg-gray-50 text-gray-500' : ''
            }`}
          />
        );

      case 'bool':
        return (
          <select
            value={value === null ? '' : String(value)}
            onChange={(e) => handleFieldChange(fieldName, e.target.value === '' ? null : e.target.value === 'true')}
            disabled={isReadOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
              isReadOnly ? 'bg-gray-50 text-gray-500' : ''
            }`}
          >
            <option value="">Non défini</option>
            <option value="true">Vrai</option>
            <option value="false">Faux</option>
          </select>
        );

      default:
        // Cas spécial pour validation_status
        if (fieldName === 'validation_status') {
          return (
            <select
              value={value || 'draft'}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            >
              <option value="draft">Brouillon</option>
              <option value="validated">Validé</option>
              <option value="submitted">Soumis</option>
            </select>
          );
        }

        // Input texte par défaut
        return (
          <div className="relative">
            <input
              type="text"
              value={displayValue || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value || null)}
              readOnly={isReadOnly || (isSensitive && isHidden)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
                isReadOnly ? 'bg-gray-50 text-gray-500' : ''
              } ${isSensitive && isHidden ? 'font-mono' : ''}`}
              placeholder={value === null || value === undefined ? 'Vide' : ''}
            />
            {isSensitive && (
              <button
                type="button"
                onClick={() => setHiddenFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        );
    }
  };

  // Badge de statut
  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      validated: { color: 'bg-green-100 text-green-800', label: 'Validé' },
      submitted: { color: 'bg-blue-100 text-blue-800', label: 'Soumis' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  // Gestion de la navigation avec données non sauvegardées
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-brand-white">
          <Header hasBackground={true} />
          <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
              <p className="text-brand-text-dark font-body">Chargement du dossier...</p>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  if (error && !record) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-brand-white">
          <Header hasBackground={true} />
          <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
            <div className="container mx-auto max-w-md px-4">
              <div className="bg-white rounded-lg shadow-xl border-2 border-red-300 p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="font-headline text-2xl font-bold text-red-800 mb-4">
                  Erreur de chargement
                </h1>
                <p className="text-red-700 font-body mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate('/upload')}
                    className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                  >
                    Retour à l'upload
                  </button>
                  <button
                    onClick={loadData}
                    className="border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
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
          <div className="container mx-auto max-w-7xl px-4">
            {/* En-tête */}
            <div className="mb-8">
              <button
                onClick={() => {
                  if (isDirty && !confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
                    return;
                  }
                  navigate('/upload');
                }}
                className="flex items-center gap-2 text-brand-accent hover:text-brand-dark transition-colors duration-300 font-body mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'upload
              </button>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-2">
                    Validation du dossier #{record?.id?.slice(-8) || 'N/A'}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-body">Statut :</span>
                    {getStatusBadge(record?.validation_status || 'draft')}
                    {isDirty && (
                      <span className="text-amber-600 text-sm font-medium">
                        • Modifications non sauvegardées
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    Progression : {Object.values(fieldChecks).filter(Boolean).length}/{columns.length}
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(Object.values(fieldChecks).filter(Boolean).length / columns.length) * 100}%` 
                      }}
                    />
                  </div>
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

            {/* Actions principales */}
            <div className="mb-8 bg-white rounded-lg shadow-lg border-2 border-brand-light p-6">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !allJsonValid}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>

                <button
                  onClick={handleCheckAll}
                  className="border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Tout cocher
                </button>

                <button
                  onClick={handleValidate}
                  disabled={saving || !allFieldsChecked || !allJsonValid || record?.validation_status !== 'draft'}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Valider le dossier
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={saving || record?.validation_status !== 'validated'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Soumettre
                </button>
              </div>

              {!allFieldsChecked && (
                <p className="mt-4 text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Tous les champs doivent être cochés pour valider le dossier
                </p>
              )}

              {!allJsonValid && (
                <p className="mt-4 text-sm text-red-600 flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Certains champs JSON contiennent des erreurs
                </p>
              )}
            </div>

            {/* Grille des champs */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-brand-light p-6">
              <h2 className="font-headline text-xl font-bold text-brand-text-dark mb-6">
                Champs du dossier
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {columns.map((column) => {
                  const fieldName = column.column_name;
                  const value = formData[fieldName];
                  const isChecked = fieldChecks[fieldName] || false;
                  const hasValue = value !== null && value !== undefined && value !== '';
                  
                  return (
                    <div key={fieldName} className="space-y-3 p-4 border border-gray-200 rounded-lg">
                      {/* En-tête du champ */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="font-medium text-gray-700">
                            {humanizeColumnName(fieldName)}
                          </label>
                          <span className="text-xs text-gray-500">
                            ({column.udt_name || column.data_type})
                          </span>
                          {hasValue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Rempli
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              À compléter
                            </span>
                          )}
                        </div>
                        
                        {/* Case à cocher */}
                        <button
                          onClick={() => handleCheckChange(fieldName, !isChecked)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            isChecked 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-gray-300 hover:border-brand-accent'
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Champ de saisie */}
                      <div>
                        {renderField(column, value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informations de debug */}
            <details className="mt-8 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700 font-medium">
                Informations techniques
              </summary>
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-1">
                <p><strong>ID du dossier :</strong> {record?.id}</p>
                <p><strong>Colonnes détectées :</strong> {columns.length}</p>
                <p><strong>Champs cochés :</strong> {Object.values(fieldChecks).filter(Boolean).length}</p>
                <p><strong>JSON valides :</strong> {Object.values(jsonValidities).filter(Boolean).length}/{Object.keys(jsonValidities).length}</p>
                <p><strong>Modifications non sauvegardées :</strong> {isDirty ? 'Oui' : 'Non'}</p>
              </div>
            </details>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}