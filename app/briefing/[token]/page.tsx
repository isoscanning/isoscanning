"use client";

// Visão PÚBLICA do briefing via link compartilhado (/briefing/<token>).
// - Sem conta: consulta somente leitura (conteúdo sanitizado pelo backend).
// - Com conta: botão "Participar" adiciona a pessoa como membro com o papel
//   definido pelo dono no link (visualizador ou editor).

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Clock, MapPin, Phone, Package, Link2, HardDrive,
  Lock, CheckCircle2, CornerDownRight, Loader2, UserPlus, LogIn, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import {
  PublicBriefingView,
  BRIEFING_STATUS_CONFIG,
  BRIEFING_TYPE_LABELS,
  DELIVERABLE_STATUS_CONFIG,
  PRIORITY_CONFIG,
  STORAGE_TYPE_LABELS,
} from "@/lib/briefing-pro-types";

function formatDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function PublicBriefingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [view, setView] = useState<PublicBriefingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await briefingProService.fetchPublicBriefing(token);
      setView(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o briefing");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function join() {
    setJoining(true);
    try {
      const result = await briefingProService.joinShared(token);
      toast.success("Você entrou no briefing!");
      router.push(`/dashboard/briefing-pro/${result.briefing_id}`);
    } catch {
      toast.error("Erro ao entrar no briefing");
      setJoining(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
            <p className="font-medium mb-1">{error}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Peça um novo link para quem compartilhou este briefing com você.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Ir para a ISOSCANNING</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const { briefing } = view;
  const statusCfg = BRIEFING_STATUS_CONFIG[briefing.status];
  const allItems = view.sections.flatMap((s) => s.items);
  const doneCount = allItems.filter((i) => i.status === "done" || i.status === "skipped").length;
  const progress = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
  const roleLabel = view.share_role === "editor" ? "editar o conteúdo" : "acompanhar e comentar";

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar pública */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </span>
            Briefing Pro · ISOSCANNING
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            Visualização compartilhada
          </Badge>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* CTA de participação */}
        <Card className="mb-6 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm">
              <span className="font-medium">Quer participar deste briefing?</span>{" "}
              <span className="text-muted-foreground">
                Entrando, você poderá {roleLabel} e marcar itens no dia da execução.
              </span>
            </p>
            {authLoading ? null : userProfile ? (
              <Button onClick={join} disabled={joining} className="gap-2 shrink-0">
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Participar do briefing
              </Button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
                <Button asChild size="sm" className="gap-2">
                  <Link href="/cadastro">
                    <UserPlus className="h-4 w-4" />
                    Criar conta grátis
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
          {!userProfile && !authLoading && (
            <CardContent className="pt-0 pb-3">
              <p className="text-xs text-muted-foreground">
                Depois de entrar, volte a este link e clique em &quot;Participar do briefing&quot;.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Cabeçalho do briefing */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="secondary" className={statusCfg.className}>{statusCfg.label}</Badge>
              <Badge variant="outline">{BRIEFING_TYPE_LABELS[briefing.briefing_type]}</Badge>
              <Badge variant="outline" className="text-muted-foreground">v{briefing.version}</Badge>
            </div>
            <CardTitle className="text-2xl">{briefing.title}</CardTitle>
            <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
              {briefing.client_name && <span>Cliente: {briefing.client_name}</span>}
              {briefing.event_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(briefing.event_date)}
                  {briefing.event_time ? ` às ${briefing.event_time}` : ""}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {briefing.objective && <p><span className="font-medium">Objetivo: </span>{briefing.objective}</p>}
            {briefing.target_audience && <p><span className="font-medium">Público-alvo: </span>{briefing.target_audience}</p>}
            {briefing.tone && <p><span className="font-medium">Tom / estilo: </span>{briefing.tone}</p>}
            {briefing.restrictions && (
              <p className="text-red-600 dark:text-red-400">
                <span className="font-medium">Restrições: </span>{briefing.restrictions}
              </p>
            )}
            {briefing.notes && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Observações: </span>{briefing.notes}
              </p>
            )}
            {allItems.length > 0 && (
              <div className="pt-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{doneCount}/{allItems.length} itens · {progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locações e contatos */}
        {(briefing.locations.length > 0 || briefing.contacts.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {briefing.locations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />Locações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {briefing.locations.map((l, i) => (
                    <div key={i}>
                      <p className="font-medium">{l.name}</p>
                      {l.address && <p className="text-xs text-muted-foreground">{l.address}</p>}
                      {l.map_url && (
                        <a href={l.map_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          Ver no mapa
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {briefing.contacts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />Contatos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {briefing.contacts.map((c, i) => (
                    <div key={i}>
                      <p className="font-medium">
                        {c.name}
                        {c.role && <span className="text-muted-foreground font-normal"> — {c.role}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[c.phone, c.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Estrutura */}
        <h2 className="text-lg font-semibold mb-3">Estrutura do briefing</h2>
        <div className="space-y-4 mb-6">
          {view.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => {
                  const isDone = item.status === "done" || item.status === "skipped";
                  const itemLinks = view.links.filter((l) => l.item_id === item.id);
                  return (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 mt-0.5 shrink-0 ${isDone ? "text-emerald-500" : "text-muted-foreground/40"}`}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </span>
                          {item.scheduled_time && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />{item.scheduled_time}
                            </Badge>
                          )}
                          {item.is_required && (
                            <Badge variant="secondary" className="text-xs gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Lock className="h-3 w-3" />Obrigatório
                            </Badge>
                          )}
                          {item.priority === "high" && (
                            <Badge variant="secondary" className={`text-xs ${PRIORITY_CONFIG.high.className}`}>
                              Alta
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                        {item.subitems.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.subitems.map((sub) => (
                              <li key={sub.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CornerDownRight className="h-3 w-3 shrink-0" />
                                <span className={sub.status === "done" ? "line-through" : ""}>{sub.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {itemLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {itemLinks.map((link) => (
                              <a
                                key={link.id}
                                href={link.url || undefined}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${link.url ? "text-blue-600 dark:text-blue-400 hover:underline" : "text-muted-foreground cursor-default"}`}
                                title={link.description || undefined}
                              >
                                {link.storage_type === "external_hd" ? <HardDrive className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Entregáveis */}
        {view.deliverables.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" />Entregáveis
            </h2>
            <div className="space-y-3 mb-6">
              {view.deliverables.map((del) => (
                <Card key={del.id}>
                  <CardContent className="py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {del.quantity > 1 ? `${del.quantity}x ` : ""}{del.title}
                      </span>
                      <Badge variant="secondary" className={DELIVERABLE_STATUS_CONFIG[del.status].className}>
                        {DELIVERABLE_STATUS_CONFIG[del.status].label}
                      </Badge>
                    </div>
                    {del.specs && <p className="text-xs text-muted-foreground mt-1">{del.specs}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {del.due_date && `Prazo: ${formatDate(del.due_date)} · `}
                      {del.deliver_to && `Para: ${del.deliver_to} · `}
                      {del.delivery_method && `Via: ${del.delivery_method}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Materiais gerais */}
        {view.links.filter((l) => !l.item_id && !l.deliverable_id).length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />Materiais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {view.links
                .filter((l) => !l.item_id && !l.deliverable_id)
                .map((link) => (
                  <div key={link.id}>
                    {link.url ? (
                      <a href={link.url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-all">
                        {link.label}
                      </a>
                    ) : (
                      <span className="font-medium">{link.label}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {STORAGE_TYPE_LABELS[link.storage_type]}
                      {link.description ? ` — ${link.description}` : ""}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Briefing compartilhado via{" "}
          <Link href="/" className="text-rose-500 hover:underline">ISOSCANNING · Briefing Pro</Link>
        </p>
      </main>
    </div>
  );
}
