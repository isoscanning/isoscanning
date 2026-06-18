"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Input } from "@/components/ui/input";
import {
  Share2, Plus, Calendar, Users, ChevronRight,
  Archive, Instagram, Facebook, Youtube, Linkedin, Twitter, Music2,
  MoreVertical, Trash2, Eye, AlertTriangle
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  SocialMediaSchedule, NetworkType, MONTHS_PT, NETWORK_CONFIG
} from "@/lib/social-media-types";

interface ScheduleWithCount extends SocialMediaSchedule {
  posts_count?: number;
  my_role?: string;
}

const NETWORK_ICONS: Record<NetworkType, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

export default function SocialMediaPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [ownedSchedules, setOwnedSchedules] = useState<ScheduleWithCount[]>([]);
  const [sharedSchedules, setSharedSchedules] = useState<ScheduleWithCount[]>([]);
  const [activeTab, setActiveTab] = useState<"owned" | "shared">("owned");
  const [fetching, setFetching] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleWithCount | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    fetchSchedules();
  }, [userProfile]);

  async function fetchSchedules() {
    if (!userProfile) return;
    setFetching(true);
    try {
      const { data: owned, error: ownedErr } = await supabase
        .from("social_media_schedules")
        .select("*")
        .eq("owner_id", userProfile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (ownedErr) {
        console.warn("social_media_schedules:", ownedErr);
        setOwnedSchedules([]);
        setSharedSchedules([]);
        return;
      }

      const ownedWithCount: ScheduleWithCount[] = await Promise.all(
        (owned || []).map(async (s) => {
          const { count } = await supabase
            .from("social_media_posts")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", s.id);
          return { ...s, posts_count: count || 0 };
        })
      );
      setOwnedSchedules(ownedWithCount);

      const { data: teamRows, error: teamErr } = await supabase
        .from("social_media_team_members")
        .select("role, schedule_id, social_media_schedules(*)")
        .eq("user_id", userProfile.id)
        .eq("status", "active");

      if (teamErr) {
        console.warn("social_media_team_members:", teamErr);
        setSharedSchedules([]);
        return;
      }

      const sharedRaw = await Promise.all(
        (teamRows || []).map(async (row: any) => {
          const s = row.social_media_schedules as SocialMediaSchedule;
          if (!s) return null;
          const { count } = await supabase
            .from("social_media_posts")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", s.id);
          return { ...s, posts_count: count || 0, my_role: row.role } as ScheduleWithCount;
        })
      );
      setSharedSchedules(sharedRaw.filter((x): x is ScheduleWithCount => x !== null));
    } catch (err) {
      console.error("fetchSchedules unexpected error:", err);
    } finally {
      setFetching(false);
    }
  }

  async function archiveSchedule(id: string) {
    const { error } = await supabase
      .from("social_media_schedules")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao arquivar cronograma");
      return;
    }
    toast.success("Cronograma arquivado");
    fetchSchedules();
  }

  async function deleteSchedule() {
    if (!deleteTarget || confirmText.toLowerCase() !== "excluir") return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("social_media_schedules")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast.error("Erro ao excluir cronograma");
        return;
      }
      toast.success("Cronograma excluído permanentemente");
      setDeleteTarget(null);
      setConfirmText("");
      fetchSchedules();
    } finally {
      setDeleting(false);
    }
  }

  function openDeleteDialog(schedule: ScheduleWithCount) {
    setConfirmText("");
    setDeleteTarget(schedule);
  }

  const displaySchedules = activeTab === "owned" ? ownedSchedules : sharedSchedules;

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-6xl space-y-8">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">

          {/* Header */}
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/10 via-blue-400/10 to-cyan-500/10 p-8 md:p-10 border border-blue-500/10">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
                      Gestão Social Media
                    </h1>
                  </div>
                  <p className="text-muted-foreground max-w-xl">
                    Crie cronogramas com IA, gerencie conteúdos e colabore com sua equipe em tempo real.
                  </p>
                </div>
                <Link href="/dashboard/social-media/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0">
                    <Plus className="h-4 w-4" />
                    Novo Cronograma
                  </Button>
                </Link>
              </div>
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
            </div>
          </ScrollReveal>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("owned")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "owned"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              Meus Cronogramas
              {ownedSchedules.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                  {ownedSchedules.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "shared"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              Compartilhados comigo
              {sharedSchedules.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                  {sharedSchedules.length}
                </span>
              )}
            </button>
          </div>

          {/* Schedules Grid */}
          {fetching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : displaySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">
                {activeTab === "owned" ? "Nenhum cronograma criado ainda" : "Nenhum cronograma compartilhado"}
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {activeTab === "owned"
                  ? "Crie seu primeiro cronograma de social media com geração automática por IA."
                  : "Quando alguém te convidar para colaborar em um cronograma, ele aparecerá aqui."}
              </p>
              {activeTab === "owned" && (
                <Link href="/dashboard/social-media/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 mt-2">
                    <Plus className="h-4 w-4" />
                    Criar Cronograma
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displaySchedules.map((schedule, i) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  isOwner={activeTab === "owned"}
                  delay={i * 0.05}
                  onArchive={() => archiveSchedule(schedule.id)}
                  onDelete={() => openDeleteDialog(schedule)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-destructive">Excluir cronograma permanentemente</DialogTitle>
            </div>
            <DialogDescription className="space-y-3 pt-1">
              <span className="block">
                Você está prestes a excluir o cronograma{" "}
                <strong className="text-foreground">{deleteTarget?.client_name}</strong>.
                Todos os posts, comentários e dados associados serão apagados.
              </span>
              <span className="block font-semibold text-destructive">
                Esta ação não pode ser desfeita.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Para confirmar, digite <strong className="text-foreground">excluir</strong> no campo abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="excluir"
              className="border-destructive/30 focus-visible:ring-destructive/50"
              onKeyDown={(e) => { if (e.key === "Enter" && confirmText.toLowerCase() === "excluir") deleteSchedule(); }}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSchedule}
              disabled={confirmText.toLowerCase() !== "excluir" || deleting}
            >
              {deleting ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleCard({
  schedule,
  isOwner,
  delay,
  onArchive,
  onDelete,
}: {
  schedule: ScheduleWithCount;
  isOwner: boolean;
  delay: number;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const monthName = MONTHS_PT[schedule.month - 1];
  const networks = (schedule.networks || []) as NetworkType[];

  return (
    <ScrollReveal delay={delay}>
      <Card className="h-full border-border hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight group-hover:text-blue-500 transition-colors line-clamp-1">
                {schedule.client_name}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-1">
                {schedule.client_niche || "Sem nicho definido"}
              </CardDescription>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/social-media/${schedule.id}/team`} className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Gerenciar equipe
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-muted-foreground"
                    onClick={onArchive}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Month/Year + Post count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{monthName} {schedule.year}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {schedule.posts_count || 0} posts
            </span>
          </div>

          {/* Networks */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {networks.slice(0, 4).map((net) => {
              const Icon = NETWORK_ICONS[net];
              const config = NETWORK_CONFIG[net];
              return Icon ? (
                <div
                  key={net}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted"
                  title={config.label}
                >
                  <Icon className={`h-3 w-3 ${config.color}`} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ) : null;
            })}
            {networks.length > 4 && (
              <span className="text-xs text-muted-foreground">+{networks.length - 4}</span>
            )}
          </div>

          {/* Role badge for shared */}
          {!isOwner && schedule.my_role && (
            <Badge variant="secondary" className="text-xs capitalize">
              {schedule.my_role === "approver" ? "Aprovador" :
                schedule.my_role === "editor" ? "Editor" : "Visualizador"}
            </Badge>
          )}

          {/* Action */}
          <Link href={`/dashboard/social-media/${schedule.id}`} className="block">
            <Button
              className="w-full gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/30 hover:border-blue-600 transition-all"
              variant="ghost"
            >
              <Eye className="h-4 w-4" />
              Ver Calendário
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
