/*
  # Recréation de la fonction rpc_create_upload

  1. Fonction RPC
    - Crée ou met à jour un upload
    - Gère l'authentification utilisateur
    - Retourne l'ID de l'upload créé

  2. Sécurité
    - Vérification de l'utilisateur authentifié
    - Validation des paramètres d'entrée
    - Gestion des erreurs explicites
*/

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS public.rpc_create_upload(text, text, bigint, text, text);

-- Créer la fonction avec une signature claire
CREATE OR REPLACE FUNCTION public.rpc_create_upload(
  p_request_id text,
  p_filename text,
  p_filesize bigint,
  p_file_type text,
  p_upload_status text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_upload_id uuid;
  v_existing_upload_id uuid;
BEGIN
  -- Récupérer l'utilisateur authentifié
  v_user_id := auth.uid();
  
  -- Vérifier l'authentification
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié. Veuillez vous connecter.';
  END IF;
  
  -- Valider les paramètres
  IF p_request_id IS NULL OR p_request_id = '' THEN
    RAISE EXCEPTION 'request_id est requis';
  END IF;
  
  IF p_filename IS NULL OR p_filename = '' THEN
    RAISE EXCEPTION 'filename est requis';
  END IF;
  
  -- Log pour debugging
  RAISE NOTICE 'rpc_create_upload: user_id=%, request_id=%, filename=%', 
    v_user_id, p_request_id, p_filename;
  
  -- Vérifier si un upload existe déjà pour ce request_id et cet utilisateur
  SELECT id INTO v_existing_upload_id
  FROM uploads 
  WHERE uploads.request_id = p_request_id 
    AND uploads.user_id = v_user_id;
  
  IF v_existing_upload_id IS NOT NULL THEN
    -- Mettre à jour l'upload existant
    UPDATE uploads 
    SET 
      filename = p_filename,
      filesize = p_filesize,
      file_type = p_file_type,
      upload_status = p_upload_status,
      processed_at = CASE 
        WHEN p_upload_status = 'completed' THEN now() 
        ELSE processed_at 
      END
    WHERE id = v_existing_upload_id;
    
    RAISE NOTICE 'Upload mis à jour: id=%', v_existing_upload_id;
    RETURN v_existing_upload_id;
  ELSE
    -- Créer un nouvel upload
    INSERT INTO uploads (
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
    ) RETURNING id INTO v_upload_id;
    
    RAISE NOTICE 'Nouvel upload créé: id=%', v_upload_id;
    RETURN v_upload_id;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur rpc_create_upload: %', SQLERRM;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_upload(text, text, bigint, text, text) TO anon;