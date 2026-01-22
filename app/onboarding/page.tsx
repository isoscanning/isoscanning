"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validateCPF, formatCPF, formatPhone } from "@/lib/utils";
import { Loader2, User, Phone, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

// Schema for Step 1: Account Info
const step1Schema = z.object({
    username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").max(50),
    email: z.string().email(),
    cpf: z.string().refine((val) => validateCPF(val), {
        message: "CPF inválido",
    }),
    password: z
        .string()
        .min(8, "A senha deve ter pelo menos 8 caracteres")
        .regex(/[0-9]/, "A senha deve conter pelo menos um número")
        .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

// Schema for Step 2: Contact Info
const step2Schema = z.object({
    phone: z.string().min(14, "Telefone inválido").max(15, "Telefone inválido"),
});

// Schema for Step 3: Verification Method
const step3Schema = z.object({
    method: z.enum(["totp", "email"]),
});

// Schema for Step 4: Verification Code
const step4Schema = z.object({
    code: z.string().length(6, "O código deve ter 6 dígitos"),
});

export default function OnboardingPage() {
    const { userProfile, updateProfile, updateUserAuth, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Verification State
    const [verificationMethod, setVerificationMethod] = useState<"totp" | "email" | null>(null);

    // TOTP State
    const [factorId, setFactorId] = useState<string>("");
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [secret, setSecret] = useState<string>("");

    // Email OTP State
    const [emailSent, setEmailSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Form for Step 1
    const form1 = useForm<z.infer<typeof step1Schema>>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            username: "",
            email: "",
            cpf: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Form for Step 2
    const form2 = useForm<z.infer<typeof step2Schema>>({
        resolver: zodResolver(step2Schema),
        defaultValues: {
            phone: "",
        },
    });

    // Form for Step 3 (Method Selection)
    const form3 = useForm<z.infer<typeof step3Schema>>({
        resolver: zodResolver(step3Schema),
        defaultValues: {
            method: "email",
        },
    });

    // Form for Step 4 (Code Verification)
    const form4 = useForm<z.infer<typeof step4Schema>>({
        resolver: zodResolver(step4Schema),
        defaultValues: {
            code: "",
        },
    });

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
        } else if (!loading && userProfile) {
            // Pre-fill email
            if (userProfile.email && !form1.getValues("email")) {
                form1.setValue("email", userProfile.email);
            }

            // Check if already completed onboarding
            if (userProfile.cpf && userProfile.phone && userProfile.username) {
                router.push("/dashboard");
            }
        }
    }, [userProfile, loading, router, form1]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const onStep1Submit = async (values: z.infer<typeof step1Schema>) => {
        setStep(2);
    };

    const onStep2Submit = async (values: z.infer<typeof step2Schema>) => {
        setStep(3);
    };

    const onStep3Submit = async (values: z.infer<typeof step3Schema>) => {
        setVerificationMethod(values.method);
        setStep(4);

        if (values.method === "email") {
            sendEmailCode();
        } else {
            setupTOTP();
        }
    };

    const setupTOTP = async () => {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            setFactorId(data.id);
            setSecret(data.totp.secret);

            const qrUrl = await QRCode.toDataURL(data.totp.uri);
            setQrCodeUrl(qrUrl);
        } catch (error) {
            console.error("Error enrolling MFA:", error);
            toast({
                variant: "destructive",
                title: "Erro ao configurar 2FA",
                description: "Tente novamente ou use a verificação por email.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const sendEmailCode = async () => {
        if (countdown > 0) return;

        setIsSubmitting(true);
        try {
            const email = form1.getValues("email");
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) throw error;

            setEmailSent(true);
            setCountdown(60);
            toast({
                title: "Código enviado!",
                description: "Verifique seu email (inclusive spam) para pegar o código.",
            });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({
                variant: "destructive",
                title: "Erro ao enviar código",
                description: "Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalizeRegistration = async () => {
        const step1Values = form1.getValues();
        const step2Values = form2.getValues();

        await updateUserAuth({
            password: step1Values.password,
        });

        await updateProfile({
            username: step1Values.username,
            cpf: step1Values.cpf.replace(/\D/g, ""),
            phone: step2Values.phone.replace(/\D/g, ""),
            phoneCountryCode: "55",
        });

        toast({
            title: "Cadastro concluído!",
            description: "Bem-vindo ao IsoScanning.",
        });

        router.push("/dashboard");
    };

    const onSkip2FA = async () => {
        setIsSubmitting(true);
        try {
            await handleFinalizeRegistration();
        } catch (error) {
            console.error("Error skipping 2FA:", error);
            toast({
                variant: "destructive",
                title: "Erro ao finalizar cadastro",
                description: "Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onStep4Submit = async (values: z.infer<typeof step4Schema>) => {
        setIsSubmitting(true);
        try {
            const email = form1.getValues("email");

            if (verificationMethod === "email") {
                // Verify Email OTP
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    email,
                    token: values.code,
                    type: 'email',
                });
                if (verifyError) throw verifyError;
            } else {
                // Verify TOTP
                const challenge = await supabase.auth.mfa.challenge({ factorId });
                if (challenge.error) throw challenge.error;

                const verify = await supabase.auth.mfa.verify({
                    factorId,
                    challengeId: challenge.data.id,
                    code: values.code,
                });
                if (verify.error) throw verify.error;
            }

            await handleFinalizeRegistration();
        } catch (error) {
            console.error("Verification error:", error);
            toast({
                variant: "destructive",
                title: "Código inválido",
                description: "Verifique o código e tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-2 sm:p-4">
            <Card className="w-full max-w-lg shadow-sm">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                    <CardTitle className="text-xl sm:text-2xl text-center">Complete seu Cadastro</CardTitle>
                    <CardDescription className="text-center text-sm sm:text-base">
                        {step >= 3
                            ? "Escolha como deseja proteger sua conta."
                            : "Precisamos de algumas informações adicionais para garantir a segurança da sua conta."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
                    {/* Stepper */}
                    <div className="flex items-center justify-center mb-6 sm:mb-8">
                        <div className={`flex items-center ${step >= 1 ? "text-primary" : "text-gray-400"}`}>
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm ${step >= 1 ? "border-primary bg-primary text-white" : "border-gray-300"}`}>
                                1
                            </div>
                            <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Conta</span>
                        </div>
                        <div className={`w-6 sm:w-16 h-1 mx-1 sm:mx-2 ${step >= 2 ? "bg-primary" : "bg-gray-200"}`} />
                        <div className={`flex items-center ${step >= 2 ? "text-primary" : "text-gray-400"}`}>
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm ${step >= 2 ? "border-primary bg-primary text-white" : "border-gray-300"}`}>
                                2
                            </div>
                            <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Contato</span>
                        </div>
                        <div className={`w-6 sm:w-16 h-1 mx-1 sm:mx-2 ${step >= 3 ? "bg-primary" : "bg-gray-200"}`} />
                        <div className={`flex items-center ${step >= 3 ? "text-primary" : "text-gray-400"}`}>
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm ${step >= 3 ? "border-primary bg-primary text-white" : "border-gray-300"}`}>
                                3
                            </div>
                            <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Segurança</span>
                        </div>
                    </div>

                    {step === 1 && (
                        <Form {...form1}>
                            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                                <FormField
                                    control={form1.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input {...field} disabled className="pl-9 bg-gray-100" />
                                                </div>
                                            </FormControl>
                                            <FormDescription>O email não pode ser alterado.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form1.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome de Usuário</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="seu_usuario" className="pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>Este será seu identificador único na plataforma.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form1.control}
                                    name="cpf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="000.000.000-00"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(formatCPF(e.target.value));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form1.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Senha</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="password" placeholder="********" className="pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>Mínimo 8 caracteres, 1 número e 1 símbolo.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form1.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirmar Senha</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="password" placeholder="********" className="pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full h-11 sm:h-10 text-sm sm:text-base">
                                    Próximo
                                </Button>
                            </form>
                        </Form>
                    )}

                    {step === 2 && (
                        <Form {...form2}>
                            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                                <FormField
                                    control={form2.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone / Celular</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="(00) 00000-0000"
                                                        className="pl-9"
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(formatPhone(e.target.value));
                                                        }}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormDescription>Informe um número para contato.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base">
                                        Voltar
                                    </Button>
                                    <Button type="submit" className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando...
                                            </>
                                        ) : (
                                            "Próximo: Segurança"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}

                    {step === 3 && (
                        <Form {...form3}>
                            <form onSubmit={form3.handleSubmit(onStep3Submit)} className="space-y-4">
                                <FormField
                                    control={form3.control}
                                    name="method"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Método de Verificação</FormLabel>
                                            <FormControl>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div
                                                        className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${field.value === 'email' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                                                        onClick={() => field.onChange('email')}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-blue-100 p-2 rounded-full">
                                                                <Mail className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Email</p>
                                                                <p className="text-sm text-gray-500">Receba um código no seu email.</p>
                                                            </div>
                                                            {field.value === 'email' && <ShieldCheck className="ml-auto h-5 w-5 text-primary" />}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${field.value === 'totp' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                                                        onClick={() => field.onChange('totp')}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-purple-100 p-2 rounded-full">
                                                                <Smartphone className="h-5 w-5 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Aplicativo Autenticador</p>
                                                                <p className="text-sm text-gray-500">Google Authenticator, Authy, etc.</p>
                                                            </div>
                                                            {field.value === 'totp' && <ShieldCheck className="ml-auto h-5 w-5 text-primary" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4 sm:space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                                        <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base">
                                            Voltar
                                        </Button>
                                        <Button type="submit" className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base">
                                            Continuar
                                        </Button>
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            className="text-sm sm:text-base text-gray-400 hover:text-primary transition-colors py-2"
                                            onClick={onSkip2FA}
                                            disabled={isSubmitting}
                                        >
                                            Configurar mais tarde
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </Form>
                    )}

                    {step === 4 && (
                        <Form {...form4}>
                            <form onSubmit={form4.handleSubmit(onStep4Submit)} className="space-y-4">
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    {verificationMethod === 'email' ? (
                                        <div className="bg-white p-6 rounded-lg border shadow-sm w-full text-center">
                                            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold">Verifique seu Email</h3>
                                            <p className="text-sm text-gray-600 mt-2">
                                                Enviamos um código para:
                                            </p>
                                            <p className="font-medium text-gray-900 mt-1">{form1.getValues("email")}</p>

                                            <div className="mt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={sendEmailCode}
                                                    disabled={countdown > 0 || isSubmitting}
                                                >
                                                    {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar Código"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white p-4 rounded-lg border shadow-sm w-full flex flex-col items-center">
                                            {qrCodeUrl ? (
                                                <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48" />
                                            ) : (
                                                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-600 mt-4 text-center">
                                                Escaneie com seu app autenticador.
                                            </p>
                                            {secret && (
                                                <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded mt-2">
                                                    {secret}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <FormField
                                    control={form4.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código de Verificação</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="000000"
                                                        className="pl-9 text-center tracking-widest text-lg"
                                                        maxLength={6}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                {verificationMethod === 'email'
                                                    ? "Digite o código enviado para seu email."
                                                    : "Digite o código gerado pelo seu aplicativo."}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                                    <Button type="button" variant="outline" onClick={() => setStep(3)} className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base">
                                        Voltar
                                    </Button>
                                    <Button type="submit" className="w-full sm:flex-1 h-11 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
                                            </>
                                        ) : (
                                            "Confirmar e Finalizar"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
