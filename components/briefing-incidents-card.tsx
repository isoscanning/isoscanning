"use client";

// Intercorrências do Briefing Pro: registro de imprevistos durante a execução
// (equipamento falhou, atraso, chuva...), com gravidade e resolução.
// Usado na página de detalhe e no modo Dia de Execução.

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import {
  BriefingIncident,
  EffectiveRole,
  INCIDENT_SEVERITY_CONFIG,
} from "@/lib/briefing-pro-types";

export function BriefingIncidentsCard({
  briefingId, incidents, myRole, userId, onChanged,
}: {
  briefingId: string;
  incidents: BriefingIncident[];
  myRole: EffectiveRole;
  userId?: string;
  onChanged: () => void;
}) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<BriefingIncident | null>(null);

  const openCount = incidents.filter((i) => !i.resolved).length;
  const canManage = (incident: BriefingIncident) =>
    myRole === "owner" || myRole === "editor" || incident.author_id === userId;

  return (
    <Card className={openCount > 0 ? "border-orange-300 dark:border-orange-800" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${openCount > 0 ? "text-orange-500" : ""}`} />
            Intercorrências
            {openCount > 0 && (
              <Badge variant="secondary" className={INCIDENT_SEVERITY_CONFIG.medium.className}>
                {openCount} em aberto
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        </div>
        <CardDescription className="text-xs">
          Imprevistos da execução ficam registrados aqui e entram no relatório final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma intercorrência registrada. 🍀</p>
        )}
        {incidents.map((incident) => {
          const severityCfg = INCIDENT_SEVERITY_CONFIG[incident.severity];
          return (
            <div
              key={incident.id}
              className={`rounded-lg border p-3 text-sm ${incident.resolved ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={severityCfg.className}>
                    {severityCfg.label}
                  </Badge>
                  {incident.resolved ? (
                    <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolvida
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800">
                      Em aberto
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!incident.resolved && canManage(incident) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setResolveTarget(incident)}
                    >
                      Resolver
                    </Button>
                  )}
                  {canManage(incident) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Excluir intercorrência"
                      onClick={async () => {
                        try {
                          await briefingProService.deleteIncident(incident.id);
                          onChanged();
                        } catch {
                          toast.error("Erro ao excluir a intercorrência");
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words">{incident.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {incident.profile?.display_name ?? "Alguém"} ·{" "}
                {new Date(incident.occurred_at).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {incident.resolved && incident.resolution && (
                <p className="text-xs mt-1.5 border-l-2 border-emerald-400 pl-2 text-muted-foreground">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Resolução: </span>
                  {incident.resolution}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>

      {registerOpen && (
        <RegisterIncidentDialog
          briefingId={briefingId}
          onClose={() => setRegisterOpen(false)}
          onSaved={() => { setRegisterOpen(false); onChanged(); }}
        />
      )}

      {resolveTarget && (
        <ResolveIncidentDialog
          incident={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSaved={() => { setResolveTarget(null); onChanged(); }}
        />
      )}
    </Card>
  );
}

function RegisterIncidentDialog({
  briefingId, onClose, onSaved,
}: {
  briefingId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (description.trim().length < 3) {
      toast.error("Descreva o que aconteceu");
      return;
    }
    setSaving(true);
    try {
      await briefingProService.addIncident(briefingId, {
        description: description.trim(),
        severity,
      });
      toast.success("Intercorrência registrada — a equipe foi notificada");
      onSaved();
    } catch {
      toast.error("Erro ao registrar a intercorrência");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Registrar intercorrência
          </DialogTitle>
          <DialogDescription>
            O que aconteceu fora do planejado? Toda a equipe será notificada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Gravidade</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Leve — não afeta o resultado</SelectItem>
                <SelectItem value="medium">Média — exigiu adaptação</SelectItem>
                <SelectItem value="high">Grave — compromete entregas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>O que aconteceu? *</Label>
            <Textarea
              autoFocus
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Choveu durante a cerimônia externa — fotos movidas para o salão. Flash principal parou de funcionar às 18h, usando o reserva."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || description.trim().length < 3} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveIncidentDialog({
  incident, onClose, onSaved,
}: {
  incident: BriefingIncident;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await briefingProService.updateIncident(incident.id, {
        resolved: true,
        resolution: resolution.trim() || undefined,
      });
      toast.success("Intercorrência resolvida");
      onSaved();
    } catch {
      toast.error("Erro ao resolver a intercorrência");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolver intercorrência</DialogTitle>
          <DialogDescription className="line-clamp-2">{incident.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Como foi resolvida? (opcional)</Label>
          <Textarea
            autoFocus
            rows={3}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Ex: Usamos o equipamento reserva; cronograma ajustado em +20min."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Marcar como resolvida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
