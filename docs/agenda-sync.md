# Agenda avançada + sincronização com calendários

Implementado em 2026-08-31. Este documento cobre o que foi construído, o que
custa (nada), e o que precisa ser configurado para ligar cada parte.

## O que existe

| Recurso | Onde | Precisa configurar? |
|---|---|---|
| Semana padrão (recorrência), datas específicas, bloqueios manuais, preferências | NestJS `availability` + `/dashboard/agenda` | Só a migration 68 |
| Agenda efetiva calculada (perfil público) | `GET /api/availability/agenda` | Só a migration 68 |
| **Exportar**: feed `.ics` para Google/Apple/Outlook assinarem | `GET /api/availability/feed/:token.ics` | `API_PUBLIC_URL` no backend |
| **Importar por link `.ics`** (iCloud/Apple, Outlook, Google "endereço secreto") | `POST /api/agenda/connections` (Next) | `ENCRYPTION_KEY` + `SUPABASE_SERVICE_ROLE_KEY` no front |
| **Importar do Google por OAuth** (um clique, refresh automático) | `/api/agenda/google/*` (Next) | Projeto no Google Cloud (abaixo) |
| Sincronização automática ("fechar datas sozinho") | `GET /api/agenda/cron-sync` | Agendador gratuito (GitHub Actions) |

Tudo isso é **gratuito**: a Google Calendar API não é cobrada (limite gratuito
de 1.000.000 requisições/dia por projeto — uma sincronização usa 1 a 3);
iCloud e Outlook não têm API pública gratuita com OAuth, mas publicam links
`.ics` que lemos sem custo; o feed de exportação é servido pela nossa própria API.

### Privacidade

De calendários externos gravamos **somente intervalos de tempo** (`calendar_busy`:
data, início, fim). Título, participantes, local e descrição nunca chegam ao
banco. No Google pedimos o escopo `calendar.freebusy` — o mais estreito que
existe: a API devolve literalmente "ocupado das 14h às 16h" e nada mais.

Tokens OAuth e a URL `.ics` (que é secreta — quem a tem lê o calendário) são
cifrados em repouso com a mesma `ENCRYPTION_KEY` do CPF (AES-256-GCM).

## 1. Banco

Aplique `isoscanning-backend/database/68-agenda-avancada.sql` no SQL Editor do
Supabase. Ela:

- troca o índice único da `availability` de `(profissional, data)` para
  `(profissional, data, início, fim, tipo)` — várias janelas por dia;
- cria `availability_rules`, `availability_settings`, `calendar_connections`,
  `calendar_busy` com RLS.

Sem ela, a agenda continua funcionando só com datas específicas (o backend
trata a ausência das tabelas novas como "sem recorrência / sem conexões").

## 2. Feed de exportação (IsoScanning → calendário pessoal)

No backend (Render), defina `API_PUBLIC_URL=https://SEU-BACKEND.onrender.com`
(sem barra final). É a URL que o Google/Apple vão chamar para ler o feed. Sem
ela o link gerado aponta para localhost.

O feed contém as janelas publicadas (eventos "transparentes", não marcam
ocupado) e os agendamentos pendentes/confirmados (opacos). Não contém o que
foi importado de outros calendários — evitaria eco.

Frequência de atualização é decidida pelo cliente: Google ~12–24 h, Apple e
Outlook respeitam o `REFRESH-INTERVAL` (1 h).

## 3. Importar por link `.ics` (funciona hoje, sem Google Cloud)

Pré-requisitos no **frontend** (Render/`.env.local`): `ENCRYPTION_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` (os mesmos do Instagram).

Onde o usuário acha o link:

- **iCloud / Apple**: app Calendário → (i) do calendário → "Calendário público"
  → copiar link `webcal://…`. Recorrências e exceções vêm no arquivo e nosso
  parser expande RRULE/EXDATE/RECURRENCE-ID.
- **Google sem OAuth**: Configurações → calendário → "Endereço secreto no
  formato iCal". Atualiza sempre que o cron roda (o Google serve o arquivo na hora).
- **Outlook**: Configurações → Calendário → Calendários compartilhados →
  Publicar → link ICS.

Limites: 5 conexões por profissional, arquivo até 5 MB, timeout 25 s.

## 4. Google Agenda por OAuth (um clique)

### 4.1 Criar as credenciais (≈ 15 min, gratuito)

1. <https://console.cloud.google.com> → criar projeto "IsoScanning".
2. **APIs e serviços → Biblioteca** → ativar **Google Calendar API**.
3. **APIs e serviços → Tela de consentimento OAuth**:
   - Tipo: **Externo**. Nome do app, e-mail de suporte, logo, domínio
     `isoscanning.com`, links de política de privacidade e termos.
   - **Escopos**: adicionar `https://www.googleapis.com/auth/calendar.freebusy`
     (e os não sensíveis `openid`, `email`).
   - **Usuários de teste**: enquanto o app estiver em "Teste", só até 100
     contas listadas aqui conseguem conectar. Adicione as suas.
4. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - URIs de redirecionamento autorizados:
     - `https://www.isoscanning.com/api/agenda/google/callback`
     - `http://localhost:3000/api/agenda/google/callback` (dev)
   - Copie **ID do cliente** e **Chave secreta**.

### 4.2 Envs no frontend

```
GOOGLE_CALENDAR_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
# opcional — só se a URL pública não for detectável pelos headers do proxy
GOOGLE_CALENDAR_REDIRECT_URI=https://www.isoscanning.com/api/agenda/google/callback
```

