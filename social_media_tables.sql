-- ============================================================
-- Gestão de Social Media — Tabelas e Políticas RLS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Cronogramas de postagem
CREATE TABLE IF NOT EXISTS social_media_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_niche VARCHAR(255),
  description TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  networks TEXT[] DEFAULT '{}',
  tone_of_voice VARCHAR(255),
  target_audience TEXT,
  posting_frequency INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Posts individuais do cronograma
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES social_media_schedules(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  post_type VARCHAR(50) NOT NULL CHECK (post_type IN ('reels', 'carrossel', 'feed_image', 'feed_video', 'story', 'shorts', 'thread')),
  network VARCHAR(50) NOT NULL CHECK (network IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected')),
  copy TEXT,
  hashtags TEXT[] DEFAULT '{}',
  content_description TEXT,
  ai_generated BOOLEAN DEFAULT false,
  position_number INTEGER,
  notes TEXT,
  material_link TEXT,
  video_link TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Membros da equipe por cronograma
CREATE TABLE IF NOT EXISTS social_media_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES social_media_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'approver', 'viewer')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
  UNIQUE(schedule_id, user_id)
);

-- 4. Comentários e sugestões por post
CREATE TABLE IF NOT EXISTS social_media_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'approval', 'rejection')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Histórico de edições
CREATE TABLE IF NOT EXISTS social_media_post_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sm_schedules_owner ON social_media_schedules(owner_id);
CREATE INDEX IF NOT EXISTS idx_sm_schedules_month_year ON social_media_schedules(year, month);
CREATE INDEX IF NOT EXISTS idx_sm_schedules_status ON social_media_schedules(status);
CREATE INDEX IF NOT EXISTS idx_sm_posts_schedule ON social_media_posts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sm_posts_date ON social_media_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sm_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_sm_posts_network ON social_media_posts(network);
CREATE INDEX IF NOT EXISTS idx_sm_team_schedule ON social_media_team_members(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sm_team_user ON social_media_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sm_comments_post ON social_media_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_sm_history_post ON social_media_post_history(post_id);

-- ============================================================
-- Funções SECURITY DEFINER para quebrar recursão nas políticas RLS
-- Rodam como superuser, sem checar RLS das tabelas internas
-- ============================================================

CREATE OR REPLACE FUNCTION sm_is_team_member(p_schedule_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM social_media_team_members
    WHERE schedule_id = p_schedule_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION sm_is_schedule_owner(p_schedule_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM social_media_schedules
    WHERE id = p_schedule_id
      AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION sm_post_schedule_id(p_post_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT schedule_id FROM social_media_posts WHERE id = p_post_id;
$$;

-- ============================================================
-- RLS Policies (sem referências circulares)
-- ============================================================

ALTER TABLE social_media_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_post_history ENABLE ROW LEVEL SECURITY;

-- SCHEDULES ------------------------------------------------
DROP POLICY IF EXISTS "sm_schedules_select" ON social_media_schedules;
CREATE POLICY "sm_schedules_select" ON social_media_schedules FOR SELECT USING (
  auth.uid() = owner_id
  OR sm_is_team_member(id, auth.uid())
);

DROP POLICY IF EXISTS "sm_schedules_insert" ON social_media_schedules;
CREATE POLICY "sm_schedules_insert" ON social_media_schedules FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);

DROP POLICY IF EXISTS "sm_schedules_update" ON social_media_schedules;
CREATE POLICY "sm_schedules_update" ON social_media_schedules FOR UPDATE USING (
  auth.uid() = owner_id
);

DROP POLICY IF EXISTS "sm_schedules_delete" ON social_media_schedules;
CREATE POLICY "sm_schedules_delete" ON social_media_schedules FOR DELETE USING (
  auth.uid() = owner_id
);

-- POSTS ----------------------------------------------------
DROP POLICY IF EXISTS "sm_posts_select" ON social_media_posts;
CREATE POLICY "sm_posts_select" ON social_media_posts FOR SELECT USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
  OR sm_is_team_member(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_posts_insert" ON social_media_posts;
CREATE POLICY "sm_posts_insert" ON social_media_posts FOR INSERT WITH CHECK (
  sm_is_schedule_owner(schedule_id, auth.uid())
  OR sm_is_team_member(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_posts_update" ON social_media_posts;
CREATE POLICY "sm_posts_update" ON social_media_posts FOR UPDATE USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
  OR sm_is_team_member(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_posts_delete" ON social_media_posts;
CREATE POLICY "sm_posts_delete" ON social_media_posts FOR DELETE USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

-- TEAM MEMBERS ---------------------------------------------
DROP POLICY IF EXISTS "sm_team_select" ON social_media_team_members;
CREATE POLICY "sm_team_select" ON social_media_team_members FOR SELECT USING (
  user_id = auth.uid()
  OR sm_is_schedule_owner(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_team_insert" ON social_media_team_members;
CREATE POLICY "sm_team_insert" ON social_media_team_members FOR INSERT WITH CHECK (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_team_update" ON social_media_team_members;
CREATE POLICY "sm_team_update" ON social_media_team_members FOR UPDATE USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_team_delete" ON social_media_team_members;
CREATE POLICY "sm_team_delete" ON social_media_team_members FOR DELETE USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

-- COMMENTS -------------------------------------------------
DROP POLICY IF EXISTS "sm_comments_select" ON social_media_post_comments;
CREATE POLICY "sm_comments_select" ON social_media_post_comments FOR SELECT USING (
  user_id = auth.uid()
  OR sm_is_schedule_owner(sm_post_schedule_id(post_id), auth.uid())
  OR sm_is_team_member(sm_post_schedule_id(post_id), auth.uid())
);

DROP POLICY IF EXISTS "sm_comments_insert" ON social_media_post_comments;
CREATE POLICY "sm_comments_insert" ON social_media_post_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    sm_is_schedule_owner(sm_post_schedule_id(post_id), auth.uid())
    OR sm_is_team_member(sm_post_schedule_id(post_id), auth.uid())
  )
);

-- HISTORY --------------------------------------------------
DROP POLICY IF EXISTS "sm_history_select" ON social_media_post_history;
CREATE POLICY "sm_history_select" ON social_media_post_history FOR SELECT USING (
  user_id = auth.uid()
  OR sm_is_schedule_owner(sm_post_schedule_id(post_id), auth.uid())
  OR sm_is_team_member(sm_post_schedule_id(post_id), auth.uid())
);

DROP POLICY IF EXISTS "sm_history_insert" ON social_media_post_history;
CREATE POLICY "sm_history_insert" ON social_media_post_history FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Colunas adicionadas posteriormente (idempotente — rode sempre que atualizar)
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS material_link TEXT;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS video_link TEXT;

-- ============================================================
-- Funções SECURITY DEFINER para gestão de equipe
-- Evitam o bloqueio RLS em operações de escrita na equipe
-- ============================================================

-- Leitura de membros (bypassa RLS do SELECT)
CREATE OR REPLACE FUNCTION sm_get_team_members(p_schedule_id uuid)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT sm_is_schedule_owner(p_schedule_id, auth.uid())
     AND NOT sm_is_team_member(p_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para ver membros';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id',           m.id,
    'schedule_id',  m.schedule_id,
    'user_id',      m.user_id,
    'role',         m.role,
    'invited_by',   m.invited_by,
    'invited_at',   m.invited_at,
    'accepted_at',  m.accepted_at,
    'status',       m.status,
    'profile', json_build_object(
      'display_name', p.display_name,
      'avatar_url',   p.avatar_url,
      'username',     p.username,
      'email',        p.email
    )
  )
  FROM social_media_team_members m
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.schedule_id = p_schedule_id
    AND m.status = 'active'
  ORDER BY m.invited_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sm_add_team_member(
  p_schedule_id uuid,
  p_user_id     uuid,
  p_role        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();

  IF NOT sm_is_schedule_owner(p_schedule_id, v_caller_id) THEN
    RAISE EXCEPTION 'Apenas o dono do cronograma pode adicionar membros';
  END IF;

  INSERT INTO social_media_team_members (
    schedule_id, user_id, role, invited_by, status, accepted_at
  ) VALUES (
    p_schedule_id, p_user_id, p_role, v_caller_id, 'active', NOW()
  )
  ON CONFLICT (schedule_id, user_id)
  DO UPDATE SET role = p_role, status = 'active', accepted_at = NOW();

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION sm_remove_team_member(
  p_member_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  SELECT schedule_id INTO v_schedule_id
  FROM social_media_team_members WHERE id = p_member_id;

  IF v_schedule_id IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  IF NOT sm_is_schedule_owner(v_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o dono do cronograma pode remover membros';
  END IF;

  UPDATE social_media_team_members SET status = 'removed' WHERE id = p_member_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION sm_update_member_role(
  p_member_id uuid,
  p_role      text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  SELECT schedule_id INTO v_schedule_id
  FROM social_media_team_members WHERE id = p_member_id;

  IF NOT sm_is_schedule_owner(v_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o dono do cronograma pode alterar funções';
  END IF;

  UPDATE social_media_team_members SET role = p_role WHERE id = p_member_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- Funções SECURITY DEFINER para comentários
-- ============================================================

CREATE OR REPLACE FUNCTION sm_get_post_comments(p_post_id uuid)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  v_schedule_id := sm_post_schedule_id(p_post_id);

  IF NOT sm_is_schedule_owner(v_schedule_id, auth.uid())
     AND NOT sm_is_team_member(v_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para ver comentários';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id',           c.id,
    'post_id',      c.post_id,
    'user_id',      c.user_id,
    'comment',      c.comment,
    'comment_type', c.comment_type,
    'created_at',   c.created_at,
    'profile', json_build_object(
      'display_name', p.display_name,
      'avatar_url',   p.avatar_url
    )
  )
  FROM social_media_post_comments c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sm_add_post_comment(
  p_post_id      uuid,
  p_comment      text,
  p_comment_type text DEFAULT 'comment'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_caller_id   uuid;
BEGIN
  v_caller_id   := auth.uid();
  v_schedule_id := sm_post_schedule_id(p_post_id);

  IF NOT sm_is_schedule_owner(v_schedule_id, v_caller_id)
     AND NOT sm_is_team_member(v_schedule_id, v_caller_id) THEN
    RAISE EXCEPTION 'Sem permissão para comentar neste post';
  END IF;

  INSERT INTO social_media_post_comments (post_id, user_id, comment, comment_type)
  VALUES (p_post_id, v_caller_id, p_comment, p_comment_type);

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION sm_delete_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  v_schedule_id := sm_post_schedule_id(p_post_id);
  IF NOT sm_is_schedule_owner(v_schedule_id, auth.uid())
     AND NOT sm_is_team_member(v_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para excluir este post';
  END IF;
  DELETE FROM social_media_posts WHERE id = p_post_id;
  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- Share Links — visualização pública somente-leitura
-- ============================================================

CREATE TABLE IF NOT EXISTS social_media_share_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES social_media_schedules(id) ON DELETE CASCADE,
  token       text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT uq_share_schedule UNIQUE (schedule_id)
);
ALTER TABLE social_media_share_links ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE social_media_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm_share_select" ON social_media_share_links;
CREATE POLICY "sm_share_select" ON social_media_share_links FOR SELECT USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_share_insert" ON social_media_share_links;
CREATE POLICY "sm_share_insert" ON social_media_share_links FOR INSERT WITH CHECK (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

DROP POLICY IF EXISTS "sm_share_delete" ON social_media_share_links;
CREATE POLICY "sm_share_delete" ON social_media_share_links FOR DELETE USING (
  sm_is_schedule_owner(schedule_id, auth.uid())
);

-- Obtém ou cria link (retorna token + active)
CREATE OR REPLACE FUNCTION sm_get_or_create_share_link(p_schedule_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token  text;
  v_active boolean;
BEGIN
  IF NOT sm_is_schedule_owner(p_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o dono pode gerar link de compartilhamento';
  END IF;

  SELECT token, active INTO v_token, v_active
  FROM social_media_share_links
  WHERE schedule_id = p_schedule_id;

  IF v_token IS NULL THEN
    v_token  := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
    v_active := true;
    INSERT INTO social_media_share_links (schedule_id, token, active, created_by)
    VALUES (p_schedule_id, v_token, v_active, auth.uid());
  END IF;

  RETURN json_build_object('token', v_token, 'active', v_active);
END;
$$;
GRANT EXECUTE ON FUNCTION sm_get_or_create_share_link(uuid) TO authenticated;

-- Ativa ou desativa o compartilhamento (sem trocar o token)
CREATE OR REPLACE FUNCTION sm_toggle_share_link(p_schedule_id uuid, p_active boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT sm_is_schedule_owner(p_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o dono pode alterar o compartilhamento';
  END IF;

  UPDATE social_media_share_links
  SET active = p_active
  WHERE schedule_id = p_schedule_id;

  RETURN json_build_object('success', true, 'active', p_active);
END;
$$;
GRANT EXECUTE ON FUNCTION sm_toggle_share_link(uuid, boolean) TO authenticated;

-- Revoga link atual e gera um novo token
CREATE OR REPLACE FUNCTION sm_revoke_share_link(p_schedule_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text;
BEGIN
  IF NOT sm_is_schedule_owner(p_schedule_id, auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o dono pode revogar links';
  END IF;

  DELETE FROM social_media_share_links WHERE schedule_id = p_schedule_id;

  v_new_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  INSERT INTO social_media_share_links (schedule_id, token, active, created_by)
  VALUES (p_schedule_id, v_new_token, true, auth.uid());

  RETURN json_build_object('token', v_new_token, 'active', true);
END;
$$;
GRANT EXECUTE ON FUNCTION sm_revoke_share_link(uuid) TO authenticated;

-- Leitura pública pelo token — verifica active
CREATE OR REPLACE FUNCTION sm_get_shared_calendar(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_active      boolean;
  v_schedule    json;
  v_posts       json;
BEGIN
  SELECT schedule_id, active INTO v_schedule_id, v_active
  FROM social_media_share_links
  WHERE token = p_token;

  IF v_active IS FALSE THEN
    RAISE EXCEPTION 'Compartilhamento desativado';
  END IF;

  IF v_schedule_id IS NULL THEN
    RAISE EXCEPTION 'Link inválido ou expirado';
  END IF;

  SELECT json_build_object(
    'id',          id,
    'client_name', client_name,
    'month',       month,
    'year',        year,
    'networks',    networks
  ) INTO v_schedule
  FROM social_media_schedules
  WHERE id = v_schedule_id;

  SELECT json_agg(
    json_build_object(
      'id',             id,
      'title',          title,
      'post_type',      post_type,
      'network',        network,
      'scheduled_date', scheduled_date,
      'scheduled_time', scheduled_time,
      'status',         status
    ) ORDER BY scheduled_date, scheduled_time NULLS LAST
  ) INTO v_posts
  FROM social_media_posts
  WHERE schedule_id = v_schedule_id;

  RETURN json_build_object(
    'schedule', v_schedule,
    'posts',    COALESCE(v_posts, '[]'::json)
  );
END;
$$;
-- Permite acesso anônimo — o token é a credencial
GRANT EXECUTE ON FUNCTION sm_get_shared_calendar(text) TO anon;
GRANT EXECUTE ON FUNCTION sm_get_shared_calendar(text) TO authenticated;

SELECT 'Tabelas de Social Media criadas com sucesso!' AS status;
