# Configuração do Google Auth no Supabase

Para que o login com Google funcione, você precisa configurar o provedor no painel do Supabase e no Google Cloud Console.

## Passo 1: Configurar o Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um existente.
3. Vá para **APIs e Serviços** > **Tela de permissão OAuth**.
4. Escolha **Externo** e clique em **Criar**.
5. Preencha as informações obrigatórias (Nome do App, E-mail de suporte, etc.) e salve.
6. Vá para **Credenciais** > **Criar Credenciais** > **ID do cliente OAuth**.
7. Selecione **Aplicação Web**.
8. Em **Origens JavaScript autorizadas**, adicione:
   - `https://<seu-projeto>.supabase.co` (URL do seu projeto Supabase)
   - `http://localhost:3000` (para desenvolvimento local)
9. Em **URIs de redirecionamento autorizados**, adicione:
   - `https://<seu-projeto>.supabase.co/auth/v1/callback`
10. Clique em **Criar**.
11. Copie o **ID do Cliente** e a **Chave Secreta do Cliente**.

## Passo 2: Configurar o Supabase

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Vá para **Authentication** > **Providers**.
3. Selecione **Google**.
4. Ative o provedor (**Enable Google**).
5. Cole o **Client ID** e o **Client Secret** que você copiou do Google Cloud.
6. Clique em **Save**.

## Passo 3: Configurar Variáveis de Ambiente

Certifique-se de que o arquivo `isoscanning/frontend/.env.local` contém as chaves corretas do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anonima>
```

## Passo 4: URL de Redirecionamento (Site URL)

1. No painel do Supabase, vá para **Authentication** > **URL Configuration**.
2. Em **Site URL**, coloque `http://localhost:3000`.
3. Em **Redirect URLs**, adicione `http://localhost:3000/auth/callback`.
4. Salve as alterações.

Após seguir esses passos, o login com Google deve funcionar corretamente.
