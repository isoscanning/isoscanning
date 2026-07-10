# Integração oficial com o Instagram (Graph API)

A conexão OAuth com a Meta e a sincronização automática de métricas **já estão
implementadas** no código. Este documento explica o que falta configurar (app na
Meta + variáveis de ambiente) e como o fluxo funciona.

## O que já está implementado

| Peça | Arquivo |
|---|---|
| Iniciar OAuth (URL do diálogo da Meta) | `app/api/social-media/instagram/connect/route.ts` |
| Callback (code → token longa duração → conta IG → salva) | `app/api/social-media/instagram/callback/route.ts` |
| Sincronizar métricas do mês (matching + insights) | `app/api/social-media/instagram/sync/route.ts` |
| Helpers Meta (state assinado HMAC, Graph fetch) | `lib/server/meta.ts` |
| Client service-role (token nunca chega ao browser) | `lib/server/supabase-admin.ts` |
| Tabela `sm_instagram_accounts` + funções status/disconnect | `isoscanning-backend/database/44-social-media-instagram.sql` |
| UI: modal com guia de conexão, sincronizar, desconectar | página do calendário + página de relatório |

Segurança: `sm_instagram_accounts` tem RLS **sem policies** — só as rotas de
servidor (service role) leem o `access_token`. O front consulta o status via
`sm_get_instagram_connection` (SECURITY DEFINER), que não expõe o token.

## Configuração necessária (uma vez)

### 1. Criar o app na Meta
1. Acesse https://developers.facebook.com → **My Apps → Create App** → tipo **Business**.
2. Adicione o produto **Facebook Login for Business**.
3. Em *Facebook Login → Settings → Valid OAuth Redirect URIs*, adicione:
   - `https://SEU_DOMINIO/api/social-media/instagram/callback`
   - `http://localhost:3000/api/social-media/instagram/callback` (desenvolvimento)
4. Anote o **App ID** e o **App Secret** (Settings → Basic).

### 2. Variáveis de ambiente (`.env.local` do isoscanning)
```env
META_APP_ID=xxxxxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
# opcional — se não definido, é derivado da origem da requisição:
# META_REDIRECT_URI=https://SEU_DOMINIO/api/social-media/instagram/callback

# necessário para o callback/sync gravarem no banco sem sessão do usuário
# (Supabase > Project Settings > API > service_role)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
⚠️ A service_role key dá acesso total ao banco — nunca a exponha com prefixo
`NEXT_PUBLIC_` nem em código de cliente.

### 3. Rodar a migration
Execute `44-social-media-instagram.sql` no SQL Editor do Supabase.

### 4. Modo desenvolvimento vs produção
- **Development Mode** (imediato): funciona apenas com contas de usuários
  adicionados ao app (App Roles → add Testers/Developers). Suficiente para
  testar e para gerenciar suas próprias contas/clientes que aceitarem ser testers.
- **Produção (qualquer cliente)**: exige **App Review** da Meta para as permissões
  `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
  `pages_read_engagement` (grava um vídeo demonstrando o fluxo de conexão e o
  relatório). Também exige Business Verification da sua empresa.

## Pré-requisitos da conta do cliente (mostrados no modal da UI)
1. Instagram **Profissional** (Comercial ou Criador).
2. Vinculado a uma **Página do Facebook** (Central de Contas).
3. Quem conecta precisa ser **administrador da Página** — ou o próprio cliente
   faz o login no diálogo da Meta na hora de conectar.

## Como funciona o sync
1. Busca as mídias do mês na conta (`/{ig-user-id}/media`, paginado).
2. Matching mídia ↔ post do cronograma:
   - primeiro pelo `ig_media_id` salvo em syncs anteriores (exato);
   - depois por **data de publicação** (fuso America/Sao_Paulo) + similaridade
     de palavras entre legenda e copy/título; par único no dia casa direto.
3. Para cada mídia associada busca insights (`reach`, `saved`, `shares`,
   `views`/`plays` para Reels) com fallback de métricas não suportadas.
4. Preenche `metric_*` nos posts — as **mesmas colunas** do registro manual,
   então o Relatório Mensal e as sugestões de IA funcionam igual.

Token: armazenamos o **Page Access Token de longa duração**, que não expira.
Se a Meta invalidar (troca de senha, remoção de permissão), o sync retorna
"Token expirado ou inválido — reconecte a conta" e basta conectar de novo.

## Sincronização automática diária

Rota: `GET /api/social-media/instagram/cron-sync`, protegida por
`Authorization: Bearer <CRON_SECRET>` (env já gerada no `.env.local`).
- Sincroniza **todas** as contas conectadas (mês corrente; nos 5 primeiros dias
  do mês também o mês anterior, pois métricas de fim de mês ainda crescem).
- Lógica compartilhada com o botão manual (`lib/server/instagram-sync.ts`) —
  matching, insights e importação de posts feitos fora do planejamento.
