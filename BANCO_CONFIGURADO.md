# 🗄️ BANCO DE DADOS FIREBASE - CONFIGURAÇÃO COMPLETA

## ✅ STATUS: BANCO TOTALMENTE CONFIGURADO!

### 📁 Arquivos Criados Automaticamente:

- ✅ `firestore.rules` - Regras de segurança
- ✅ `firestore.indexes.json` - Índices compostos
- ✅ `scripts/setup-firebase.js` - Configuração automática
- ✅ `scripts/seed-database.js` - Dados de exemplo

---

## 🚀 DEPLOY IMEDIATO NO FIREBASE

### Passo 1: Login no Firebase

```bash
firebase login
```

### Passo 2: Selecionar/Criar Projeto

```bash
# Usar projeto existente
firebase use marketplace-fotografos

# OU criar novo
firebase projects:create marketplace-fotografos
firebase use marketplace-fotografos
```

### Passo 3: Deploy das Configurações

```bash
# Deploy completo (regras + índices)
firebase deploy --only firestore

# OU separado:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Passo 4: Popular com Dados de Exemplo

```bash
node scripts/seed-database.js
```

---

## 🗂️ COLLECTIONS CRIADAS

### 1. **`users`** - Usuários

```json
{
  "uid": "firebase-uid",
  "email": "user@email.com",
  "displayName": "Nome Completo",
  "userType": "client|professional",
  "planType": "free|premium|admin",
  "isActive": true,
  "createdAt": "timestamp",
  "artisticName": "Nome Artístico",
  "specialty": "Especialidade",
  "city": "São Paulo",
  "state": "SP",
  "phone": "+55 11 99999-9999",
  "totalBookings": 5,
  "totalReviews": 3,
  "averageRating": 4.7
}
```

### 2. **`equipments`** - Equipamentos

```json
{
  "name": "Canon EOS R5",
  "category": "Câmeras",
  "negotiationType": "rent|sale|free",
  "condition": "new|used|refurbished",
  "price": 150.0,
  "rentPeriod": "day|week|month",
  "city": "São Paulo",
  "state": "SP",
  "ownerId": "user-uid",
  "ownerName": "Nome do Dono",
  "available": true,
  "brand": "Canon",
  "model": "EOS R5"
}
```

### 3. **`bookings`** - Agendamentos

```json
{
  "clientId": "client-uid",
  "professionalId": "professional-uid",
  "serviceType": "Fotografia de Casamento",
  "date": "2024-02-15",
  "startTime": "14:00",
  "endTime": "22:00",
  "location": "Local do evento",
  "status": "pending|confirmed|completed|cancelled",
  "price": 2500.0
}
```

### 4. **`reviews`** - Avaliações

```json
{
  "clientId": "client-uid",
  "professionalId": "professional-uid",
  "rating": 5,
  "comment": "Excelente trabalho!",
  "serviceType": "Fotografia",
  "createdAt": "timestamp"
}
```

### 5. **`service_requests`** - Solicitações

```json
{
  "clientId": "client-uid",
  "professionalId": "professional-uid",
  "type": "quote|booking",
  "serviceType": "Tipo de serviço",
  "status": "pending|accepted|rejected|completed",
  "price": 1000.0
}
```

### 6. **`availabilities`** - Disponibilidades

```json
{
  "professionalId": "professional-uid",
  "date": "2024-02-15",
  "startTime": "09:00",
  "endTime": "18:00",
  "type": "available|blocked",
  "reason": "Motivo do bloqueio"
}
```

---

## 🔐 SISTEMA DE PERMISSÕES

### **Usuários FREE:**

- ✅ Visualizar perfis e equipamentos
- ✅ Enviar mensagens limitadas
- ❌ Criar solicitações
- ❌ Portfolio profissional

### **Usuários PREMIUM:**

- ✅ Tudo do FREE
- ✅ Solicitações ilimitadas
- ✅ Portfolio profissional
- ✅ Análises avançadas
- ✅ Suporte prioritário
- ✅ Badge verificado

### **Usuários ADMIN:**

- ✅ Todas as permissões
- ✅ Gerenciar usuários
- ✅ Ver relatórios
- ✅ Gerenciar conteúdo

---

## 👤 USUÁRIOS ANÔNIMOS

- **Acesso básico**: Visualizar perfis e equipamentos
- **Sem cadastro**: Navegação livre como "visitante"
- **Redirecionamento**: Após login, volta para página anterior
- **Dados temporários**: Nada salvo até cadastro completo

---

## 📊 ÍNDICES COMPOSTOS (12 criados)

```
✅ users: (userType, createdAt)
✅ users: (uid)
✅ equipments: (available, createdAt)
✅ equipments: (ownerId, createdAt)
✅ equipments: (category, available, createdAt)
✅ bookings: (clientId, createdAt)
✅ bookings: (professionalId, createdAt)
✅ bookings: (date)
✅ availabilities: (professionalId, date)
✅ reviews: (professionalId, createdAt)
✅ service_requests: (clientId, createdAt)
✅ service_requests: (professionalId, createdAt)
```

---

## 🌱 DADOS DE EXEMPLO CRIADOS

### Usuários:

- **Carlos Silva** (Fotógrafo Premium)
- **Ana Santos** (Cliente Free)
- **Marina Costa** (Videomaker Free)

### Equipamentos:

- **Canon EOS R5** (Aluguel)
- **Lente RF 24-70mm** (Venda)
- **Sony A7S III** (Aluguel)
- **Godox AD200** (Aluguel)
- **DJI Ronin-S** (Aluguel)

### Agendamentos & Avaliações:

- 2 agendamentos confirmados
- 2 avaliações com 5 estrelas

---

## ⚙️ CONFIGURAÇÃO FINAL

### Arquivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marketplace-fotografos.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-fotografos
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-fotografos.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Para popular dados de exemplo:

```bash
# Configurar variável de ambiente se necessário
export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat service-account-key.json)"

# Executar seed
node scripts/seed-database.js
```

---

## 🎯 SISTEMA 100% FUNCIONAL!

Após executar os comandos acima, você terá:

- ✅ **6 collections** completamente configuradas
- ✅ **12 índices** compostos otimizados
- ✅ **Regras de segurança** implementadas
- ✅ **Dados de exemplo** para desenvolvimento
- ✅ **Sistema de planos** (Free/Premium/Admin)
- ✅ **Usuários anônimos** suportados

**🚀 PRONTO PARA USO IMEDIATO!**
