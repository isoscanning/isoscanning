# 📱 ISO Scanning - Frontend (Next.js)

Marketplace para profissionais de fotografia e audiovisual.

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- Backend rodando em `http://localhost:4000`

### Instalação

```bash
# Instalar dependências
npm install

# Criar arquivo .env.local
cp .env.example .env.local

# Rodar em desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

## 📦 Variáveis de Ambiente

Criar arquivo `.env.local`:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_API_TIMEOUT=30000

# Environment
NEXT_PUBLIC_ENV=development
```

**Sem nenhuma variável do Supabase!** Tudo passa pelo Backend.

## 🔗 Integração Backend

O frontend se comunica **APENAS** com o Backend NestJS através de:

- **Cliente HTTP:** Axios (`lib/api-service.ts`)
- **Autenticação:** Backend JWT (`lib/auth-context.tsx`)
- **Dados:** Backend API (`lib/data-service.ts`)

### Fluxo de Autenticação

**Email/Senha:**

```
Frontend → Backend (/auth/login ou /auth/signup)
        → Backend verifica com Supabase Auth
        → Retorna JWT Token
```

**Google OAuth:**

```
Frontend → Backend (/auth/google-login)
        → Backend retorna Google OAuth URL
        → Browser redireciona para Google Login
        → Google redireciona para /auth/callback
        → Frontend envia code para Backend
        → Backend troca code por JWT (Supabase)
        → Frontend armazena JWT e acessa app
```

## 📁 Estrutura

```
lib/
├── api-service.ts       # Cliente HTTP centralizado
├── auth-context.tsx     # Contexto de autenticação (Backend)
├── data-service.ts      # Serviços de dados
└── utils.ts            # Utilitários

app/
├── layout.tsx          # Layout raiz
├── page.tsx            # Página inicial
├── login/              # Login (email + Google)
├── cadastro/           # Signup (email + Google)
├── auth/callback/      # OAuth callback
├── dashboard/          # Dashboard do usuário
├── equipamentos/       # Listagem de equipamentos
└── profissionais/      # Listagem de profissionais
```

## 🛠️ Build

```bash
npm run build
npm start
```

## 🔑 Autenticação

### Signup com Email/Senha

- Campo: nome completo
- Campo: email
- Campo: senha (mín. 8 caracteres)
- Escolher: Cliente ou Profissional

### Login com Google

- Clique em "Cadastrar com Google" ou "Entrar com Google"
- Backend solicita OAuth URL ao Supabase
- Frontend redireciona para Google Login
- Após login, Google redireciona para `/auth/callback`
- Frontend troca o code pelo JWT
- Perfil criado/atualizado automaticamente

## 📝 Licença

Privado - ISO Scanning