A tela "Sincronização" mostra "integração não configurada" enquanto essas envs
faltarem (`GET /api/agenda/google/connect` devolve o que está faltando).

### 4.3 Verificação do app (para abrir ao público)

`calendar.freebusy` é um escopo **sensível**: em produção, para qualquer
conta (não só usuários de teste) o Google exige a **verificação do app**. É
gratuita e pede: tela de consentimento completa, domínio verificado no Search
Console, política de privacidade pública explicando o uso ("lemos apenas
horários livre/ocupado para bloquear datas no seu perfil"), e um vídeo curto
mostrando o fluxo. Prazo típico: alguns dias a poucas semanas. Enquanto isso:
usuários de teste funcionam normalmente; os demais podem usar o link `.ics`
(item 3), que não depende de verificação.

Escopo mínimo é decisão consciente: se no futuro quisermos listar os
calendários da conta (para o usuário escolher quais bloqueiam), seria preciso
adicionar `calendar.calendars.readonly` — outro escopo sensível. Hoje usamos
`primary`; IDs extras de calendário podem ser passados por `PATCH
/api/agenda/connections/:id` (`calendarIds`).

## 5. Sincronização automática

`GET /api/agenda/cron-sync` (header `Authorization: Bearer $CRON_SECRET`)
sincroniza todas as conexões ligadas. Uma rodada gasta 1–3 requisições por
conexão; rodar a cada 30 min está muito abaixo de qualquer limite.

Opção gratuita já pronta: copie `docs/agenda-sync.workflow.yml` para
`.github/workflows/agenda-sync.yml` no repositório e defina os secrets
`AGENDA_SYNC_URL` (= `https://SEU-FRONT/api/agenda/cron-sync`) e
`CRON_SECRET`. O workflow do Instagram (`instagram-sync.workflow.yml`) segue o
mesmo modelo.

Também há a entrada em `vercel.json` (caso o front vá para a Vercel) e o
comentário em `render.yaml` (Render cobra cron jobs — por isso o GitHub Actions).

Além do cron, o usuário tem "Sincronizar agora" na tela, e o Google é
sincronizado na hora em que conecta.

### Por que polling e não push notifications do Google?

A Calendar API oferece `events.watch` (webhook), mas exige domínio verificado
no Cloud Console, canais que expiram em ≤ 7 dias com renovação, e o escopo
`calendar.events.readonly` (bem mais amplo que `freebusy`, e um evento chegaria
com título etc.). Para "fechar datas no perfil", 30 minutos de atraso são
irrelevantes e o polling é mais simples de manter. Se um dia precisar, a
estrutura (`calendar_connections`, `syncConnection`) já suporta trocar o gatilho.

## 6. Como o cálculo funciona

`agenda.engine.ts` (backend, funções puras, testado):

1. Oferta do dia = janelas da **data específica**, se houver; senão a **semana
   padrão** do dia da semana (se `publish_weekly_rules`).
2. Cortes = **bloqueios manuais** + **calendar_busy** (se `auto_block_external`)
   + **antecedência mínima** (nada nas próximas N horas).
3. Perfil público ainda aplica **horizonte** (padrão 90 dias) e nunca mostra
   passado. O dono (`/agenda/mine`, feed) vê tudo.

Status por dia: `free` (nada foi cortado), `partial`, `busy` (oferta toda
cortada), ausente = sem informação.

## 7. Agenda pessoal (compromissos)

Migration `69-calendar-events.sql`. O profissional marca compromissos dentro
do sistema (aba **Agenda** em `/dashboard/agenda`): título, dia inteiro ou
horário, vários dias, local, notas, cor, e "bloqueia minha agenda" (desligado
= lembrete).

Privacidade: `calendar_events` não tem leitura pública (RLS só do dono). O
motor lê os compromissos com o client de aplicação e entrega ao perfil
público **somente** o horário fechado (`AgendaDay.blocked`, `fromEvents`),
nunca o conteúdo. Um dia sem semana padrão mas com compromisso aparece como
"fechado" para o visitante — é o comportamento pedido ("o público só vê as
datas fechadas, sem saber quais eventos são").

O feed `.ics` de exportação (privado do dono) inclui os compromissos com
título, então eles aparecem no Google/Apple de quem assinou o feed.

Rotas (todas autenticadas, dono pelo token): `GET/POST /availability/events`,
`PUT/DELETE /availability/events/:id`.

## 8. Público × privado (modelo mental da tela)

- **Minha agenda** (aba 1): a agenda PRIVADA — compromissos com detalhes. Só o dono.
- **Visão pública** (aba 2): exatamente o que um contratante vê no perfil —
  dias de atendimento ("Atende Seg a Sex 09:00–18:00", vindo de
  `AgendaView.weeklyPattern`), datas livres/parciais e datas fechadas. Nunca
  o motivo do fechamento.
- **Configurar agenda pública** (aba 3): as ferramentas que alimentam a visão
  pública — dias de atendimento (semana padrão + preferências), exceções por
  data (janela própria / bloqueio) e calendários conectados (Google/.ics +
  feed de exportação). Um checklist no topo mostra o que falta configurar.

## Envs — resumo

Frontend: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
`GOOGLE_CALENDAR_REDIRECT_URI` (opcional), `CRON_SECRET`, `ENCRYPTION_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

Backend: `API_PUBLIC_URL`.
