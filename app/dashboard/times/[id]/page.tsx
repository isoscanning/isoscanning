"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Archive, Crown, Shield, Users, Briefcase, MessageSquare, Megaphone, Settings, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { TEAM_ROLE_LABELS, initials, isManagerRole, type TeamDetail } from "@/lib/teams-types";
import { OverviewTab } from "./components/overview-tab";
import { MembersTab } from "./components/members-tab";
import { JobsTab } from "./components/jobs-tab";
import { TeamChat } from "./components/team-chat";
import { AnnouncementsTab } from "./components/announcements-tab";
import { SettingsTab } from "./components/settings-tab";

type TabKey = "visao" | "membros" | "jobs" | "chat" | "avisos" | "config";
const TABS: TabKey[] = ["visao", "membros", "jobs", "chat", "avisos", "config"];

function TeamHubInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.id as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(requested && TABS.includes(requested) ? requested : "visao");

  const load = useCallback(async () => {
    try {
      const data = await teamsService.getDetail(teamId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(teamsApiError(err, "Não foi possível carregar o time"));
    }
  }, [teamId]);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    if (userProfile) void load();
  }, [userProfile, load]);

  useEffect(() => {
    if (requested && TABS.includes(requested)) setTab(requested);
  }, [requested]);

  function changeTab(next: string) {
    const key = next as TabKey;
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.toString());
  }

  const isManager = isManagerRole(detail?.my_role);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-6 md:py-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">
          <Link href="/dashboard/times" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Meus times
          </Link>

          {error ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="font-medium">{error}</p>
              <Button asChild variant="outline" className="mt-4"><Link href="/dashboard/times">Voltar</Link></Button>
            </div>
          ) : !detail ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full max-w-lg" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: detail.team.color }}>
                  {initials(detail.team.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold truncate">{detail.team.name}</h1>
                    <Badge variant={detail.my_role === "member" ? "secondary" : "default"}>
                      {detail.my_role === "owner" ? <Crown className="mr-1 h-3 w-3" /> : detail.my_role === "manager" ? <Shield className="mr-1 h-3 w-3" /> : null}
                      {TEAM_ROLE_LABELS[detail.my_role]}
                    </Badge>
                    {detail.team.archived_at && (
                      <Badge variant="outline"><Archive className="mr-1 h-3 w-3" /> Arquivado</Badge>
                    )}
                  </div>
                  {detail.team.description && <p className="text-muted-foreground mt-1">{detail.team.description}</p>}
                </div>
              </div>

              <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
                <div className="overflow-x-auto -mx-4 px-4">
                  <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
                    <TabsTrigger value="visao"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Visão geral</TabsTrigger>
                    <TabsTrigger value="membros">
                      <Users className="mr-1.5 h-4 w-4" /> Membros
                      <span className="ml-1.5 text-xs text-muted-foreground">{detail.stats.members_active}</span>
                    </TabsTrigger>
                    <TabsTrigger value="jobs">
                      <Briefcase className="mr-1.5 h-4 w-4" /> Jobs
                      {detail.stats.jobs_open > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{detail.stats.jobs_open}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="chat">
                      <MessageSquare className="mr-1.5 h-4 w-4" /> Chat
                      {detail.unread.team > 0 && (
                        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{detail.unread.team}</span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="avisos"><Megaphone className="mr-1.5 h-4 w-4" /> Avisos</TabsTrigger>
                    <TabsTrigger value="config"><Settings className="mr-1.5 h-4 w-4" /> Configurar</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="visao">
                  <OverviewTab detail={detail} onGoTo={changeTab} onChanged={load} />
                </TabsContent>
                <TabsContent value="membros">
                  <MembersTab detail={detail} currentUserId={userProfile?.id ?? ""} onChanged={load} />
                </TabsContent>
                <TabsContent value="jobs">
                  <JobsTab teamId={teamId} isManager={isManager} archived={!!detail.team.archived_at} />
                </TabsContent>
                <TabsContent value="chat">
                  <TeamChat
                    teamId={teamId}
                    currentUserId={userProfile?.id ?? ""}
                    disabled={!!detail.team.archived_at}
                    title={`Chat do time ${detail.team.name}`}
                    onRead={() => setDetail((d) => (d ? { ...d, unread: { ...d.unread, team: 0 } } : d))}
                  />
                </TabsContent>
                <TabsContent value="avisos">
                  <AnnouncementsTab teamId={teamId} isManager={isManager} currentUserId={userProfile?.id ?? ""} archived={!!detail.team.archived_at} />
                </TabsContent>
                <TabsContent value="config">
                  <SettingsTab
                    detail={detail}
                    currentUserId={userProfile?.id ?? ""}
                    onChanged={load}
                    onLeftOrDeleted={() => {
                      toast.success("Pronto");
                      router.push("/dashboard/times");
                    }}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TeamHubPage() {
  return (
    <Suspense fallback={null}>
      <TeamHubInner />
    </Suspense>
  );
}
