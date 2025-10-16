# 🔥 Guia Completo de Configuração do Firebase

Este guia detalha todos os passos necessários para configurar o Firebase para o marketplace de profissionais de fotografia e audiovisual.

---

## 📋 Índice

1. [Criar Projeto Firebase](#1-criar-projeto-firebase)
2. [Configurar Authentication](#2-configurar-authentication)
3. [Configurar Firestore Database](#3-configurar-firestore-database)
4. [Configurar Storage](#4-configurar-storage)
5. [Configurar Analytics](#5-configurar-analytics)
6. [Obter Credenciais](#6-obter-credenciais)
7. [Estrutura do Banco de Dados](#7-estrutura-do-banco-de-dados)
8. [Regras de Segurança](#8-regras-de-segurança)

---

## 1. Criar Projeto Firebase

### Passo 1.1: Acessar Firebase Console
1. Acesse [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Faça login com sua conta Google
3. Clique em **"Adicionar projeto"** ou **"Create a project"**

### Passo 1.2: Configurar o Projeto
1. **Nome do projeto**: Digite um nome (ex: "marketplace-fotografos")
2. Clique em **"Continuar"**
3. **Google Analytics**: Deixe habilitado (recomendado)
4. Clique em **"Continuar"**
5. **Conta do Analytics**: Selecione ou crie uma conta
6. Clique em **"Criar projeto"**
7. Aguarde a criação (pode levar 1-2 minutos)
8. Clique em **"Continuar"**

### Passo 1.3: Adicionar App Web
1. Na página inicial do projeto, clique no ícone **"</>"** (Web)
2. **Nome do app**: Digite um nome (ex: "Marketplace Web")
3. **Firebase Hosting**: Pode deixar desmarcado por enquanto
4. Clique em **"Registrar app"**
5. **IMPORTANTE**: Copie o objeto `firebaseConfig` que aparece na tela
   - Você vai precisar desses valores para as variáveis de ambiente
6. Clique em **"Continuar no console"**

---

## 2. Configurar Authentication

### Passo 2.1: Habilitar Authentication
1. No menu lateral, clique em **"Authentication"** (ou **"Autenticação"**)
2. Clique em **"Get started"** ou **"Vamos começar"**

### Passo 2.2: Habilitar Email/Senha
1. Na aba **"Sign-in method"** (Método de login)
2. Clique em **"Email/Password"** (Email/Senha)
3. **Habilite** a primeira opção: "Email/Password"
4. A segunda opção "Email link" pode deixar desabilitada
5. Clique em **"Salvar"**

### Passo 2.3: Habilitar Google Sign-In
1. Ainda na aba **"Sign-in method"**
2. Clique em **"Google"**
3. **Habilite** o provedor
4. **Email de suporte do projeto**: Selecione seu email
5. Clique em **"Salvar"**

### Passo 2.4: Configurar Domínios Autorizados
1. Na aba **"Settings"** (Configurações) do Authentication
2. Role até **"Authorized domains"** (Domínios autorizados)
3. Adicione seus domínios:
   - `localhost` (já deve estar)
   - Seu domínio de produção quando tiver (ex: `seuapp.vercel.app`)

---

## 3. Configurar Firestore Database

### Passo 3.1: Criar Banco de Dados
1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"** ou **"Create database"**

### Passo 3.2: Escolher Modo
1. Selecione **"Iniciar no modo de produção"** (Production mode)
   - Vamos configurar as regras de segurança depois
2. Clique em **"Avançar"**

### Passo 3.3: Escolher Localização
1. Selecione a localização mais próxima dos seus usuários
   - Para Brasil: **"southamerica-east1"** (São Paulo)
   - Ou: **"us-east1"** (Carolina do Sul) - mais barato
2. Clique em **"Ativar"**
3. Aguarde a criação do banco (pode levar 1-2 minutos)

---

## 4. Configurar Storage

### Passo 4.1: Habilitar Storage
1. No menu lateral, clique em **"Storage"**
2. Clique em **"Get started"** ou **"Vamos começar"**

### Passo 4.2: Configurar Regras
1. Selecione **"Iniciar no modo de produção"** (Production mode)
2. Clique em **"Avançar"**

### Passo 4.3: Escolher Localização
1. Use a **mesma localização** que escolheu para o Firestore
2. Clique em **"Concluído"**

---

## 5. Configurar Analytics

O Analytics já foi habilitado quando você criou o projeto. Não precisa fazer nada adicional.

---

## 6. Obter Credenciais

### Passo 6.1: Acessar Configurações do Projeto
1. Clique no ícone de **engrenagem** ⚙️ no menu lateral
2. Clique em **"Configurações do projeto"** ou **"Project settings"**

### Passo 6.2: Copiar Credenciais
1. Role até a seção **"Seus aplicativos"** ou **"Your apps"**
2. Você verá o app web que criou
3. Role até ver o objeto `firebaseConfig`
4. Copie os seguintes valores:

\`\`\`javascript
const firebaseConfig = {
  apiKey: "AIza...",              // ← NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "seu-projeto.firebaseapp.com",  // ← NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "seu-projeto",       // ← NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "seu-projeto.appspot.com",   // ← NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789", // ← NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123", // ← NEXT_PUBLIC_FIREBASE_APP_ID
  measurementId: "G-XXXXXXXXXX"   // ← NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
\`\`\`

### Passo 6.3: Adicionar Variáveis de Ambiente no v0
1. Na interface do v0, clique em **"Vars"** na barra lateral esquerda
2. Adicione cada variável com seu respectivo valor:

| Nome da Variável | Valor do Firebase |
|-----------------|-------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Valor de `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Valor de `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Valor de `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Valor de `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Valor de `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Valor de `appId` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Valor de `measurementId` |

---

## 7. Estrutura do Banco de Dados

O Firestore é um banco NoSQL baseado em coleções e documentos. Abaixo está a estrutura completa que a aplicação usa:

### 7.1 Coleção: `users`
Armazena informações dos usuários (clientes e profissionais).

**Caminho**: `/users/{userId}`

**Campos**:
\`\`\`typescript
{
  // Campos comuns
  uid: string,              // ID do usuário (mesmo do Authentication)
  email: string,            // Email do usuário
  displayName: string,      // Nome completo
  photoURL?: string,        // URL da foto de perfil
  userType: "client" | "professional", // Tipo de usuário
  createdAt: Timestamp,     // Data de criação
  updatedAt: Timestamp,     // Data de atualização
  
  // Campos específicos para profissionais (quando userType === "professional")
  bio?: string,             // Biografia
  specialties?: string[],   // Ex: ["Casamentos", "Eventos Corporativos"]
  location?: string,        // Ex: "São Paulo, SP"
  phone?: string,           // Telefone de contato
  website?: string,         // Site pessoal
  instagram?: string,       // @usuario
  priceRange?: string,      // Ex: "R$ 1.000 - R$ 3.000"
  experience?: string,      // Ex: "5 anos"
  equipment?: string[],     // Equipamentos que possui
  services?: string[],      // Serviços oferecidos
  rating?: number,          // Média de avaliações (0-5)
  reviewCount?: number,     // Número de avaliações
}
\`\`\`

**Exemplo de documento**:
\`\`\`json
{
  "uid": "abc123",
  "email": "joao@exemplo.com",
  "displayName": "João Silva",
  "photoURL": "https://...",
  "userType": "professional",
  "bio": "Fotógrafo especializado em casamentos...",
  "specialties": ["Casamentos", "Ensaios"],
  "location": "São Paulo, SP",
  "phone": "(11) 98765-4321",
  "priceRange": "R$ 2.000 - R$ 5.000",
  "rating": 4.8,
  "reviewCount": 15,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
\`\`\`

---

### 7.2 Coleção: `equipment`
Armazena equipamentos disponíveis para venda, aluguel ou empréstimo.

**Caminho**: `/equipment/{equipmentId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID do equipamento
  ownerId: string,          // ID do profissional dono
  ownerName: string,        // Nome do dono
  ownerPhoto?: string,      // Foto do dono
  title: string,            // Título do anúncio
  description: string,      // Descrição detalhada
  category: string,         // Ex: "Câmeras", "Lentes", "Iluminação"
  brand: string,            // Marca
  model: string,            // Modelo
  condition: "novo" | "usado" | "seminovo", // Condição
  negotiationType: "venda" | "aluguel" | "gratuito", // Tipo
  price?: number,           // Preço (para venda)
  dailyRate?: number,       // Diária (para aluguel)
  images: string[],         // URLs das imagens
  location: string,         // Localização
  available: boolean,       // Disponível?
  createdAt: Timestamp,     // Data de criação
  updatedAt: Timestamp,     // Data de atualização
}
\`\`\`

**Exemplo de documento**:
\`\`\`json
{
  "id": "eq123",
  "ownerId": "abc123",
  "ownerName": "João Silva",
  "title": "Canon EOS R5 - Estado de Nova",
  "description": "Câmera profissional...",
  "category": "Câmeras",
  "brand": "Canon",
  "model": "EOS R5",
  "condition": "seminovo",
  "negotiationType": "venda",
  "price": 18000,
  "images": ["https://...", "https://..."],
  "location": "São Paulo, SP",
  "available": true,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
\`\`\`

---

### 7.3 Coleção: `portfolio`
Armazena itens do portfólio dos profissionais.

**Caminho**: `/portfolio/{portfolioId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID do item
  professionalId: string,   // ID do profissional
  title: string,            // Título do trabalho
  description?: string,     // Descrição
  category: string,         // Ex: "Casamento", "Evento Corporativo"
  imageUrl: string,         // URL da imagem principal
  images?: string[],        // URLs de imagens adicionais
  date?: Timestamp,         // Data do trabalho
  location?: string,        // Local do trabalho
  createdAt: Timestamp,     // Data de criação
}
\`\`\`

---

### 7.4 Coleção: `reviews`
Armazena avaliações de profissionais.

**Caminho**: `/reviews/{reviewId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID da avaliação
  professionalId: string,   // ID do profissional avaliado
  clientId: string,         // ID do cliente que avaliou
  clientName: string,       // Nome do cliente
  clientPhoto?: string,     // Foto do cliente
  rating: number,           // Nota (1-5)
  comment: string,          // Comentário
  serviceType: string,      // Tipo de serviço
  createdAt: Timestamp,     // Data da avaliação
}
\`\`\`

---

### 7.5 Coleção: `quoteRequests`
Armazena solicitações de orçamento.

**Caminho**: `/quoteRequests/{requestId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID da solicitação
  clientId: string,         // ID do cliente
  clientName: string,       // Nome do cliente
  clientEmail: string,      // Email do cliente
  clientPhone: string,      // Telefone do cliente
  professionalId: string,   // ID do profissional
  professionalName: string, // Nome do profissional
  serviceType: string,      // Tipo de serviço
  eventDate: Timestamp,     // Data do evento
  location: string,         // Local do evento
  guestCount?: number,      // Número de convidados
  duration?: string,        // Duração estimada
  description: string,      // Descrição detalhada
  budget?: string,          // Orçamento estimado
  status: "pending" | "accepted" | "rejected" | "completed", // Status
  createdAt: Timestamp,     // Data de criação
  updatedAt: Timestamp,     // Data de atualização
}
\`\`\`

---

### 7.6 Coleção: `bookings`
Armazena agendamentos confirmados.

**Caminho**: `/bookings/{bookingId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID do agendamento
  clientId: string,         // ID do cliente
  clientName: string,       // Nome do cliente
  clientEmail: string,      // Email do cliente
  clientPhone: string,      // Telefone do cliente
  professionalId: string,   // ID do profissional
  professionalName: string, // Nome do profissional
  serviceType: string,      // Tipo de serviço
  date: Timestamp,          // Data do serviço
  startTime: string,        // Hora de início (ex: "14:00")
  endTime: string,          // Hora de término (ex: "18:00")
  location: string,         // Local
  notes?: string,           // Observações
  status: "pending" | "confirmed" | "cancelled" | "completed", // Status
  createdAt: Timestamp,     // Data de criação
  updatedAt: Timestamp,     // Data de atualização
}
\`\`\`

---

### 7.7 Coleção: `availability`
Armazena disponibilidade dos profissionais.

**Caminho**: `/availability/{availabilityId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID da disponibilidade
  professionalId: string,   // ID do profissional
  date: Timestamp,          // Data
  startTime: string,        // Hora de início (ex: "09:00")
  endTime: string,          // Hora de término (ex: "18:00")
  available: boolean,       // Disponível? (false = bloqueado)
  reason?: string,          // Motivo do bloqueio (se aplicável)
  createdAt: Timestamp,     // Data de criação
}
\`\`\`

---

### 7.8 Coleção: `equipmentProposals`
Armazena propostas de negociação de equipamentos.

**Caminho**: `/equipmentProposals/{proposalId}`

**Campos**:
\`\`\`typescript
{
  id: string,               // ID da proposta
  equipmentId: string,      // ID do equipamento
  equipmentTitle: string,   // Título do equipamento
  buyerId: string,          // ID do interessado
  buyerName: string,        // Nome do interessado
  buyerEmail: string,       // Email do interessado
  buyerPhone: string,       // Telefone do interessado
  sellerId: string,         // ID do vendedor
  negotiationType: "venda" | "aluguel", // Tipo
  proposedPrice?: number,   // Preço proposto (para venda)
  startDate?: Timestamp,    // Data início (para aluguel)
  endDate?: Timestamp,      // Data fim (para aluguel)
  message: string,          // Mensagem
  status: "pending" | "accepted" | "rejected" | "negotiating", // Status
  createdAt: Timestamp,     // Data de criação
  updatedAt: Timestamp,     // Data de atualização
}
\`\`\`

---

## 8. Regras de Segurança

### 8.1 Regras do Firestore

1. No Firebase Console, vá em **"Firestore Database"**
2. Clique na aba **"Regras"** ou **"Rules"**
3. Substitua o conteúdo por:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se o usuário está autenticado
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Função auxiliar para verificar se é o próprio usuário
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Coleção de usuários
    match /users/{userId} {
      // Qualquer um pode ler perfis públicos
      allow read: if true;
      // Apenas o próprio usuário pode criar/atualizar seu perfil
      allow create, update: if isOwner(userId);
      // Apenas o próprio usuário pode deletar seu perfil
      allow delete: if isOwner(userId);
    }
    
    // Coleção de equipamentos
    match /equipment/{equipmentId} {
      // Qualquer um pode ler equipamentos
      allow read: if true;
      // Apenas usuários autenticados podem criar equipamentos
      allow create: if isSignedIn();
      // Apenas o dono pode atualizar/deletar
      allow update, delete: if isSignedIn() && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Coleção de portfólio
    match /portfolio/{portfolioId} {
      // Qualquer um pode ler portfólios
      allow read: if true;
      // Apenas usuários autenticados podem criar
      allow create: if isSignedIn();
      // Apenas o dono pode atualizar/deletar
      allow update, delete: if isSignedIn() && 
        resource.data.professionalId == request.auth.uid;
    }
    
    // Coleção de avaliações
    match /reviews/{reviewId} {
      // Qualquer um pode ler avaliações
      allow read: if true;
      // Apenas usuários autenticados podem criar avaliações
      allow create: if isSignedIn();
      // Apenas o autor pode atualizar/deletar
      allow update, delete: if isSignedIn() && 
        resource.data.clientId == request.auth.uid;
    }
    
    // Coleção de solicitações de orçamento
    match /quoteRequests/{requestId} {
      // Apenas o cliente ou profissional envolvido pode ler
      allow read: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
      // Apenas usuários autenticados podem criar
      allow create: if isSignedIn();
      // Apenas o profissional pode atualizar o status
      allow update: if isSignedIn() && 
        resource.data.professionalId == request.auth.uid;
      // Apenas o cliente pode deletar
      allow delete: if isSignedIn() && 
        resource.data.clientId == request.auth.uid;
    }
    
    // Coleção de agendamentos
    match /bookings/{bookingId} {
      // Apenas o cliente ou profissional envolvido pode ler
      allow read: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
      // Apenas usuários autenticados podem criar
      allow create: if isSignedIn();
      // Ambos podem atualizar (para mudar status)
      allow update: if isSignedIn() && (
        resource.data.clientId == request.auth.uid ||
        resource.data.professionalId == request.auth.uid
      );
      // Apenas o cliente pode deletar
      allow delete: if isSignedIn() && 
        resource.data.clientId == request.auth.uid;
    }
    
    // Coleção de disponibilidade
    match /availability/{availabilityId} {
      // Qualquer um pode ler disponibilidades
      allow read: if true;
      // Apenas o profissional pode criar/atualizar/deletar
      allow create, update, delete: if isSignedIn() && 
        request.resource.data.professionalId == request.auth.uid;
    }
    
    // Coleção de propostas de equipamentos
    match /equipmentProposals/{proposalId} {
      // Apenas comprador ou vendedor podem ler
      allow read: if isSignedIn() && (
        resource.data.buyerId == request.auth.uid ||
        resource.data.sellerId == request.auth.uid
      );
      // Apenas usuários autenticados podem criar
      allow create: if isSignedIn();
      // Ambos podem atualizar (para negociar)
      allow update: if isSignedIn() && (
        resource.data.buyerId == request.auth.uid ||
        resource.data.sellerId == request.auth.uid
      );
      // Apenas o comprador pode deletar
      allow delete: if isSignedIn() && 
        resource.data.buyerId == request.auth.uid;
    }
  }
}
\`\`\`

4. Clique em **"Publicar"** ou **"Publish"**

### 8.2 Regras do Storage

1. No Firebase Console, vá em **"Storage"**
2. Clique na aba **"Regras"** ou **"Rules"**
3. Substitua o conteúdo por:

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Função auxiliar para verificar se o usuário está autenticado
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Função auxiliar para verificar tamanho do arquivo (máx 10MB)
    function isValidSize() {
      return request.resource.size < 10 * 1024 * 1024;
    }
    
    // Função auxiliar para verificar tipo de arquivo (apenas imagens)
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Pasta de fotos de perfil
    match /profile-photos/{userId}/{allPaths=**} {
      // Qualquer um pode ler
      allow read: if true;
      // Apenas o próprio usuário pode fazer upload
      allow write: if isSignedIn() && 
                      request.auth.uid == userId && 
                      isValidSize() && 
                      isImage();
    }
    
    // Pasta de portfólio
    match /portfolio/{professionalId}/{allPaths=**} {
      // Qualquer um pode ler
      allow read: if true;
      // Apenas o profissional pode fazer upload
      allow write: if isSignedIn() && 
                      request.auth.uid == professionalId && 
                      isValidSize() && 
                      isImage();
    }
    
    // Pasta de equipamentos
    match /equipment/{ownerId}/{allPaths=**} {
      // Qualquer um pode ler
      allow read: if true;
      // Apenas o dono pode fazer upload
      allow write: if isSignedIn() && 
                      request.auth.uid == ownerId && 
                      isValidSize() && 
                      isImage();
    }
  }
}
\`\`\`

4. Clique em **"Publicar"** ou **"Publish"**

---

## 9. Verificação Final

### Checklist de Configuração

- [ ] Projeto Firebase criado
- [ ] App Web registrado
- [ ] Authentication habilitado (Email/Senha + Google)
- [ ] Firestore Database criado
- [ ] Storage habilitado
- [ ] Regras de segurança do Firestore publicadas
- [ ] Regras de segurança do Storage publicadas
- [ ] Variáveis de ambiente copiadas e adicionadas no v0
- [ ] Aplicação recarregada no v0

### Testando a Configuração

1. Recarregue a aplicação no v0
2. O banner de aviso do Firebase deve desaparecer
3. Tente criar uma conta com email/senha
4. Tente fazer login com Google
5. Navegue pelas páginas de profissionais e equipamentos
6. Tente criar um perfil de profissional

---

## 10. Próximos Passos

Após a configuração básica, você pode:

1. **Adicionar índices compostos** no Firestore conforme necessário
   - O Firebase vai sugerir automaticamente quando você fizer queries complexas
   
2. **Configurar backup automático** do Firestore
   - Vá em Firestore > Backups
   
3. **Monitorar uso** no painel do Firebase
   - Firestore: 50k leituras/dia grátis
   - Storage: 5GB grátis
   - Authentication: ilimitado no plano gratuito

4. **Configurar domínio personalizado** quando for para produção
   - Authentication > Settings > Authorized domains

---

## 11. Suporte

Se encontrar problemas:

1. Verifique o console do navegador (F12) para erros
2. Verifique as regras de segurança do Firestore e Storage
3. Confirme que todas as variáveis de ambiente estão corretas
4. Verifique se os serviços estão habilitados no Firebase Console

---

## 📚 Recursos Úteis

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Documentação do Firestore](https://firebase.google.com/docs/firestore)
- [Documentação do Authentication](https://firebase.google.com/docs/auth)
- [Documentação do Storage](https://firebase.google.com/docs/storage)
- [Regras de Segurança](https://firebase.google.com/docs/rules)

---

**Última atualização**: Janeiro 2025
