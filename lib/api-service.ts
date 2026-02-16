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
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers = config.headers || {};
      // Ensure we don't overwrite if already set (though usually we want to enforce the token)
      // Use bracket notation to be safe with Axios header objects
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para tratar erros
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Check for specific header or config to skip redirect
    // Axios config headers can be in different places depending on version/context
    const skipRedirect = error.config?.headers?.["X-Skip-Auth-Redirect"] ||
      error.config?.headers?.["x-skip-auth-redirect"];

    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && !skipRedirect) {
        // Prevent redirect loop if already on login page OR in the auth callback phase
        const currentPath = window.location.pathname;
        if (currentPath === "/login" || currentPath === "/auth/callback") {
          console.warn(`[api-service] 401 Unauthorized on ${currentPath}, suppressing redirect to allow page-level handling`);
          if (error.response?.data) {
            console.error("[api-service] Backend error data:", error.response.data);
          }
          return Promise.reject(error);
        }

        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_profile");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
