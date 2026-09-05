"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createJobOffer, fetchSpecialties, type Specialty } from "@/lib/data-service";
import { ScrollReveal } from "@/components/scroll-reveal";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import {
    EMPTY_JOB_OFFER_FORM,
    JobOfferForm,
    buildCreateJobOfferPayload,
    validateJobOfferForm,
    type JobOfferFormValues,
} from "@/components/jobs/job-offer-form";

export default function NovaVagaPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();

    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [values, setValues] = useState<JobOfferFormValues>(EMPTY_JOB_OFFER_FORM);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
        }
    }, [userProfile, loading, router]);

    useEffect(() => {
        fetchSpecialties().then(setSpecialties).catch(() => setSpecialties([]));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        const validation = validateJobOfferForm(values, { rejectPastDates: true });
        if (validation) {
            setError(validation);
            return;
        }

        setSaving(true);
        try {
            await createJobOffer(buildCreateJobOfferPayload(values, specialties));
            setSuccess(true);
            setTimeout(() => {
                router.push("/dashboard/vagas");
            }, 1500);
        } catch (err: any) {
            console.error("Erro ao criar vaga:", err);

            // 403 de plano (limite de vagas/mês): o modal de upgrade já foi
            // aberto pelo interceptor do apiClient — sem alerta duplicado.
            if (isPlanErrorBody(err?.response?.data)) return;

            let errorMessage = "Erro inesperado ao cadastrar vaga.";
            if (err?.response?.data?.message) {
                errorMessage = Array.isArray(err.response.data.message)
                    ? err.response.data.message.join(", ")
                    : err.response.data.message;
            } else if (err?.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!userProfile) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl space-y-8">
                    <ScrollReveal>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                    Publicar Nova Vaga
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Encontre o profissional ideal para o seu projeto audiovisual
                                </p>
                            </div>
                            <Button variant="outline" className="rounded-full" onClick={() => router.back()}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                        </div>
                    </ScrollReveal>

                    {success && (
                        <ScrollReveal>
                            <Alert className="bg-green-500/10 border-green-500/20 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Vaga publicada com sucesso! Redirecionando...
                                </AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    {error && (
                        <ScrollReveal>
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    <ScrollReveal delay={0.2}>
                        <JobOfferForm
                            mode="create"
                            values={values}
                            onChange={setValues}
                            specialties={specialties}
                            submitting={saving}
                            disabled={success}
                            onSubmit={handleSubmit}
                            onCancel={() => router.back()}
                        />
                    </ScrollReveal>
                </div>
            </main>

            <Footer />
        </div>
    );
}
