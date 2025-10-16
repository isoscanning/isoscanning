"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userType: "client" | "professional";
  phone?: string;
  location?: string;
  specialty?: string;
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAnonymous: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Configurar persistência local do Firebase
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("❌ Erro ao configurar persistência:", error);
      });
    }
  }, []);

  // Monitorar mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Buscar perfil do usuário no Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUserProfile({
              ...profileData,
              createdAt: profileData.createdAt?.toDate() || new Date(),
              updatedAt: profileData.updatedAt?.toDate() || new Date(),
            } as UserProfile);
          } else {
            // Criar perfil básico se não existir
            const basicProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "Usuário",
              userType: "client", // padrão
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await setDoc(userDocRef, {
              ...basicProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            setUserProfile(basicProfile);
          }
        } catch (error) {
          console.error("❌ Erro ao buscar perfil do usuário:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    await signInWithPopup(auth, provider);
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<UserProfile>
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Criar perfil no Firestore
    const profileData: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName:
        userData.displayName || user.displayName || email.split("@")[0],
      userType: userData.userType || "client",
      phone: userData.phone || "",
      location: userData.location || "",
      specialty: userData.specialty || "",
      bio: userData.bio || "",
      avatar: userData.avatar || user.photoURL || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, "users", user.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    // Limpar URL de redirecionamento do localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("redirectAfterLogin");
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const getRedirectUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("redirectAfterLogin");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error("Usuário não autenticado");

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(
      userDocRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Atualizar estado local
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        ...updates,
        updatedAt: new Date(),
      });
    }
  };

  const isAnonymous = !user || user.isAnonymous;

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAnonymous,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    getRedirectUrl,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
