"use client";

import type React from "react";

import { useState } from "react";
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
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RecuperarSenhaPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/5">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center shadow-lg">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Recuperar senha
            </CardTitle>
            <CardDescription className="text-base">
              Digite seu email para receber instruções de recuperação
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

            {success && (
              <Alert className="border-success/50 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Email de recuperação enviado com sucesso! Verifique sua caixa
                  de entrada e spam.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
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
                    disabled={success}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-right transition-all duration-500"
                disabled={loading || success}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </div>
                ) : success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Email enviado
                  </div>
                ) : (
                  "Enviar email de recuperação"
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
