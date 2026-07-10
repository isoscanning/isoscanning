# Integração oficial com o Instagram (Graph API) — Arquitetura

Este documento descreve como evoluir a feature de Gestão Social Media para puxar
métricas reais automaticamente da API oficial do Instagram, substituindo o
registro manual de métricas que alimenta o Relatório Mensal hoje.

## O que já está pronto (funciona sem a Meta)

- **Anamnese da conta pelo @** — `/api/social-media/account-analysis` pesquisa a
  conta/empresa na internet com IA (`groq/compound-mini`, busca web nativa) e
  gera a anamnese usada na geração do cronograma. Não depende da API da Meta.
- **Métricas por post** — colunas `metric_likes/comments/shares/saves/reach/views`
  em `social_media_posts` + RPC `sm_update_post_metrics` (migration 43).
  Hoje preenchidas manualmente no slide-over; a integração oficial preencherá
  as MESMAS colunas — relatório e sugestões continuam funcionando sem mudança.
- **Relatório mensal com IA** — `/api/social-media/monthly-report` + página
  `/dashboard/social-media/[scheduleId]/report` + tabela `sm_monthly_reports`.

## Restrições da API oficial (importante)

1. **Não existe API pública para perfis de terceiros.** Só é possível ler dados
   de contas que **autorizarem** o app via OAuth. Scraping viola os Termos de Uso.
2. A conta do cliente precisa ser **Business ou Creator** e estar **vinculada a
   uma Página do Facebook**.
3. É preciso criar um **app na Meta for Developers** e passar por **App Review**
   para as permissões:
   - `instagram_basic` — perfil e mídia
   - `instagram_manage_insights` — métricas (alcance, impressões, salvos...)
   - `pages_show_list` + `pages_read_engagement` — descobrir a conta IG via Página
4. Tokens de longa duração expiram em **60 dias** — precisa de refresh agendado.

## Passo a passo de implementação

### 1. Setup na Meta
- Criar app tipo "Business" em https://developers.facebook.com
- Adicionar produto "Facebook Login for Business"
- Redirect URI: `https://SEU_DOMINIO/api/social-media/instagram/callback`
- Env vars: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`

### 2. Banco (migration futura `44-social-media-instagram.sql`)
```sql
CREATE TABLE sm_instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES social_media_schedules(id) ON DELETE CASCADE UNIQUE,
  ig_user_id TEXT NOT NULL,          -- id da conta IG Business
  ig_username TEXT,
  access_token TEXT NOT NULL,        -- token de longa duração (criptografar!)
  token_expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES profiles(id),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: somente owner do cronograma lê/escreve. NUNCA expor access_token ao client:
-- leitura do token só via rota de servidor com service role.
```

### 3. Rotas Next.js
- `GET /api/social-media/instagram/connect?scheduleId=...`
  → redireciona para o diálogo OAuth da Meta (state = scheduleId assinado)
- `GET /api/social-media/instagram/callback`
  → troca `code` por token curto → token de longa duração (`fb_exchange_token`)
  → `GET /me/accounts` → `GET /{page-id}?fields=instagram_business_account`
  → salva em `sm_instagram_accounts`
- `POST /api/social-media/instagram/sync?scheduleId=...&month=...&year=...`
  1. `GET /{ig-user-id}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&since=...&until=...`
  2. Para cada mídia: `GET /{media-id}/insights?metric=reach,saved,shares,plays`
  3. **Matching** mídia ↔ post do cronograma: por data (`timestamp` vs `scheduled_date`)
     + similaridade do caption com a copy; guardar `ig_media_id` no post para
     sincronizações seguintes serem exatas.
  4. Atualiza as colunas `metric_*` via service role (bypassa RLS no servidor).
- Cron (Vercel Cron / Supabase Edge Function schedule):
  - refresh de tokens a cada ~50 dias
  - sync diário de métricas dos últimos 30 dias

### 4. UI
- Página do cronograma: botão "Conectar Instagram" (owner) → status conectado
  (@username + última sincronização) → botão "Sincronizar agora".
- Relatório mensal: badge "métricas via Instagram API" em vez de "manuais".

### 5. Métricas de conta (bônus para o relatório)
- `GET /{ig-user-id}/insights?metric=reach,impressions,profile_views,follower_count&period=day`
  → snapshot mensal em uma tabela `sm_account_metrics` para o relatório mostrar
  evolução de seguidores/alcance da conta, não só dos posts.

## Ordem recomendada
1. Rodar com métricas manuais (já pronto) para validar o relatório com clientes.
2. Criar o app Meta + modo dev (funciona com contas de teste sem review).
3. Implementar connect/callback/sync.
4. Submeter App Review (exige vídeo demonstrando o uso das permissões).
5. Ativar cron de sync + refresh de token.
