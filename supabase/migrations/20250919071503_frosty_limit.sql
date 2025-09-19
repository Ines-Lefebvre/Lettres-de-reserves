/*
  # Fix RPC Create Upload - Résolution ambiguïté column reference

  1. Problème résolu
    - Erreur "column reference request_id is ambiguous" 
    - Qualification explicite de toutes les colonnes
    - Préfixage des paramètres de fonction

  2. Changements
    - DROP et CREATE de la fonction rpc_create_upload
    - Qualification explicite : uploads.request_id vs paramètre
    - Variables locales pour éviter les conflits
    - Gestion d'erreur améliorée avec RAISE NOTICE

  3. Test
    - Fonction testable avec SELECT rpc_create_upload(...)
    - Logs détaillés pour debugging
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.rpc_create_upload(text, text, bigint, text, text);

-- Créer la nouvelle fonction avec qualification explicite
CREATE OR REPLACE FUNCTION public.rpc_create_upload(
  p_request_id text,
  p_filename text,
  p_filesize bigint DEFAULT 0,
  p_file_type text DEFAULT 'application/pdf',
  p_upload_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_existing_upload_id uuid;
  v_new_upload_id uuid;
BEGIN
  -- Log début de fonction
  RAISE NOTICE 'rpc_create_upload: Début avec request_id=%', p_request_id;
  
  -- 1. Récupération de l'utilisateur connecté
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  RAISE NOTICE 'rpc_create_upload: user_id=%', v_user_id;
  
  -- 2. Vérification si upload existe déjà (qualification explicite)
  SELECT uploads.id 
  INTO v_existing_upload_id
  FROM public.uploads
  WHERE uploads.request_id = p_request_id 
    AND uploads.user_id = v_user_id;
  
  IF v_existing_upload_id IS NOT NULL THEN
    RAISE NOTICE 'rpc_create_upload: Upload existant trouvé, mise à jour id=%', v_existing_upload_id;
    
    -- Mise à jour de l'upload existant
    UPDATE public.uploads 
    SET 
      filename = p_filename,
      filesize = p_filesize,
      file_type = p_file_type,
      upload_status = p_upload_status,
      created_at = now()
    WHERE uploads.id = v_existing_upload_id
      AND uploads.user_id = v_user_id;
    
    RETURN v_existing_upload_id;
  END IF;
  
  -- 3. Création d'un nouvel upload
  RAISE NOTICE 'rpc_create_upload: Création nouvel upload';
  
  INSERT INTO public.uploads (
    user_id,
    request_id,
    filename,
    filesize,
    file_type,
    upload_status,
    created_at
  ) VALUES (
    v_user_id,
    p_request_id,
    p_filename,
    p_filesize,
    p_file_type,
    p_upload_status,
    now()
  ) RETURNING uploads.id INTO v_new_upload_id;
  
  RAISE NOTICE 'rpc_create_upload: Nouvel upload créé id=%', v_new_upload_id;
  
  RETURN v_new_upload_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'rpc_create_upload: Erreur - %', SQLERRM;
    RAISE;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO anon;

-- Test de la fonction (commenté pour éviter erreur en migration)
-- SELECT public.rpc_create_upload('test_req_123', 'test.pdf', 1000000, 'application/pdf', 'pending');