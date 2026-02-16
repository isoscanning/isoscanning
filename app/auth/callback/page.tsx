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
            if (profileError.response?.data) {
              console.error("[auth-callback] Profile fetch error data:", profileError.response.data);
            }

            // Check if error is related to missing profile (401 from backend now throws UnauthorizedException)
            if (profileError.response?.status === 401 || profileError.response?.status === 404) {
              console.log("[auth-callback] Profile not found. Attempting automatic registration...");

              // Get pending signup info or use defaults
              const signupUserType = localStorage.getItem("signupUserType") || "professional";
              const userEmail = session.user.email;
              const displayName = session.user.user_metadata.full_name || session.user.user_metadata.name || userEmail?.split('@')[0] || "Usuário";
              const avatarUrl = session.user.user_metadata.avatar_url || session.user.user_metadata.picture;

              console.log(`[auth-callback] Registering new Google user [${signupUserType}]: ${userEmail}`);

              try {
                // Use the standard /auth/signup endpoint for registration
                // We send a dummy/random password since it's an OAuth account, 
                // but the backend might require it for the signup schema.
                const { data: signupResponse } = await apiClient.post("/auth/signup", {
                  email: userEmail,
                  password: Math.random().toString(36).slice(-12) + "OAuth!", // Backend should ideally handle OAuth separately but we use standard signup
                  displayName,
                  userType: signupUserType,
                  avatarUrl,
                  isGoogle: true // Hint to backend if needed
                });

                // The backend /auth/signup returns { accessToken, user, ... }
                const newUserProfile = signupResponse.user || signupResponse.data?.user;
                const newAccessToken = signupResponse.accessToken || signupResponse.data?.accessToken;

                if (newAccessToken) {
                  localStorage.setItem("auth_token", newAccessToken);
                }

                if (newUserProfile) {
                  localStorage.setItem("user_profile", JSON.stringify(newUserProfile));
                }

                localStorage.removeItem("signupUserType");

                console.log("[auth-callback] Account created successfully via /auth/signup. Redirecting...");
                window.location.href = redirectUrl || "/dashboard";
                return;

              } catch (createError: any) {
                console.error("[auth-callback] Registration failed:", createError);
                if (createError.response?.data) {
                  console.error("[auth-callback] Registration error data:", createError.response.data);
                }

                const errorMsg = createError.response?.data?.message || createError.message || "Erro ao criar perfil";
                setError(`Não foi possível criar sua conta automaticamente: ${errorMsg}. Por favor, tente o cadastro manual.`);
                setLoading(false);

                // Cleanup to allow retry
                await supabase.auth.signOut();
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user_profile");
                return;
              }
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
