"use client";

// Editor da equipe do trabalho (nome + função + vínculo opcional com um
// usuário da plataforma). Usado na criação do briefing e no dialog "Equipe e
// funções" do detalhe. Trabalha com rascunhos locais; quem salva é a página.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2, Loader2, Plus, Search, Unlink, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizeSearchTerm } from "@/lib/utils";
import { JOB_ROLE_SUGGESTIONS, jobRoleTone } from "@/lib/briefing-pro-crew";
import { ProfileSummary } from "@/lib/briefing-pro-types";

export interface CrewDraft {
  /** Chave local estável (linha). */
  key: string;
  /** Id no banco quando já existe. */
  id?: string;
  name: string;
  job_role: string;
  user_id: string | null;
  profile?: ProfileSummary | null;
  phone: string;
}

let keySeq = 0;
export function newCrewDraft(partial: Partial<CrewDraft> = {}): CrewDraft {
  keySeq += 1;
  return {
    key: `draft-${Date.now()}-${keySeq}`,
    name: "",
    job_role: "",
    user_id: null,
    profile: null,
    phone: "",
    ...partial,
  };
}

function Initial({ profile, name }: { profile?: ProfileSummary | null; name: string }) {
  const initial = (profile?.display_name || name || "?").charAt(0).toUpperCase();
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar_url} alt={profile.display_name} className="h-7 w-7 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <span className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
      {initial}
    </span>
  );
}

/** Busca de perfis cadastrados (mesma consulta do painel de equipe). */
function ProfileSearchPopover({
  onPick, excludeIds, quickOptions,
}: {
  onPick: (profile: ProfileSummary) => void;
  excludeIds: Set<string>;
  /** Pessoas com acesso ao briefing — sugestões sem precisar buscar. */
  quickOptions?: ProfileSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = sanitizeSearchTerm(query);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, username, email")
          .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
          .eq("is_active", true)
          .limit(8);
        setResults(((data ?? []) as ProfileSummary[]).filter((p) => !excludeIds.has(p.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const quick = (quickOptions ?? []).filter((p) => !excludeIds.has(p.id));

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" title="Vincular a um usuário cadastrado (notificações e filtro Meus itens)">
          <Link2 className="h-3.5 w-3.5" />
          Vincular usuário
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2 space-y-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou usuário..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}
        {(query.length < 2 ? quick : results).map((p) => (
          <button
            key={p.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
            onClick={() => { onPick(p); setOpen(false); setQuery(""); }}
          >
            <Initial profile={p} name={p.display_name} />
            <span className="min-w-0">
              <span className="block text-sm truncate">{p.display_name}</span>
              {p.username && <span className="block text-[11px] text-muted-foreground truncate">@{p.username}</span>}
            </span>
          </button>
        ))}
        {query.length >= 2 && !searching && results.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">Ninguém encontrado.</p>
        )}
        {query.length < 2 && quick.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">Digite para buscar quem já usa a plataforma.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CrewEditor({
  value, onChange, quickProfiles, compact = false,
}: {
  value: CrewDraft[];
  onChange: (next: CrewDraft[]) => void;
  /** Pessoas com acesso ao briefing — aparecem como sugestão de vínculo. */
  quickProfiles?: ProfileSummary[];
  compact?: boolean;
}) {
  const update = (key: string, patch: Partial<CrewDraft>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const remove = (key: string) => onChange(value.filter((row) => row.key !== key));
  const linkedIds = new Set(value.map((r) => r.user_id).filter((id): id is string => Boolean(id)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Quem vai trabalhar no dia e qual a função de cada um. Pode incluir gente sem conta na plataforma.
        </p>
      )}
      {value.map((row) => (
        <div key={row.key} className="rounded-lg border p-2.5 space-y-2">
          <div className="flex items-start gap-2">
            <Initial profile={row.profile} name={row.name} />
            <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-2">
              <Input
                value={row.name}
                onChange={(e) => update(row.key, { name: e.target.value })}
                placeholder="Nome"
                className="h-8 text-sm"
                aria-label="Nome"
              />
              <Input
                value={row.job_role}
                onChange={(e) => update(row.key, { job_role: e.target.value })}
                placeholder="Função (Foto, Drone, Coordenação...)"
                className="h-8 text-sm"
                aria-label="Função"
                list="briefing-crew-job-roles"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive shrink-0"
              title="Remover da equipe"
              onClick={() => remove(row.key)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!row.job_role && (
            <div className="flex flex-wrap gap-1 pl-9">
              {JOB_ROLE_SUGGESTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => update(row.key, { job_role: role })}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium hover:ring-2 hover:ring-primary/30 ${jobRoleTone(role)}`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
          {!compact && (
            <div className="flex flex-wrap items-center gap-2 pl-9">
              {row.user_id ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  Vinculado a {row.profile?.display_name ?? "usuário"}
                  {row.profile?.username ? ` (@${row.profile.username})` : ""}
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center gap-0.5 hover:text-foreground"
                    title="Desvincular"
                    onClick={() => update(row.key, { user_id: null, profile: null })}
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <ProfileSearchPopover
                  excludeIds={linkedIds}
                  quickOptions={quickProfiles}
                  onPick={(p) =>
                    update(row.key, {
                      user_id: p.id,
                      profile: p,
                      name: row.name.trim() || p.display_name,
                    })
                  }
                />
              )}
              <Input
                value={row.phone}
                onChange={(e) => update(row.key, { phone: e.target.value })}
                placeholder="Telefone (opcional)"
                className="h-7 text-xs w-44"
                aria-label="Telefone"
              />
            </div>
          )}
        </div>
      ))}
      <datalist id="briefing-crew-job-roles">
        {JOB_ROLE_SUGGESTIONS.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onChange([...value, newCrewDraft()])}
      >
        <Plus className="h-4 w-4" />
        Adicionar pessoa
      </Button>
    </div>
  );
}
