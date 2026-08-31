"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AgendaSettings } from "@/lib/data-service";

const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (UTC−3)" },
  { value: "America/Fortaleza", label: "Fortaleza / Nordeste (UTC−3)" },
  { value: "America/Recife", label: "Recife (UTC−3)" },
  { value: "America/Bahia", label: "Salvador (UTC−3)" },
  { value: "America/Belem", label: "Belém (UTC−3)" },
  { value: "America/Manaus", label: "Manaus (UTC−4)" },
  { value: "America/Cuiaba", label: "Cuiabá (UTC−4)" },
  { value: "America/Campo_Grande", label: "Campo Grande (UTC−4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (UTC−4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC−5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC−2)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC−3)" },
  { value: "America/Montevideo", label: "Montevidéu (UTC−3)" },
  { value: "America/Santiago", label: "Santiago (UTC−4/−3)" },
  { value: "America/Lima", label: "Lima (UTC−5)" },
  { value: "America/Bogota", label: "Bogotá (UTC−5)" },
  { value: "America/Mexico_City", label: "Cidade do México (UTC−6)" },
  { value: "America/New_York", label: "Nova York (UTC−5/−4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC−8/−7)" },
  { value: "Europe/Lisbon", label: "Lisboa (UTC+0/+1)" },
  { value: "Europe/Madrid", label: "Madri (UTC+1/+2)" },
  { value: "Europe/London", label: "Londres (UTC+0/+1)" },
  { value: "UTC", label: "UTC" },
];

const LEAD_TIMES = [
  { value: 0, label: "Sem antecedência" },
  { value: 2, label: "2 horas" },
  { value: 6, label: "6 horas" },
  { value: 12, label: "12 horas" },
  { value: 24, label: "1 dia" },
  { value: 48, label: "2 dias" },
  { value: 72, label: "3 dias" },
  { value: 168, label: "1 semana" },
];

const HORIZONS = [
  { value: 30, label: "1 mês" },
  { value: 60, label: "2 meses" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
  { value: 365, label: "1 ano" },
];

interface AgendaSettingsCardProps {
  settings: AgendaSettings;
  saving: boolean;
  onSave: (patch: Partial<AgendaSettings>) => Promise<void>;
}

export function AgendaSettingsCard({ settings, saving, onSave }: AgendaSettingsCardProps) {
  const [draft, setDraft] = useState<AgendaSettings>(settings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setDirty(false);
  }, [settings]);

  const patch = (p: Partial<AgendaSettings>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };

  const tzKnown = TIMEZONES.some((t) => t.value === draft.timezone);

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Preferências da agenda</CardTitle>
        <CardDescription className="text-base">
          Como a sua disponibilidade é publicada no perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fuso horário</Label>
            <Select value={draft.timezone} onValueChange={(v) => patch({ timezone: v })}>
              <SelectTrigger aria-label="Fuso horário">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!tzKnown && <SelectItem value={draft.timezone}>{draft.timezone}</SelectItem>}
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Seus horários são lidos neste fuso.</p>
          </div>

          <div className="space-y-2">
            <Label>Antecedência mínima</Label>
            <Select value={String(draft.leadTimeHours)} onValueChange={(v) => patch({ leadTimeHours: Number(v) })}>
              <SelectTrigger aria-label="Antecedência mínima">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_TIMES.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Horários mais próximos que isso não aparecem como livres.</p>
          </div>

          <div className="space-y-2">
            <Label>Publicar até</Label>
            <Select value={String(draft.horizonDays)} onValueChange={(v) => patch({ horizonDays: Number(v) })}>
              <SelectTrigger aria-label="Horizonte de publicação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label} à frente</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Até onde a semana padrão é projetada no perfil.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="publishWeeklyRules">Publicar a semana padrão automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Desligado, só as datas marcadas manualmente aparecem no seu perfil.
              </p>
            </div>
            <Switch
              id="publishWeeklyRules"
              checked={draft.publishWeeklyRules}
              onCheckedChange={(v) => patch({ publishWeeklyRules: v })}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="autoBlockExternal">Fechar datas com os calendários conectados</Label>
              <p className="text-sm text-muted-foreground">
                Compromissos do Google/iCloud/Outlook bloqueiam o horário no seu perfil. Desligado, eles
                continuam sincronizando mas não fecham nada.
              </p>
            </div>
            <Switch
              id="autoBlockExternal"
              checked={draft.autoBlockExternal}
              onCheckedChange={(v) => patch({ autoBlockExternal: v })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={() => onSave(draft)} disabled={saving || !dirty}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar preferências
          </Button>
          {dirty && !saving && <span className="text-xs text-muted-foreground">alterações não salvas</span>}
        </div>
      </CardContent>
    </Card>
  );
}
