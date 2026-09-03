"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-service";
import { ContractComposer, type ComposerSubmit } from "@/components/contracts/contract-composer";
import { apiErrorMessage } from "@/lib/contracts/contract-utils";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";

interface TemplateData {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  body: string;
  isSystem: boolean;
  variables?: { key: string; label: string }[];
}

function NovoEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const { userProfile, loading } = useAuth();

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!templateId || !userProfile) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplate(true);
      try {
        const res = await apiClient.get("/contracts/templates");
        const all: TemplateData[] = [...(res.data.systemTemplates ?? []), ...(res.data.userTemplates ?? [])];
        const tpl = all.find((t) => t.id === templateId) ?? null;
        if (!cancelled) {
          setTemplate(tpl);
          if (!tpl) setError("Modelo não encontrado. Você pode começar do zero.");
        }
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, "Não foi possível carregar o modelo."));
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [templateId, userProfile]);

  const variableLabels = Object.fromEntries(
    (template?.variables ?? []).map(({ key, label }) => [key.replace(/\{\{|\}\}/g, "").trim(), label])
  );

  const handleSubmit = async ({ form, body }: ComposerSubmit, andSend: boolean) => {
    setSaving(true);
    setError("");
    try {
      const res = await apiClient.post("/contracts", {
        title: form.title.trim(),
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientDocument: form.clientDocument.trim() || undefined,
        body,
        templateId: template?.id,
        creationType: "editor",
        contractValue: form.contractValue ? parseFloat(form.contractValue) : undefined,
        serviceStartDate: form.serviceStartDate || undefined,
        serviceEndDate: form.serviceEndDate || undefined,
        expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59Z` : undefined,
      });
      const newId: string = res.data.id;
      if (andSend) {
        try {
          await apiClient.post(`/contracts/${newId}/send`);
          router.push(`/dashboard/contratos/${newId}?enviado=1`);
          return;
        } catch (e) {
          // O rascunho foi criado; mostra o motivo no detalhe em vez de perder o trabalho.
          // (erro de plano: o interceptor do apiClient já abriu o modal de upgrade)
          const data = (e as { response?: { data?: unknown } })?.response?.data;
          const erro = isPlanErrorBody(data) ? "" : `?erro=${encodeURIComponent(apiErrorMessage(e, "Não foi possível enviar."))}`;
          router.push(`/dashboard/contratos/${newId}${erro}`);
          return;
        }
      }
      router.push(`/dashboard/contratos/${newId}`);
    } catch (e) {
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      if (!isPlanErrorBody(data)) setError(apiErrorMessage(e, "Erro ao criar contrato."));
      setSaving(false);
    }
  };

  if (loading || !userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {loadingTemplate ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-64" />
              <div className="grid md:grid-cols-3 gap-6">
                <Skeleton className="h-96 md:col-span-2 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
              </div>
            </div>
          ) : (
            <ContractComposer
              key={template?.id ?? "blank"}
              mode="create"
              initial={template ? { body: template.body, title: template.name } : undefined}
              variableLabels={variableLabels}
              sourceTemplate={template}
              saving={saving}
              error={error}
              backHref="/dashboard/contratos/novo"
              backLabel="Novo Contrato"
              onSubmit={handleSubmit}
              onValidationError={setError}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function NovoEditorPage() {
  return (
    <Suspense fallback={null}>
      <NovoEditorInner />
    </Suspense>
  );
}
