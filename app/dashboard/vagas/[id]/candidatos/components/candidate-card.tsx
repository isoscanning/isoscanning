"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    MapPin,
    Star,
    Calendar,
    MessageSquare,
    Loader2,
    Check,
    X,
    Mail,
    Phone,
    MessageCircle,
    DollarSign
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type JobCandidate } from "@/lib/data-service";
import { ApprovalModal } from "./approval-modal";
import { useState } from "react";

interface CandidateCardProps {
    candidate: JobCandidate;
    isProcessing: boolean;
    onStatusUpdate: (id: string, status: 'accepted' | 'rejected', agreedValue?: number) => void;
    jobBudgetValue: number;
}

export function CandidateCard({
    candidate,
    isProcessing,
    onStatusUpdate,
    jobBudgetValue
}: CandidateCardProps) {
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted":
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Aprovado</Badge>;
            case "rejected":
                return <Badge variant="destructive">Rejeitado</Badge>;
            case "withdrawn":
                return <Badge variant="outline">Desistência</Badge>;
            default:
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Pendente</Badge>;
        }
    };

    const handleApprovalClick = () => {
        setIsApprovalModalOpen(true);
    };

    const handleConfirmApproval = (value: number) => {
        onStatusUpdate(candidate.id, 'accepted', value);
    };

    const initialValue = (candidate.counterProposal && candidate.counterProposal > 0)
        ? candidate.counterProposal
        : jobBudgetValue;

    return (
        <>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                <AvatarImage src={candidate.profile.avatarUrl} alt={candidate.profile.displayName} />
                                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                                    {candidate.profile.displayName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-foreground">
                                            {candidate.profile.displayName}
                                        </h3>
                                        {getStatusBadge(candidate.status)}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        {candidate.profile.specialty && (
                                            <span className="font-medium text-foreground/80">{candidate.profile.specialty}</span>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{candidate.profile.city || "N/A"}/{candidate.profile.state || "UF"}</span>
                                        </div>
                                        {candidate.profile.totalReviews && candidate.profile.totalReviews > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                                <span>{candidate.profile.averageRating?.toFixed(1) || "5.0"} ({candidate.profile.totalReviews})</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                                <span>Sem avaliação</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Aplicou em {format(new Date(candidate.createdAt), "d 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                    {candidate.counterProposal && candidate.counterProposal > 0 && (
                                        <div className="flex items-center gap-1.5 text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            <span>Proposta: R$ {candidate.counterProposal}</span>
                                        </div>
                                    )}
                                    {candidate.agreedValue && (
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            <span>Fechado: R$ {candidate.agreedValue}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {candidate.message && (
                                <div className="bg-muted/30 p-3 rounded-md text-sm italic text-muted-foreground border">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-70" />
                                        <p>"{candidate.message}"</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 justify-between">
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
                                        <Link href={`/profissionais/${candidate.profile.id}`} target="_blank">
                                            Ver Perfil Completo
                                        </Link>
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                                Entrar em Contato
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Opções de Contato</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {candidate.profile.email ? (
                                                <DropdownMenuItem asChild>
                                                    <a href={`mailto:${candidate.profile.email}`}>
                                                        <Mail className="mr-2 h-4 w-4" /> Email
                                                    </a>
                                                </DropdownMenuItem>
                                            ) : null}
                                            {candidate.profile.phone ? (
                                                <>
                                                    <DropdownMenuItem asChild>
                                                        <a href={`https://wa.me/${candidate.profile.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href={`tel:${candidate.profile.phone}`}>
                                                            <Phone className="mr-2 h-4 w-4" /> Telefone
                                                        </a>
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                            {!candidate.profile.email && !candidate.profile.phone && (
                                                <DropdownMenuItem disabled>
                                                    Sem dados de contato
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {candidate.status === 'pending' && (
                                    <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                                            onClick={handleApprovalClick}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><Check className="mr-1 h-4 w-4" /> Aprovar</>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => onStatusUpdate(candidate.id, 'rejected')}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><X className="mr-1 h-4 w-4" /> Rejeitar</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ApprovalModal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                onConfirm={handleConfirmApproval}
                candidateName={candidate.profile.displayName}
                initialValue={initialValue}
            />
        </>
    );
}
