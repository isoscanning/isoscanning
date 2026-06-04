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
import { ChevronLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

                    // Pre-fill fields
                    const initialValue = (candidateData.counterProposal && candidateData.counterProposal > 0)
                        ? candidateData.counterProposal
                        : (jobData.budgetMax || jobData.budgetMin || 0);
                        
                    setAgreementValue(initialValue.toString());
                    setAgreementScope(jobData.description);
                    setAgreementLocation(jobData.locationType === 'remote' ? 'Remoto' : `${jobData.city || ''} / ${jobData.state || ''}`);
                    
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

    // Update agreement text when fields change
    useEffect(() => {
        if (!jobOffer || !candidate || !userProfile) return;

        const text = `TERMO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS (FOTO E VÍDEO)

Por este instrumento particular, de um lado ${userProfile.displayName} (doravante denominado CONTRATANTE), 
e de outro lado ${candidate.profile.displayName} (doravante denominado CONTRATADO), têm entre si justo e acordado 
o seguinte:

1. DO OBJETO
O presente termo tem como objeto a prestação de serviços audiovisuais referentes à vaga "${jobOffer.title}".
Escopo dos serviços:
${agreementScope}

2. DO LOCAL E PRAZO
Os serviços serão executados no local: ${agreementLocation}.
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
    }, [agreementValue, agreementDeadline, agreementLocation, agreementScope, jobOffer, candidate, userProfile]);

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

        const numericValue = parseFloat(agreementValue.replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (isNaN(numericValue)) {
            toast({
                variant: "destructive",
                title: "Valor inválido",
                description: "Insira um valor numérico válido."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await sendJobAgreement(candidate.id, {
                agreementText,
                agreementValue: numericValue,
                agreementDeadline,
                agreementLocation
            });

            if (success) {
                toast({
                    title: "Acordo enviado",
                    description: "O termo de acordo foi enviado para aprovação do candidato."
                });
                router.push(`/dashboard/vagas/${jobOffer.id}/candidatos`);
            } else {
                throw new Error("Falha ao enviar acordo");
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível enviar o termo de acordo."
            });
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

                    <h1 className="text-3xl font-bold tracking-tight">Termo de Acordo</h1>
                    <p className="text-muted-foreground mt-1">
                        Gere e envie um termo de prestação de serviços para <span className="font-medium text-foreground">{candidate.profile.displayName}</span>
                    </p>
                </div>

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
                                        value={agreementValue} 
                                        onChange={(e) => setAgreementValue(e.target.value)}
                                        placeholder="Ex: 500,00"
                                    />
                                </div>
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
                                    Enviar para o Candidato
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                    O candidato receberá uma notificação para aprovar os termos. Após a aprovação do candidato, a contratação será oficialmente finalizada.
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
