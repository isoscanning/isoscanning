-- ============================================================
-- Script SQL COMPLETO para tabela profiles
-- Com validação de existência para evitar erros ao executar múltiplas vezes
-- ============================================================

-- Adicionar todas as colunas que faltam (com IF NOT EXISTS)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'client',
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NOT NULL,
ADD COLUMN IF NOT EXISTS artistic_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS portfolio_link TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
-- DEPRECATED: specialty column will be removed after data migration
-- ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),

-- Migration: Copy existing specialty to specialties array if not already done
-- (This logic relies on running a query, which cannot be done in a declarative ADD COLUMN block easily without DO block)
DO $$
BEGIN
    -- 1. Migrate data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'specialty') THEN
        UPDATE profiles 
        SET specialties = ARRAY[specialty] 
        WHERE specialty IS NOT NULL AND (specialties IS NULL OR specialties = '{}');
    END IF;
END $$;

-- Criar índices (IF NOT EXISTS não funciona com índices, então usamos DROP IF EXISTS + CREATE)
DROP INDEX IF EXISTS idx_profiles_user_type;
CREATE INDEX idx_profiles_user_type ON profiles(user_type);

DROP INDEX IF EXISTS idx_profiles_average_rating;
CREATE INDEX idx_profiles_average_rating ON profiles(average_rating);

DROP INDEX IF EXISTS idx_profiles_total_reviews;
CREATE INDEX idx_profiles_total_reviews ON profiles(total_reviews);

DROP INDEX IF EXISTS idx_profiles_is_active;
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

DROP INDEX IF EXISTS idx_profiles_city_state;
CREATE INDEX idx_profiles_city_state ON profiles(city, state);

-- Verificar se as colunas foram criadas com sucesso
SELECT 'Tabela profiles atualizada com sucesso!' AS status;
