# Instruções para Configurar o Login com Firebase

## ✅ O que já está pronto:

1. **Código de autenticação completo** - Todas as funções de login, cadastro e recuperação de senha já estão implementadas
2. **Firebase integrado** - O Firebase já está configurado no projeto com suas credenciais
3. **Interface de usuário** - Todas as telas de login, cadastro e recuperação de senha estão prontas

## 🔧 Configurações necessárias no Firebase Console:

Para o login funcionar, você precisa habilitar os métodos de autenticação no Firebase Console:

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: **isoscanner-a9cc7**

### 2. Habilite Authentication (Autenticação)

#### Passo 1: Email/Senha
1. No menu lateral, clique em **"Authentication"** (Autenticação)
2. Clique na aba **"Sign-in method"** (Método de login)
3. Clique em **"Email/Password"** (Email/Senha)
4. **Habilite** a opção "Email/Password"
5. Clique em **"Save"** (Salvar)

#### Passo 2: Google Sign-In
1. Na mesma tela de "Sign-in method"
2. Clique em **"Google"**
3. **Habilite** a opção
4. Adicione um **email de suporte do projeto** (pode ser o seu email)
5. Clique em **"Save"** (Salvar)

### 3. Configure o Firestore Database

#### Criar o banco de dados:
1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Create database"** (Criar banco de dados)
3. Selecione **"Start in production mode"** (Iniciar em modo de produção)
4. Escolha a **localização** (recomendo: southamerica-east1 - São Paulo)
5. Clique em **"Enable"** (Ativar)

#### Configurar regras de segurança:
1. Clique na aba **"Rules"** (Regras)
2. Substitua as regras pelo seguinte código:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Regra para usuários autenticados
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Outras coleções (ajuste conforme necessário)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Clique em **"Publish"** (Publicar)

### 4. Configure o Firebase Storage (Opcional - para fotos de perfil)

1. No menu lateral, clique em **"Storage"**
2. Clique em **"Get started"** (Começar)
3. Aceite as regras padrão
4. Escolha a mesma localização do Firestore
5. Clique em **"Done"** (Concluir)

## 🚀 Como testar o login:

Após configurar tudo no Firebase Console:

1. **Inicie a aplicação** (se ainda não estiver rodando):
   ```bash
   npm run dev
   ```

2. **Acesse** http://localhost:3000

3. **Teste o cadastro**:
   - Vá para `/cadastro`
   - Preencha o formulário
   - Tente criar uma conta

4. **Teste o login**:
   - Vá para `/login`
   - Use as credenciais criadas
   - Ou tente login com Google

## 🐛 Solução de problemas comuns:

### Erro: "Firebase: Error (auth/operation-not-allowed)"
- **Solução**: Email/Password ou Google não estão habilitados no Firebase Console

### Erro: "Firebase: Error (auth/invalid-email)"
- **Solução**: Verifique se o email está no formato correto

### Erro: "Firebase: Error (auth/weak-password)"
- **Solução**: A senha precisa ter pelo menos 6 caracteres (nosso form exige 8)

### Erro: "Firebase: Error (auth/email-already-in-use)"
- **Solução**: Este email já está cadastrado. Tente fazer login ou use outro email

### Erro relacionado ao Firestore
- **Solução**: Verifique se o Firestore Database foi criado e está ativo

## 📝 Recursos disponíveis:

- ✅ Login com Email/Senha
- ✅ Login com Google
- ✅ Cadastro de usuários (Cliente ou Profissional)
- ✅ Recuperação de senha
- ✅ Atualização de perfil
- ✅ Logout

## 🔍 Verificar configuração:

Após fazer as configurações, abra o console do navegador (F12) e procure por:
- ✅ "Firebase inicializado com sucesso!" - Tudo certo!
- ⚠️ "Firebase não está configurado!" - Verifique o arquivo .env.local

