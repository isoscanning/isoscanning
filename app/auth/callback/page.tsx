"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-service";
import { trackEvent } from "@/lib/analytics";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[auth-callback] Verifying Supabase session...");

        // Supabase client automatically handles the hash fragment or code exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          console.log("[auth-callback] Session found.");
          trackEvent({ action: 'login', category: 'Auth', label: 'Google' });

          // Store tokens
          localStorage.setItem("auth_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("refresh_token", session.refresh_token);
          }

          let redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
          localStorage.removeItem("redirectAfterLogin");

          try {
            // Fetch profile to check if we have the required contact info (Phone/WhatsApp)
            // The user explicitly requested to ONLY check for this contact info.
            const response = await apiClient.get("/auth/me");
            const userProfile = response.data;

            localStorage.setItem("user_profile", JSON.stringify(userProfile));

            // Logic: If user doesn't have a phone number, send to onboarding.
            // We ignore CPF/Username as they are no longer required for initial access.
            if (!userProfile.phone) {
              console.log("[auth-callback] Phone number missing, redirecting to onboarding...");
              redirectUrl = "/onboarding";
            } else {
              console.log("[auth-callback] Profile has phone, proceeding to destination...");
            }

          } catch (profileError) {
            console.error("[auth-callback] Error fetching profile:", profileError);
            // If profile fetch fails (maybe first login/trigger delay), send to onboarding to be safe/retry
            redirectUrl = "/onboarding";
          }

          window.location.href = redirectUrl;
        } else {
          // Retry or wait logic removed for simplicity, relying on immediate session check
          // If no session, try listening once
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              localStorage.setItem("auth_token", session.access_token);
              window.location.href = "/dashboard";
            }
          });

          setTimeout(() => {
            if (loading) {
              // Check if we didn't get a session after timeout
              setError("Time out waiting for session.");
              setLoading(false);
            }
          }, 4000);
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Entrando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md w-full bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-destructive mb-2">Erro na autenticação</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full px-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all"
          >
            Voltar tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return null;
}
