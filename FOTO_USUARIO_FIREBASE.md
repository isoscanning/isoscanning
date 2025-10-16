# 📸 Foto do Usuário no Firebase

## ✅ Como Funciona

### A `photoURL` vem automaticamente no token do Firebase!

Quando o usuário faz login com Google, o Firebase retorna automaticamente:

```json
{
  "uid": "mpXMEff5I0XTZhn1jsYY1L4zJ3E2",
  "email": "isoscanning@gmail.com",
  "displayName": "isoscanning",
  "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocLP3eoJo9o-SG9gCsqMSVP9oRahD4mkALyNYo0aPlTGn2bE6w=s96-c",
  ...
}
```

## 🎨 Onde a Foto é Exibida

### 1. Header (Desktop e Mobile)

O componente `Header` agora mostra:

- ✅ **Avatar circular** com a foto do Google
- ✅ **Fallback** com a primeira letra do nome se não tiver foto
- ✅ **Nome do usuário** ao lado do avatar

```tsx
<Avatar className="h-6 w-6">
  <AvatarImage src={user.photoURL || undefined} />
  <AvatarFallback className="bg-accent text-white text-xs">
    {user.displayName?.[0]?.toUpperCase() || "U"}
  </AvatarFallback>
</Avatar>
```

## 📊 Dados Disponíveis do Usuário

### Do Firebase Auth (`user`):

```typescript
user.uid; // ID único do usuário
user.email; // Email
user.emailVerified; // Email verificado?
user.displayName; // Nome do usuário
user.photoURL; // URL da foto (Google, Facebook, etc.)
user.phoneNumber; // Telefone (se fornecido)
```

### Do Firestore (`userProfile`):

```typescript
userProfile.uid; // ID único
userProfile.email; // Email
userProfile.displayName; // Nome
userProfile.photoURL; // Foto (copiada do auth)
userProfile.userType; // "client" ou "professional"
userProfile.createdAt; // Data de criação
userProfile.artisticName; // Nome artístico (profissional)
userProfile.specialty; // Especialidade
userProfile.city; // Cidade
userProfile.state; // Estado
userProfile.phone; // Telefone
```

## 🔧 Como Acessar a Foto

### No código React:

```tsx
import { useAuth } from "@/lib/auth-context";

function MyComponent() {
  const { user, userProfile } = useAuth();

  return (
    <div>
      {/* Foto do usuário */}
      {user?.photoURL && (
        <img src={user.photoURL} alt={user.displayName || "Usuário"} />
      )}

      {/* Nome do usuário */}
      <p>{user?.displayName || userProfile?.displayName || "Usuário"}</p>

      {/* Email */}
      <p>{user?.email}</p>
    </div>
  );
}
```

## 📸 Fontes de Foto

### 1. Login com Google

✅ **Automático**: O Firebase pega a foto do perfil do Google

```
https://lh3.googleusercontent.com/a/ACg8ocL...=s96-c
```

### 2. Login com Email/Senha

❌ **Não tem foto**: `photoURL` será `null`

- Solução: Usar um avatar com iniciais
- Ou permitir upload de foto personalizada

### 3. Outros provedores (Facebook, Twitter, etc.)

✅ **Automático**: Cada provedor fornece sua própria foto

## 🎯 Implementação Atual

### Header atualizado:

```tsx
// Desktop
<Link href="/dashboard">
  <Button
    variant="ghost"
    size="sm"
    className="hover:bg-accent/10 hover:text-accent gap-2"
  >
    <Avatar className="h-6 w-6">
      <AvatarImage
        src={user.photoURL || undefined}
        alt={user.displayName || "Usuário"}
      />
      <AvatarFallback className="bg-accent text-white text-xs">
        {user.displayName?.[0]?.toUpperCase() ||
          user.email?.[0]?.toUpperCase() ||
          "U"}
      </AvatarFallback>
    </Avatar>
    <span className="max-w-[120px] truncate">
      {userProfile?.displayName || user.displayName || "Perfil"}
    </span>
  </Button>
</Link>
```

### Comportamento:

