import axios, { AxiosInstance, AxiosError } from "axios";
import { tokenManager } from "./token-manager";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000");

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

// Attach token from centralized manager on every request
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.get();
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// On 401: sync token cache and retry once in case Supabase refreshed the token
// while the request was in-flight. If the retried request also fails, clear
// session and redirect to login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const skipRedirect =
      error.config?.headers?.["X-Skip-Auth-Redirect"] ||
      error.config?.headers?.["x-skip-auth-redirect"];

    if (error.response?.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      if (currentPath === "/login" || currentPath === "/auth/callback") {
        if (error.response?.data) {
          console.error("[api-service] Backend error data:", error.response.data);
        }
        return Promise.reject(error);
      }

      if (!skipRedirect) {
        // Sync cache — Supabase may have already refreshed the token
        const tokenBeforeSync = tokenManager.get();
        tokenManager.sync();
        const tokenAfterSync = tokenManager.get();

        // If a fresh token appeared, retry the original request once
        if (tokenAfterSync && tokenAfterSync !== tokenBeforeSync && error.config) {
          error.config.headers = error.config.headers || {};
          error.config.headers["Authorization"] = `Bearer ${tokenAfterSync}`;
          return apiClient.request(error.config);
        }

        tokenManager.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
