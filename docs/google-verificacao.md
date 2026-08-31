# Verificação do app no Google (OAuth) — tutorial

Objetivo: tirar o app "IsoScanning" do modo **Teste** (só até 100 usuários
listados à mão) e deixá-lo **verificado em produção**, para QUALQUER usuário
conectar o Google Agenda sem a tela de "app não verificado".

É gratuito. Nossos escopos (`calendar.freebusy` e `calendar.app.created`) são
**sensíveis, não restritos** — ou seja, passam pela revisão normal do Google,
SEM a auditoria de segurança paga (CASA), que só existe para escopos
restritos como Gmail/Drive. Prazo típico: de alguns dias a ~4 semanas, com
idas e vindas por e-mail.

## Checklist do que a verificação exige

| Item | Status |
|---|---|
| Tela de consentimento completa (Branding) | Parcial — falta logo e links |
| Domínio verificado no **Search Console** pela conta dona do projeto | **Fazer** (passo 1) |
| Política de privacidade pública citando os dados do Google + Uso Limitado | ✅ Pronta — `/privacidade`, seção 4 (deploy desta versão antes de submeter) |
| Termos de uso públicos | ✅ `/termos` |
| Página inicial descrevendo o app no domínio verificado | ✅ `www.isoscanning.com` |
| Justificativa de cada escopo (texto) | ✅ Pronta abaixo — copiar/colar |
| Vídeo demo no YouTube (não listado) | **Gravar** (passo 3, roteiro abaixo) |

> Faça tudo logado em **isoscanning@gmail.com** (a conta dona do projeto no
> Google Cloud). Se outra conta verificar o domínio, a verificação não conta.

## Passo 1 — Verificar o domínio no Search Console

1. Acesse <https://search.google.com/search-console> com `isoscanning@gmail.com`.
2. **Adicionar propriedade** → tipo **Domínio** → `isoscanning.com`.
3. O Google mostra um registro **TXT** (algo como `google-site-verification=...`).
4. No painel do provedor onde o domínio `isoscanning.com` está registrado
   (onde você gerencia o DNS), crie um registro **TXT** no host `@` com esse
   valor. TTL padrão.
5. Volte ao Search Console → **Verificar**. DNS pode demorar minutos a
   algumas horas para propagar; se falhar, espere e tente de novo.

Bônus: essa verificação é a mesma pendência do SEO da comunidade — mata dois
coelhos.

## Passo 2 — Completar o Branding

Google Cloud → **Google Auth Platform → Branding**:

1. **Logotipo**: agora sim, suba o logo (120×120 px, fundo simples — o JPG da
   marca em `marketing/inpi` serve como base; recorte quadrado).
2. **Página inicial do aplicativo**: `https://www.isoscanning.com`
3. **Link da Política de Privacidade**: `https://www.isoscanning.com/privacidade`
4. **Link dos Termos de Serviço**: `https://www.isoscanning.com/termos`
5. **Domínios autorizados**: `isoscanning.com` (só aceita depois do passo 1).
6. **Salvar**.

Confira também em **Acesso a dados** se os três escopos estão declarados:
`openid`, `.../auth/userinfo.email`, `.../auth/calendar.freebusy` e
`.../auth/calendar.app.created`.

## Passo 3 — Gravar o vídeo demo

Requisitos do Google: mostrar o fluxo OAuth **de verdade**, com a **barra de
endereço visível** (para ver o domínio e o `client_id` na URL de
consentimento), e mostrar **como cada escopo é usado** no app. Pode ser sem
narração; 2–4 minutos; suba no **YouTube como "Não listado"**.

Roteiro (grave a tela inteira do navegador):

1. Abra `https://www.isoscanning.com`, mostre a home por 2 s e faça login.
2. Vá em **Dashboard → Minha Agenda → Configurar agenda pública →
   Calendários conectados**.
3. Clique **Conectar Google Agenda**. Na tela de consentimento do Google,
   PARE 3–4 s mostrando a URL (contém o client_id) e as permissões pedidas.
4. Autorize. De volta ao app, mostre a conexão ativa.
5. **Uso do `calendar.freebusy`**: em outra aba, abra o Google Agenda e crie
   um evento amanhã às 14h. Volte ao IsoScanning → "Sincronizar agora" →
   abra a aba **Visão pública** e mostre o dia marcado como
   parcialmente/indisponível (sem mostrar o título do evento — cite isso numa
   legenda: "only free/busy is read").
6. **Uso do `calendar.app.created`**: no IsoScanning, crie um compromisso na
   aba **Minha agenda**. Abra o Google Agenda e mostre o calendário
   **"IsoScanning"** que apareceu na lista, com o compromisso dentro.
7. Mostre o botão **Desconectar** (e, se quiser, o calendário sumindo).

## Passo 4 — Justificativas de escopo (copiar/colar)

O formulário pede, em inglês, por que cada escopo é necessário.

**`https://www.googleapis.com/auth/calendar.freebusy`**

> IsoScanning is a marketplace where photography, video and 3D-scanning
> professionals publish their availability so clients can hire them. With the
> user's explicit consent, we read only free/busy intervals from their
> calendar to automatically mark those times as unavailable on their public
> profile. We never access event titles, descriptions, attendees or
> locations, and visitors only ever see "unavailable". Data is refreshed
> every 30 minutes, tokens and intervals are stored encrypted (AES-256-GCM),
> and the data is never used for advertising nor shared with third parties.
> This is the narrowest scope that supports this feature.

**`https://www.googleapis.com/auth/calendar.app.created`**

> With the user's explicit consent, IsoScanning creates a single secondary
> calendar named "IsoScanning" in the user's account and mirrors into it the
> appointments and bookings the user manages inside our platform, keeping it
> up to date (create/update/delete). This scope is limited to calendars
> created by our app, so the user's other calendars remain inaccessible. The
> user can disable this at any time in the app, which deletes the mirrored
> calendar from their account.

**`openid` / `email`**

> Used only to identify which Google account is connected (shown in the UI)
> and to prevent duplicate connections.

## Passo 5 — Submeter

1. **Google Auth Platform → Público-alvo** → botão **Publicar app** (de
   "Em teste" para "Em produção"). O console avisa que escopos sensíveis
   exigem verificação → siga para a **Central de verificação**.
2. Na **Central de verificação**, complete o formulário: confirme branding,
   domínios, links, cole as justificativas do passo 4 e o link do vídeo do
   passo 3 → **Enviar para verificação**.
3. Guarde o e-mail de confirmação. A equipe (remetente do domínio
   `google.com`, normalmente "OAuth Verification / Trust & Safety") pode
   responder pedindo ajustes — **responda no MESMO thread** e refaça o que
   pedirem (motivos comuns: vídeo sem a barra de URL, política sem a menção
   ao Uso Limitado, domínio não verificado pela conta certa).

## Enquanto a verificação roda

- **Usuários de teste continuam funcionando** normalmente.
- Com o app "Em produção" mas ainda não verificado, novos usuários veem a
  tela "O Google não verificou este app" (dá para prosseguir em
  Avançado → Acessar) e há um teto de 100 concessões — por isso o caminho
  `.ics` continua exposto na tela como alternativa.
- Nada muda no código: quando a verificação for aprovada, a tela de aviso
  some sozinha.

## Depois de aprovado

- Teste com uma conta que NÃO esteja nos usuários de teste.
- Se um dia mudarmos/adicionarmos escopos, a verificação precisa ser refeita
  para o escopo novo (o app continua funcionando com os já aprovados).
