# 🚀 Setup Rápido - Login com Firebase

## ✅ O que já foi feito automaticamente:

1. ✅ Firebase configurado com suas credenciais
2. ✅ Arquivo `.env.local` criado
3. ✅ Código de login, cadastro e recuperação de senha implementado
4. ✅ Integração com Google Sign-In pronta
5. ✅ AuthContext configurado
6. ✅ Todas as telas de autenticação prontas

## 🔧 Configure o Firebase Console (2 minutos):

### Passo 1: Habilite Authentication
1. Acesse: **https://console.firebase.google.com/**
2. Selecione o projeto: **isoscanner-a9cc7**
3. Menu lateral → **Authentication** → **Sign-in method**
4. **Habilite "Email/Password"**
5. **Habilite "Google"** (adicione um email de suporte)

### Passo 2: Crie o Firestore Database
1. Menu lateral → **Firestore Database**
2. Clique em **"Create database"**
3. Selecione **"Start in production mode"**
4. Localização: **southamerica-east1** (São Paulo)
5. Clique em **"Enable"**

### Passo 3: Configure as Regras do Firestore
1. Na tela do Firestore, clique em **"Rules"**
2. Cole este código:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Clique em **"Publish"**

## 🧪 Teste a aplicação:

### 1. Verifique o status do Firebase:
```
http://localhost:3000/test-firebase
```

Esta página mostra se o Firebase está configurado corretamente.

### 2. Teste o cadastro:
```
http://localhost:3000/cadastro
```

- Preencha o formulário
- Escolha "Cliente" ou "Profissional"
- Crie uma conta

### 3. Teste o login:
```
http://localhost:3000/login
```

- Use o email e senha que você criou
- Ou tente login com Google

### 4. Teste recuperação de senha:
```
http://localhost:3000/recuperar-senha
```

## 📱 Páginas disponíveis:

- **/** - Home
- **/login** - Página de login
- **/cadastro** - Página de cadastro
- **/recuperar-senha** - Recuperação de senha
- **/dashboard** - Dashboard (requer autenticação)
- **/test-firebase** - Teste de configuração do Firebase

## 🎯 Funcionalidades prontas:

- ✅ Login com email/senha
- ✅ Login com Google
- ✅ Cadastro de usuário (Cliente ou Profissional)
- ✅ Recuperação de senha por email
- ✅ Logout
- ✅ Proteção de rotas autenticadas
- ✅ Perfil de usuário no Firestore
- ✅ Atualização de perfil

## 🐛 Problemas comuns:

### "Firebase não está configurado"
**Solução**: Reinicie o servidor (Ctrl+C e depois `npm run dev`)

### "operation-not-allowed"
**Solução**: Habilite Email/Password no Firebase Console (Authentication → Sign-in method)

### Erro ao criar usuário no Firestore
**Solução**: Crie o Firestore Database e configure as regras

### Google Sign-In não funciona
**Solução**: 
1. Habilite Google no Firebase Console
2. Adicione seu domínio nos "Authorized domains" (localhost já está autorizado por padrão)

## 💡 Dica:

Abra o **Console do Navegador** (F12) para ver os logs do Firebase e debug de autenticação.

---

**Projeto configurado e pronto para uso!** 🎉

