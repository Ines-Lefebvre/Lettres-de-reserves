/*
  # Correction de l'ambiguïté dans rpc_create_upload

  1. Corrections
    - Résolution de l'ambiguïté sur la colonne `request_id`
    - Amélioration de la gestion d'erreurs
    - Optimisation des requêtes

  2. Sécurité
    - Maintien du RLS
    - Vérification de l'authentification
*/

-- Supprimer l'ancienne version si elle existe
DROP FUNCTION IF EXISTS public.rpc_create_upload(text, text, bigint, text, text);

-- Créer la fonction corrigée
CREATE OR REPLACE FUNCTION public.rpc_create_upload(
  request_id text,
  filename text,
  filesize bigint,
  file_type text DEFAULT 'application/pdf',
  upload_status text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  upload_record record;
BEGIN
  -- Vérification de l'authentification
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Validation des paramètres obligatoires
  IF request_id IS NULL OR request_id = '' THEN
    RAISE EXCEPTION 'request_id est obligatoire';
  END IF;
  
  IF filename IS NULL OR filename = '' THEN
    RAISE EXCEPTION 'filename est obligatoire';
  END IF;

  -- Log de debug
  RAISE NOTICE 'rpc_create_upload: user_id=%, request_id=%, filename=%', 
    current_user_id, request_id, filename;

  -- Upsert dans la table uploads avec qualification explicite des colonnes
  INSERT INTO public.uploads (
    user_id,
    request_id,
    filename,
    filesize,
    file_type,
    upload_status,
    created_at
  )
  VALUES (
    current_user_id,
    request_id,
    filename,
    filesize,
    file_type,
    upload_status,
    now()
  )
  ON CONFLICT (request_id) 
  DO UPDATE SET
    filename = EXCLUDED.filename,
    filesize = EXCLUDED.filesize,
    file_type = EXCLUDED.file_type,
    upload_status = EXCLUDED.upload_status,
    created_at = EXCLUDED.created_at
  WHERE uploads.user_id = current_user_id
  RETURNING * INTO upload_record;

  -- Vérifier que l'enregistrement a été créé/mis à jour
  IF upload_record IS NULL THEN
    RAISE EXCEPTION 'Échec de création/mise à jour de l''upload';
  END IF;

  -- Retourner les informations de l'upload
  RETURN jsonb_build_object(
    'success', true,
    'upload_id', upload_record.id,
    'request_id', upload_record.request_id,
    'status', upload_record.upload_status,
    'message', 'Upload créé/mis à jour avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur rpc_create_upload: %', SQLERRM;
END;
$$;

-- Supprimer l'ancienne version de rpc_upsert_ocr_result si elle existe
DROP FUNCTION IF EXISTS public.rpc_upsert_ocr_result(text, text, jsonb, jsonb, jsonb, numeric);

-- Créer la fonction rpc_upsert_ocr_result corrigée
CREATE OR REPLACE FUNCTION public.rpc_upsert_ocr_result(
  request_id text,
  document_type text DEFAULT 'AT_NORMALE',
  extracted_fields jsonb DEFAULT '{}',
  validation_fields jsonb DEFAULT '{}',
  contextual_questions jsonb DEFAULT '[]',
  ocr_confidence numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  upload_record record;
  ocr_record record;
BEGIN
  -- Vérification de l'authentification
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Validation des paramètres
  IF request_id IS NULL OR request_id = '' THEN
    RAISE EXCEPTION 'request_id est obligatoire';
  END IF;

  -- Log de debug
  RAISE NOTICE 'rpc_upsert_ocr_result: user_id=%, request_id=%, document_type=%', 
    current_user_id, request_id, document_type;

  -- Récupérer l'upload correspondant avec qualification explicite
  SELECT u.* INTO upload_record
  FROM public.uploads u
  WHERE u.request_id = rpc_upsert_ocr_result.request_id 
    AND u.user_id = current_user_id;

  IF upload_record IS NULL THEN
    RAISE EXCEPTION 'Upload non trouvé pour request_id: %', request_id;
  END IF;

  -- Upsert dans ocr_results avec qualification explicite
  INSERT INTO public.ocr_results (
    upload_id,
    user_id,
    document_type,
    extracted_fields,
    validation_fields,
    contextual_questions,
    ocr_confidence,
    created_at
  )
  VALUES (
    upload_record.id,
    current_user_id,
    document_type,
    extracted_fields,
    validation_fields,
    contextual_questions,
    ocr_confidence,
    now()
  )
  ON CONFLICT (upload_id)
  DO UPDATE SET
    document_type = EXCLUDED.document_type,
    extracted_fields = EXCLUDED.extracted_fields,
    validation_fields = EXCLUDED.validation_fields,
    contextual_questions = EXCLUDED.contextual_questions,
    ocr_confidence = EXCLUDED.ocr_confidence,
    created_at = EXCLUDED.created_at
  WHERE ocr_results.user_id = current_user_id
  RETURNING * INTO ocr_record;

  -- Mettre à jour le statut de l'upload
  UPDATE public.uploads 
  SET 
    upload_status = 'completed',
    processed_at = now()
  WHERE id = upload_record.id 
    AND user_id = current_user_id;

  -- Retourner les informations
  RETURN jsonb_build_object(
    'success', true,
    'ocr_result_id', ocr_record.id,
    'upload_id', upload_record.id,
    'request_id', upload_record.request_id,
    'document_type', ocr_record.document_type,
    'message', 'Résultat OCR sauvegardé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur rpc_upsert_ocr_result: %', SQLERRM;
END;
$$;

-- Supprimer l'ancienne version de rpc_insert_validation si elle existe
DROP FUNCTION IF EXISTS public.rpc_insert_validation(text, jsonb, jsonb, jsonb, jsonb, text, text, text);

-- Créer la fonction rpc_insert_validation corrigée
CREATE OR REPLACE FUNCTION public.rpc_insert_validation(
  request_id text,
  validated_fields jsonb DEFAULT '{}',
  answers jsonb DEFAULT '[]',
  contextual_answers jsonb DEFAULT '{}',
  completion_stats jsonb DEFAULT '{}',
  document_type text DEFAULT NULL,
  session_id text DEFAULT NULL,
  source text DEFAULT 'mistral_ocr'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  ocr_result_record record;
  validation_record record;
BEGIN
  -- Vérification de l'authentification
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Validation des paramètres
  IF request_id IS NULL OR request_id = '' THEN
    RAISE EXCEPTION 'request_id est obligatoire';
  END IF;

  -- Log de debug
  RAISE NOTICE 'rpc_insert_validation: user_id=%, request_id=%, source=%', 
    current_user_id, request_id, source;

  -- Récupérer l'ocr_result correspondant avec qualification explicite
  SELECT ocr.* INTO ocr_result_record
  FROM public.ocr_results ocr
  INNER JOIN public.uploads u ON u.id = ocr.upload_id
  WHERE u.request_id = rpc_insert_validation.request_id 
    AND ocr.user_id = current_user_id;

  IF ocr_result_record IS NULL THEN
    RAISE EXCEPTION 'Résultat OCR non trouvé pour request_id: %', request_id;
  END IF;

  -- Insérer la validation avec qualification explicite
  INSERT INTO public.validations (
    ocr_result_id,
    user_id,
    validated_fields,
    answers,
    contextual_answers,
    completion_stats,
    validation_status,
    request_id,
    session_id,
    document_type,
    source,
    created_at
  )
  VALUES (
    ocr_result_record.id,
    current_user_id,
    validated_fields,
    answers,
    contextual_answers,
    completion_stats,
    'validated',
    request_id,
    session_id,
    COALESCE(document_type, ocr_result_record.document_type),
    source,
    now()
  )
  RETURNING * INTO validation_record;

  -- Retourner les informations
  RETURN jsonb_build_object(
    'success', true,
    'validation_id', validation_record.id,
    'ocr_result_id', ocr_result_record.id,
    'request_id', validation_record.request_id,
    'status', validation_record.validation_status,
    'message', 'Validation sauvegardée avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur rpc_insert_validation: %', SQLERRM;
END;
$$;

-- Accorder les droits d'exécution
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_ocr_result(text, text, jsonb, jsonb, jsonb, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_insert_validation(text, jsonb, jsonb, jsonb, jsonb, text, text, text) TO authenticated;

-- Commentaires
COMMENT ON FUNCTION public.rpc_create_upload IS 'Crée ou met à jour un upload avec gestion des ambiguïtés de colonnes';
COMMENT ON FUNCTION public.rpc_upsert_ocr_result IS 'Sauvegarde les résultats OCR avec qualification explicite des colonnes';
COMMENT ON FUNCTION public.rpc_insert_validation IS 'Insère une validation avec résolution automatique des relations';