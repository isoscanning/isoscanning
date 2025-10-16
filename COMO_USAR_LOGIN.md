# 🚀 Como Usar o Sistema de Login

## 📋 Guia Rápido

### 1️⃣ Primeiro Acesso - Configure o Firebase Console

Antes de começar, você precisa configurar o Firebase Console (leva 2 minutos):

#### Acesse o Firebase Console:
🔗 https://console.firebase.google.com/

#### Habilite Authentication:
1. Selecione o projeto: **isoscanner-a9cc7**
2. Menu lateral → **Authentication**
3. Aba **Sign-in method**
4. Habilite:
   - ✅ **Email/Password**
   - ✅ **Google** (adicione um email de suporte)

#### Crie o Firestore Database:
1. Menu lateral → **Firestore Database**
2. **Create database**
3. **Production mode**
4. Localização: **southamerica-east1** (São Paulo)
5. **Enable**

#### Configure as Regras do Firestore:
1. Aba **Rules**
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

3. **Publish**

---

## 2️⃣ Usando a Aplicação

### 🌐 Acesse a aplicação:
```
http://localhost:3000
```

### 📱 Páginas Disponíveis:

| Página | URL | Descrição |
|--------|-----|-----------|
| Home | `/` | Página inicial |
| Login | `/login` | Fazer login |
| Cadastro | `/cadastro` | Criar nova conta |
| Recuperar Senha | `/recuperar-senha` | Recuperar senha por email |
| Dashboard | `/dashboard` | Área logada (requer autenticação) |
| Teste Firebase | `/test-firebase` | Verificar configuração do Firebase |

---

## 3️⃣ Criar uma Conta

### Opção 1: Cadastro com Email/Senha

1. Acesse: `http://localhost:3000/cadastro`
2. Escolha o tipo de conta:
   - **Cliente**: Para contratar fotógrafos e alugar equipamentos
   - **Profissional**: Para oferecer serviços e equipamentos
3. Preencha o formulário:
   - Nome completo
   - Email
   - Senha (mínimo 8 caracteres)
   - Confirmar senha
4. Clique em **"Criar conta gratuitamente"**
5. Você será redirecionado para o Dashboard

### Opção 2: Cadastro com Google

1. Acesse: `http://localhost:3000/cadastro`
2. Clique em **"Cadastrar com Google"**
3. Selecione sua conta Google
4. Autorize o acesso
5. Você será redirecionado para o Dashboard

---

## 4️⃣ Fazer Login

### Opção 1: Login com Email/Senha

1. Acesse: `http://localhost:3000/login`
2. Digite seu email e senha
3. Clique em **"Entrar"**
4. Você será redirecionado para o Dashboard

### Opção 2: Login com Google

1. Acesse: `http://localhost:3000/login`
2. Clique em **"Entrar com Google"**
3. Selecione sua conta Google
4. Você será redirecionado para o Dashboard

---

## 5️⃣ Recuperar Senha

1. Acesse: `http://localhost:3000/recuperar-senha`
2. Digite seu email
3. Clique em **"Enviar email de recuperação"**
4. Verifique sua caixa de entrada (e spam)
5. Clique no link recebido
6. Crie uma nova senha
7. Faça login com a nova senha

---

## 6️⃣ Persistência e Sincronização

### ✅ A sessão persiste automaticamente:

- **Recarregar a página**: Você permanece logado
- **Fechar e reabrir o navegador**: Você permanece logado
- **Abrir em nova aba**: Você já está logado
- **Login em uma aba**: Sincroniza em todas as abas
- **Logout em uma aba**: Desconecta todas as abas

### 🔐 Como funciona:

O Firebase armazena tokens JWT no localStorage:
- **ID Token**: Válido por 1 hora (renovado automaticamente)
- **Refresh Token**: Usado para renovar o ID Token

---

## 7️⃣ Verificar Configuração

### Teste se tudo está funcionando:

1. Acesse: `http://localhost:3000/test-firebase`
2. Verifique se todos os itens estão marcados com ✅:
   - Firebase Habilitado
   - Firebase App
   - Authentication
   - Firestore Database
   - Storage
   - Analytics

