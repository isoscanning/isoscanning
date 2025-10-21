"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-service";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[auth-callback] Processing OAuth callback...");

        // Get the authorization code from URL params (sent by Backend)
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
          throw new Error("No authorization code received");
        }

        console.log("[auth-callback] Exchanging code for token...");

        // Exchange code for token via Backend
        const response = await apiClient.post("/auth/google-callback", {
          code,
          state,
        });

        if (response.data.accessToken) {
          console.log("[auth-callback] Token received, storing...");
          localStorage.setItem("auth_token", response.data.accessToken);
          if (response.data.refreshToken) {
            localStorage.setItem("refresh_token", response.data.refreshToken);
          }
          if (response.data.user) {
            localStorage.setItem(
              "user_profile",
              JSON.stringify(response.data.user)
            );
          }

          const redirectUrl =
            localStorage.getItem("redirectAfterLogin") || "/dashboard";
          localStorage.removeItem("redirectAfterLogin");

          console.log("[auth-callback] Redirecting to dashboard...");
          router.push(redirectUrl);
        } else {
          throw new Error("No token received from Backend");
        }
      } catch (err: any) {
        console.error("[auth-callback] Error:", err);
        setError(err.message || "Erro ao processar autenticação");
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h1 className="text-lg font-bold text-destructive mb-2">
              Erro na autenticação
            </h1>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => router.push("/cadastro")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Voltar para cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
