"use client";

// Intercorrências do Briefing Pro: registro de imprevistos durante a execução
// (equipamento falhou, atraso, chuva...), com gravidade e DESFECHO — resolvida,
// contornada com adaptação ou não solucionada (motivo + justificativa), porque
// nem tudo que acontece no dia tem solução e o relatório precisa refletir isso.
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
import {
  AlertTriangle, Ban, CheckCircle2, Loader2, Plus, RotateCcw, Wrench, X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { briefingProService } from "@/lib/briefing-pro-service";
import {
  BriefingIncident,
  EffectiveRole,
  INCIDENT_OUTCOME_CONFIG,
  INCIDENT_SEVERITY_CONFIG,
  IncidentOutcome,
  ProfileSummary,
  UNRESOLVED_REASON_LABELS,
  UnresolvedReason,
} from "@/lib/briefing-pro-types";

const OUTCOME_ICONS: Record<IncidentOutcome, typeof CheckCircle2> = {
  resolved: CheckCircle2,
  workaround: Wrench,
  unresolved: Ban,
};

export function BriefingIncidentsCard({
  briefingId, incidents, myRole, userId, profiles, onChanged,
}: {
  briefingId: string;
  incidents: BriefingIncident[];
  myRole: EffectiveRole;
  userId?: string;
  /** Perfis do briefing (para "encerrada por"). */
  profiles?: Record<string, ProfileSummary>;
  onChanged: () => void;
}) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<BriefingIncident | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  const openCount = incidents.filter((i) => !i.resolved).length;
  const unresolvedCount = incidents.filter((i) => i.resolved && i.outcome === "unresolved").length;
  const canManage = (incident: BriefingIncident) =>
    myRole === "owner" || myRole === "editor" || incident.author_id === userId;

  async function reopen(incident: BriefingIncident) {
    setReopening(incident.id);
    try {
      await briefingProService.updateIncident(incident.id, { resolved: false });
      toast.success("Intercorrência reaberta");
      onChanged();
    } catch {
      toast.error("Erro ao reabrir a intercorrência");
    } finally {
      setReopening(null);
    }
  }

  return (
    <Card className={openCount > 0 ? "border-orange-300 dark:border-orange-800" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base flex flex-wrap items-center gap-2 min-w-0">
            <AlertTriangle className={`h-4 w-4 shrink-0 ${openCount > 0 ? "text-orange-500" : ""}`} />
            Intercorrências
            {openCount > 0 && (
              <Badge variant="secondary" className={INCIDENT_SEVERITY_CONFIG.medium.className}>
                {openCount} em aberto
              </Badge>
            )}
            {unresolvedCount > 0 && (
              <Badge variant="outline" className={INCIDENT_OUTCOME_CONFIG.unresolved.className}>
                {unresolvedCount} sem solução
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => setRegisterOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        </div>
        <CardDescription className="text-xs">
          Imprevistos da execução ficam registrados aqui e entram no relatório final — inclusive
          o que não pôde ser resolvido, com o motivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma intercorrência registrada. 🍀</p>
        )}
        {incidents.map((incident) => {
          const severityCfg = INCIDENT_SEVERITY_CONFIG[incident.severity];
          const outcome: IncidentOutcome | null = incident.resolved
            ? (incident.outcome ?? "resolved")
            : null;
          const outcomeCfg = outcome ? INCIDENT_OUTCOME_CONFIG[outcome] : null;
          const OutcomeIcon = outcome ? OUTCOME_ICONS[outcome] : null;
          const closedBy = incident.resolved_by ? profiles?.[incident.resolved_by] : null;
          return (
            <div
              key={incident.id}
              className={`rounded-lg border p-3 text-sm ${
                outcome === "resolved" || outcome === "workaround" ? "opacity-75" : ""
              } ${outcome === "unresolved" ? "border-red-200 dark:border-red-900/60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Badge variant="secondary" className={severityCfg.className}>
                    {severityCfg.label}
                  </Badge>
                  {outcomeCfg && OutcomeIcon ? (
                    <Badge variant="outline" className={`gap-1 ${outcomeCfg.className}`}>
                      <OutcomeIcon className="h-3 w-3" />
                      {outcomeCfg.label}
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
                      onClick={() => setCloseTarget(incident)}
                    >
                      Encerrar
                    </Button>
                  )}
                  {incident.resolved && canManage(incident) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Reabrir intercorrência"
                      disabled={reopening === incident.id}
                      onClick={() => reopen(incident)}
                    >
                      {reopening === incident.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  {canManage(incident) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Excluir intercorrência"
                      onClick={() =>
                        askConfirm({
                          title: "Excluir esta intercorrência?",
                          description: "Ela sai do registro e do relatório final. Essa ação não pode ser desfeita.",
                          confirmLabel: "Excluir",
                          destructive: true,
                          onConfirm: async () => {
                            try {
                              await briefingProService.deleteIncident(incident.id);
                              await onChanged();
                            } catch {
                              toast.error("Erro ao excluir a intercorrência");
                            }
                          },
                        })
                      }
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
              {outcome === "unresolved" && (
                <div className="text-xs mt-1.5 border-l-2 border-red-400 pl-2 text-muted-foreground space-y-0.5">
                  <p>
                    <span className="font-medium text-red-600 dark:text-red-400">Motivo: </span>
                    {incident.unresolved_reason
                      ? UNRESOLVED_REASON_LABELS[incident.unresolved_reason]
                      : "não informado"}
                  </p>
                  {incident.resolution && (
                    <p className="whitespace-pre-wrap break-words">{incident.resolution}</p>
                  )}
                  {closedBy && <p className="opacity-80">Registrado por {closedBy.display_name}</p>}
                </div>
              )}
              {(outcome === "resolved" || outcome === "workaround") &&
                (incident.resolution || closedBy) && (
                  <div
                    className={`text-xs mt-1.5 border-l-2 pl-2 text-muted-foreground space-y-0.5 ${
                      outcome === "workaround" ? "border-amber-400" : "border-emerald-400"
                    }`}
                  >
                    {incident.resolution && (
                      <p className="whitespace-pre-wrap break-words">
                        <span
                          className={`font-medium ${
                            outcome === "workaround"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {outcome === "workaround" ? "Contorno: " : "Resolução: "}
                        </span>
                        {incident.resolution}
                      </p>
                    )}
                    {closedBy && <p className="opacity-80">Encerrada por {closedBy.display_name}</p>}
                  </div>
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

      {closeTarget && (
        <CloseIncidentDialog
          incident={closeTarget}
          onClose={() => setCloseTarget(null)}
          onSaved={() => { setCloseTarget(null); onChanged(); }}
        />
      )}
      {confirmDialog}
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
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
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

const OUTCOME_OPTIONS: IncidentOutcome[] = ["resolved", "workaround", "unresolved"];

/** Cor do ícone do desfecho (só as classes de texto do config). */
function outcomeTextClass(outcome: IncidentOutcome): string {
  return INCIDENT_OUTCOME_CONFIG[outcome].className
    .split(" ")
    .filter((c) => c.includes("text-"))
    .join(" ");
}

function CloseIncidentDialog({
  incident, onClose, onSaved,
}: {
  incident: BriefingIncident;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<IncidentOutcome>("resolved");
  const [reason, setReason] = useState<UnresolvedReason | "">("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const isUnresolved = outcome === "unresolved";
  const canSubmit = !saving && (!isUnresolved || (reason !== "" && text.trim().length >= 3));

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await briefingProService.updateIncident(incident.id, {
        outcome,
        resolution: text.trim() || undefined,
        ...(isUnresolved && reason ? { unresolved_reason: reason } : {}),
      });
      toast.success(
        outcome === "resolved"
          ? "Intercorrência resolvida"
          : outcome === "workaround"
            ? "Intercorrência contornada"
            : "Registrado: intercorrência não solucionada"
      );
      onSaved();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao encerrar a intercorrência");
      setSaving(false);
    }
  }

  const submitLabel =
    outcome === "resolved"
      ? "Marcar como resolvida"
      : outcome === "workaround"
        ? "Marcar como contornada"
        : "Registrar como não solucionada";
  const SubmitIcon = OUTCOME_ICONS[outcome];

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar intercorrência</DialogTitle>
          <DialogDescription className="line-clamp-2">{incident.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Qual foi o desfecho?</Label>
            <div className="grid gap-2" role="radiogroup" aria-label="Desfecho">
              {OUTCOME_OPTIONS.map((option) => {
                const cfg = INCIDENT_OUTCOME_CONFIG[option];
                const Icon = OUTCOME_ICONS[option];
                const selected = outcome === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setOutcome(option)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected ? "border-primary bg-muted/60" : "hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${outcomeTextClass(option)}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{cfg.label}</span>
                      <span className="block text-xs text-muted-foreground">{cfg.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {isUnresolved && (
            <div className="space-y-2">
              <Label>Por que não foi solucionada? *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as UnresolvedReason)}>
                <SelectTrigger><SelectValue placeholder="Escolha o motivo principal" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNRESOLVED_REASON_LABELS) as UnresolvedReason[]).map((key) => (
                    <SelectItem key={key} value={key}>{UNRESOLVED_REASON_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {isUnresolved
                ? "Justificativa *"
                : outcome === "workaround"
                  ? "Como foi contornada? (opcional)"
                  : "Como foi resolvida? (opcional)"}
            </Label>
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isUnresolved
                  ? "Ex: O gerador do local não foi liberado e a iluminação externa ficou sem energia; o cliente foi avisado às 19h."
                  : outcome === "workaround"
                    ? "Ex: Sem o drone, fizemos as tomadas gerais do mezanino."
                    : "Ex: Usamos o equipamento reserva; cronograma ajustado em +20min."
              }
            />
            {isUnresolved && (
              <p className="text-[11px] text-muted-foreground">
                Fica no relatório como não solucionada, com o motivo — não como problema resolvido.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={save}
            disabled={!canSubmit}
            variant={isUnresolved ? "destructive" : "default"}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SubmitIcon className="h-4 w-4" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
