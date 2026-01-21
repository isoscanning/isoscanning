-- ============================================================
-- Script SQL para corrigir permissões (RLS) da tabela job_applications
-- ============================================================

-- 1. Habilitar RLS na tabela
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON job_applications;
DROP POLICY IF EXISTS "Employers can update status of applications for their jobs" ON job_applications;
DROP POLICY IF EXISTS "Candidates can view their own applications" ON job_applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON job_applications;

-- 3. Política: Empregadores podem ver aplicações de suas vagas
CREATE POLICY "Employers can view applications for their jobs" ON job_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_offers
            WHERE job_offers.id = job_applications.job_offer_id
            AND job_offers.employer_id = auth.uid()
        )
    );

-- 4. Política: Empregadores podem ATUALIZAR status das aplicações de suas vagas
CREATE POLICY "Employers can update status of applications for their jobs" ON job_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM job_offers
            WHERE job_offers.id = job_applications.job_offer_id
            AND job_offers.employer_id = auth.uid()
        )
    );

-- 5. Política: Candidatos podem ver suas próprias aplicações
CREATE POLICY "Candidates can view their own applications" ON job_applications
    FOR SELECT
    USING (candidate_id = auth.uid());

-- 6. Política: Candidatos podem criar aplicações
CREATE POLICY "Candidates can create applications" ON job_applications
    FOR INSERT
    WITH CHECK (candidate_id = auth.uid());

-- 7. Confirmação
SELECT 'Políticas de segurança (RLS) atualizadas com sucesso!' as result;
