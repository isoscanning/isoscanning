"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, PauseCircle } from "lucide-react";
import { fetchJobOfferById, fetchSpecialties, updateJobOffer, type JobOffer, type Specialty } from "@/lib/data-service";
import { ScrollReveal } from "@/components/scroll-reveal";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { jobStatusInfo } from "@/lib/jobs/job-offer-display";
import {
    EMPTY_JOB_OFFER_FORM,
    JobOfferForm,
    buildUpdateJobOfferPayload,
    jobOfferToFormValues,
    validateJobOfferForm,
    type JobOfferFormValues,
} from "@/components/jobs/job-offer-form";

export default function EditarVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading } = useAuth();

    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [job, setJob] = useState<JobOffer | null>(null);
    const [values, setValues] = useState<JobOfferFormValues>(EMPTY_JOB_OFFER_FORM);
    const [initialValues, setInitialValues] = useState<JobOfferFormValues>(EMPTY_JOB_OFFER_FORM);

    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [blockingError, setBlockingError] = useState("");

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
            return;
        }

        const loadData = async () => {
            try {
                // Busca direta por id: a listagem pública não devolve vagas
                // pausadas/concluídas/expiradas (a edição antiga não as achava).
                const [vaga, specialtiesData] = await Promise.all([
                    fetchJobOfferById(params.id as string),
                    fetchSpecialties().catch(() => [] as Specialty[]),
                ]);

                setSpecialties(specialtiesData);

                if (!vaga) {
                    setBlockingError("Vaga não encontrada.");
                    return;
                }

                if (vaga.employerId !== userProfile?.id) {
                    setBlockingError("Você não tem permissão para editar esta vaga.");
                    return;
                }

                const formValues = jobOfferToFormValues(vaga);
                setJob(vaga);
                setValues(formValues);
                setInitialValues(formValues);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setBlockingError("Vaga não encontrada.");
            } finally {
                setFetching(false);
            }
        };

        if (userProfile && params.id) {
            loadData();
        }
    }, [userProfile, loading, params.id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Datas só são conferidas contra "hoje" se mudaram (mesma regra do backend)
        const datesTouched =
            values.startDate !== initialValues.startDate || values.endDate !== initialValues.endDate;
        const validation = validateJobOfferForm(values, { rejectPastDates: datesTouched });
        if (validation) {
            setError(validation);
            return;
        }

        setSaving(true);
        try {
            await updateJobOffer(params.id as string, buildUpdateJobOfferPayload(values, specialties));
            setSuccess(true);
            setTimeout(() => {
                router.push("/dashboard/vagas");
            }, 1500);
        } catch (err: any) {
            console.error("Erro ao atualizar vaga:", err);
            if (isPlanErrorBody(err?.response?.data)) return;

            let errorMessage = "Erro inesperado ao atualizar vaga.";
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

    if (loading || fetching || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const status = job ? jobStatusInfo(job) : null;
    const banner =
        status?.status === "expired" ? (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Vaga expirada</AlertTitle>
                <AlertDescription>
                    A data do trabalho passou e a vaga saiu do ar. Informe novas datas de início/término e salve:
                    ela reabre automaticamente.
                </AlertDescription>
            </Alert>
        ) : status && status.status !== "open" ? (
            <Alert className="border-border bg-muted/40">
                <PauseCircle className="h-4 w-4" />
                <AlertTitle>Vaga {status.label.toLowerCase()}</AlertTitle>
                <AlertDescription>
                    {status.hint} Marque &quot;Vaga Ativa&quot; no fim do formulário para reabrir ao salvar.
                </AlertDescription>
            </Alert>
        ) : null;

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl space-y-8">
                    <ScrollReveal>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                    Editar Vaga
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Atualize as informações da sua oferta de emprego
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
                                    Vaga atualizada com sucesso! Redirecionando...
                                </AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    {(error || blockingError) && (
                        <ScrollReveal>
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{blockingError || error}</AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    {!success && !blockingError && job && (
                        <ScrollReveal delay={0.2}>
                            <JobOfferForm
                                mode="edit"
                                values={values}
                                onChange={setValues}
                                specialties={specialties}
                                submitting={saving}
                                onSubmit={handleSubmit}
                                onCancel={() => router.back()}
                                banner={banner}
                            />
                        </ScrollReveal>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
