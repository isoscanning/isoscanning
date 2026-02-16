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
            // We pass X-Skip-Auth-Redirect to prevent api network interceptor from redirecting to login on 401
            const response = await apiClient.get("/auth/me", {
              headers: { "X-Skip-Auth-Redirect": "true" }
            });
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

          } catch (profileError: any) {
            console.error("[auth-callback] Error fetching profile:", profileError);

            // Check if error is related to missing profile (401 from backend now throws UnauthorizedException)
            if (profileError.response?.status === 401 || profileError.response?.status === 404) {
              console.log("[auth-callback] Profile not found.");

              // Check if we have a pending signup (user came from /cadastro)
              const signupUserType = localStorage.getItem("signupUserType");

              if (signupUserType) {
                console.log("[auth-callback] Found pending signup, creating profile...");
                try {
                  // Complete signup by creating the profile
                  const { data: newProfile } = await apiClient.post("/auth/complete-google-signup", {
                    userType: signupUserType,
                    displayName: session.user.user_metadata.full_name || session.user.email?.split('@')[0],
                    avatarUrl: session.user.user_metadata.avatar_url
                  });

                  localStorage.setItem("user_profile", JSON.stringify(newProfile));
                  localStorage.removeItem("signupUserType"); // clear it

                  console.log("[auth-callback] Profile created successfully. Redirecting...");
                  window.location.href = redirectUrl || "/dashboard";
                  return;

                } catch (createError) {
                  console.error("[auth-callback] Failed to create profile:", createError);
                  // Fallthrough to cleanup and redirect to signup
                }
              }

              console.log("[auth-callback] Redirecting to signup...");

              // Clear session locally and in Supabase
              await supabase.auth.signOut();
              localStorage.removeItem("auth_token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user_profile");

              // Redirect immediately to signup
              router.push("/cadastro");
              return;
            }

            // If other error, send to onboarding to be safe/retry
            redirectUrl = "/onboarding";
            window.location.href = redirectUrl;
          }

          if (!error) {
            window.location.href = redirectUrl;
          }
        } else {
          // Retry or wait logic removed for simplicity, relying on immediate session check
          // If no session, try listening once
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              localStorage.setItem("auth_token", session.access_token);
              window.location.href = "/dashboard";
            }
          });

          // If session detection times out, it might be a new user or a glitch.
          // In either case, redirecting to /cadastro allows them to try again or sign up.
          // This aligns with user request to handle "no account" scenarios gracefully.
          setTimeout(() => {
            if (loading) {
              console.warn("[auth-callback] Session timeout. Redirecting to signup...");
              router.push("/cadastro");
            }
          }, 10000); // Increased to 10s to account for slow mobile networks
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
