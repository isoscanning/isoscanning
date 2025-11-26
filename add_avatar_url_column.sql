---- Script SQL para adicionar coluna avatar_url na tabela profiles
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Criar índice para melhor performance
CREATE INDEX idx_profiles_avatar_url ON profiles(avatar_url);
