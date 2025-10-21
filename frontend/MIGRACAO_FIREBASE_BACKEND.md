# Migração Firebase → Backend com Supabase

## 📋 Resumo

Este documento descreve a completa migração do frontend de Firebase para um backend NestJS com Supabase. **Todas as interações com dados agora passam pelo backend**, removendo completamente as dependências diretas de Firebase.

---

## ✅ O QUE FOI FEITO

### 1. **Páginas Refatoradas (Agendar, Orçamento, Negociar)**

#### `app/agendar/[id]/page.tsx` - Agendamento de Serviços

- ✅ Fetch profissional via `GET /profiles/{id}`
- ✅ Fetch disponibilidade via `GET /availability?professionalId=...`
- ✅ Create agendamento via `POST /bookings`
- ✅ Uso de `userProfile` do auth system
- ✅ Validação de campos obrigatórios
- ✅ Redirecionamento para dashboard após sucesso

#### `app/orcamento/[id]/page.tsx` - Solicitação de Orçamento

- ✅ Fetch profissional via `GET /profiles/{id}`
- ✅ Create solicitação via `POST /quote-requests`
- ✅ Campos: serviceType, serviceDate, location, description, budget
- ✅ Suporte a orçamento esperado (opcional)
- ✅ Redirecionamento após envio

#### `app/negociar-equipamento/[id]/page.tsx` - Negociação

- ✅ Fetch equipamento via `GET /equipments/{id}`
- ✅ Create proposta via `POST /equipment-proposals`
- ✅ Exibição de detalhes do equipamento
- ✅ Datas opcionais para aluguel (startDate, endDate)
- ✅ Contato telefônico obrigatório

---

### 2. **Páginas do Dashboard (3 novas)**

#### `app/dashboard/solicitacoes/page.tsx` - Lista de Solicitações

- ✅ Fetch solicitações via `GET /quote-requests?clientId=...`
- ✅ Exibição em cards com status (Pendente, Respondido, Cancelado)
- ✅ Informações: data, local, descrição, orçamento
- ✅ Navegação para explorar profissionais se vazio
- ✅ Estados de loading e erro

#### `app/dashboard/agenda/page.tsx` - Lista de Agendamentos

- ✅ Fetch agendamentos via `GET /bookings?userId=...`
- ✅ Filtros por status: Todos, Pendentes, Confirmados, Concluídos
- ✅ Exibição em cards com informações: data, hora, local
- ✅ Badges com cores por status
- ✅ Navegação para agendar novo serviço se vazio

#### `app/dashboard/agenda/disponibilidade/page.tsx` - Gerenciar Disponibilidade

- ✅ Apenas para profissionais (validação de `userType`)
- ✅ Fetch disponibilidades via `GET /availability?professionalId=...`
- ✅ Create via `POST /availability`
- ✅ Delete via `DELETE /availability/{id}`
- ✅ Campos: data, startTime, endTime, type (available/unavailable)
- ✅ Lista lado-a-lado com formulário

---

### 3. **Atualização de Interfaces e Tipos**

#### `lib/data-service.ts`

- ✅ `Equipment` interface com campos: id, name, category, negotiationType, condition, description, brand, model, price, rentPeriod, city, state, imageUrls, ownerId, isAvailable
- ✅ `Professional` interface com: id, displayName, **userType**, email, artisticName, specialty, city, state, avatarUrl, description, averageRating, totalReviews, phone, portfolioLink, isActive
- ✅ Função `fetchProfessionals()` retornando array de Professional

---

### 4. **Endpoints Backend Utilizados**

| Método | Endpoint                                    | Descrição                      |
| ------ | ------------------------------------------- | ------------------------------ |
| GET    | `/profiles/{id}`                            | Fetch profissional específico  |
| GET    | `/profiles?userType=professional&limit=100` | Lista profissionais            |
| GET    | `/availability?professionalId=...`          | Lista disponibilidade          |
| POST   | `/availability`                             | Criar disponibilidade          |
| DELETE | `/availability/{id}`                        | Deletar disponibilidade        |
| POST   | `/bookings`                                 | Criar agendamento              |
| GET    | `/bookings?userId=...`                      | Listar agendamentos            |
| POST   | `/quote-requests`                           | Criar solicitação de orçamento |
| GET    | `/quote-requests?clientId=...`              | Listar solicitações            |
| GET    | `/equipments/{id}`                          | Fetch equipamento específico   |
| POST   | `/equipment-proposals`                      | Criar proposta de negociação   |
| GET    | `/portfolio?professionalId=...`             | Listar portfólio               |

---

## 🚀 COMO TESTAR

