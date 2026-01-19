"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Mail,
  Lock,
  User,
  AlertCircle,
  UserCircle,
  Briefcase,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CadastroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInWithGoogle, getRedirectUrl } = useAuth();

  const [userType, setUserType] = useState<"client" | "professional">("professional");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Obter URL de redirecionamento ou usar dashboard como padrão
  const redirectTo = getRedirectUrl() || "/dashboard";

  useEffect(() => {
    const tipo = searchParams.get("tipo");
    if (tipo === "profissional") {
      setUserType("professional");
    }
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, {
        displayName: name,
        userType,
      });
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);

    try {
      // Store the userType so we can use it after OAuth callback
      localStorage.setItem("signupUserType", userType);
      localStorage.setItem("redirectAfterLogin", redirectTo);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar com Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl grid gap-10 items-start md:grid-cols-2">
          {/* Left side - Hero content */}
          <div className="hidden md:flex flex-col justify-start space-y-8">
            <div className="space-y-5 surface-soft rounded-3xl p-8 bg-card border border-border/50">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary w-fit">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">
                  Junte-se à Comunidade
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                Comece sua jornada profissional hoje
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Crie sua conta gratuitamente e tenha acesso a uma plataforma
                completa para gerenciar seus projetos, encontrar oportunidades e
                conectar-se com profissionais.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    100% Gratuito
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sem taxas ocultas. Comece agora mesmo sem compromisso
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Portfólio Online
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mostre seu trabalho e atraia novos clientes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Oportunidades Ilimitadas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Acesse projetos e conecte-se com clientes em potencial
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Signup form */}
          <div className="w-full">
            <Card className="surface-layer border border-border/40 shadow-xl">
              <CardHeader className="space-y-1 text-center pb-6">
                <div className="flex justify-center mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                    <Camera className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  Criar conta
                </CardTitle>
                <CardDescription className="text-base">
                  Escolha o tipo de conta e comece agora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-8">
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-destructive/50 bg-destructive/5"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* 
                  Temporarily forcing Professional account type as per requirements.
                  Tabs for selecting Client/Professional are hidden.
                */}
                <div className="w-full">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Briefcase className="h-5 w-5" />
                      <span>Conta Profissional</span>
                    </div>
                    <p className="text-sm text-foreground">
                      Ideal para fotógrafos que desejam oferecer serviços,
                      alugar equipamentos e expandir sua rede de clientes.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando conta...
                    </div>
                  ) : (
                    <>
                      <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Cadastrar com Google
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <span className="text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                  </span>
                  <Link
                    href="/login"
                    className="text-sm text-accent hover:text-accent/80 font-semibold transition-colors"
                  >
                    Entrar
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
