# 🚀 Guia de Deploy - Frontend no Render

Este guia completo vai te ajudar a fazer o deploy do frontend da aplicação IsoScanning no Render.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

1. ✅ Backend já deployado no Render (ver `isoscanning-backend/DEPLOY_RENDER.md`)
2. ✅ URL do backend anotada (ex: `https://isoscanning-backend.onrender.com`)
3. ✅ Credenciais do Supabase (URL e anon key)
4. ✅ Repositório Git com o código

---

## 🌐 Passo 1: Preparar o Frontend

### 1.1 Verificar Configurações

Certifique-se de que o arquivo `next.config.mjs` está correto. Ele deve ter:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
```

### 1.2 Verificar Scripts no package.json

No arquivo `package.json`, certifique-se de que os scripts estão assim:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## 🎯 Passo 2: Deploy no Render

### 2.1 Criar Web Service

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório:
   - Selecione o repositório **isoscanning**

### 2.2 Configurar o Web Service

Preencha os campos:

- **Name**: `isoscanning-frontend` (ou outro nome)
- **Region**: Escolha a mesma região do backend (ex: Oregon)
- **Branch**: `main` (ou `master`)
- **Root Directory**: `frontend` (⚠️ IMPORTANTE!)
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Instance Type**: `Free`

### 2.3 Adicionar Variáveis de Ambiente

⚠️ **MUITO IMPORTANTE**: Role até **"Environment Variables"** e adicione:

| Key | Value | Exemplo |
|-----|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase | `eyJhbGc...` |
| `NEXT_PUBLIC_API_URL` | URL do backend no Render | `https://isoscanning-backend.onrender.com` |
| `NODE_ENV` | `production` | `production` |

⚠️ **ATENÇÃO**: 
- Use `NEXT_PUBLIC_` no início das variáveis que precisam estar disponíveis no browser
- Certifique-se de que a `NEXT_PUBLIC_API_URL` aponta para o backend correto
- NÃO inclua `/` no final da URL do backend

### 2.4 Configurações Avançadas (Opcional)

Se você tiver problemas de build, adicione estas variáveis também:

| Key | Value |
|-----|-------|
| `NODE_VERSION` | `20` |

### 2.5 Finalizar Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (pode levar 5-10 minutos)
3. Quando aparecer **"Your service is live"** ✅, está pronto!

---

## 🔗 Passo 3: Configurar Comunicação Backend ↔ Frontend

### 3.1 Configurar CORS no Backend

O backend já deve ter CORS configurado, mas verifique se está correto.

No arquivo `isoscanning-backend/backend/src/main.ts`, deve ter algo assim:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://seu-frontend.onrender.com', // Adicione a URL do seu frontend
  ],
  credentials: true,
});
```

Se não tiver, adicione e faça um novo deploy do backend.

### 3.2 Atualizar URL no Frontend (se necessário)

Se você mudar a URL do backend, vá no painel do Render:

1. Clique no serviço do frontend
2. Vá em **"Environment"**
3. Edite `NEXT_PUBLIC_API_URL` com a nova URL
4. Clique em **"Save Changes"**
5. O Render fará redeploy automaticamente

---

## 🧪 Passo 4: Testar a Aplicação

### 4.1 Acessar o Frontend

1. No painel do Render, copie a URL do frontend (ex: `https://isoscanning-frontend.onrender.com`)
2. Abra no navegador
3. Você deve ver a home page da aplicação

### 4.2 Testar Funcionalidades

Teste as principais funcionalidades:

- [ ] **Home page** carrega corretamente
- [ ] **Login/Cadastro** funciona
- [ ] **Listar profissionais** mostra os dados do banco
- [ ] **Listar equipamentos** mostra os equipamentos
- [ ] **Ver detalhes** de profissional/equipamento funciona
- [ ] **Criar agendamento** funciona (se logado)

### 4.3 Verificar Console do Navegador

Abra o DevTools (F12) e verifique:
- ✅ Não deve ter erros de CORS
- ✅ Requisições para o backend devem funcionar
- ⚠️ Avisos de TypeScript são normais (ignoramos durante build)

---

## 🐛 Troubleshooting

### Problema: Build falha com "Out of memory"

**Solução**: 
- Aumente o limite de memória do Node:
  
  No **Build Command**, use:
  ```bash
  NODE_OPTIONS='--max-old-space-size=4096' npm run build
  ```

### Problema: Página carrega mas mostra erro "Failed to fetch"

**Solução**:
1. Verifique se a `NEXT_PUBLIC_API_URL` está correta
2. Teste o backend diretamente no navegador
3. Verifique CORS no backend
4. Abra o DevTools e veja o erro exato

### Problema: Imagens não carregam

**Solução**: 
- Adicione o domínio das imagens no `next.config.mjs`:
  ```javascript
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      // Adicione outros domínios conforme necessário
    ],
  }
  ```

### Problema: Aplicação lenta após período de inatividade

**Solução**: Isso é normal no plano gratuito. O serviço "dorme" após 15 minutos de inatividade e leva 30-60 segundos para "acordar".

