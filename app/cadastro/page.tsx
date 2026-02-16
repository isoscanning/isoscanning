"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Camera,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal } from "@/components/scroll-reveal";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

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

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    trackEvent({ action: "sign_up", category: "Auth", label: "Google Button Click (Signup)" });

    try {
      // Store the userType so we can use it after OAuth callback
      localStorage.setItem("signupUserType", userType);
      localStorage.setItem("redirectAfterLogin", redirectTo);
      localStorage.setItem("redirectAfterLogin", redirectTo);
      await signInWithGoogle({
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
          consent: "prompt" // Force consent screen as extra measure
        }
      });
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar com Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Header />

      {/* Background Effects */}
      <ParticleBackground />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <main className="flex-1 flex items-center justify-center py-12 px-4 relative z-10">
        <div className="w-full max-w-6xl grid gap-12 items-center md:grid-cols-2">

          {/* Left side - Hero content */}
          <div className="hidden md:flex flex-col justify-center space-y-10">
            <ScrollReveal direction="left">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary w-fit border border-primary/20 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-sm font-medium">
                    Junte-se à Comunidade
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">Comece sua </span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    jornada profissional
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Crie sua conta gratuitamente e tenha acesso a uma plataforma
                  completa para gerenciar seus projetos, encontrar oportunidades e
                  conectar-se com profissionais.
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-6">
              <ScrollReveal direction="left" delay={0.2}>
                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">100% Gratuito</h3>
                    <p className="text-sm text-muted-foreground">Sem taxas ocultas. Comece agora mesmo sem compromisso</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.3}>
                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Portfólio Online</h3>
                    <p className="text-sm text-muted-foreground">Mostre seu trabalho e atraia novos clientes</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.4}>
                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Oportunidades Ilimitadas</h3>
                    <p className="text-sm text-muted-foreground">Acesse projetos e conecte-se com clientes em potencial</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Right side - Signup form */}
          <ScrollReveal direction="right" delay={0.2}>
            <div className="w-full max-w-md mx-auto relative group">
              {/* Decorative background glow for the card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-500"></div>

              <Card className="relative surface-layer border border-border/40 shadow-2xl rounded-[1.8rem] backdrop-blur-xl bg-background/80">
                <CardHeader className="space-y-4 text-center pt-10 pb-6">
                  <div className="flex justify-center mb-2">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-primary/20 relative overflow-hidden group/icon"
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                      <Camera className="h-10 w-10 text-white relative z-10" />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                      Criar conta
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      Escolha o tipo de conta e comece agora
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8 px-8 pb-10">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert
                        variant="destructive"
                        className="border-destructive/30 bg-destructive/10 backdrop-blur-sm"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <div className="w-full">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Briefcase className="h-5 w-5" />
                        <span>Conta Profissional</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ideal para fotógrafos que desejam oferecer serviços,
                        alugar equipamentos e expandir sua rede de clientes.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 group flex items-center justify-center gap-3"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Criando conta...</span>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-1 rounded-full">
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                        </div>
                        <span>Cadastrar com Google</span>
                        <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <span className="text-sm text-muted-foreground">
                      Já tem uma conta?{" "}
                    </span>
                    <Link
                      href="/login"
                      className="text-sm text-primary hover:text-primary/80 font-bold hover:underline transition-all"
                    >
                      Entrar
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile-only help text */}
              <div className="mt-8 text-center md:hidden">
                <Link href="/" className="text-primary hover:underline font-medium">
                  Voltar para a Home
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}
