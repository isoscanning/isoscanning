"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJobCandidates, fetchJobOfferById, sendJobAgreement, type JobCandidate, type JobOffer } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, Loader2, Send, CalendarDays, AlertTriangle, CheckCircle2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { NegotiationHistory, formatBRL, formatDateOnly, parseBRL } from "@/components/jobs/negotiation";

const apiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    return typeof msg === "string" && msg ? msg : fallback;
};

/** Normaliza ISO/timestamp para o formato do <input type="date"> (YYYY-MM-DD). */
const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function AcordoVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [candidate, setCandidate] = useState<JobCandidate | null>(null);
    const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [agreementValue, setAgreementValue] = useState("");
    const [agreementDeadline, setAgreementDeadline] = useState("");
    const [agreementLocation, setAgreementLocation] = useState("");
    const [agreementStartDate, setAgreementStartDate] = useState("");
    const [agreementEndDate, setAgreementEndDate] = useState("");
    const [agreementScope, setAgreementScope] = useState("");
    const [agreementText, setAgreementText] = useState("");

    useEffect(() => {
        const loadData = async () => {
            if (userProfile && params.id && params.applicationId) {
                try {
                    const [jobData, candidatesData] = await Promise.all([
                        fetchJobOfferById(params.id as string),
                        fetchJobCandidates(params.id as string)
                    ]);

                    if (!jobData || jobData.employerId !== userProfile.id) {
                        router.push("/dashboard/vagas");
                        return;
                    }

                    const candidateData = candidatesData.find(c => c.id === params.applicationId);
                    if (!candidateData) {
                        router.push(`/dashboard/vagas/${params.id}/candidatos`);
                        return;
                    }

                    setJobOffer(jobData);
                    setCandidate(candidateData);

                    // Pré-preenche com a última posição da negociação:
                    // contraproposta do candidato > sua contraproposta > valor já enviado > orçamento da vaga
                    const initialValue =
                        candidateData.counterProposal ||
                        candidateData.employerCounterProposal ||
                        candidateData.agreementValue ||
                        jobData.budgetMax || jobData.budgetMin || 0;

                    setAgreementValue(initialValue ? initialValue.toFixed(2).replace('.', ',') : "");
                    setAgreementDeadline(candidateData.agreementDeadline ?? "");
                    setAgreementScope(jobData.description);
                    setAgreementLocation(
                        candidateData.agreementLocation ??
                        (jobData.locationType === 'remote' ? 'Remoto' : `${jobData.city || ''} / ${jobData.state || ''}`)
                    );
                    // Datas do serviço: as do acordo anterior, senão as da vaga → viram reserva na agenda
                    const start = toDateInput(candidateData.agreementStartDate ?? jobData.startDate);
                    const end = toDateInput(candidateData.agreementEndDate ?? jobData.endDate) || start;
                    setAgreementStartDate(start);
                    setAgreementEndDate(end);
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                } finally {
                    setLoading(false);
                }
            } else if (!authLoading && !userProfile) {
                router.push("/login");
            }
        };

        loadData();
    }, [userProfile, authLoading, params.id, params.applicationId, router]);

    // Regenera o texto quando os campos mudam
    useEffect(() => {
        if (!jobOffer || !candidate || !userProfile) return;

        const serviceDates = agreementStartDate
            ? (agreementEndDate && agreementEndDate !== agreementStartDate
                ? `de ${formatDateOnly(agreementStartDate)} a ${formatDateOnly(agreementEndDate)}`
                : `em ${formatDateOnly(agreementStartDate)}`)
            : "a combinar entre as partes";

        const text = `TERMO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS (FOTO E VÍDEO)

Por este instrumento particular, de um lado ${userProfile.displayName} (doravante denominado CONTRATANTE),
e de outro lado ${candidate.profile.displayName} (doravante denominado CONTRATADO), têm entre si justo e acordado
o seguinte:

1. DO OBJETO
O presente termo tem como objeto a prestação de serviços audiovisuais referentes à vaga "${jobOffer.title}".
Escopo dos serviços:
${agreementScope}

2. DO LOCAL, DATA E PRAZO
Os serviços serão executados no local: ${agreementLocation}.
Data de realização do serviço: ${serviceDates}.
O prazo de entrega dos materiais finais é: ${agreementDeadline}.

3. DO VALOR E PAGAMENTO
Pela prestação dos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de R$ ${agreementValue}.
As condições de pagamento deverão ser combinadas diretamente entre as partes.

4. DAS OBRIGAÇÕES
O CONTRATADO compromete-se a entregar os serviços com qualidade e dentro do prazo estipulado.
O CONTRATANTE compromete-se a efetuar o pagamento acordado e fornecer as condições necessárias para a execução do serviço.

Assinado digitalmente por ambas as partes através da plataforma IsoScanning.

Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

        setAgreementText(text);
    }, [agreementValue, agreementDeadline, agreementLocation, agreementStartDate, agreementEndDate, agreementScope, jobOffer, candidate, userProfile]);

    const agreementAccepted = candidate?.agreementStatus === 'accepted';
    const isResend = !!candidate?.agreementText;

    const handleSendAgreement = async () => {
        if (!candidate || !jobOffer) return;

        if (!agreementValue || !agreementDeadline || !agreementLocation) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Preencha o valor, prazo de entrega e local."
            });
            return;
        }

        const numericValue = parseBRL(agreementValue);
        if (Number.isNaN(numericValue) || numericValue <= 0) {
            toast({
                variant: "destructive",
                title: "Valor inválido",
                description: "Insira um valor numérico válido."
            });
            return;
        }

        if (agreementStartDate && agreementEndDate && agreementEndDate < agreementStartDate) {
            toast({ variant: "destructive", title: "Datas inválidas", description: "A data final não pode ser anterior à inicial." });
            return;
        }

        setIsSubmitting(true);
        try {
            await sendJobAgreement(candidate.id, {
                agreementText,
                agreementValue: numericValue,
                agreementDeadline,
                agreementLocation,
                agreementStartDate: agreementStartDate || undefined,
                agreementEndDate: (agreementEndDate || agreementStartDate) || undefined,
            });

            toast({
                title: isResend ? "Acordo reenviado" : "Acordo enviado",
                description: "O candidato foi notificado e pode aceitar, recusar ou contrapropor."
            });
            router.push(`/dashboard/vagas/${jobOffer.id}/candidatos?candidatura=${candidate.id}`);
        } catch (error) {
            console.error(error);
            // 403 de plano: o modal de upgrade já foi aberto pelo apiClient.
            if (!isPlanErrorBody((error as any)?.response?.data)) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: apiErrorMessage(error, "Não foi possível enviar o termo de acordo.")
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || loading || !userProfile || !jobOffer || !candidate) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    // Acordo já aceito: os termos estão travados — o próximo passo é o contrato digital.
    if (agreementAccepted) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                    <Button variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" asChild>
                        <Link href={`/dashboard/vagas/${jobOffer.id}/candidatos?candidatura=${candidate.id}`}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Candidatos
                        </Link>
                    </Button>
                    <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertTitle>Acordo já aceito por {candidate.profile.displayName}</AlertTitle>
                        <AlertDescription className="space-y-3">
                            <p>
                                Os termos ({formatBRL(candidate.agreementValue)}) foram aceitos e não podem mais ser reenviados.
                                Para alterar algo, gere o contrato digital e ajuste as cláusulas nele — ou cancele-o e crie uma nova versão.
                            </p>
                            <Button asChild size="sm">
                                <Link href={`/dashboard/vagas/${jobOffer.id}/candidatos?candidatura=${candidate.id}`}>
                                    {candidate.contractId ? "Ver contrato" : "Gerar contrato digital"}
                                </Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <Button variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" asChild>
                        <Link href={`/dashboard/vagas/${jobOffer.id}/candidatos`}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Candidatos
                        </Link>
                    </Button>

                    <h1 className="text-3xl font-bold tracking-tight">{isResend ? "Reenviar Termo de Acordo" : "Termo de Acordo"}</h1>
                    <p className="text-muted-foreground mt-1">
                        Gere e envie um termo de prestação de serviços para <span className="font-medium text-foreground">{candidate.profile.displayName}</span>
                    </p>
                </div>

                {candidate.agreementStatus === 'countered' && candidate.counterProposal && (
                    <Alert className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                        <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                        <AlertTitle>O candidato contrapropôs {formatBRL(candidate.counterProposal)}</AlertTitle>
                        <AlertDescription>
                            O valor abaixo já foi preenchido com a contraproposta. Ajuste se quiser e reenvie o acordo.
                        </AlertDescription>
                    </Alert>
                )}
                {candidate.agreementStatus === 'rejected' && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>O candidato recusou o acordo anterior</AlertTitle>
                        <AlertDescription>Revise os termos antes de reenviar — veja o histórico abaixo para entender a negociação.</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhes do Acordo</CardTitle>
                                <CardDescription>Preencha os campos para gerar o texto do contrato.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="value">Valor Acordado (R$)</Label>
                                    <Input
                                        id="value"
                                        inputMode="decimal"
                                        value={agreementValue}
                                        onChange={(e) => setAgreementValue(e.target.value)}
                                        placeholder="Ex: 500,00"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Data do serviço</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={agreementStartDate}
                                            onChange={(e) => {
                                                setAgreementStartDate(e.target.value);
                                                if (!agreementEndDate || agreementEndDate < e.target.value) setAgreementEndDate(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">Até (opcional)</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            min={agreementStartDate || undefined}
                                            value={agreementEndDate}
                                            onChange={(e) => setAgreementEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {agreementStartDate ? (
                                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        Ao aceitar, a data é reservada na agenda de vocês dois e bloqueada de vez na assinatura do contrato.
                                    </p>
                                ) : (
                                    <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        Sem data do serviço, nada será reservado na agenda nem bloqueado no calendário.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="deadline">Prazo de Entrega</Label>
                                    <Input
                                        id="deadline"
                                        value={agreementDeadline}
                                        onChange={(e) => setAgreementDeadline(e.target.value)}
                                        placeholder="Ex: 5 dias úteis, ou 20/07/2026"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Local da Prestação do Serviço</Label>
                                    <Input
                                        id="location"
                                        value={agreementLocation}
                                        onChange={(e) => setAgreementLocation(e.target.value)}
                                        placeholder="Ex: Estúdio XYZ - São Paulo/SP"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scope">Escopo do Serviço</Label>
                                    <Textarea
                                        id="scope"
                                        value={agreementScope}
                                        onChange={(e) => setAgreementScope(e.target.value)}
                                        className="h-32"
                                        placeholder="Descreva o que será entregue (fotos, vídeos, tempo, etc)."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Histórico da negociação</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <NegotiationHistory applicationId={candidate.id} viewerRole="employer" />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>Texto do Termo</CardTitle>
                                <CardDescription>Revise o texto gerado. Você pode editá-lo livremente antes de enviar.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                                <Textarea
                                    className="flex-1 min-h-[350px] font-mono text-sm leading-relaxed"
                                    value={agreementText}
                                    onChange={(e) => setAgreementText(e.target.value)}
                                />
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleSendAgreement}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 h-4 w-4" />
                                    )}
                                    {isResend ? "Reenviar para o Candidato" : "Enviar para o Candidato"}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                    O candidato receberá uma notificação para aceitar, recusar ou contrapropor. Com o aceite, a data é reservada na agenda e você poderá gerar o contrato digital para assinatura.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
