"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-service";
import { ContractComposer, type ComposerForm, type ComposerSubmit } from "@/components/contracts/contract-composer";
import { apiErrorMessage } from "@/lib/contracts/contract-utils";

interface ContractData {
  id: string; title: string; clientName: string; clientEmail: string;
  clientDocument?: string | null; body: string; status: string;
  contractValue?: number | null; serviceStartDate?: string | null;
  serviceEndDate?: string | null; expiresAt?: string | null;
  templateId?: string | null;
  parties?: { partyRole: string; userId?: string | null }[];
}

interface TemplateData {
  id: string; name: string; category: string; description?: string | null; isSystem: boolean;
}

export default function EditarContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { userProfile, loading } = useAuth();

  const [initial, setInitial] = useState<Partial<ComposerForm> | null>(null);
  const [recipientLocked, setRecipientLocked] = useState(false);
  const [sourceTemplate, setSourceTemplate] = useState<TemplateData | null>(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    let cancelled = false;
    (async () => {
      setLoadingContract(true);
      try {
        const res = await apiClient.get(`/contracts/${id}`);
        const c: ContractData = res.data;
        if (c.status !== "draft") {
          router.replace(`/dashboard/contratos/${id}`);
          return;
        }
        if (cancelled) return;
        setInitial({
          title: c.title,
          clientName: c.clientName,
          clientEmail: c.clientEmail,
          clientDocument: c.clientDocument ?? "",
          body: c.body ?? "",
          contractValue: c.contractValue != null ? String(c.contractValue) : "",
          serviceStartDate: c.serviceStartDate ?? "",
          serviceEndDate: c.serviceEndDate ?? "",
          expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : "",
        });
        setRecipientLocked(!!c.parties?.some((p) => p.partyRole === "recipient" && p.userId));

        if (c.templateId) {
          try {
            const t = await apiClient.get("/contracts/templates");
            const mine: TemplateData[] = t.data.userTemplates ?? [];
            const found = mine.find((tpl) => tpl.id === c.templateId) ?? null;
            if (!cancelled) setSourceTemplate(found);
          } catch { /* modelo de origem é só conveniência */ }
        }
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, "Contrato não encontrado."));
      } finally {
        if (!cancelled) setLoadingContract(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userProfile, id, router]);

  const handleSubmit = async ({ form, body }: ComposerSubmit) => {
    setSaving(true);
    setError("");
    try {
      // `null` limpa o campo no backend (PATCH aceita nulls); undefined = não mexer.
      await apiClient.patch(`/contracts/${id}`, {
        title: form.title.trim(),
        ...(recipientLocked ? {} : { clientName: form.clientName.trim(), clientEmail: form.clientEmail.trim() }),
        clientDocument: form.clientDocument.trim() || null,
        body,
        contractValue: form.contractValue ? parseFloat(form.contractValue) : null,
        serviceStartDate: form.serviceStartDate || null,
        serviceEndDate: form.serviceEndDate || null,
        expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59Z` : null,
      });
      router.push(`/dashboard/contratos/${id}`);
    } catch (e) {
      setError(apiErrorMessage(e, "Erro ao salvar contrato."));
      setSaving(false);
    }
  };

  if (loading || !userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {loadingContract || !initial ? (
            error ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
            ) : (
              <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid md:grid-cols-3 gap-6">
                  <Skeleton className="h-96 md:col-span-2 rounded-xl" />
                  <Skeleton className="h-96 rounded-xl" />
                </div>
              </div>
            )
          ) : (
            <ContractComposer
              mode="edit"
              initial={initial}
              sourceTemplate={sourceTemplate}
              recipientLocked={recipientLocked}
              saving={saving}
              error={error}
              backHref={`/dashboard/contratos/${id}`}
              backLabel="Voltar ao contrato"
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
