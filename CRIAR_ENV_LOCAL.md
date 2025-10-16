# 📝 Como Criar o Arquivo .env.local

## ⚠️ IMPORTANTE

O arquivo `.env.local` está bloqueado pelo `.gitignore` por motivos de segurança.
Você precisa criar este arquivo manualmente.

## 🛠️ Passo a Passo

### 1. Criar o arquivo

Na raiz do projeto, crie um arquivo chamado `.env.local`

```
marketplace-fotografos/
├── .env.local  ← Criar este arquivo aqui
├── app/
├── components/
├── lib/
└── ...
```

### 2. Adicionar as variáveis

Cole o seguinte conteúdo no arquivo `.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAmB_IrxP1IIOJ0meQXQURZSX0q946I6lM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=isoscanner-a9cc7.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=isoscanner-a9cc7
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=isoscanner-a9cc7.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=14549206083
NEXT_PUBLIC_FIREBASE_APP_ID=1:14549206083:web:62abe30fe35e84bea740f6
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-0W2ZPW2N8C
```

### 3. Salvar o arquivo

Salve o arquivo e reinicie o servidor de desenvolvimento:

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

## ✅ Verificar se funcionou

1. Acesse: http://localhost:3000/test-firebase
2. Todos os itens devem estar com ✅
3. No console do navegador (F12), você deve ver:
   ```
   ✅ Firebase inicializado com sucesso!
   🔐 Persistência de autenticação habilitada (JWT tokens no localStorage)
   ```

## 🔒 Segurança

### ⚠️ NUNCA faça:

- ❌ Commitar o arquivo `.env.local` no Git
- ❌ Compartilhar estas credenciais publicamente
- ❌ Usar estas credenciais em produção sem configurar domínios autorizados

### ✅ Boas práticas:

- ✅ Mantenha `.env.local` no `.gitignore`
- ✅ Use variáveis diferentes para produção
- ✅ Configure domínios autorizados no Firebase Console
- ✅ Use HTTPS em produção

## 🐛 Problemas Comuns

### "Firebase não está configurado"

**Causa**: Arquivo `.env.local` não foi criado ou está com nome errado

**Solução**:
1. Verifique se o arquivo se chama exatamente `.env.local` (com o ponto no início)
2. Verifique se está na raiz do projeto
3. Reinicie o servidor (`npm run dev`)

### "Variável de ambiente undefined"

**Causa**: Servidor não foi reiniciado após criar `.env.local`

**Solução**:
1. Pare o servidor (Ctrl+C)
2. Inicie novamente: `npm run dev`

### Arquivo não aparece no VS Code

**Causa**: Arquivos que começam com `.` podem estar ocultos

**Solução**:
1. No VS Code, vá em File → Preferences → Settings
2. Procure por "files.exclude"
3. Verifique se `.env.local` não está na lista de exclusão

## 📋 Template Completo

Se preferir, copie este template completo:

```env
# ========================================
# Firebase Configuration
# ========================================
# Projeto: isoscanner-a9cc7
# Ambiente: Desenvolvimento Local
# ========================================

# API Key
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAmB_IrxP1IIOJ0meQXQURZSX0q946I6lM

# Auth Domain
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=isoscanner-a9cc7.firebaseapp.com

# Project ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID=isoscanner-a9cc7

# Storage Bucket
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=isoscanner-a9cc7.firebasestorage.app

# Messaging Sender ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=14549206083

# App ID
NEXT_PUBLIC_FIREBASE_APP_ID=1:14549206083:web:62abe30fe35e84bea740f6

# Measurement ID (Analytics)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-0W2ZPW2N8C

# ========================================
# Notas:
# - Reinicie o servidor após editar este arquivo
# - NUNCA commite este arquivo no Git
# - Use credenciais diferentes em produção
# ========================================
```

## 🎯 Checklist Final

- [ ] Arquivo `.env.local` criado na raiz do projeto
- [ ] Variáveis copiadas corretamente
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Teste em `/test-firebase` mostra tudo ✅
- [ ] Console do navegador mostra "Firebase inicializado com sucesso!"

---

**Pronto! Agora seu Firebase está configurado e pronto para uso! 🎉**

