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
  phone?: string;
  city?: string;
  state?: string;
  specialty?: string;
  description?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

        const token = localStorage.getItem("auth_token");
        const savedProfile = localStorage.getItem("user_profile");

        if (savedProfile) {
          // Load profile from localStorage first
          console.log("[auth-context] Loading profile from localStorage...");
          const profile = JSON.parse(savedProfile);
          setUserProfile(profile);
        } else if (token) {
          // If no saved profile, fetch from API
          console.log("[auth-context] Token found, fetching profile...");
          const response = await apiClient.get("/auth/me");
          setUserProfile(response.data);
          localStorage.setItem("user_profile", JSON.stringify(response.data));
          console.log("[auth-context] Profile loaded successfully");
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
        userType: userData.userType || "client",
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
      }
    } catch (error) {
      console.error("[auth-context] Sign up error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("[auth-context] Initiating Google login with Supabase...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    } catch (error) {
      console.error("[auth-context] Update profile error:", error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