1. **Com foto** (login Google): Mostra a foto circular
2. **Sem foto** (login email): Mostra círculo com inicial do nome
3. **Truncate**: Nome longo é cortado com "..."
4. **Hover**: Muda de cor para o accent

## 🔄 Atualizar a Foto

### Opção 1: Usar a foto do provedor (Google, Facebook)

✅ **Automático**: Já funciona, nada a fazer

### Opção 2: Permitir upload de foto personalizada

```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

async function uploadProfilePhoto(file: File) {
  if (!auth.currentUser) return;

  // Upload para Firebase Storage
  const storageRef = ref(storage, `profile-photos/${auth.currentUser.uid}`);
  await uploadBytes(storageRef, file);

  // Pegar URL da foto
  const photoURL = await getDownloadURL(storageRef);

  // Atualizar perfil do usuário
  await updateProfile(auth.currentUser, { photoURL });

  // Atualizar no Firestore também
  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    {
      photoURL,
    },
    { merge: true }
  );
}
```

## 🎨 Estilos do Avatar

### Tamanhos disponíveis:

```tsx
// Pequeno (header)
<Avatar className="h-6 w-6">

// Médio
<Avatar className="h-10 w-10">

// Grande (perfil)
<Avatar className="h-20 w-20">
```

### Personalização:

```tsx
<Avatar className="h-10 w-10 border-2 border-accent">
  <AvatarImage src={user.photoURL} />
  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
    {user.displayName?.[0]}
  </AvatarFallback>
</Avatar>
```

## 🐛 Problemas Comuns

### "Foto não aparece"

**Causas possíveis:**

1. Login com email/senha (não tem foto)
2. URL da foto inválida
3. Bloqueio de CORS

**Solução:**

```tsx
// Sempre usar fallback
<Avatar>
  <AvatarImage
    src={user.photoURL || undefined}
    onError={(e) => {
      console.error("Erro ao carregar foto:", e);
    }}
  />
  <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
</Avatar>
```

### "Foto fica pixelizada"

**Causa**: URL do Google com tamanho pequeno (`s96-c`)

**Solução**: Mudar o tamanho na URL:

```typescript
// De: s96-c (96x96)
// Para: s200-c (200x200)
const highResPhoto = user.photoURL?.replace("s96-c", "s200-c");
```

## 📋 Checklist de Implementação

- ✅ Avatar no header (desktop)
- ✅ Avatar no header (mobile)
- ✅ Fallback com iniciais
- ✅ Tooltip com nome completo
- ✅ Truncate para nomes longos
- ⏳ Avatar na página de perfil
- ⏳ Upload de foto personalizada
- ⏳ Crop de imagem antes do upload

## 🎯 Próximos Passos (Opcional)

### 1. Página de Perfil Completa

```tsx
function ProfilePage() {
  const { user, userProfile } = useAuth();

  return (
    <div>
      <Avatar className="h-32 w-32">
        <AvatarImage src={user.photoURL} />
        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
      </Avatar>

      <h1>{user.displayName}</h1>
      <p>{user.email}</p>

      {/* Botão para upload de foto */}
      <input type="file" onChange={handlePhotoUpload} />
    </div>
  );
}
```

### 2. Dropdown no Header

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>
      <AvatarImage src={user.photoURL} />
      <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Perfil</DropdownMenuItem>
    <DropdownMenuItem>Configurações</DropdownMenuItem>
    <DropdownMenuItem>Sair</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

---

## ✅ Resumo

**A foto do usuário:**

- ✅ Vem automaticamente no token JWT do Firebase
- ✅ É fornecida pelo Google (ou outro provedor OAuth)
- ✅ Está disponível em `user.photoURL`
- ✅ Aparece no header quando o usuário está logado
- ✅ Tem fallback com iniciais se não houver foto
- ✅ Funciona em desktop e mobile

**Para usar:**

```tsx
const { user } = useAuth();
const photoUrl = user?.photoURL; // URL da foto do Google
const displayName = user?.displayName; // "isoscanning"
const email = user?.email; // "isoscanning@gmail.com"
```

---

**Pronto! A foto do usuário já está funcionando no header! 📸**
