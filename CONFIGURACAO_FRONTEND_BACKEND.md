# 🔗 Guia de Integração Frontend ↔ Backend

## 📋 1. CONFIGURAR VARIÁVEIS DE AMBIENTE DO FRONTEND

### Arquivo: `frontend/.env.local`

Crie este arquivo com as seguintes variáveis:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_API_TIMEOUT=30000

# Environment
NEXT_PUBLIC_ENV=development
```

**⚠️ IMPORTANTE:**

- `NEXT_PUBLIC_` significa que é acessível no frontend (não coloque secrets aqui!)
- Substitua `seu-projeto` pela sua URL Supabase
- A porta `4000` é a padrão do NestJS backend

---

## 🪣 2. CRIAR BUCKET NO SUPABASE PARA ARQUIVOS

### Passo 1: Acessar Supabase Storage

1. Acesse seu projeto Supabase: https://supabase.com/dashboard
2. Clique em **Storage** na barra lateral esquerda

### Passo 2: Criar Novo Bucket

1. Clique em **Create a new bucket**
2. Preencha com:

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **Name**          | `equipments`                                           |
| **Public bucket** | ✅ Sim (para poder fazer download público das imagens) |

3. Clique **Create bucket**

### Passo 3: Configurar Políticas de Acesso

Após criar o bucket, você precisa configurar as regras de acesso. Clique em **Policies** no bucket `equipments`:

#### Policy 1: Permitir Upload (Usuários autenticados)

```sql
-- Nome: "Permitir upload para usuários autenticados"
-- Tipo: INSERT

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Permitir Leitura Pública

```sql
-- Nome: "Permitir leitura pública"
-- Tipo: SELECT

CREATE POLICY "Qualquer um pode ver as imagens"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'equipments');
```

#### Policy 3: Permitir Exclusão (Proprietário)

