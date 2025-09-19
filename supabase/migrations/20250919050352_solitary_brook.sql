/*
  # Create validations table with complete structure

  1. New Tables
    - `validations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `request_id` (text)
      - `session_id` (text)
      - `document_type` (text)
      - `data` (jsonb, normalized validation data)
      - `answers` (jsonb, contextual questions answers)
      - `completion_stats` (jsonb, completion statistics)
      - `source` (text, OCR source)
      - `is_confirmed` (boolean, confirmation status)
      - `confirmed_at` (timestamptz, confirmation timestamp)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `validations` table
    - Add policies for authenticated users to manage their own validations
*/

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id text,
  session_id text,
  document_type text,
  data jsonb NOT NULL DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '[]',
  completion_stats jsonb NOT NULL DEFAULT '{}',
  source text,
  is_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (idempotent)
ALTER TABLE public.validations
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completion_stats jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Enable RLS
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='validations' AND policyname='val_select_owner') THEN
    DROP POLICY val_select_owner ON public.validations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='validations' AND policyname='val_ins_self') THEN
    DROP POLICY val_ins_self ON public.validations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='validations' AND policyname='val_upd_owner') THEN
    DROP POLICY val_upd_owner ON public.validations;
  END IF;
END$$;

-- Create RLS policies
CREATE POLICY val_select_owner ON public.validations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY val_ins_self ON public.validations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY val_upd_owner ON public.validations
  FOR UPDATE USING (auth.uid() = user_id);