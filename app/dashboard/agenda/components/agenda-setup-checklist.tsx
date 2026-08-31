"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarRange, CheckCircle2, Circle, ExternalLink, Link2, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgendaOverview, AgendaView } from "@/lib/data-service";
import { addDaysToKey, formatWeeklyPattern, todayKey } from "@/lib/availability";

// Checklist "o que o público está vendo da minha agenda?" — cada item tem o
// estado atual e um atalho para a seção que resolve. É o guia do
// profissional para deixar a agenda pública correta sem precisar entender
// como as peças (semana padrão, exceções, calendários) se combinam.

export type ConfigSection = "weekly" | "dates" | "calendars";

interface AgendaSetupChecklistProps {
  overview: AgendaOverview | null;
  agenda: AgendaView | null;
  profileUrl: string;
  onGo: (section: ConfigSection) => void;
}

interface Item {
  key: ConfigSection;
  icon: React.ReactNode;
  title: string;
  done: boolean;
  status: string;
  action: string;
}

export function AgendaSetupChecklist({ overview, agenda, profileUrl, onGo }: AgendaSetupChecklistProps) {
  const items = useMemo<Item[]>(() => {
    const rules = overview?.rules ?? [];
    const settings = overview?.settings;
    const pattern = agenda?.weeklyPattern ?? [];
    const activeConnections = (overview?.connections ?? []).filter((c) => c.syncEnabled && c.status === "active");

    const weeklyDone = rules.length > 0 && !!settings?.publishWeeklyRules;
    const weeklyStatus = rules.length === 0
      ? "Não definido — seu perfil não diz quando você atende."
      : !settings?.publishWeeklyRules
        ? "Definido, mas a publicação automática está desligada (só datas marcadas aparecem)."
        : `Atende ${formatWeeklyPattern(pattern.length ? pattern : [])}${settings?.horizonDays ? ` · publicado até ${settings.horizonDays} dias à frente` : ""}`;

    return [
      {
        key: "weekly",
        icon: <Settings2 className="h-4 w-4" />,
        title: "Dias de atendimento",
        done: weeklyDone,
        status: weeklyStatus,
        action: rules.length === 0 ? "Definir" : "Ajustar",
      },
      {
        key: "calendars",
        icon: <Link2 className="h-4 w-4" />,
        title: "Fechar datas automaticamente",
        done: activeConnections.length > 0,
        status: activeConnections.length > 0
          ? `${activeConnections.length} calendário${activeConnections.length === 1 ? "" : "s"} conectado${activeConnections.length === 1 ? "" : "s"} — compromissos de fora já bloqueiam seu perfil.`
          : "Conecte Google, iCloud ou Outlook e o sistema fecha as datas sozinho a cada 30 min.",
        action: activeConnections.length > 0 ? "Gerenciar" : "Conectar",
      },
      {
        key: "dates",
        icon: <CalendarRange className="h-4 w-4" />,
        title: "Folgas, viagens e exceções",
        done: true, // opcional — nunca "pendente"
        status: "Datas com horário diferente da semana padrão, ou dias que você quer fechar de vez.",
        action: "Marcar",
      },
    ];
  }, [overview, agenda]);

  // Resultado: quantos dias abertos o visitante encontra no horizonte publicado
  const outlook = useMemo(() => {
    if (!agenda || !overview) return null;
    const today = todayKey();
    const limit = addDaysToKey(today, overview.settings.horizonDays);
    const inWindow = agenda.days.filter((d) => d.date >= today && d.date <= limit);
    return {
      open: inWindow.filter((d) => d.status === "free" || d.status === "partial").length,
      closed: inWindow.filter((d) => d.status === "busy").length,
      horizon: overview.settings.horizonDays,
    };
  }, [agenda, overview]);

  const pending = items.filter((i) => !i.done).length;

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">O que o público vê da sua agenda</CardTitle>
            <CardDescription className="text-base">
              Quem quer te contratar vê seus dias de atendimento e quais datas já estão fechadas — nunca o
              motivo. As configurações abaixo alimentam essa visão.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver meu perfil público
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {outlook && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <strong className="text-emerald-700 dark:text-emerald-400">{outlook.open}</strong> dia{outlook.open === 1 ? "" : "s"} com horário livre
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{outlook.closed}</strong> fechado{outlook.closed === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">nos próximos {outlook.horizon} dias</span>
            {pending > 0 && (
              <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                {pending} item{pending === 1 ? "" : "s"} para configurar
              </span>
            )}
          </div>
        )}

        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="flex flex-1 items-start gap-3">
                {item.done
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-2 font-medium">
                    {item.icon} {item.title}
                  </p>
                  <p className={cn("text-sm", item.done ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400")}>
                    {item.status}
                  </p>
                </div>
              </div>
              <Button type="button" variant={item.done ? "ghost" : "default"} size="sm" onClick={() => onGo(item.key)}>
                {item.action} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