```sql
-- Nome: "Proprietário pode deletar"
-- Tipo: DELETE

CREATE POLICY "Usuários podem deletar suas próprias imagens"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'equipments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Estrutura de Pastas Recomendada

```
equipments/
├── {user-id}/
│   ├── 1697800000000-camera.jpg
│   ├── 1697800001000-lente.jpg
│   └── ...
├── {another-user-id}/
│   ├── 1697800000000-drone.jpg
│   └── ...
```

**Padrão de nome de arquivo:**

```
{timestamp}-{nome-original}.{ext}
```

---

## 🔌 3. CRIAR SERVIÇO DE API DO FRONTEND

### Arquivo: `frontend/lib/api-service.ts`

Crie este arquivo para centralizar as chamadas ao backend:

```typescript
import axios, { AxiosInstance, AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000");

// Criar instância do Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token de autenticação
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("supabase_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("supabase_auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🛠️ 4. ADAPTAR DATA-SERVICE PARA CHAMAR API

### Atualizar `frontend/lib/data-service.ts`

**Antes (Firebase):**

```typescript
export async function fetchEquipments(): Promise<Equipment[]> {
  const q = query(collection(db, "equipments"), where("available", "==", true));
  const querySnapshot = await getDocs(q);
  // ... Firebase logic
}
```

**Depois (API):**

```typescript
import apiClient from "./api-service";

export async function fetchEquipments(): Promise<Equipment[]> {
  try {
    const response = await apiClient.get(
      "/equipments?limit=100&availableOnly=true"
    );
    return response.data.data || response.data;
  } catch (error) {
    console.error("Erro ao buscar equipamentos:", error);
    throw new Error("Erro ao buscar equipamentos");
  }
}

export async function createEquipment(
  data: CreateEquipmentData
): Promise<string> {
  try {
    const response = await apiClient.post("/equipments", data);
    return response.data.id;
  } catch (error) {
    console.error("Erro ao criar equipamento:", error);
    throw new Error("Erro ao criar equipamento");
  }
}

export async function updateEquipment(
  equipmentId: string,
  data: Partial<CreateEquipmentData>
): Promise<void> {
  try {
    await apiClient.put(`/equipments/${equipmentId}`, data);
  } catch (error) {
    console.error("Erro ao atualizar equipamento:", error);
    throw new Error("Erro ao atualizar equipamento");
  }
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  try {
    await apiClient.delete(`/equipments/${equipmentId}`);
  } catch (error) {
    console.error("Erro ao deletar equipamento:", error);
    throw new Error("Erro ao deletar equipamento");
  }
}

// Para uploads, usar Supabase Storage diretamente
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadEquipmentImages(
  files: File[],
  userId: string
): Promise<string[]> {
  try {
    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const path = `${userId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("equipments")
        .upload(path, file);

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("equipments")
        .getPublicUrl(path);

      return urlData.publicUrl;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    throw new Error("Erro ao fazer upload das imagens");
  }
}
```

---

## 🔐 5. ATUALIZAR AUTH-CONTEXT PARA SUPABASE

### Arquivo: `frontend/lib/auth-context-supabase.tsx`

```typescript
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";
import apiClient from "./api-service";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  userType: "client" | "professional";
  city?: string;
  state?: string;
  phone?: string;
  specialty?: string;
  description?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão salva
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session?.access_token) {
        localStorage.setItem("supabase_auth_token", session.access_token);
        // Buscar perfil do backend
        try {
          const response = await apiClient.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
        }
      }
      setLoading(false);
    };
    getSession();
  }, []);

  // Monitorar mudanças de autenticação
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.access_token) {
        localStorage.setItem("supabase_auth_token", session.access_token);
        try {
          const response = await apiClient.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
        }
      } else {
        setUser(null);
        localStorage.removeItem("supabase_auth_token");
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => {
    try {
      const response = await apiClient.post("/auth/signup", {
        email,
        password,
        displayName: userData.displayName || email.split("@")[0],
        userType: userData.userType || "client",
        ...userData,
      });

      if (response.data.accessToken) {
        localStorage.setItem("supabase_auth_token", response.data.accessToken);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("Erro ao registrar:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      if (response.data.accessToken) {
        localStorage.setItem("supabase_auth_token", response.data.accessToken);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem("supabase_auth_token");
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signUp, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 📝 6. ATUALIZAR PACKAGE.JSON

Adicione axios ao frontend:

```bash
cd frontend
npm install axios
```

---

## ✅ 7. CHECKLIST DE INTEGRAÇÃO

- [ ] Criar arquivo `.env.local` no frontend
- [ ] Configurar `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- [ ] Criar bucket `equipments` no Supabase Storage
- [ ] Configurar políticas de acesso do bucket
- [ ] Criar `lib/api-service.ts` para chamadas centralizadas
- [ ] Atualizar `lib/data-service.ts` para usar API
- [ ] Atualizar `lib/auth-context.tsx` para usar Supabase/API
- [ ] Instalar `axios`: `npm install axios`
- [ ] Testar sign up/login
- [ ] Testar upload de imagens
- [ ] Testar listagem de equipamentos

---

## 🚀 8. RODAR APLICAÇÃO COMPLETA

Terminal 1 (Backend):

```bash
cd backend
npm run start:dev
```

Terminal 2 (Frontend):

```bash
cd frontend
npm run dev
```

Acesse: http://localhost:3000

---

## 🔗 ENDPOINTS DO BACKEND

| Endpoint          | Método | Descrição                        |
| ----------------- | ------ | -------------------------------- |
| `/auth/signup`    | POST   | Registrar usuário                |
| `/auth/login`     | POST   | Fazer login                      |
| `/auth/me`        | GET    | Dados do usuário (requer token)  |
| `/equipments`     | GET    | Listar equipamentos              |
| `/equipments`     | POST   | Criar equipamento (requer token) |
| `/equipments/:id` | PUT    | Atualizar equipamento            |
| `/equipments/:id` | DELETE | Deletar equipamento              |
| `/profiles`       | GET    | Listar profissionais             |
| `/profiles/:id`   | GET    | Obter profissional               |
| `/bookings`       | GET    | Listar agendamentos              |
| `/bookings`       | POST   | Criar agendamento                |

---

**Última atualização:** 20/10/2025