### 1. **Inicie o Backend**

```bash
cd backend
npm install
npm run start:dev
# Backend rodando em http://localhost:4000
```

### 2. **Inicie o Frontend**

```bash
cd frontend
npm install
npm run dev
# Frontend rodando em http://localhost:3000
```

### 3. **Teste um Fluxo Completo**

#### A. Cadastro e Login

1. Vá para `/cadastro`
2. Cadastre como Profissional: nome, email, senha
3. Faça login em `/login`
4. Você será redirecionado para `/dashboard`

#### B. Agendar Serviço (Como Cliente)

1. Vá para `/profissionais`
2. Clique em um profissional
3. Clique em "Ver Disponibilidade" ou "Agendar"
4. Preencha: Tipo de Serviço, Local, Data, Hora, Observações
5. Clique em "Agendar Serviço"
6. Vá para `/dashboard/agenda` para ver agendamento

#### C. Gerenciar Disponibilidade (Como Profissional)

1. Faça login como profissional
2. Vá para `/dashboard/agenda/disponibilidade`
3. Adicione horários disponíveis: Data, Hora Início, Hora Fim
4. Escolha tipo: "Disponível" ou "Indisponível"
5. Clique em "Adicionar"
6. Veja a lista à direita atualizando em tempo real

#### D. Solicitar Orçamento

1. Vá para `/profissionais`
2. Clique em um profissional
3. Clique em "Solicitar Orçamento"
4. Preencha: Tipo de Serviço, Data, Local, Descrição, Orçamento (opcional)
5. Clique em "Enviar Solicitação"
6. Vá para `/dashboard/solicitacoes` para ver status

---

## 🔧 ERROS COMUNS E SOLUÇÕES

### Erro: "401 Unauthorized"

- **Causa**: Token JWT expirou ou não foi salvo
- **Solução**: Faça login novamente. O token é salvo em `localStorage` como `auth_token`

### Erro: "404 Not Found"

- **Causa**: Endpoint não existe ou profissionalId/userId incorreto
- **Solução**: Verifique se o backend está rodando e os IDs estão corretos

### Erro: "500 Internal Server Error"

- **Causa**: Backend teve erro ao processar requisição
- **Solução**: Verifique logs do backend (console do npm run start:dev)

### Erro: "Profile not found"

- **Causa**: Usuário logou mas perfil não foi criado no Supabase
- **Solução**: Verifique se a tabela `profiles` tem todos os dados necessários

---

## 📝 VARIÁVEIS DE AMBIENTE

### Frontend (.env.local)

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_API_TIMEOUT=30000

# Environment
NEXT_PUBLIC_ENV=development
```

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Server
NODE_ENV=development
PORT=4000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600
```

---

## 🔐 SEGURANÇA

### Autenticação

- ✅ JWT tokens salvos em `localStorage` como `auth_token`
- ✅ Refresh tokens salvos como `refresh_token`
- ✅ User profile salvo como `user_profile` JSON
- ✅ Tokens injetados automaticamente em todas as requisições via interceptor Axios

### Autorização

- ✅ Profissionais podem gerenciar apenas sua disponibilidade
- ✅ Clientes podem ver apenas suas solicitações
- ✅ Backend valida permissões em cada endpoint

### Row Level Security (Supabase)

- ✅ Aplicado em todas as tabelas
- ✅ Service role do backend pode fazer todas operações
- ✅ Usuários autenticados podem ver apenas seus dados

---

## 📊 FLUXO DE DADOS

```
Frontend (React/Next.js)
    ↓
apiClient (Axios Interceptor com JWT)
    ↓
Backend API (NestJS)
    ↓
Supabase (PostgreSQL + Auth)
```

---

## ✨ PRÓXIMOS PASSOS OPCIONAIS

1. **Implementar Notificações em Tempo Real**

   - WebSockets ou Server-Sent Events
   - Notificar profissional quando receber agendamento

2. **Sistema de Avaliações**

   - Clientes avaliarem profissionais após serviço
   - Profissionais avaliarem clientes

3. **Pagamentos**

   - Integrar Stripe ou PayPal
   - Controlar saldos de transações

4. **Comunicação Direta**

   - Chat entre cliente e profissional
   - Mensagens sobre agendamentos

5. **Relatórios**
   - Dashboard para profissionais com estatísticas
   - Histórico de ganhos

---

## 📚 REFERÊNCIAS

- [NestJS Documentation](https://docs.nestjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Axios Documentation](https://axios-http.com/)

---

**Última atualização**: Outubro 2025
**Status**: ✅ Firebase Completamente Removido
**Próxima fase**: Testes e Deploy
