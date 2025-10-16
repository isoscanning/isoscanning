# 🚀 GUIA COMPLETO - DEPLOY FIREBASE

## 📋 PRÉ-REQUISITOS

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Fazer Login

```bash
firebase login
```

### 3. Criar/Selecionar Projeto

```bash
# Criar novo projeto
firebase projects:create marketplace-fotografos

# OU usar projeto existente
firebase use marketplace-fotografos
```

---

## 🗄️ DEPLOY DAS COLLECTIONS

### Passo 1: Deploy das Regras de Segurança

```bash
firebase deploy --only firestore:rules
```

### Passo 2: Deploy dos Índices

```bash
firebase deploy --only firestore:indexes
```

### Passo 3: Deploy Completo (Regras + Índices)

```bash
firebase deploy --only firestore
```

---

## 🔧 CONFIGURAÇÃO DA AUTENTICAÇÃO

### No Firebase Console:

1. **Authentication** → **Get started**
2. **Sign-in method** → Ativar:

   - ✅ **Email/Password**
   - ✅ **Google**
   - ✅ **Anonymous** (para usuários visitantes)

3. **Settings** → **Authorized domains**
   - Adicionar: `localhost` (desenvolvimento)
   - Adicionar seu domínio de produção

---

## 🌱 CRIAR DADOS DE EXEMPLO

Execute este script para criar dados de exemplo:

```javascript
// Arquivo: create-sample-data.js
const admin = require("firebase-admin");

// ... (código será gerado automaticamente)
```

---

## 📊 VERIFICAÇÃO

### Verificar se tudo foi configurado:

```bash
firebase projects:list
firebase use marketplace-fotografos
firebase deploy --only firestore --dry-run
```

---

## 🎯 ESTRUTURA CRIADA

### Collections:

- ✅ `users` - Usuários do sistema
- ✅ `equipments` - Equipamentos para aluguel/venda
- ✅ `bookings` - Agendamentos de serviços
- ✅ `availabilities` - Disponibilidades dos profissionais
- ✅ `reviews` - Avaliações dos serviços
- ✅ `service_requests` - Solicitações de orçamento

### Índices Compostos:

- ✅ 12 índices criados automaticamente
- ✅ Otimizados para consultas frequentes

### Regras de Segurança:

- ✅ Controle de acesso por usuário
- ✅ Usuários anônimos podem ler equipamentos
- ✅ Proteção de dados sensíveis

---

## 🚀 PRÓXIMO PASSO

Após o deploy, configure as variáveis de ambiente no arquivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-fotografos
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-fotografos.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

---

## 🖼️ **FIREBASE STORAGE - CONFIGURAÇÃO DE IMAGENS**

### **1. Deploy das Regras do Storage**

```bash
# Deploy das regras do Storage (adicional ao Firestore)
firebase deploy --only storage
```

### **2. Regras Implementadas (`storage.rules`)**

- ✅ **Upload**: Apenas usuários autenticados podem fazer upload
- ✅ **Visualização**: Qualquer pessoa pode ver as imagens dos equipamentos
- ✅ **Limite**: Máximo 1MB por imagem
- ✅ **Tipos**: Apenas JPEG, PNG, WebP
- ✅ **Segurança**: Apenas o dono pode deletar suas imagens

### **3. Estrutura das Imagens**

```
📁 equipment-images/
  ├── 📁 [userId]/
  │   ├── 📄 [userId]_[timestamp]_canon-eos-r5.jpg
  │   ├── 📄 [userId]_[timestamp]_lente-sony.jpg
  │   ├── 📄 [userId]_[timestamp]_tripé.jpg
  │   └── 📄 [userId]_[timestamp]_microfone.jpg (até 5 imagens)
  └── 📁 [outro-userId]/
      └── 📄 ...
```

### **4. Como Funciona o Link**

1. **Upload**: Múltiplas imagens vão para `equipment-images/[userId]/`
2. **URLs**: Firebase Storage gera URLs públicas para cada imagem
3. **Link**: Array de URLs é salvo no campo `imageUrls` do equipamento no Firestore
4. **Exibição**: Frontend usa o array de URLs para mostrar galeria de imagens

---

## 📋 **REGRAS DE SEGURANÇA COMPLETAS**

Para ver todas as regras organizadas e explicadas, consulte o arquivo:
📄 **`FIREBASE_SECURITY_RULES.md`**

---

## 📊 **RESUMO COMPLETO**

### **O que NÃO precisa alterar no Firebase:**

- ❌ **Estrutura do Firestore**: Schemaless, aceita novo campo `imageUrl`
- ❌ **Regras do Firestore**: Não interferem com o campo `imageUrl`
- ❌ **Índices**: Não afetam campos adicionais

### **O que PRECISA ser feito:**

- ✅ **Deploy das regras do Storage**: `firebase deploy --only storage`
- ✅ **Variáveis de ambiente**: STORAGE_BUCKET já configurado
- ✅ **Frontend**: Já implementado e funcionando

**🎉 SISTEMA COMPLETO DE UPLOAD DE IMAGENS PRONTO!**
