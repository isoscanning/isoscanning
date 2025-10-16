# Marketplace de Fotógrafos e Profissionais Audiovisuais

Plataforma completa para conectar profissionais de fotografia e audiovisual com clientes, incluindo marketplace de equipamentos, sistema de agendamento e avaliações.

## Funcionalidades

### Para Clientes
- Buscar profissionais por especialidade, localização e avaliação
- Solicitar orçamentos
- Agendar serviços
- Avaliar profissionais após o serviço
- Buscar equipamentos para compra ou aluguel

### Para Profissionais
- Criar perfil profissional completo
- Gerenciar portfólio de trabalhos
- Controlar agenda e disponibilidade
- Cadastrar equipamentos para venda/aluguel
- Receber e responder solicitações de orçamento
- Visualizar avaliações de clientes

## Tecnologias

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Firebase** - Backend completo (Auth, Firestore, Storage, Analytics)
- **Tailwind CSS v4** - Estilização
- **shadcn/ui** - Componentes de UI
- **React Hook Form** - Gerenciamento de formulários

## Configuração

### 1. Instalar Dependências

\`\`\`bash
npm install
\`\`\`

### 2. Modo de Desenvolvimento (Mock Data) - RECOMENDADO PARA COMEÇAR

**O sistema funciona imediatamente sem configuração do Firebase!**

Por padrão, o sistema usa dados mockados para facilitar o desenvolvimento. Você pode começar a desenvolver e testar todas as funcionalidades sem precisar configurar nada.

Para alternar entre dados mockados e Firebase real, edite o arquivo `lib/mock-data.ts`:

\`\`\`typescript
// true = usa dados mockados (padrão)
// false = usa Firebase real
export const USE_MOCK_DATA = true
\`\`\`

**Vantagens do Mock Data:**
- ✅ Desenvolvimento sem necessidade de configurar Firebase inicialmente
- ✅ Dados de exemplo prontos para testar todas as funcionalidades
- ✅ Fácil alternância entre mock e produção com uma única variável
- ✅ Autenticação simulada (login automático como usuário teste)
- ✅ Todos os fluxos funcionam perfeitamente

### 3. Executar o Projeto

\`\`\`bash
npm run dev
\`\`\`

Acesse [http://localhost:3000](http://localhost:3000)

**Pronto! O sistema já está funcionando com dados mockados.**

### 4. Configurar Firebase (Quando estiver pronto para produção)

Quando quiser usar o Firebase real:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication (Email/Password e Google)
3. Crie um banco Firestore
4. Ative Storage para upload de imagens
5. Adicione as credenciais no arquivo `.env.local`:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id
\`\`\`

6. Altere `USE_MOCK_DATA` para `false` em `lib/mock-data.ts`

## Estrutura do Projeto

\`\`\`
├── app/                      # Páginas e rotas (App Router)
│   ├── cadastro/            # Registro de usuários
│   ├── login/               # Login
│   ├── dashboard/           # Dashboard do usuário
│   │   ├── perfil/         # Edição de perfil
│   │   ├── portfolio/      # Gerenciamento de portfólio
│   │   ├── equipamentos/   # Gerenciamento de equipamentos
│   │   ├── agenda/         # Calendário e disponibilidade
│   │   └── avaliacoes/     # Visualização de avaliações
│   ├── profissionais/       # Busca e perfis de profissionais
│   ├── equipamentos/        # Marketplace de equipamentos
│   └── agendar/            # Sistema de agendamento
├── components/              # Componentes reutilizáveis
│   ├── ui/                 # Componentes shadcn/ui
│   ├── header.tsx          # Cabeçalho
│   ├── footer.tsx          # Rodapé
│   └── review-form.tsx     # Formulário de avaliação
├── lib/                     # Utilitários e configurações
│   ├── firebase.ts         # Configuração do Firebase
│   ├── auth-context.tsx    # Context de autenticação
│   ├── mock-data.ts        # Dados mockados (ALTERE USE_MOCK_DATA AQUI)
│   └── data-service.ts     # Serviço de dados (mock/Firebase)
└── public/                  # Arquivos estáticos
\`\`\`

## Fluxos Principais

### Cadastro e Login
1. Usuário escolhe entre Cliente ou Profissional
2. Cadastro com email/senha ou Google
3. Profissionais completam perfil com especialidade, localização, etc.

### Busca de Profissionais
1. Cliente busca por especialidade, localização, avaliação
2. Visualiza perfis com portfólio e avaliações
3. Solicita orçamento ou agenda diretamente

### Marketplace de Equipamentos
1. Profissionais cadastram equipamentos (venda/aluguel/gratuito)
2. Usuários buscam por categoria, tipo, localização
3. Negociação direta entre as partes

### Sistema de Avaliações
1. Após conclusão do serviço, cliente pode avaliar
2. Avaliação com estrelas (1-5) e comentário
3. Avaliações aparecem no perfil do profissional

## Dados Mockados Disponíveis

O sistema vem com dados de exemplo prontos:

- **3 Profissionais** com perfis completos, portfólios e avaliações
- **3 Equipamentos** (venda, aluguel e gratuito)
- **Avaliações** de clientes
- **Agendamentos** e orçamentos de exemplo
- **Usuário teste** logado automaticamente

Explore todas as funcionalidades sem precisar cadastrar dados manualmente!

## Próximos Passos

- [x] Estrutura base do projeto
- [x] Sistema de autenticação
- [x] Perfis de usuário
- [x] Busca de profissionais
- [x] Marketplace de equipamentos
- [x] Sistema de agendamento
- [x] Portfólio e avaliações
- [x] Sistema de mock data
- [ ] Configurar Firebase para produção
- [ ] Implementar upload de imagens no Storage
- [ ] Adicionar sistema de mensagens entre usuários
- [ ] Implementar notificações
- [ ] Criar painel administrativo
- [ ] Adicionar sistema de pagamentos

## Conversão para Mobile

O projeto foi desenvolvido com React e pode ser facilmente convertido para aplicativo mobile usando:

- **React Native** - Reutilizar lógica de negócio
- **Expo** - Desenvolvimento rápido
- **Firebase SDK** - Mesma infraestrutura

A estrutura responsiva já está otimizada para mobile, facilitando a conversão.

## Licença

MIT
