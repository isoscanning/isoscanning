"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  Camera,
  Mail,
  Lock,
  AlertCircle,
  Sparkles,
  Package,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, getRedirectUrl } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Obter URL de redirecionamento ou usar dashboard como padrão
  const redirectTo = getRedirectUrl() || "/dashboard";

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push(redirectTo);
    } catch (err: any) {
      setError(
        err.message || "Erro ao fazer login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      localStorage.setItem("redirectAfterLogin", redirectTo);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login com Google.");
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
                  Sua jornada fotográfica começa aqui
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                Conecte-se ao futuro da fotografia
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Acesse sua conta e descubra oportunidades ilimitadas. Gerencie
                projetos, alugue equipamentos profissionais e expanda sua rede
                de contatos.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Portfólio Profissional
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mostre seu trabalho e conquiste novos clientes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Rede de Profissionais
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Conecte-se com fotógrafos de todo o Brasil
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="w-full">
            <Card className="surface-layer border border-border/40 shadow-xl">
              <CardHeader className="space-y-1 text-center pb-8">
                <div className="flex justify-center mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                    <Camera className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  Bem-vindo de volta
                </CardTitle>
                <CardDescription className="text-base">
                  Entre com sua conta para continuar sua jornada
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

                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11 h-12 border-border/50 focus:border-accent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Senha
                      </Label>
                      {/* Recuperar senha temporariamente desabilitado - aguardando implementação no backend */}
                      {/* 
                      <Link
                        href="/recuperar-senha"
                        className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                      >
                        Esqueceu a senha?
                      </Link>
                      */}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 h-12 border-border/50 focus:border-accent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </div>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 py-1 text-muted-foreground font-medium">
                      Ou continue com
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-border/30 hover:border-accent hover:bg-accent/10 transition-all"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
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
                  Entrar com Google
                </Button>

                <div className="text-center pt-4">
                  <span className="text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                  </span>
                  <Link
                    href="/cadastro"
                    className="text-sm text-accent hover:text-accent/80 font-semibold transition-colors"
                  >
                    Cadastre-se gratuitamente
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
