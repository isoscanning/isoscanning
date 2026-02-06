"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import apiClient from "./api-service";
import { supabase } from "./supabase";
import { trackEvent } from "./analytics";

/**
 * LocalStorage keys used by auth context:
 * - auth_token: JWT access token from backend
 * - refresh_token: JWT refresh token for token renewal
 * - user_profile: Cached user profile object
 * - redirectAfterLogin: URL to redirect to after OAuth
 * - signupUserType: User type selected during signup (for OAuth signup)
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  userType: "client" | "professional";
  username?: string;
  cpf?: string;
  phone?: string;
  phoneCountryCode?: string;
  city?: string;
  state?: string;
  specialties?: string[];
  artisticName?: string;
  description?: string;
  portfolioLink?: string;
  avatarUrl?: string;
  averageRating?: number;
  totalReviews?: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscriptionTier?: 'free' | 'standard' | 'pro' | 'vip';
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  isAnonymous: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getRedirectUrl: () => string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateUserAuth: (attributes: { password?: string; email?: string; data?: any }) => Promise<void>;
  updateSubscriptionTier: (tier: 'free' | 'standard' | 'pro' | 'vip') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (typeof window === "undefined") return;

        // 1. Try to recover/refresh session from Supabase first
        // This handles cases where localStorage has stale token but Supabase client has valid session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          console.log("[auth-context] Active Supabase session found, syncing tokens...");
          localStorage.setItem("auth_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("refresh_token", session.refresh_token);
          }
        }

        const token = localStorage.getItem("auth_token");

        if (!token) {
          setLoading(false);
          return;
        }

        let profile: UserProfile | null = null;

        // Always fetch fresh data from API when we have a token
        // This ensures we have the most up-to-date profile data
        try {
          console.log("[auth-context] Token found, fetching profile from API...");
          const response = await apiClient.get("/auth/me");
          profile = response.data;
          localStorage.setItem("user_profile", JSON.stringify(response.data));
          console.log("[auth-context] Profile loaded from API successfully");
        } catch (apiError) {
          console.error("[auth-context] Error fetching from API, falling back to localStorage:", apiError);
          // Fallback to localStorage only if API fails
          const savedProfile = localStorage.getItem("user_profile");
          if (savedProfile) {
            profile = JSON.parse(savedProfile);
            console.log("[auth-context] Using cached profile from localStorage");
          }
        }

        // Enrich with Google Data if missing info
        if (profile) {
          try {
            if (!profile.displayName || !profile.avatarUrl) {
              const keys = Object.keys(localStorage);
              const sbKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
              if (sbKey) {
                const sessionData = localStorage.getItem(sbKey);
                if (sessionData) {
                  const session = JSON.parse(sessionData);
                  const metadata = session.user?.user_metadata;
                  if (metadata) {
                    if (!profile.displayName) {
                      profile.displayName = metadata.full_name || metadata.name || "";
                    }
                    if (!profile.avatarUrl) {
                      profile.avatarUrl = metadata.avatar_url || metadata.picture || "";
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error enriching profile", e);
          }
          setUserProfile(profile);
        }

      } catch (error) {
        console.error("[auth-context] Error loading profile:", error);
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_profile");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // 2. Setup Real-time Auth Listener
    // This handles auto-refresh when token expires while app is open
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[auth-context] Auth event: ${event}`);

      if (session?.access_token) {
        // Update local storage with fresh tokens
        localStorage.setItem("auth_token", session.access_token);
        if (session.refresh_token) {
          localStorage.setItem("refresh_token", session.refresh_token);
        }
      }

      // Handle specific events
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_profile");
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("[auth-context] Token automatically refreshed by Supabase");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[auth-context] Attempting sign in...");
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      if (response.data.accessToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", response.data.accessToken);
          if (response.data.refreshToken) {
            localStorage.setItem("refresh_token", response.data.refreshToken);
          }
          if (response.data.user) {
            setUserProfile(response.data.user);
            localStorage.setItem(
              "user_profile",
              JSON.stringify(response.data.user)
            );
          }
        }
        console.log("[auth-context] Sign in successful");
        trackEvent({ action: 'login', category: 'Auth', label: 'Email' });
      }
    } catch (error) {
      console.error("[auth-context] Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => {
    try {
      console.log("[auth-context] Attempting sign up...");
      const response = await apiClient.post("/auth/signup", {
        email,
        password,
        displayName: userData.displayName || email.split("@")[0],
        userType: userData.userType || "professional",
        ...userData,
      });

      if (response.data.accessToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", response.data.accessToken);
          if (response.data.refreshToken) {
            localStorage.setItem("refresh_token", response.data.refreshToken);
          }
          if (response.data.user) {
            setUserProfile(response.data.user);
            localStorage.setItem(
              "user_profile",
              JSON.stringify(response.data.user)
            );
          }
        }
        console.log("[auth-context] Sign up successful");
        trackEvent({ action: 'sign_up', category: 'Auth', label: userData.userType });
      }
    } catch (error) {
      console.error("[auth-context] Sign up error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("[auth-context] Initiating Google login with Supabase...");

      // Use NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin for dev
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("[auth-context] Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("redirectAfterLogin");
        localStorage.removeItem("user_profile");
      }
      setUserProfile(null);
      console.log("[auth-context] Sign out successful");
      trackEvent({ action: 'sign_out', category: 'Auth' });
    } catch (error) {
      console.error("[auth-context] Sign out error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log("[auth-context] Requesting password reset...");
      await apiClient.post("/auth/reset-password", {
        email,
        redirectUrl: `${typeof window !== "undefined" ? window.location.origin : ""
          }/recuperar-senha`,
      });
      console.log("[auth-context] Password reset email sent");
    } catch (error) {
      console.error("[auth-context] Password reset error:", error);
      throw error;
    }
  };

  const getRedirectUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("redirectAfterLogin");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) throw new Error("Usuário não autenticado");

    try {
      await apiClient.put(`/profiles/${userProfile.id}`, updates);

      // Update local state
      setUserProfile({
        ...userProfile,
        ...updates,
        updatedAt: new Date(),
      });

      console.log("[auth-context] Profile updated successfully");
      trackEvent({ action: 'update_profile', category: 'User', label: userProfile.userType });
    } catch (error) {
      console.error("[auth-context] Update profile error:", error);
      throw error;
    }
  };

  const updateUserAuth = async (attributes: { password?: string; email?: string; data?: any }) => {
    try {
      const { data, error } = await supabase.auth.updateUser(attributes);
      if (error) throw error;

      // If we got a new session/token (e.g. after password change), update localStorage
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem("auth_token", session.access_token);
        console.log("[auth-context] auth_token refreshed after user update");
      }

      console.log("[auth-context] User auth updated successfully");
    } catch (error) {
      console.error("[auth-context] Update user auth error:", error);
      throw error;
    }
  };

  const updateSubscriptionTier = async (tier: 'free' | 'standard' | 'pro' | 'vip') => {
    if (!userProfile) throw new Error("Usuário não autenticado");

    try {
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', userProfile.id);

      if (error) throw error;

      // Update local state
      setUserProfile({
        ...userProfile,
        subscriptionTier: tier,
        updatedAt: new Date(),
      });

      // Update local storage
      localStorage.setItem("user_profile", JSON.stringify({
        ...userProfile,
        subscriptionTier: tier,
        updatedAt: new Date(),
      }));

      console.log(`[auth-context] Subscription updated to ${tier}`);
    } catch (error) {
      console.error("[auth-context] Update subscription error:", error);
      throw error;
    }
  };

  const isAnonymous = !userProfile;

  const value: AuthContextType = {
    userProfile,
    loading,
    isAnonymous,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    getRedirectUrl,
    updateProfile,
    updateUserAuth,
    updateSubscriptionTier,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
