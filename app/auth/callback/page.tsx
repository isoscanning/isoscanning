"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[auth-callback] Verifying Supabase session...");

        // Supabase client automatically handles the hash fragment or code exchange
        // We just need to check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          console.log("[auth-callback] Session found, redirecting...");

          // Store token in localStorage for compatibility with existing code
          localStorage.setItem("auth_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("refresh_token", session.refresh_token);
          }
          if (session.user) {
            // Map Supabase user to local profile format if needed, or just store basic info
            // For now, we rely on the auth context to fetch the full profile later
            localStorage.setItem("user_profile", JSON.stringify(session.user));
          }

          const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
          localStorage.removeItem("redirectAfterLogin");

          router.push(redirectUrl);
        } else {
          // If no session immediately, wait for onAuthStateChange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              console.log("[auth-callback] Signed in via event, redirecting...");
              localStorage.setItem("auth_token", session.access_token);
              router.push("/dashboard");
            }
          });

          // If still no session after a short timeout, show error (or just stay loading)
          setTimeout(() => {
            if (loading) {
              // Check one last time
              supabase.auth.getSession().then(({ data }) => {
                if (!data.session) {
                  setError("Não foi possível confirmar a autenticação. Tente novamente.");
                  setLoading(false);
                }
              });
            }
          }, 5000);
        }
      } catch (err: any) {
        console.error("[auth-callback] Error:", err);
        setError(err.message || "Erro ao processar autenticação");
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Finalizando autenticação...</p>
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
