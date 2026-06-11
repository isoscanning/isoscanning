"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, Users, UserPlus, Trash2, Crown, Pencil, Eye,
  CheckCircle, Search, Loader2, X
} from "lucide-react";
import { toast } from "sonner";
import { TeamMember, MemberRole } from "@/lib/social-media-types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLE_CONFIG: Record<MemberRole, {
  label: string;
  description: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  owner: {
    label: "Proprietário",
    description: "Acesso total",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Crown,
  },
  editor: {
    label: "Editor",
    description: "Pode editar posts e conteúdo",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Pencil,
  },
  approver: {
    label: "Aprovador",
    description: "Pode aprovar e rejeitar posts",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
  viewer: {
    label: "Visualizador",
    description: "Apenas leitura",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: Eye,
  },
};

interface ProfileResult {
  id: string;
  display_name: string;
  avatar_url?: string;
  username?: string;
  email?: string;
  specialties?: string[];
}

function UserAvatar({ profile, size = "md" }: {
  profile: { display_name?: string; avatar_url?: string };
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
  const initial = profile.display_name?.charAt(0).toUpperCase() || "?";

  if (profile.avatar_url && !imgError) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.display_name || ""}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-border`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold shrink-0`}>
      {initial}
    </div>
  );
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const scheduleId = params.scheduleId as string;

  const [scheduleName, setScheduleName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [fetching, setFetching] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [inviting, setInviting] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(searchQuery.trim());
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, members]);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    fetchTeam();
  }, [userProfile, scheduleId]);

  async function fetchTeam() {
    setFetching(true);
    try {
      const { data: sched } = await supabase
        .from("social_media_schedules")
        .select("client_name, owner_id")
        .eq("id", scheduleId)
        .single();

      if (!sched || sched.owner_id !== userProfile?.id) {
        toast.error("Acesso não autorizado");
        router.push(`/dashboard/social-media/${scheduleId}`);
        return;
      }
      setScheduleName(sched.client_name);

      const { data: memberRows, error: membersErr } = await supabase
        .rpc("sm_get_team_members", { p_schedule_id: scheduleId });

      if (membersErr) {
        console.error("sm_get_team_members error:", membersErr);
      }

      setMembers((memberRows as any[]) || []);
    } catch {
      toast.error("Erro ao carregar equipe");
    } finally {
      setFetching(false);
    }
  }

  async function runSearch(query: string) {
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username, email, specialties")
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq("id", userProfile?.id)
        .eq("is_active", true)
        .limit(8);

      const existingIds = members.map((m) => m.user_id);
      const filtered = ((data as ProfileResult[]) || []).filter(
        (p) => !existingIds.includes(p.id)
      );
      setSearchResults(filtered);
      setDropdownOpen(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleInvite(profile: ProfileResult) {
    if (inviting) return;
    setInviting(profile.id);
    try {
      const { data, error } = await supabase.rpc("sm_add_team_member", {
        p_schedule_id: scheduleId,
        p_user_id: profile.id,
        p_role: inviteRole,
      });

      if (error) {
        console.error("sm_add_team_member error:", error);
        const msg: string = error.message || "";
        if (msg.toLowerCase().includes("already") || msg.includes("23505")) {
          toast.error("Este usuário já está na equipe");
        } else {
          toast.error(`Erro ao adicionar: ${msg || "verifique o console"}`);
        }
        return;
      }

      const result = data as { success?: boolean; error?: string } | null;
      if (result?.error === "already_member") {
        toast.error("Este usuário já está na equipe");
        return;
      }

      toast.success(`${profile.display_name} adicionado como ${ROLE_CONFIG[inviteRole].label}`);
      setSearchQuery("");
      setSearchResults([]);
      setDropdownOpen(false);
      await fetchTeam();
    } catch (err) {
      console.error("handleInvite exception:", err);
      toast.error("Erro ao adicionar membro");
    } finally {
      setInviting(null);
    }
  }

  async function handleChangeRole(memberId: string, newRole: MemberRole) {
    const { error } = await supabase.rpc("sm_update_member_role", {
      p_member_id: memberId,
      p_role: newRole,
    });

    if (error) {
      console.error("sm_update_member_role error:", error);
      toast.error("Erro ao atualizar função");
      return;
    }
    toast.success("Função atualizada");
    fetchTeam();
  }

  async function handleRemoveMember(memberId: string, name: string) {
    const { error } = await supabase.rpc("sm_remove_team_member", {
      p_member_id: memberId,
    });

    if (error) {
      console.error("sm_remove_team_member error:", error);
      toast.error("Erro ao remover membro");
      return;
    }
    toast.success(`${name} removido da equipe`);
    fetchTeam();
  }

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-3xl space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
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
        <div className="container mx-auto max-w-3xl space-y-8">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/social-media/${scheduleId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Gestão de Equipe
              </h1>
              <p className="text-sm text-muted-foreground">
                Cronograma: <strong>{scheduleName}</strong>
              </p>
            </div>
          </div>

          {/* Invite Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-500" />
                Convidar Colaborador
              </CardTitle>
              <CardDescription>
                Busque pelo nome ou @usuário de alguém cadastrado na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Role selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Função do novo membro</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["editor", "approver", "viewer"] as MemberRole[]).map((role) => {
                    const cfg = ROLE_CONFIG[role];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs transition-all ${inviteRole === role
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-border hover:border-blue-300"
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{cfg.label}</span>
                        <span className="text-muted-foreground text-center leading-tight">{cfg.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Autocomplete search */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Buscar usuário</Label>
                <div ref={searchRef} className="relative">
                  {/* Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Digite o nome ou @usuário..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                      className="pl-9 pr-9"
                    />
                    {/* Right icon: loading or clear */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : searchQuery ? (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(""); setSearchResults([]); setDropdownOpen(false); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Dropdown */}
                  {dropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-muted-foreground text-center">
                          Nenhum usuário encontrado para "{searchQuery}"
                        </div>
                      ) : (
                        <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                          {searchResults.map((profile) => (
                            <li
                              key={profile.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors"
                            >
                              {/* Avatar */}
                              <UserAvatar profile={profile} size="md" />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-none truncate">
                                  {profile.display_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {profile.username ? `@${profile.username}` : profile.email || ""}
                                </p>
                                {profile.specialties && profile.specialties.length > 0 && (
                                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                                    {profile.specialties.slice(0, 2).join(", ")}
                                  </p>
                                )}
                              </div>

                              {/* Add button — elemento button dedicado */}
                              <button
                                type="button"
                                onClick={() => handleInvite(profile)}
                                disabled={!!inviting}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                                  inviting === profile.id
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {inviting === profile.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <UserPlus className="h-3 w-3" />}
                                {inviting === profile.id ? "Adicionando..." : "Adicionar"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Footer hint */}
                      <div className="px-4 py-2 bg-muted/30 border-t border-border">
                        <p className="text-[11px] text-muted-foreground">
                          {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} · Função selecionada: <strong>{ROLE_CONFIG[inviteRole].label}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Digite ao menos 2 caracteres para buscar
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current team */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Membros da Equipe
              </CardTitle>
              <CardDescription>
                {members.length} {members.length === 1 ? "colaborador" : "colaboradores"} com acesso a este cronograma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                      <Skeleton className="h-8 w-28 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Nenhum colaborador adicionado ainda.</p>
                  <p className="text-xs">Use o campo acima para buscar e convidar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const profile = (member as any).profile as ProfileResult | undefined;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors"
                      >
                        <UserAvatar profile={profile || {}} size="lg" />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">
                            {profile?.display_name || "Usuário"}
                          </p>
                          {profile?.username && (
                            <p className="text-xs text-muted-foreground">@{profile.username}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Desde {format(new Date(member.invited_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>

                        {/* Role selector */}
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleChangeRole(member.id, v as MemberRole)}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["editor", "approver", "viewer"] as MemberRole[]).map((role) => (
                              <SelectItem key={role} value={role} className="text-xs">
                                {ROLE_CONFIG[role].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          onClick={() => handleRemoveMember(member.id, profile?.display_name || "membro")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role reference */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Referência de Funções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["owner", "editor", "approver", "viewer"] as MemberRole[]).map((role) => {
                  const cfg = ROLE_CONFIG[role];
                  return (
                    <div key={role} className="flex items-start gap-2">
                      <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{cfg.description}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </div>
  );
}