- Teste manual local:
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/social-media/instagram/cron-sync`
- Não esqueça de definir `CRON_SECRET` também nas envs do serviço do frontend
  na hospedagem (junto com META_APP_ID, META_APP_SECRET, META_LOGIN_CONFIG_ID
  e SUPABASE_SERVICE_ROLE_KEY).

### Agendadores (hospedagem no Render)
1. **GitHub Actions (GRATUITO — recomendado)**: template pronto em
   `docs/instagram-sync.workflow.yml`. Para ativar:
   a) copie o arquivo para `.github/workflows/instagram-sync.yml` — via
      interface web do GitHub (Add file → Create new file), pois push por
      token exige o escopo `workflow` no Personal Access Token
      (github.com/settings/tokens → editar token → marcar `workflow`);
   b) configure 2 secrets no repo (Settings → Secrets and variables → Actions):
      `SYNC_URL` (URL do front + rota) e `CRON_SECRET`;
   c) teste pela aba Actions → "Instagram Sync Diário" → Run workflow.
2. **Render Cron Job (~US$ 1/mês)**: serviço `isoscanning-instagram-sync` já
   descrito no `isoscanning-backend/render.yaml` — defina `SYNC_URL` e
   `CRON_SECRET` no dashboard do Render.
3. **cron-job.org (gratuito, sem código)**: crie um job diário chamando a URL
   com o header `Authorization: Bearer <CRON_SECRET>`.

O `vercel.json` na raiz agenda o mesmo cron automaticamente caso o projeto um
dia seja hospedado na Vercel — é ignorado no Render, pode manter.

## Checklist de PRODUÇÃO (qualquer cliente conectando a própria conta)

Pré-requisitos no código: JÁ PRONTOS — guia de conexão no modal
(`components/social-media/instagram-guide.tsx`), páginas públicas
`/privacidade` e `/exclusao-de-dados`.

### A. Deploy (Render)
1. Envs no serviço do frontend: `META_APP_ID`, `META_APP_SECRET`,
   `META_LOGIN_CONFIG_ID`, `SUPABASE_SERVICE_ROLE_KEY` (+ `CRON_SECRET` quando
   ativar o cron).
2. Migrations 42/43/44 aplicadas no Supabase de produção.

### B. Painel da Meta — configuração básica
1. **Facebook Login → Configurações**: adicionar a redirect URI de produção
   `https://SEU_DOMINIO/api/social-media/instagram/callback` (manter a de localhost).
2. **Configurações do app → Básico**, preencher:
   - Ícone do app (1024×1024) e categoria (ex.: "Business and pages")
   - **URL da Política de Privacidade**: `https://SEU_DOMINIO/privacidade`
   - **URL de instruções de exclusão de dados**: `https://SEU_DOMINIO/exclusao-de-dados`
   - Domínio do app: `SEU_DOMINIO`

### C. Portfólio empresarial + verificação (obrigatório p/ acesso avançado)
1. Criar um portfólio em business.facebook.com (Meta Business Suite) se não houver.
2. Vincular o app ao portfólio: Configurações do app → Básico → "Verificação
   empresarial" / conectar portfólio.
3. Concluir a **Verificação do negócio** (Business Verification) no Business
   Manager: Central de segurança → Iniciar verificação → enviar CNPJ/documentos
   + confirmar telefone/site. Leva de horas a alguns dias.

### D. App Review (Acesso Avançado)
1. Análise do app → **Permissões e recursos** → solicitar **Acesso avançado** para:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement` (e `public_profile`, liberado após a verificação).
2. Preencher o formulário de cada permissão: descrever o uso ("exibir métricas
   e relatórios de desempenho das publicações do próprio usuário") e anexar um
   **screencast** mostrando o fluxo real: login → seleção de Página/IG →
   calendário sincronizando → relatório com métricas.
3. Fornecer credenciais de teste (crie um usuário demo na plataforma para o
   revisor da Meta acessar).
4. Enviar para análise (retorno típico: 2 a 10 dias úteis; se reprovar, o
   feedback vem apontando o que corrigir — reenvie).

### E. Publicar
1. Com o acesso avançado aprovado, alternar o **Modo do aplicativo** para
   **"Ao vivo"** (toggle no topo do painel).
2. Testar com uma conta que NÃO tem papel no app (a prova real de produção).

Enquanto o app estiver em desenvolvimento, contas de clientes podem ser
conectadas adicionando o Facebook delas em **Funções do app → Funções →
Testers** (o cliente aceita o convite em developers.facebook.com/requests).

## Evoluções futuras
- Seleção de Página quando o usuário administra várias com IG vinculado
  (hoje: usa a primeira encontrada).
- Métricas de conta (seguidores, alcance do perfil) via
  `/{ig-user-id}/insights` para enriquecer o relatório com evolução mensal.
