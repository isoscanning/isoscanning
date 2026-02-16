"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-service";
import { trackEvent } from "@/lib/analytics";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Verificando sessão...");
  const hasHandled = useRef(false);

  useEffect(() => {
    // Prevent multiple executions in Strict Mode
    if (hasHandled.current) return;
    hasHandled.current = true;

    const handleCallback = async () => {
      try {
        console.log("[auth-callback] Starting authentication callback handler...");

        // 1. Get the session. Supabase handles the code exchange automatically 
        // but we'll be explicit and wait for it.
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session, wait a bit and try once more (sometimes the fragment takes a moment to process)
        if (!session && !sessionError) {
          console.log("[auth-callback] No session found immediately, waiting 1s...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
          sessionError = retry.error;
        }

        if (sessionError) throw sessionError;

        if (!session) {
          console.warn("[auth-callback] Authentication failed: No session detected.");
          throw new Error("Não foi possível estabelecer uma sessão de login. Por favor, tente entrar novamente.");
        }

        console.log("[auth-callback] Session confirmed for user:", session.user.email);
        setStatus("Sessão confirmada! Preparando sua conta...");
        trackEvent({ action: 'login', category: 'Auth', label: 'Google' });

        // 2. Persist tokens for the API client
        localStorage.setItem("auth_token", session.access_token);
        if (session.refresh_token) {
          localStorage.setItem("refresh_token", session.refresh_token);
        }

        // 3. Sync with Backend
        // This is where the backend automatically creates the profile if missing.
        console.log("[auth-callback] Syncing with backend API (/auth/me)...");
        try {
          const response = await apiClient.get("/auth/me", {
            headers: { "X-Skip-Auth-Redirect": "true" }
          });

          const userProfile = response.data;
          console.log("[auth-callback] Backend sync successful. Profile ID:", userProfile.id);

          localStorage.setItem("user_profile", JSON.stringify(userProfile));
          localStorage.removeItem("signupUserType");

          // 4. Determine destination
          let redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
          localStorage.removeItem("redirectAfterLogin");

          if (!userProfile.phone) {
            console.log("[auth-callback] Required info missing (phone), directing to onboarding.");
            redirectUrl = "/onboarding";
          }

          setStatus("Conta pronta! Redirecionando...");

          // Use window.location.href for a full page refresh to ensure all contexts (AuthContext etc)
          // pick up the new localStorage state properly.
          window.location.href = redirectUrl;

        } catch (apiError: any) {
          console.error("[auth-callback] Critical backend sync error:", apiError);
          if (apiError.response?.data) {
            console.error("[auth-callback] Error details:", apiError.response.data);
          }

          const detail = apiError.response?.data?.message || apiError.message || "Erro de conexão com o servidor.";
          throw new Error(`Erro ao sincronizar sua conta: ${detail}`);
        }

      } catch (err: any) {
        console.error("[auth-callback] Final catch:", err);
        setError(err.message || "Ocorreu um erro inesperado durante o login.");

        // Cleanup failed session to allow retry
        await supabase.auth.signOut();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_profile");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {error ? (
          <div className="space-y-6">
            <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <svg className="h-10 w-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Falha no Login</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {error}
              </p>
            </div>

            <button
              onClick={() => window.location.href = "/login"}
              className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <div className="h-20 w-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Autenticando</h2>
              <p className="text-muted-foreground text-sm animate-pulse">
                {status}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
