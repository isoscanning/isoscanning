"use client";

// "Feito por X" de um item concluído/pulado do Briefing Pro. Para dono e
// editores vira um seletor: no dia da execução é comum uma pessoa marcar as
// tarefas em nome da equipe, e o relatório precisa refletir quem executou.

import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import { BriefingItem, ProfileSummary } from "@/lib/briefing-pro-types";

function MiniAvatar({ profile }: { profile?: ProfileSummary | null }) {
  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? "?";
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.display_name}
        className="h-4 w-4 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center text-[9px] font-semibold shrink-0">
      {initial}
    </span>
  );
}

export function BriefingCompletedBy({
  item, people, profiles, canEdit, onChanged,
}: {
  item: BriefingItem;
  /** Dono + membros ativos (opções do seletor). */
  people: Array<{ id: string; profile: ProfileSummary | null }>;
  /** Mapa de perfis do briefing — resolve executores que já saíram da equipe. */
  profiles: Record<string, ProfileSummary>;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const isDone = item.status === "done";
  const isSkipped = item.status === "skipped";
  if (!isDone && !isSkipped) return null;

  const verb = isSkipped ? "pulado" : "feito";
  const current = item.completed_by ? profiles[item.completed_by] ?? null : null;
  const options = [...people];
  if (item.completed_by && !options.some((p) => p.id === item.completed_by)) {
    options.push({ id: item.completed_by, profile: current });
  }

  async function change(userId: string) {
    if (userId === item.completed_by) return;
    setSaving(true);
    try {
      await briefingProService.updateItem(item.id, { completed_by: userId });
      onChanged();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao alterar quem executou");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    if (!item.completed_by) return null;
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <MiniAvatar profile={current} />
        {verb} por {current?.display_name ?? "alguém"}
      </span>
    );
  }

  return (
    <Select value={item.completed_by ?? ""} onValueChange={change} disabled={saving}>
      <SelectTrigger
        size="sm"
        aria-label="Alterar quem executou"
        title="Alterar quem executou este item"
        className="data-[size=sm]:h-6 w-auto min-w-0 max-w-[220px] gap-1 rounded-full border-dashed px-2 py-0 text-xs text-emerald-600 dark:text-emerald-400 shadow-none [&>svg:last-child]:hidden"
      >
        {saving ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <MiniAvatar profile={current} />
        )}
        <SelectValue placeholder={`${verb} por —`}>
          {verb} por {current?.display_name ?? "?"}
        </SelectValue>
        <ChevronDown className="size-3 opacity-60" />
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.profile?.display_name ?? "Usuário"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
