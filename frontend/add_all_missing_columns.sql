-- Script SQL completo para criar todas as colunas necessárias na tabela profiles

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON profiles(average_rating);
CREATE INDEX IF NOT EXISTS idx_profiles_total_reviews ON profiles(total_reviews);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
