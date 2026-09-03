"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BookMarked, Loader2 } from "lucide-react";
import apiClient from "@/lib/api-service";
import { usePlan } from "@/lib/plans/use-plan";
import { PlanBadge } from "@/components/plan/plan-gate";
import { notifyPlanLimit } from "@/lib/plans/plan-events";
import { buildPlanFeatureBody, isPlanErrorBody } from "@/lib/plans/plan-limits";
import { apiErrorMessage } from "@/lib/contracts/contract-utils";
import { useToast } from "@/components/ui/use-toast";

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  service_agreement: "Prestação de Serviços",
  equipment_rental: "Locação de Equipamentos",
  audiovisual_production: "Produção Audiovisual",
  freelance: "Freelance",
  image_rights: "Direitos de Imagem",
  general: "Geral",
};

interface SaveTemplateDialogProps {
  /** HTML atual do editor — as {{variáveis}} presentes viram campos do modelo. */
  body: string;
  defaultName?: string;
  /** Quando o contrato veio de um modelo PRÓPRIO, permite atualizar o modelo em vez de criar outro. */
  existingTemplate?: { id: string; name: string; category: string; description?: string | null } | null;
  onSaved?: (template: { id: string; name: string }) => void;
  triggerClassName?: string;
}

export function SaveTemplateDialog({ body, defaultName, existingTemplate, onSaved, triggerClassName }: SaveTemplateDialogProps) {
  const plan = usePlan();
  const allowed = plan.can("customContractTemplates");
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"new" | "update">("new");
  const [name, setName] = useState(defaultName ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  useEffect(() => {
    if (!open) return;
    if (existingTemplate) {
      setMode("update");
      setName(existingTemplate.name);
      setCategory(existingTemplate.category);
      setDescription(existingTemplate.description ?? "");
    } else {
      setMode("new");
      setName(defaultName ?? "");
    }
    setError("");
  }, [open, existingTemplate, defaultName]);

  const handleOpen = () => {
    if (!allowed) {
      notifyPlanLimit(buildPlanFeatureBody("customContractTemplates", plan.tier));
      return;
    }
    if (!body.trim() || body.replace(/<[^>]+>/g, "").trim().length < 20) {
      toast({ title: "Escreva o contrato antes de salvar como modelo.", variant: "destructive" });
      return;
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (name.trim().length < 3) { setError("Dê um nome ao modelo (mínimo 3 caracteres)."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, category, body };
      const res = mode === "update" && existingTemplate
        ? await apiClient.patch(`/contracts/templates/${existingTemplate.id}`, payload)
        : await apiClient.post("/contracts/templates", payload);
      toast({
        title: mode === "update" ? "Modelo atualizado" : "Modelo salvo",
        description: "Ele aparece em \"Meus Modelos\" ao criar um novo contrato.",
      });
      onSaved?.({ id: res.data.id, name: res.data.name });
      setOpen(false);
    } catch (e: unknown) {
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      if (isPlanErrorBody(data)) {
        // O interceptor do apiClient já abriu o modal de upgrade; só fecha este dialog
        setOpen(false);
        return;
      }
      setError(apiErrorMessage(e, "Não foi possível salvar o modelo."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={handleOpen} className={`gap-2 ${triggerClassName ?? ""}`}>
        <BookMarked className="h-4 w-4" />
        Salvar como modelo
        {!allowed && <PlanBadge />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>
              O texto atual do editor vira um modelo reutilizável. Deixe as {"{{variáveis}}"} no texto para
              preenchê-las a cada novo contrato — dados já aplicados ficam fixos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {existingTemplate && (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("update")}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${mode === "update" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-border"}`}
                >
                  Atualizar &quot;{existingTemplate.name}&quot;
                </button>
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${mode === "new" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-border"}`}
                >
                  Salvar como novo
                </button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome do modelo *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Ex: Ensaio fotográfico — padrão"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Quando usar este modelo"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "update" ? "Atualizar modelo" : "Salvar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
