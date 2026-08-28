"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList, Plus, Users, CheckCircle2, Calendar,
  MoreVertical, Trash2, Archive, ChevronRight, Sparkles, PlayCircle,
  Copy, Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import { usePlan, usePlanUsage } from "@/lib/plans/use-plan";
import {
  BriefingListRow,
  BRIEFING_STATUS_CONFIG,
  BRIEFING_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
} from "@/lib/briefing-pro-types";

function formatDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function DuplicateBriefingDialog({
  briefing, onClose, onDuplicated,
}: {
  briefing: BriefingListRow;
  onClose: () => void;
  onDuplicated: (newId: string) => void;
}) {
  const [title, setTitle] = useState(`${briefing.title} (cópia)`);
  const [clientName, setClientName] = useState(briefing.client_name ?? "");
  const [eventDate, setEventDate] = useState("");
  const [copyMembers, setCopyMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  async function duplicate() {
    setSaving(true);
    try {
      const copy = await briefingProService.duplicate(briefing.id, {
        title: title.trim() || undefined,
        client_name: clientName.trim() || undefined,
        event_date: eventDate || undefined,
        copy_members: copyMembers,
      });
      toast.success("Briefing duplicado! Você é o dono da cópia.");
      onDuplicated(copy.id);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Erro ao duplicar o briefing");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar briefing
          </DialogTitle>
          <DialogDescription>
            Cria uma cópia completa (seções, itens, subitens, entregáveis, links, contatos e
            locações) como novo rascunho seu. Se informar uma nova data, os prazos dos
            entregáveis são remapeados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título da cópia</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Novo cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova data da execução</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <Checkbox
              checked={copyMembers}
              onCheckedChange={(v) => setCopyMembers(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium block">Levar a equipe junto</span>
              <span className="text-muted-foreground text-xs">
                Copia os membros e as atribuições de responsáveis; todos são notificados.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={duplicate} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BriefingProPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [owned, setOwned] = useState<BriefingListRow[]>([]);
  const [shared, setShared] = useState<BriefingListRow[]>([]);
  const [activeTab, setActiveTab] = useState<"owned" | "shared">("owned");
  const [fetching, setFetching] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BriefingListRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<BriefingListRow | null>(null);

  // Cota de briefings/mês (GET /plans/me) — só exibe quando o plano tem limite
  const plan = usePlan();
  const { usage } = usePlanUsage();
  const briefingLimit = plan.limitOf("briefingsPerMonth");
  const briefingsUsed = usage.briefingsPerMonth;

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    fetchBriefings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  async function fetchBriefings() {
    setFetching(true);
    try {
      const data = await briefingProService.list();
      setOwned(data.owned.filter((b) => b.status !== "archived"));
      setShared(data.shared.filter((b) => b.status !== "archived"));
    } catch (err) {
      console.error("briefing-pro list:", err);
      toast.error("Erro ao carregar os briefings");
    } finally {
      setFetching(false);
    }
  }

  async function archiveBriefing(briefing: BriefingListRow) {
    try {
      await briefingProService.changeStatus(briefing.id, "archived");
      toast.success("Briefing arquivado");
      fetchBriefings();
    } catch {
      toast.error("Erro ao arquivar o briefing");
    }
  }

  async function deleteBriefing() {
    if (!deleteTarget || confirmText.toLowerCase() !== "excluir") return;
    setDeleting(true);
    try {
      await briefingProService.remove(deleteTarget.id);
      toast.success("Briefing excluído");
      setDeleteTarget(null);
      setConfirmText("");
      fetchBriefings();
    } catch {
      toast.error("Erro ao excluir o briefing");
    } finally {
      setDeleting(false);
    }
  }

  const list = activeTab === "owned" ? owned : shared;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center">
                <ClipboardList className="h-5 w-5" />
              </span>
              Briefing Pro
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie briefings completos, compartilhe com a equipe e acompanhe a execução em tempo real.
            </p>
            {briefingLimit !== null && briefingsUsed !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {briefingsUsed}/{briefingLimit} briefings este mês no plano {plan.label}
              </p>
            )}
          </div>
          <Button onClick={() => router.push("/dashboard/briefing-pro/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo briefing
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "owned" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("owned")}
          >
            Meus briefings ({owned.length})
          </Button>
          <Button
            variant={activeTab === "shared" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("shared")}
          >
            Compartilhados comigo ({shared.length})
          </Button>
        </div>

        {fetching ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              {activeTab === "owned" ? (
                <>
                  <p className="font-medium mb-1">Nenhum briefing ainda</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Crie manualmente ou cole o texto do cliente e deixe a IA estruturar tudo.
                  </p>
                  <Button onClick={() => router.push("/dashboard/briefing-pro/new")} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Criar meu primeiro briefing
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Quando alguém compartilhar um briefing com você, ele aparecerá aqui.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((briefing) => {
              const statusCfg = BRIEFING_STATUS_CONFIG[briefing.status];
              const total = briefing.items_total ?? 0;
              const done = briefing.items_done ?? 0;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;
              const isOwner = activeTab === "owned";

              return (
                <Card
                  key={briefing.id}
                  className="group hover:border-rose-500/50 hover:shadow-lg transition-all cursor-pointer flex flex-col"
                  onClick={() => router.push(`/dashboard/briefing-pro/${briefing.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline">
                          {BRIEFING_TYPE_LABELS[briefing.briefing_type]}
                        </Badge>
                        {briefing.my_role && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {MEMBER_ROLE_LABELS[briefing.my_role]}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setDuplicateTarget(briefing)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {isOwner && (
                            <>
                              <DropdownMenuItem onClick={() => archiveBriefing(briefing)}>
                                <Archive className="h-4 w-4 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(briefing)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-lg mt-2 group-hover:text-rose-500 transition-colors line-clamp-2">
                      {briefing.title}
                    </CardTitle>
                    {briefing.client_name && (
                      <CardDescription>Cliente: {briefing.client_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    {total > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {done}/{total} itens
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {briefing.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(briefing.event_date)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(briefing.members_count ?? 0) + 1}
                        </span>
                        {briefing.status === "in_execution" && (
                          <span className="flex items-center gap-1 text-blue-500 font-medium">
                            <PlayCircle className="h-3 w-3" />
                            Ao vivo
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      {duplicateTarget && (
        <DuplicateBriefingDialog
          briefing={duplicateTarget}
          onClose={() => setDuplicateTarget(null)}
          onDuplicated={(newId) => {
            setDuplicateTarget(null);
            router.push(`/dashboard/briefing-pro/${newId}`);
          }}
        />
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir briefing</DialogTitle>
            <DialogDescription>
              Isso exclui permanentemente &quot;{deleteTarget?.title}&quot; com todos os itens,
              entregáveis, links e comentários. Essa ação não pode ser desfeita. Digite{" "}
              <strong>excluir</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="excluir"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText.toLowerCase() !== "excluir" || deleting}
              onClick={deleteBriefing}
            >
              {deleting ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
