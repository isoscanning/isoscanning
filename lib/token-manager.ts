// Single source of truth for the auth token across auth-context and api-service.
// Keeps an in-memory cache so both modules read the same value without repeated
// localStorage lookups, and avoids the race where Supabase refreshes the token
// while a request is in-flight with the old one.

let _token: string | null = null;

function get(): string | null {
  if (typeof window === "undefined") return null;
  if (_token === null) {
    _token = localStorage.getItem("auth_token");
  }
  return _token;
}

function set(token: string): void {
  _token = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

function clear(): void {
  _token = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_profile");
  }
}

// Re-reads from localStorage — used after a Supabase TOKEN_REFRESHED event
// so the in-memory cache picks up the new value immediately.
function sync(): void {
  if (typeof window !== "undefined") {
    _token = localStorage.getItem("auth_token");
  }
}

// Headers de autenticação para fetch() direto (rotas /app/api).
function authHeader(): Record<string, string> {
  const token = get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const tokenManager = { get, set, clear, sync, authHeader };