Opções:
1. Aceitar (é gratuito! 😊)
2. Usar um serviço de ping (ex: [cron-job.org](https://cron-job.org)) para manter ativo
3. Upgrade para plano pago ($7/mês)

### Problema: "Module not found" durante build

**Solução**:
1. Verifique se todas as dependências estão no `package.json`
2. Limpe o cache e rebuilde:
   - No painel do Render, vá em **"Manual Deploy"**
   - Selecione **"Clear build cache & deploy"**

---

## 🔍 Verificar Logs

### Ver logs em tempo real:
1. No painel do Render, clique no frontend
2. Vá na aba **"Logs"**
3. Aqui você vê todas as requisições e erros

### Logs mais úteis:
- **Build logs**: Mostram erros de compilação
- **Runtime logs**: Mostram erros quando a aplicação está rodando
- **Deploy logs**: Mostram o processo de deploy

---

## 🎨 Customizações Opcionais

### Domínio Customizado

Se você tiver um domínio próprio:

1. No painel do Render, vá em **"Settings"**
2. Role até **"Custom Domain"**
3. Clique em **"Add Custom Domain"**
4. Digite seu domínio (ex: `meusite.com.br`)
5. Configure os DNS conforme instruções do Render
6. O Render gerará SSL automaticamente!

### Variáveis de Ambiente Adicionais

Você pode adicionar mais variáveis conforme necessário:

```env
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=UA-XXXXX
NEXT_PUBLIC_SITE_URL=https://www.isoscanning.com   # dominio que responde 200 (o apex redireciona para o www)
```

---

## 📊 Monitoramento

### Analytics

Considere adicionar:
- Google Analytics
- Vercel Analytics (funciona no Render também!)
- Sentry para rastreamento de erros

### Uptime Monitoring

Serviços gratuitos para monitorar se seu site está no ar:
- [UptimeRobot](https://uptimerobot.com)
- [StatusCake](https://www.statuscake.com)
- [Pingdom](https://www.pingdom.com)

---

## 🔄 CI/CD (Deploy Automático)

O Render já faz deploy automático! 🎉

Sempre que você fizer push para a branch principal:
1. Render detecta as mudanças
2. Faz build automaticamente
3. Se o build passar, faz deploy
4. Se falhar, mantém a versão anterior

### Deploy Manual

Se preferir controlar manualmente:
1. Vá em **"Settings"**
2. Desative **"Auto-Deploy"**
3. Para fazer deploy: **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💡 Dicas de Otimização

### Performance

1. **Otimize imagens**: Use Next.js Image component
2. **Code splitting**: Next.js já faz automaticamente
3. **Cache**: Configure cache headers se necessário

### SEO

1. Adicione `metadata` em cada página:
   ```typescript
   export const metadata = {
     title: 'IsoScanning - Marketplace de Fotógrafos',
     description: 'Encontre fotógrafos profissionais e equipamentos',
   }
   ```

2. Adicione `sitemap.xml` e `robots.txt`

---

## 💰 Custos

### Plano Free
- ✅ 750 horas/mês (suficiente para 1 site)
- ✅ Deploy automático
- ✅ SSL gratuito
- ⚠️ Cold starts após inatividade

### Plano Starter ($7/mês)
- ✅ Sempre ativo
- ✅ Mais CPU/RAM
- ✅ Sem cold starts

---

## ✅ Checklist Final

- [ ] Frontend deployado no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Build completou com sucesso
- [ ] Site carrega no navegador
- [ ] Backend está respondendo
- [ ] Listagem de dados funciona
- [ ] Login/Cadastro funciona
- [ ] Imagens carregam corretamente
- [ ] Sem erros no console
- [ ] Testado em diferentes páginas

---

## 🎯 Próximos Passos

Agora que tudo está no ar:

1. ✅ **Teste extensivamente** todas as funcionalidades
2. ✅ **Adicione monitoramento** de uptime
3. ✅ **Configure domínio customizado** (opcional)
4. ✅ **Adicione analytics** para acompanhar uso
5. ✅ **Documente** para sua equipe

---

## 🆘 Precisa de Ajuda?

- 📖 [Documentação do Render](https://render.com/docs)
- 📖 [Documentação do Next.js](https://nextjs.org/docs)
- 💬 [Discord do Render](https://render.com/discord)
- 🎓 [Render YouTube](https://www.youtube.com/@renderHQ)

---

## 🔗 Links Úteis

- **Dashboard Render**: https://dashboard.render.com
- **Supabase Dashboard**: https://app.supabase.com
- **Status do Render**: https://status.render.com

---

**Parabéns! 🎉🎉🎉**

Sua aplicação completa está no ar!

- ✅ **Backend**: Rodando e conectado ao Supabase
- ✅ **Frontend**: Bonito e funcional
- ✅ **Banco de Dados**: Com dados de exemplo
- ✅ **Grátis**: Tudo no plano free!

Agora é só divulgar e usar! 🚀

