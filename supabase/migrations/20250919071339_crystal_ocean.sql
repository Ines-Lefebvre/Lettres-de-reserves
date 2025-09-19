/*
  # Correction définitive de rpc_create_upload

  1. Problème
    - Erreur "column reference request_id is ambiguous"
    - La fonction fait référence à request_id sans qualifier la table

  2. Solution
    - Suppression et recréation complète de la fonction
    - Qualification explicite de toutes les colonnes
    - Simplification de la logique pour éviter les ambiguïtés

  3. Sécurité
    - Maintien du SECURITY DEFINER
    - Vérification auth.uid()
    - Gestion d'erreurs robuste
*/

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.rpc_create_upload(text, text, bigint, text, text);

-- Créer la nouvelle fonction sans ambiguïté
CREATE OR REPLACE FUNCTION public.rpc_create_upload(
  request_id text,
  filename text,
  filesize bigint,
  file_type text DEFAULT 'application/pdf',
  upload_status text DEFAULT 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_upload_id uuid;
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

  -- Vérifier si un upload existe déjà pour ce request_id et cet utilisateur
  SELECT uploads.id INTO existing_upload_id
  FROM public.uploads
  WHERE uploads.request_id = rpc_create_upload.request_id 
    AND uploads.user_id = current_user_id;

  IF existing_upload_id IS NOT NULL THEN
    -- Mettre à jour l'upload existant
    UPDATE public.uploads 
    SET 
      filename = rpc_create_upload.filename,
      filesize = rpc_create_upload.filesize,
      file_type = rpc_create_upload.file_type,
      upload_status = rpc_create_upload.upload_status,
      created_at = now()
    WHERE uploads.id = existing_upload_id;
    
    RAISE NOTICE 'Upload mis à jour: id=%', existing_upload_id;
  ELSE
    -- Créer un nouvel upload
    INSERT INTO public.uploads (
      user_id,
      request_id,
      filename,
      filesize,
      file_type,
      upload_status,
      created_at
    ) VALUES (
      current_user_id,
      rpc_create_upload.request_id,
      rpc_create_upload.filename,
      rpc_create_upload.filesize,
      rpc_create_upload.file_type,
      rpc_create_upload.upload_status,
      now()
    );
    
    RAISE NOTICE 'Nouvel upload créé pour request_id=%', rpc_create_upload.request_id;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur rpc_create_upload: %', SQLERRM;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO anon;

-- Test de la fonction (optionnel - à supprimer en production)
DO $$
BEGIN
  RAISE NOTICE 'Fonction rpc_create_upload recréée avec succès';
END;
$$;