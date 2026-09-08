"use client";

// Quem faz o quê no Briefing Pro: chips das pessoas da equipe atribuídas a
// uma seção (momento) ou a um item, e o popover para dono/editores mudarem a
// atribuição. Item sem ninguém herda quem cuida da seção (chips tracejados).

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { crewLabel, jobRoleTone } from "@/lib/briefing-pro-crew";
import { BriefingCrew } from "@/lib/briefing-pro-types";

type CrewLike = Pick<BriefingCrew, "id" | "name" | "job_role">;

export function CrewChip({
  member, inherited, className,
}: {
  member: CrewLike;
  inherited?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap ${jobRoleTone(member.job_role)} ${
        inherited ? "border border-dashed border-current/40 opacity-75" : ""
      } ${className ?? ""}`}
      title={inherited ? `${crewLabel(member)} — herdado da seção` : crewLabel(member)}
    >
      {member.name}
      {member.job_role && <span className="opacity-70">· {member.job_role}</span>}
    </span>
  );
}

/** Chips das pessoas atribuídas (só leitura). */
export function CrewBadges({
  crewIds, crewById, inherited = false, className,
}: {
  crewIds: string[];
  crewById: Map<string, CrewLike>;
  inherited?: boolean;
  className?: string;
}) {
  const members = crewIds.map((id) => crewById.get(id)).filter((m): m is CrewLike => Boolean(m));
  if (members.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {members.map((m) => (
        <CrewChip key={m.id} member={m} inherited={inherited} />
      ))}
    </span>
  );
}

/** Lista de checkboxes da equipe — usada no popover e no formulário do item. */
export function CrewCheckboxList({
  crew, selected, onToggle, emptyHint,
}: {
  crew: CrewLike[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyHint?: string;
}) {
  if (crew.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyHint ?? "Cadastre a equipe do trabalho (card \"Equipe e funções\") para atribuir."}
      </p>
    );
  }
  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {crew.map((member) => {
        const checked = selected.includes(member.id);
        return (
          <label
            key={member.id}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted cursor-pointer"
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(member.id)} />
            <span className="text-sm flex-1 min-w-0 truncate">{member.name}</span>
            {member.job_role && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${jobRoleTone(member.job_role)}`}>
                {member.job_role}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Chips + popover de atribuição. `selectedIds` = atribuição própria do alvo;
 * `inheritedIds` = quem cuida da seção (só para itens), mostrado tracejado
 * quando o item não tem ninguém próprio.
 */
export function CrewAssignPopover({
  crew, selectedIds, inheritedIds = [], canEdit, onSave, title, addLabel = "Quem faz?",
}: {
  crew: BriefingCrew[];
  selectedIds: string[];
  inheritedIds?: string[];
  canEdit: boolean;
  onSave: (crewIds: string[]) => Promise<void>;
  title: string;
  addLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [saving, setSaving] = useState(false);
  const crewById = new Map<string, CrewLike>(crew.map((c) => [c.id, c]));

  useEffect(() => {
    if (open) setDraft(selectedIds);
  }, [open, selectedIds]);

  const hasOwn = selectedIds.length > 0;
  const shownIds = hasOwn ? selectedIds : inheritedIds;
  const badges = (
    <CrewBadges crewIds={shownIds} crewById={crewById} inherited={!hasOwn && inheritedIds.length > 0} />
  );

  if (!canEdit) return shownIds.length > 0 ? badges : null;

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao salvar a atribuição");
    } finally {
      setSaving(false);
    }
  }

  const changed =
    draft.length !== selectedIds.length || draft.some((id) => !selectedIds.includes(id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex flex-wrap items-center gap-1 rounded-md text-left hover:bg-muted/60 px-0.5 -mx-0.5"
          title={title}
          aria-label={title}
        >
          {shownIds.length > 0 ? (
            badges
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
              <UserPlus className="h-3 w-3" />
              {addLabel}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          {title}
        </p>
        <CrewCheckboxList
          crew={crew}
          selected={draft}
          onToggle={(id) =>
            setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
        />
        {inheritedIds.length > 0 && draft.length === 0 && crew.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Sem ninguém marcado, este item fica com quem cuida da seção.
          </p>
        )}
        {crew.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !changed} className="gap-1">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
