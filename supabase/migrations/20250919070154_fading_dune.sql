/*
  # Migration complète pour l'enregistrement des données de validation

  Cette migration crée :
  1. Table validations (si pas déjà existante) avec colonnes optimisées
  2. Fonction RPC rpc_insert_validation pour insertion sécurisée
  3. Politiques RLS pour sécurité multi-utilisateurs
  4. Droits d'exécution pour les utilisateurs authentifiés

  ## Structure des données
  - validated_fields: données extraites et validées par l'utilisateur (jsonb)
  - answers: réponses aux questions contextuelles (jsonb array)
  - contextual_answers: réponses structurées par catégorie (jsonb)
  - completion_stats: statistiques de completion du formulaire (jsonb)
  
  ## Sécurité
  - RLS activé : chaque utilisateur ne voit que ses propres validations
  - Fonction RPC sécurisée : utilise auth.uid() automatiquement
*/

-- =====================================================
-- 1. CRÉATION/MISE À JOUR DE LA TABLE VALIDATIONS
-- =====================================================

-- Créer la table validations si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations obligatoires
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ocr_result_id uuid NOT NULL REFERENCES public.ocr_results(id) ON DELETE CASCADE,
  
  -- Identifiants de session/requête
  request_id text,
  session_id text,
  
  -- Données de validation (colonnes principales)
  validated_fields jsonb NOT NULL DEFAULT '{}',
  user_corrections jsonb DEFAULT '{}',
  contextual_answers jsonb DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '[]',
  
  -- Métadonnées
  document_type text,
  completion_stats jsonb NOT NULL DEFAULT '{}',
  source text,
  
  -- Statut et timestamps
  validation_status text NOT NULL DEFAULT 'draft' CHECK (validation_status IN ('draft', 'validated', 'submitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  confirmed_at timestamptz
);

-- Ajouter les colonnes manquantes si la table existait déjà
DO $$
BEGIN
  -- Vérifier et ajouter request_id si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN request_id text;
  END IF;
  
  -- Vérifier et ajouter session_id si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN session_id text;
  END IF;
  
  -- Vérifier et ajouter document_type si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN document_type text;
  END IF;
  
  -- Vérifier et ajouter answers si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'answers'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN answers jsonb NOT NULL DEFAULT '[]';
  END IF;
  
  -- Vérifier et ajouter completion_stats si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'completion_stats'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN completion_stats jsonb NOT NULL DEFAULT '{}';
  END IF;
  
  -- Vérifier et ajouter source si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN source text;
  END IF;
  
  -- Vérifier et ajouter confirmed_at si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'validations' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE public.validations ADD COLUMN confirmed_at timestamptz;
  END IF;
END $$;

-- =====================================================
-- 2. INDEX POUR PERFORMANCES
-- =====================================================

-- Index sur user_id pour les requêtes RLS
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON public.validations(user_id);

-- Index sur request_id pour les lookups
CREATE INDEX IF NOT EXISTS idx_validations_request_id ON public.validations(request_id);

-- Index sur validation_status pour les filtres
CREATE INDEX IF NOT EXISTS idx_validations_status ON public.validations(validation_status);

-- Index composé pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_validations_user_status ON public.validations(user_id, validation_status);

-- =====================================================
-- 3. FONCTION RPC POUR INSERTION SÉCURISÉE
-- =====================================================

CREATE OR REPLACE FUNCTION public.rpc_insert_validation(
  request_id text,
  validated_fields jsonb DEFAULT '{}',
  answers jsonb DEFAULT '[]',
  contextual_answers jsonb DEFAULT '{}',
  completion_stats jsonb DEFAULT '{}',
  document_type text DEFAULT NULL,
  session_id text DEFAULT NULL,
  source text DEFAULT 'web_app'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  target_ocr_result_id uuid;
  new_validation_id uuid;
BEGIN
  -- 1. Vérifier que l'utilisateur est authentifié
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- 2. Valider les paramètres obligatoires
  IF request_id IS NULL OR request_id = '' THEN
    RAISE EXCEPTION 'request_id est obligatoire';
  END IF;
  
  -- 3. Retrouver l'ocr_result_id correspondant au request_id et à l'utilisateur
  -- Méthode : uploads.request_id -> ocr_results.upload_id -> ocr_results.id
  SELECT ocr.id INTO target_ocr_result_id
  FROM public.uploads up
  JOIN public.ocr_results ocr ON ocr.upload_id = up.id
  WHERE up.request_id = rpc_insert_validation.request_id
    AND up.user_id = current_user_id
    AND ocr.user_id = current_user_id
  ORDER BY ocr.created_at DESC
  LIMIT 1;
  
  -- 4. Vérifier que l'ocr_result existe
  IF target_ocr_result_id IS NULL THEN
    RAISE EXCEPTION 'Aucun résultat OCR trouvé pour request_id: % et user_id: %', request_id, current_user_id;
  END IF;
  
  -- 5. Insérer la nouvelle validation
  INSERT INTO public.validations (
    user_id,
    ocr_result_id,
    request_id,
    session_id,
    validated_fields,
    contextual_answers,
    answers,
    document_type,
    completion_stats,
    source,
    validation_status,
    validated_at
  ) VALUES (
    current_user_id,
    target_ocr_result_id,
    rpc_insert_validation.request_id,
    rpc_insert_validation.session_id,
    rpc_insert_validation.validated_fields,
    rpc_insert_validation.contextual_answers,
    rpc_insert_validation.answers,
    rpc_insert_validation.document_type,
    rpc_insert_validation.completion_stats,
    rpc_insert_validation.source,
    'validated',
    now()
  ) RETURNING id INTO new_validation_id;
  
  -- 6. Retourner l'ID de la nouvelle validation
  RETURN new_validation_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur et la re-lancer avec plus de contexte
    RAISE EXCEPTION 'Erreur lors de l''insertion de la validation: % (request_id: %, user_id: %)', 
      SQLERRM, request_id, current_user_id;
END;
$$;

-- =====================================================
-- 4. FONCTIONS RPC COMPLÉMENTAIRES
-- =====================================================

-- Fonction pour créer un upload
CREATE OR REPLACE FUNCTION public.rpc_create_upload(
  request_id text,
  filename text,
  filesize bigint,
  file_type text DEFAULT 'application/pdf',
  upload_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  new_upload_id uuid;
BEGIN
  -- Vérifier l'authentification
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Valider les paramètres
  IF request_id IS NULL OR filename IS NULL THEN
    RAISE EXCEPTION 'request_id et filename sont obligatoires';
  END IF;
  
  -- Insérer ou mettre à jour l'upload
  INSERT INTO public.uploads (
    user_id,
    request_id,
    filename,
    filesize,
    file_type,
    upload_status
  ) VALUES (
    current_user_id,
    rpc_create_upload.request_id,
    rpc_create_upload.filename,
    rpc_create_upload.filesize,
    rpc_create_upload.file_type,
    rpc_create_upload.upload_status
  )
  ON CONFLICT (request_id) DO UPDATE SET
    filename = EXCLUDED.filename,
    filesize = EXCLUDED.filesize,
    file_type = EXCLUDED.file_type,
    upload_status = EXCLUDED.upload_status
  RETURNING id INTO new_upload_id;
  
  RETURN new_upload_id;
END;
$$;

-- Fonction pour upsert un résultat OCR
CREATE OR REPLACE FUNCTION public.rpc_upsert_ocr_result(
  request_id text,
  document_type text DEFAULT 'AT_NORMALE',
  extracted_fields jsonb DEFAULT '{}',
  validation_fields jsonb DEFAULT '{}',
  contextual_questions jsonb DEFAULT '[]',
  ocr_confidence numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  target_upload_id uuid;
  new_ocr_result_id uuid;
BEGIN
  -- Vérifier l'authentification
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Retrouver l'upload_id
  SELECT id INTO target_upload_id
  FROM public.uploads
  WHERE uploads.request_id = rpc_upsert_ocr_result.request_id
    AND user_id = current_user_id
  LIMIT 1;
  
  IF target_upload_id IS NULL THEN
    RAISE EXCEPTION 'Aucun upload trouvé pour request_id: %', request_id;
  END IF;
  
  -- Insérer ou mettre à jour le résultat OCR
  INSERT INTO public.ocr_results (
    upload_id,
    user_id,
    document_type,
    extracted_fields,
    validation_fields,
    contextual_questions,
    ocr_confidence
  ) VALUES (
    target_upload_id,
    current_user_id,
    rpc_upsert_ocr_result.document_type,
    rpc_upsert_ocr_result.extracted_fields,
    rpc_upsert_ocr_result.validation_fields,
    rpc_upsert_ocr_result.contextual_questions,
    rpc_upsert_ocr_result.ocr_confidence
  )
  ON CONFLICT (upload_id) DO UPDATE SET
    document_type = EXCLUDED.document_type,
    extracted_fields = EXCLUDED.extracted_fields,
    validation_fields = EXCLUDED.validation_fields,
    contextual_questions = EXCLUDED.contextual_questions,
    ocr_confidence = EXCLUDED.ocr_confidence
  RETURNING id INTO new_ocr_result_id;
  
  RETURN new_ocr_result_id;
END;
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur la table validations
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can read own validations" ON public.validations;
DROP POLICY IF EXISTS "Users can insert own validations" ON public.validations;
DROP POLICY IF EXISTS "Users can update own validations" ON public.validations;

-- Policy SELECT : les utilisateurs ne peuvent lire que leurs propres validations
CREATE POLICY "Users can read own validations"
  ON public.validations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy INSERT : les utilisateurs ne peuvent insérer que leurs propres validations
CREATE POLICY "Users can insert own validations"
  ON public.validations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE : les utilisateurs ne peuvent modifier que leurs propres validations
CREATE POLICY "Users can update own validations"
  ON public.validations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. DROITS D'EXÉCUTION
-- =====================================================

-- Accorder les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.rpc_insert_validation TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_upload TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_ocr_result TO authenticated;

-- Accorder les droits de lecture/écriture sur la table
GRANT SELECT, INSERT, UPDATE ON public.validations TO authenticated;

-- =====================================================
-- 7. COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.validations IS 'Table des validations utilisateur - stockage des données validées après OCR';
COMMENT ON COLUMN public.validations.validated_fields IS 'Données extraites et validées par l''utilisateur (format nested JSON)';
COMMENT ON COLUMN public.validations.answers IS 'Réponses aux questions contextuelles (array JSON)';
COMMENT ON COLUMN public.validations.contextual_answers IS 'Réponses structurées par catégorie (object JSON)';
COMMENT ON COLUMN public.validations.completion_stats IS 'Statistiques de completion du formulaire';
COMMENT ON COLUMN public.validations.request_id IS 'Identifiant unique de la requête (lien avec upload)';
COMMENT ON COLUMN public.validations.session_id IS 'Identifiant de session utilisateur';

COMMENT ON FUNCTION public.rpc_insert_validation IS 'Fonction RPC sécurisée pour insérer une validation utilisateur';
COMMENT ON FUNCTION public.rpc_create_upload IS 'Fonction RPC sécurisée pour créer/mettre à jour un upload';
COMMENT ON FUNCTION public.rpc_upsert_ocr_result IS 'Fonction RPC sécurisée pour insérer/mettre à jour un résultat OCR';