### Se algo estiver com ❌:

- **Firebase não habilitado**: Verifique o arquivo `.env.local`
- **Authentication**: Habilite no Firebase Console
- **Firestore Database**: Crie no Firebase Console

---

## 8️⃣ Recursos Disponíveis

### ✅ Autenticação:
- Login com email/senha
- Login com Google
- Cadastro de usuários (Cliente ou Profissional)
- Recuperação de senha por email
- Logout
- Persistência automática de sessão
- Sincronização entre abas

### ✅ Perfil de Usuário:
- Nome
- Email
- Tipo de conta (Cliente/Profissional)
- Foto de perfil (com Google)
- Dados adicionais no Firestore

### ✅ Segurança:
- Tokens JWT gerenciados automaticamente
- Renovação automática de tokens
- Proteção contra CSRF
- Criptografia de senhas
- Regras de segurança no Firestore

---

## 9️⃣ Problemas Comuns

### ❌ "Firebase: Error (auth/operation-not-allowed)"
**Solução**: Habilite Email/Password ou Google no Firebase Console

### ❌ "Firebase: Error (auth/invalid-email)"
**Solução**: Verifique se o email está no formato correto

### ❌ "Firebase: Error (auth/weak-password)"
**Solução**: Use uma senha com pelo menos 6 caracteres (recomendado 8+)

### ❌ "Firebase: Error (auth/email-already-in-use)"
**Solução**: Este email já está cadastrado. Faça login ou use outro email

### ❌ "Firebase: Error (auth/user-not-found)"
**Solução**: Este email não está cadastrado. Crie uma conta primeiro

### ❌ "Firebase: Error (auth/wrong-password)"
**Solução**: Senha incorreta. Tente novamente ou use "Esqueceu a senha?"

### ❌ Erro ao salvar perfil no Firestore
**Solução**: Verifique se o Firestore Database foi criado e as regras estão configuradas

---

## 🔟 Monitorar no Console do Navegador

### Abra DevTools (F12) e verifique:

```javascript
// Ver mensagens do Firebase
// Procure por:
✅ Firebase inicializado com sucesso!
🔐 Persistência de autenticação habilitada (JWT tokens no localStorage)
```

### Ver tokens armazenados:

1. DevTools (F12)
2. Application → Local Storage
3. `http://localhost:3000`
4. Procure por chaves começando com `firebase:authUser:`

---

## 🎨 Design System Aplicado

### Paleta de Cores:

| Uso | Cor | Aplicação |
|-----|-----|-----------|
| Primária | #2E3A59 (Cinza Azulado) | Botões, headers |
| Secundária | #5D6C8D (Azul Acinzentado) | Backgrounds secundários |
| Destaque | #7BA8D6 (Azul Serenity) | CTAs, links, ícones |
| Fundo Claro | #F4F6F9 (Off-White) | Background geral |
| Fundo Escuro | #1A2233 (Azul Noite) | Dark mode |
| Ações Positivas | #74B49B (Verde Calmo) | Sucesso, confirmações |
| Erros | #F07B70 (Coral Claro) | Erros, alertas |

### Características do Design:

- ✅ Gradientes suaves
- ✅ Sombras profissionais
- ✅ Transições animadas
- ✅ Inputs com feedback visual
- ✅ Loading states
- ✅ Layout responsivo
- ✅ Hero section informativa

---

## 📞 Suporte

### Documentação Adicional:

- `SETUP_RAPIDO.md` - Setup rápido do projeto
- `JWT_E_PERSISTENCIA.md` - Como funciona JWT e persistência
- `FIREBASE_SETUP.md` - Setup detalhado do Firebase
- `INSTRUCOES_LOGIN.md` - Instruções de configuração

### Teste a aplicação:

```bash
# Inicie o servidor (se não estiver rodando)
npm run dev

# Acesse
http://localhost:3000

# Teste o Firebase
http://localhost:3000/test-firebase
```

---

**Pronto! Seu sistema de login está funcionando com Firebase, JWT e persistência entre abas! 🎉**

