# 🔐 JWT e Persistência de Sessão no Firebase

## Como funciona o JWT no Firebase Authentication

### ✅ O que já está implementado:

O Firebase Authentication **gerencia automaticamente** os tokens JWT para você. Não é necessário implementar lógica manual de tokens.

## 🎯 Tokens JWT do Firebase

### Tipos de Tokens:

1. **ID Token (JWT)**: Token de autenticação principal
   - Contém informações do usuário (uid, email, etc.)
   - Expira em 1 hora
   - Renovado automaticamente pelo Firebase

2. **Refresh Token**: Token de renovação
   - Usado para obter novos ID Tokens
   - Não expira (permanece válido até ser revogado)
   - Armazenado com segurança pelo Firebase

### 📦 Onde os tokens são armazenados:

```javascript
// Firebase usa browserLocalPersistence por padrão
// Isso armazena os tokens em:
// - localStorage (navegador)
// - IndexedDB (para dados maiores)
```

**Localização no navegador:**
- Abra DevTools (F12)
- Vá em Application → Local Storage
- Procure por chaves começando com `firebase:authUser:`

## 🔄 Sincronização entre abas

### Como funciona:

```javascript
// Configurado em lib/firebase.ts
setPersistence(auth, browserLocalPersistence)
```

**O Firebase automaticamente:**

1. ✅ Detecta mudanças de estado de autenticação
2. ✅ Sincroniza entre todas as abas abertas
3. ✅ Dispara eventos `onAuthStateChanged` em todas as abas
4. ✅ Renova tokens expirados automaticamente

### Teste de sincronização:

1. Abra a aplicação em duas abas
2. Faça login em uma aba
3. A outra aba detectará automaticamente o login
4. Faça logout em uma aba
5. Ambas as abas serão deslogadas

## 📋 Estrutura do Token JWT

### Exemplo de ID Token (decodificado):

```json
{
  "iss": "https://securetoken.google.com/isoscanner-a9cc7",
  "aud": "isoscanner-a9cc7",
  "auth_time": 1234567890,
  "user_id": "abc123...",
  "sub": "abc123...",
  "iat": 1234567890,
  "exp": 1234571490,
  "email": "usuario@exemplo.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["usuario@exemplo.com"]
    },
    "sign_in_provider": "password"
  }
}
```

### Campos importantes:

- **user_id**: ID único do usuário
- **email**: Email do usuário
- **exp**: Tempo de expiração (1 hora após criação)
- **iat**: Tempo de criação
- **sign_in_provider**: Método de login (password, google.com, etc.)

## 🛠️ Implementação no Projeto

### 1. Configuração da Persistência (lib/firebase.ts)

```typescript
import { setPersistence, browserLocalPersistence } from "firebase/auth";

// Configurar persistência local
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("❌ Erro ao configurar persistência:", error);
  });
}
```

### 2. Context de Autenticação (lib/auth-context.tsx)

```typescript
// Monitora mudanças de autenticação
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setUser(user);
    
    if (user) {
      // Buscar perfil do usuário no Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } else {
      setUserProfile(null);
    }
    
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

## 🔍 Como verificar os tokens

### No Console do Navegador:

```javascript
// Obter o token atual do usuário
firebase.auth().currentUser.getIdToken().then(token => {
  console.log("Token JWT:", token);
  
  // Decodificar token (apenas para debug)
  const decoded = JSON.parse(atob(token.split('.')[1]));
  console.log("Token decodificado:", decoded);
});
```

### No código React:

```typescript
import { useAuth } from "@/lib/auth-context";

function MyComponent() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      user.getIdToken().then(token => {
        console.log("Token JWT:", token);
      });
    }
  }, [user]);
}
```

## 🔒 Segurança

### ✅ Boas práticas implementadas:

1. **Tokens no localStorage**: Protegidos por Same-Origin Policy
2. **HTTPS**: Sempre use HTTPS em produção
3. **Renovação automática**: Tokens expirados são renovados automaticamente
4. **Revogação**: Tokens podem ser revogados no Firebase Console

### ⚠️ NUNCA faça:

- ❌ Armazenar tokens manualmente em cookies inseguros
- ❌ Enviar tokens por query parameters
- ❌ Compartilhar tokens entre domínios
- ❌ Desabilitar HTTPS em produção

## 📱 Persistência em diferentes cenários

### Cenário 1: Recarregar a página
✅ **Resultado**: Usuário permanece logado
- Firebase restaura a sessão do localStorage

### Cenário 2: Abrir em nova aba
✅ **Resultado**: Usuário está logado automaticamente
- Firebase compartilha o estado entre abas

### Cenário 3: Fechar e reabrir o navegador
✅ **Resultado**: Usuário permanece logado
- Tokens persistem no localStorage até expiração ou logout

### Cenário 4: Token expira (após 1 hora)
✅ **Resultado**: Firebase renova automaticamente
- Usa o refresh token para obter novo ID token

### Cenário 5: Logout em uma aba
✅ **Resultado**: Logout em todas as abas
- Firebase sincroniza o estado entre abas

## 🧪 Testar a persistência

### 1. Teste básico de login:

```bash
# 1. Abra a aplicação
http://localhost:3000/login

# 2. Faça login

# 3. Abra DevTools (F12)
# Application → Local Storage → http://localhost:3000

# 4. Procure por chaves firebase:authUser:*
# Você verá os tokens armazenados
```

### 2. Teste de sincronização entre abas:

```bash
# 1. Abra duas abas com http://localhost:3000/login

# 2. Faça login na primeira aba

# 3. Vá para a segunda aba
# → Deve redirecionar automaticamente para /dashboard

# 4. Faça logout na primeira aba

# 5. Volte para a segunda aba
# → Deve redirecionar automaticamente para /login
```

### 3. Teste de persistência após reload:

```bash
# 1. Faça login

# 2. Recarregue a página (F5)
# → Deve permanecer logado

# 3. Feche e reabra o navegador
# → Deve permanecer logado

# 4. Abra no modo anônimo
# → Deve pedir login (não compartilha storage)
```

## 📊 Monitoramento de tokens

### Adicione logs para debug:

```typescript
// Em lib/firebase.ts, adicione:
if (typeof window !== "undefined") {
  auth.onIdTokenChanged((user) => {
    if (user) {
      user.getIdToken().then(token => {
        console.log("🔄 Token atualizado");
        console.log("📅 Expira em:", new Date(JSON.parse(atob(token.split('.')[1])).exp * 1000));
      });
    }
  });
}
```

## ✅ Resumo

| Recurso | Status | Descrição |
|---------|--------|-----------|
| JWT Tokens | ✅ Automático | Gerenciado pelo Firebase |
| localStorage | ✅ Configurado | browserLocalPersistence habilitado |
| Refresh Tokens | ✅ Automático | Renovação automática |
| Sincronização entre abas | ✅ Ativo | onAuthStateChanged sincroniza |
| Persistência após reload | ✅ Ativo | Tokens restaurados do storage |
| Expiração de tokens | ✅ Gerenciado | Renovação automática a cada 1h |

---

**Conclusão**: O Firebase Authentication já implementa todo o sistema de JWT, refresh tokens e persistência. Você não precisa gerenciar tokens manualmente! 🎉

