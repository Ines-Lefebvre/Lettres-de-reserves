/*
  # Schéma complet pour lettres de réserves

  1. Nouvelles Tables
    - `profiles` - Profils utilisateurs étendus
    - `uploads` - Historique des téléversements
    - `ocr_results` - Résultats d'extraction OCR
    - `validations` - Données validées par l'utilisateur
    - `payments` - Historique des paiements

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies pour accès par propriétaire uniquement
    - Foreign keys pour intégrité référentielle

  3. Fonctionnalités
    - Timestamps automatiques
    - Statuts avec contraintes
    - Indexes pour performance
*/

-- Extension pour UUID si pas déjà activée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table profiles (extension du profil utilisateur)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text,
  company_name text,
  siret text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Table uploads (historique des téléversements)
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id text UNIQUE,
  filename text NOT NULL,
  filesize bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT 'application/pdf',
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  n8n_response jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Table ocr_results (résultats d'extraction OCR)
CREATE TABLE IF NOT EXISTS ocr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES uploads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL DEFAULT 'AT_NORMALE',
  extracted_fields jsonb NOT NULL DEFAULT '{}',
  ocr_confidence decimal(3,2) DEFAULT 0.0 CHECK (ocr_confidence >= 0.0 AND ocr_confidence <= 1.0),
  validation_fields jsonb DEFAULT '{}',
  contextual_questions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table validations (données validées par l'utilisateur)
CREATE TABLE IF NOT EXISTS validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_result_id uuid REFERENCES ocr_results(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  validated_fields jsonb NOT NULL DEFAULT '{}',
  user_corrections jsonb DEFAULT '{}',
  contextual_answers jsonb DEFAULT '{}',
  validation_status text NOT NULL DEFAULT 'draft' CHECK (validation_status IN ('draft', 'validated', 'submitted')),
  created_at timestamptz DEFAULT now() NOT NULL,
  validated_at timestamptz
);

-- Table payments (historique des paiements)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  validation_id uuid REFERENCES validations(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method text,
  stripe_payment_intent_id text,
  stripe_session_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_at timestamptz
);

-- Table dossiers (legacy - pour compatibilité)
CREATE TABLE IF NOT EXISTS dossiers (
  id serial PRIMARY KEY,
  request_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_request_id ON uploads(request_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_ocr_results_upload_id ON ocr_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_user_id ON ocr_results(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_dossiers_user_id ON dossiers(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour profiles.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Accès par propriétaire uniquement

-- Policies pour profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour uploads
CREATE POLICY "Users can read own uploads"
  ON uploads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour ocr_results
CREATE POLICY "Users can read own ocr_results"
  ON ocr_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ocr_results"
  ON ocr_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ocr_results"
  ON ocr_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour validations
CREATE POLICY "Users can read own validations"
  ON validations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own validations"
  ON validations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own validations"
  ON validations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour payments
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies pour dossiers (legacy)
CREATE POLICY "Users can read own dossiers"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dossiers"
  ON dossiers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dossiers"
  ON dossiers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);