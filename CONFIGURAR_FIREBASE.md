# 🔥 Configuração do Firebase - ISO Scanning

## Passo 1: Adicionar Variáveis de Ambiente no v0

Na **barra lateral esquerda** do chat v0, clique em **"Vars"** e adicione as seguintes variáveis:

### Variáveis Obrigatórias

| Nome da Variável | Valor |
|------------------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyAmB_IrxP1IIOJ0meQXQURZSX0q946I6lM` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `isoscanner-a9cc7.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `isoscanner-a9cc7` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `isoscanner-a9cc7.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `14549206083` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:14549206083:web:62abe30fe35e84bea740f6` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-0W2ZPW2N8C` |

### Como Adicionar

1. Clique em **"Vars"** na barra lateral esquerda
2. Clique em **"Add Variable"**
3. Cole o **nome** da variável (ex: `NEXT_PUBLIC_FIREBASE_API_KEY`)
4. Cole o **valor** correspondente
5. Repita para todas as 7 variáveis
6. **Recarregue a página** após adicionar todas

---

## Passo 2: Configurar Regras de Segurança no Firebase

### 2.1 Regras do Firestore Database

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **isoscanner-a9cc7**
3. Vá em **Firestore Database** → aba **Regras**
4. Cole as regras abaixo:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função helper para verificar autenticação
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Função helper para verificar se é o próprio usuário
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Coleção de usuários
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Coleção de solicitações de orçamento
    match /quoteRequests/{requestId} {
      allow read: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
    }
    
    // Coleção de agendamentos
    match /bookings/{bookingId} {
      allow read: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
    }
    
    // Coleção de equipamentos
    match /equipment/{equipmentId} {
      allow read: if true; // Público para busca
      allow create: if isSignedIn();
      allow update: if isSignedIn() && resource.data.ownerId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.ownerId == request.auth.uid;
    }
    
    // Coleção de propostas de equipamento
    match /equipmentProposals/{proposalId} {
      allow read: if isSignedIn() && (
        resource.data.buyerId == request.auth.uid ||
        resource.data.sellerId == request.auth.uid
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.buyerId == request.auth.uid ||
        resource.data.sellerId == request.auth.uid
      );
    }
    
    // Coleção de disponibilidades
    match /availabilities/{availabilityId} {
      allow read: if true; // Público para busca
      allow create: if isSignedIn();
      allow update: if isSignedIn() && resource.data.professionalId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.professionalId == request.auth.uid;
    }
    
    // Coleção de avaliações
    match /reviews/{reviewId} {
      allow read: if true; // Público
      allow create: if isSignedIn();
      allow update: if isSignedIn() && resource.data.clientId == request.auth.uid;
    }
    
    // Coleção de portfólio
    match /portfolio/{portfolioId} {
      allow read: if true; // Público
      allow create: if isSignedIn();
      allow update: if isSignedIn() && resource.data.professionalId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.professionalId == request.auth.uid;
    }
  }
}
\`\`\`

5. Clique em **Publicar**

### 2.2 Regras do Storage

1. No Firebase Console, vá em **Storage** → aba **Regras**
2. Cole as regras abaixo:

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Função helper para verificar autenticação
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Imagens de perfil
    match /profiles/{userId}/{allPaths=**} {
      allow read: if true; // Público
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Imagens de portfólio
    match /portfolio/{userId}/{allPaths=**} {
      allow read: if true; // Público
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Imagens de equipamentos
    match /equipment/{userId}/{allPaths=**} {
      allow read: if true; // Público
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
  }
}
\`\`\`

3. Clique em **Publicar**

---

## Passo 3: Verificar Configuração

Após adicionar as variáveis e configurar as regras:

1. ✅ Recarregue a página da aplicação
2. ✅ O banner de aviso amarelo deve desaparecer
3. ✅ Você verá a mensagem no console: "✅ [Firebase] Inicializado com sucesso!"
4. ✅ Teste o cadastro e login

---

## Estrutura do Banco de Dados

As coleções serão criadas automaticamente conforme você usar a aplicação:

### Coleções Principais

1. **users** - Perfis de usuários (clientes e profissionais)
2. **quoteRequests** - Solicitações de orçamento
3. **bookings** - Agendamentos confirmados
4. **equipment** - Equipamentos para venda/aluguel
5. **equipmentProposals** - Propostas de compra/aluguel
6. **availabilities** - Disponibilidade dos profissionais
7. **reviews** - Avaliações de profissionais
8. **portfolio** - Trabalhos dos profissionais

---

## Métodos de Autenticação Configurados

✅ **E-mail/Senha** - Ativado
✅ **Google** - Ativado  
✅ **Anônimo** - Ativado (não usado pela aplicação atualmente)

---

## Suporte

Se encontrar problemas:
1. Verifique se todas as 7 variáveis foram adicionadas corretamente
2. Confirme que as regras de segurança foram publicadas
3. Verifique o console do navegador para mensagens de erro
4. Recarregue a página após adicionar as variáveis
