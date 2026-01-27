"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPhone } from "@/lib/utils";
import { Loader2, Smartphone, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ParticleBackground } from "@/components/particle-background";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

const phoneSchema = z.object({
    phone: z.string().min(14, "Telefone inválido").max(15, "Telefone inválido"),
});

export default function OnboardingPage() {
    const { userProfile, updateProfile, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof phoneSchema>>({
        resolver: zodResolver(phoneSchema),
        defaultValues: {
            phone: "",
        },
    });

    useEffect(() => {
        if (!loading) {
            if (!userProfile) {
                router.push("/login");
            } else if (userProfile.phone) {
                // Already has phone, redirect to dashboard
                router.push("/dashboard");
            }
        }
    }, [userProfile, loading, router]);

    const handleSubmit = async (values: z.infer<typeof phoneSchema>) => {
        setIsSubmitting(true);
        try {
            await updateProfile({
                phone: values.phone.replace(/\D/g, ""), // Save clean number
                phoneCountryCode: "55", // Default to Brazil
            });

            toast({
                title: "Tudo pronto!",
                description: "Seu perfil foi atualizado com sucesso.",
            });

            // Add delay for effect
            setTimeout(() => {
                router.push("/dashboard");
            }, 500);

        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Tente novamente mais tarde.",
            });
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        // Set a flag in sessionStorage so we don't annoy the user again in this session
        // but we WILL ask again next time they open the browser or login.
        sessionStorage.setItem("onboarding_skipped", "true");
        router.push("/dashboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            <ParticleBackground />

            {/* Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <main className="w-full max-w-lg px-4 relative z-10">
                <ScrollReveal>
                    <div className="text-center mb-8 space-y-2">
                        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 text-primary animate-bounce-slow">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Quase lá, {userProfile?.displayName?.split(' ')[0]}!</h1>
                        <p className="text-muted-foreground">
                            Vamos deixar seu perfil mais completo para que você possa ser encontrado.
                        </p>
                    </div>

                    <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl">Adicionar WhatsApp</CardTitle>
                            <CardDescription>
                                Facilite o contato de clientes e outros profissionais.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Seu WhatsApp / Celular</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white">
                                                            <Smartphone className="h-5 w-5" />
                                                        </div>
                                                        <Input
                                                            placeholder="(11) 99999-9999"
                                                            className="pl-14 h-12 text-lg bg-background/50 border-input/50 focus:border-primary transition-all"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(formatPhone(e.target.value));
                                                            }}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Não enviaremos spam. Apenas para contato profissional.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-3 pt-2">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    Salvar e Continuar
                                                    <ArrowRight className="ml-2 h-5 w-5" />
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleSkip}
                                            className="w-full text-muted-foreground hover:text-foreground hover:bg-transparent"
                                            disabled={isSubmitting}
                                        >
                                            Pular por enquanto
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </ScrollReveal>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center"
                >
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-full backdrop-blur-sm border border-border/20">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Você pode alterar isso depois no seu perfil</span>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
