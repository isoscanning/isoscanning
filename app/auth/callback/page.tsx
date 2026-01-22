"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-service";

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
          console.log("[auth-callback] Session found, checking profile completeness...");

          // Store token in localStorage for compatibility with existing code
          localStorage.setItem("auth_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("refresh_token", session.refresh_token);
          }

          // Fetch user profile to check if registration is complete
          let redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
          localStorage.removeItem("redirectAfterLogin");

          try {
            const response = await apiClient.get("/auth/me");
            const userProfile = response.data;

            // Store profile in localStorage
            localStorage.setItem("user_profile", JSON.stringify(userProfile));

            // Log profile data for debugging
            console.log("[auth-callback] User profile received:", {
              username: userProfile.username,
              cpf: userProfile.cpf,
              phone: userProfile.phone,
              displayName: userProfile.displayName,
            });

            // Check if user has completed registration (username, cpf, phone)
            // Consider empty strings as incomplete as well
            const hasUsername = userProfile.username && userProfile.username.trim() !== "";
            const hasCpf = userProfile.cpf && userProfile.cpf.trim() !== "";
            const hasPhone = userProfile.phone && userProfile.phone.trim() !== "";

            const hasCompletedRegistration = hasUsername && hasCpf && hasPhone;

            console.log("[auth-callback] Registration check:", {
              hasUsername,
              hasCpf,
              hasPhone,
              hasCompletedRegistration,
            });

            if (!hasCompletedRegistration) {
              console.log("[auth-callback] Registration incomplete, redirecting to onboarding...");
              redirectUrl = "/onboarding";
            } else {
              console.log("[auth-callback] Registration complete, redirecting to dashboard...");
            }
          } catch (profileError) {
            console.error("[auth-callback] Error fetching profile:", profileError);
            // If we can't fetch the profile, redirect to onboarding to be safe
            redirectUrl = "/onboarding";
          }

          // Use window.location.href to force a full page reload.
          // This ensures AuthContext re-initializes and picks up the new token immediately.
          window.location.href = redirectUrl;
        } else {
          // If no session immediately, wait for onAuthStateChange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              console.log("[auth-callback] Signed in via event, redirecting...");
              localStorage.setItem("auth_token", session.access_token);
              window.location.href = "/dashboard";
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
