-- ============================================================
-- Script SQL para adicionar status na tabela job_offers
-- ============================================================

-- 1. Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'status') THEN
        ALTER TABLE job_offers ADD COLUMN status VARCHAR(50) DEFAULT 'open'; -- open, paused, closed
    END IF;
END $$;

-- 2. Atualizar status baseado em isActive (migração de dados)
-- Se isActive = true -> status = 'open'
-- Se isActive = false -> status = 'paused' (assumindo que antes só existia pausar)
UPDATE job_offers SET status = 'open' WHERE is_active = true AND status IS NULL;
UPDATE job_offers SET status = 'paused' WHERE is_active = false AND status IS NULL;

-- 3. Criar índice para status
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status);

-- 4. Confirmação
SELECT 'Coluna status adicionada com sucesso!' as result;
