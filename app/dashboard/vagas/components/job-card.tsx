"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Briefcase,
    MapPin,
    Trash2,
    Edit,
    DollarSign,
    Pause,
    Play,
    User,
    MoreVertical,
    Calendar,
    Search,
    CheckCircle2,
    Clock,
    Users,
    Receipt,
    CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type JobOffer } from "@/lib/data-service";
import {
    formatJobBudget,
    formatJobDateRange,
    formatJobTimeRange,
    jobCityState,
    jobStatusInfo,
    jobTypeLabel,
    positionsLabel,
} from "@/lib/jobs/job-offer-display";

interface JobCardProps {
    vaga: JobOffer;
    isSelected: boolean;
    onToggleSelection: (checked: boolean) => void;
    /** Pausar (aberta) ou reativar/reabrir (pausada/concluída). Expirada vai para a edição. */
    onToggleActive: () => void;
    onDelete: () => void;
    onConclude: () => void;
}

const STRIP_COLOR: Record<string, string> = {
    open: "bg-green-500",
    paused: "bg-yellow-500",
    closed: "bg-gray-500",
    expired: "bg-red-500",
};

const BADGE_CLASS: Record<string, string> = {
    open: "bg-green-600 hover:bg-green-700 text-white",
    paused: "",
    closed: "bg-gray-200 text-gray-700",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function JobCard({
    vaga,
    isSelected,
    onToggleSelection,
    onToggleActive,
    onDelete,
    onConclude
}: JobCardProps) {
    const status = jobStatusInfo(vaga);
    const isOpen = status.status === "open";
    const isExpired = status.status === "expired";
    const dates = formatJobDateRange(vaga.startDate, vaga.endDate);
    const times = formatJobTimeRange(vaga.startTime, vaga.endTime);
    const editHref = `/dashboard/vagas/editar/${vaga.id}`;

    const statusBadge = (
        <Badge
            variant={isOpen ? "default" : "secondary"}
            className={`text-xs ${BADGE_CLASS[status.status]}`}
            title={status.hint}
        >
            {status.label}
        </Badge>
    );

    /** Item de reativação: expirada precisa de novas datas → vai para a edição. */
    const reactivateItem = (compact: boolean) =>
        isExpired ? (
            <DropdownMenuItem asChild>
                <Link href={editHref}>
                    <CalendarClock className="mr-2 h-4 w-4" /> {compact ? "Novas datas e reabrir" : "Editar datas e reabrir"}
                </Link>
            </DropdownMenuItem>
        ) : (
            <DropdownMenuItem onClick={onToggleActive}>
                <Play className="mr-2 h-4 w-4" /> {vaga.status === "closed" ? (compact ? "Reabrir" : "Reabrir Vaga") : (compact ? "Reativar" : "Reativar Vaga")}
            </DropdownMenuItem>
        );

    return (
        <Card className={`overflow-hidden transition-all hover:shadow-md ${!isOpen ? 'opacity-75 bg-muted/30' : ''} ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
            <CardContent className="p-0">
                {/* Mobile: Status strip at top */}
                <div className={`md:hidden h-1.5 ${STRIP_COLOR[status.status]}`} />

                <div className="flex">
                    {/* Selection Strip - hidden on mobile, shown in content area */}
                    <div className="hidden md:flex items-center justify-center w-12 bg-muted/10 border-r">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onToggleSelection(checked as boolean)}
                        />
                    </div>

                    {/* Desktop: Status Strip */}
                    <div className={`hidden md:block w-2 ${STRIP_COLOR[status.status]}`} />

                    <div className="flex-1 p-4 md:p-6 space-y-3 md:space-y-4">
                        {/* Mobile: Checkbox row */}
                        <div className="flex md:hidden items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => onToggleSelection(checked as boolean)}
                                />
                                {statusBadge}
                                <Badge variant="outline" className="text-muted-foreground text-xs">
                                    {vaga.category}
                                </Badge>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>
                                            <User className="mr-2 h-4 w-4" /> Ver Candidatos
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/vagas/${vaga.id}`} target="_blank">
                                            <Search className="mr-2 h-4 w-4" /> Visualizar
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={editHref}>
                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                        </Link>
                                    </DropdownMenuItem>
                                    {vaga.status !== 'closed' && (
                                        <DropdownMenuItem onClick={onConclude}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
                                        </DropdownMenuItem>
                                    )}
                                    {isOpen && (
                                        <DropdownMenuItem onClick={onToggleActive}>
                                            <Pause className="mr-2 h-4 w-4" /> Pausar
                                        </DropdownMenuItem>
                                    )}
                                    {!isOpen && reactivateItem(true)}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                                {/* Desktop badges */}
                                <div className="hidden md:flex items-center gap-2 mb-2">
                                    {statusBadge}
                                    <Badge variant="outline" className="text-muted-foreground">
                                        {vaga.category}
                                    </Badge>
                                    {(vaga.positions ?? 1) > 1 && (
                                        <Badge variant="outline" className="text-muted-foreground gap-1">
                                            <Users className="h-3 w-3" /> {positionsLabel(vaga.positions)}
                                        </Badge>
                                    )}
                                    {vaga.requiresInvoice && (
                                        <Badge variant="outline" className="text-muted-foreground gap-1" title="Exige nota fiscal">
                                            <Receipt className="h-3 w-3" /> NF
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="text-base md:text-xl font-bold text-foreground line-clamp-2 md:line-clamp-1">
                                    {vaga.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                                        Publicado em {format(new Date(vaga.createdAt), "d 'de' MMM, yyyy", { locale: ptBR })}
                                    </span>
                                    {isExpired && (
                                        <span className="text-red-600 dark:text-red-400 font-medium">{status.hint}</span>
                                    )}
                                </div>
                            </div>

                            {/* Desktop actions */}
                            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>
                                        <User className="mr-2 h-4 w-4" />
                                        Ver Candidatos
                                    </Link>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Ações</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações da Vaga</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/vagas/${vaga.id}`} target="_blank">
                                                <Search className="mr-2 h-4 w-4" /> Visualizar Vaga
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={editHref}>
                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                            </Link>
                                        </DropdownMenuItem>
                                        {vaga.status !== 'closed' && (
                                            <DropdownMenuItem onClick={onConclude}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir Vaga
                                            </DropdownMenuItem>
                                        )}
                                        {isOpen && (
                                            <DropdownMenuItem onClick={onToggleActive}>
                                                <Pause className="mr-2 h-4 w-4" /> Pausar Vaga
                                            </DropdownMenuItem>
                                        )}
                                        {!isOpen && reactivateItem(false)}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={onDelete}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Vaga
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Info grid - responsive */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 flex-shrink-0" />
                                <span>{jobTypeLabel(vaga.jobType)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 flex-shrink-0" />
                                <span className="truncate max-w-[220px] md:max-w-none">
                                    {vaga.locationType === "remote"
                                        ? "Remoto"
                                        : vaga.venue
                                            ? `${vaga.venue} · ${jobCityState(vaga)}`
                                            : jobCityState(vaga)}
                                </span>
                            </div>
                            {dates && (
                                <div className="flex items-center gap-1.5">
                                    <CalendarClock className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 flex-shrink-0" />
                                    <span>{dates}</span>
                                </div>
                            )}
                            {times && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 flex-shrink-0" />
                                    <span>{times}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 flex-shrink-0" />
                                <span>{formatJobBudget(vaga)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
