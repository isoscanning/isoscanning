"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  ArrowLeft, Save, AlertCircle,
  Image as ImageIcon, GripVertical, PenSquare, Minus,
  Upload, X, CheckCheck, FileText,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { ContractEditor, type ContractEditorHandle } from "@/components/contracts/contract-editor";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(val: string) {
  if (!val) return "";
  const n = parseFloat(val);
  return isNaN(n) ? val : n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function todayFormatted() {
  return new Date().toLocaleDateString("pt-BR");
}

const STANDARD_VARS = new Set([
  "owner_name", "owner_email", "owner_document",
  "city", "state", "forum_city", "contract_date",
  "client_name", "client_email", "client_document",
  "service_description", "service_location",
  "service_date", "service_start_date", "service_end_date",
  "start_date", "end_date", "rental_start_date", "rental_end_date",
  "contract_value", "contract_value_written", "payment_terms",
  "expiry_date",
]);

function detectExtraVars(html: string): string[] {
  const matches = html.match(/\{\{([^}]+)\}\}/g) ?? [];
  const keys = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
  return keys.filter((k) => !STANDARD_VARS.has(k));
}

function labelFromKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function applyVarsPlain(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value && value.trim()) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }
  return result;
}

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, variable,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; variable?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {variable && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors flex-shrink-0 ${
            filled
              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
              : "bg-muted text-muted-foreground"
          }`}>
            {`{{${variable}}}`}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className={`w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 transition-colors ${
          filled ? "border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500/30" : "focus:ring-indigo-500/30"
        }`}
      />
    </div>
  );
}

// ─── DraggableBlock ──────────────────────────────────────────────────────────

function DraggableBlock({
  icon: Icon, label, html, onInsert,
}: {
  icon: React.ElementType; label: string; html: string; onInsert: (html: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/html", html); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => onInsert(html)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-grab hover:cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 text-xs text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-300 transition-all select-none"
    >
      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Contract {
  id: string; title: string; clientName: string; clientEmail: string;
  clientDocument?: string; body: string; status: string;
  contractValue?: number; serviceStartDate?: string;
  serviceEndDate?: string; expiresAt?: string;
}

export default function EditarContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { userProfile, loading } = useAuth();

  const editorRef = useRef<ContractEditorHandle>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loadingContract, setLoadingContract] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const [extraVarKeys, setExtraVarKeys] = useState<string[]>([]);
  const [extraVarValues, setExtraVarValues] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    clientDocument: "",
    body: "",
    contractValue: "",
    serviceStartDate: "",
    serviceEndDate: "",
    expiresAt: "",
    serviceDescription: "",
    serviceLocation: "",
    paymentTerms: "",
  });

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    const fetchContract = async () => {
      setLoadingContract(true);
      try {
        const res = await apiClient.get(`/contracts/${id}`);
        const c: Contract = res.data;
        if (c.status !== "draft") {
          router.push(`/dashboard/contratos/${id}`);
          return;
        }
        const body = c.body ?? "";
        setFormData({
          title: c.title,
          clientName: c.clientName,
          clientEmail: c.clientEmail,
          clientDocument: c.clientDocument ?? "",
          body,
          contractValue: c.contractValue?.toString() ?? "",
          serviceStartDate: c.serviceStartDate ?? "",
          serviceEndDate: c.serviceEndDate ?? "",
          expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : "",
          serviceDescription: "",
          serviceLocation: "",
          paymentTerms: "",
        });
        // Detect remaining {{variables}} in the body
        const extra = detectExtraVars(body);
        setExtraVarKeys(extra);
        setExtraVarValues(Object.fromEntries(extra.map((k) => [k, ""])));
      } catch {
        setError("Contrato não encontrado.");
      } finally {
        setLoadingContract(false);
      }
    };
    fetchContract();
  }, [userProfile, id, router]);

  // ─── variables map ───────────────────────────────────────────────────────

  const variables: Record<string, string> = {
    owner_name: userProfile?.displayName ?? "",
    owner_email: userProfile?.email ?? "",
    owner_document: userProfile?.cpf ?? "",
    city: userProfile?.city ?? "",
    state: userProfile?.state ?? "",
    forum_city: userProfile?.city ?? "",
    contract_date: todayFormatted(),
    client_name: formData.clientName,
    client_email: formData.clientEmail,
    client_document: formData.clientDocument,
    service_description: formData.serviceDescription,
    service_location: formData.serviceLocation,
    service_date: formatDate(formData.serviceStartDate),
    service_start_date: formatDate(formData.serviceStartDate),
    service_end_date: formatDate(formData.serviceEndDate),
    start_date: formatDate(formData.serviceStartDate),
    end_date: formatDate(formData.serviceEndDate),
    rental_start_date: formatDate(formData.serviceStartDate),
    rental_end_date: formatDate(formData.serviceEndDate),
    contract_value: formData.contractValue
      ? `R$ ${formatCurrency(formData.contractValue)}`
      : "",
    contract_value_written: formData.contractValue
      ? `R$ ${formatCurrency(formData.contractValue)}`
      : "",
    payment_terms: formData.paymentTerms,
    expiry_date: formatDate(formData.expiresAt),
    ...extraVarValues,
  };

  // ─── apply variables ─────────────────────────────────────────────────────

  const handleApplyVariables = () => {
    const newBody = applyVarsPlain(formData.body, variables);
    setFormData((p) => ({ ...p, body: newBody }));
    editorRef.current?.setContent(newBody);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const insertBlock = (html: string) => editorRef.current?.insertHtml(html);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await apiClient.patch(`/contracts/${id}`, {
        title: formData.title,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientDocument: formData.clientDocument || undefined,
        body: formData.body,
        contractValue: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
        serviceStartDate: formData.serviceStartDate || undefined,
        serviceEndDate: formData.serviceEndDate || undefined,
        expiresAt: formData.expiresAt ? `${formData.expiresAt}T23:59:59Z` : undefined,
      });
      router.push(`/dashboard/contratos/${id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Erro ao salvar contrato.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userProfile) return null;

  if (loadingContract) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-6xl space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-96 md:col-span-2 rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasTemplateVars = formData.body.includes("{{");

  const BLOCKS = [
    {
      icon: Minus,
      label: "Linha divisória",
      html: '<hr style="border:none;border-top:2px solid #e5e7eb;margin:24px 0;" />',
    },
    {
      icon: PenSquare,
      label: "Campo de assinatura",
      html: `<div style="margin-top:40px;">
  <hr style="border:none;border-top:1px solid #9ca3af;margin-bottom:8px;" />
  <p style="margin:0;font-size:0.8em;color:#6b7280;">Assinatura</p>
  <p style="margin:4px 0 0;font-size:0.8em;color:#6b7280;">Nome: ___________________________</p>
  <p style="margin:4px 0 0;font-size:0.8em;color:#6b7280;">CPF/CNPJ: ___________________________</p>
  <p style="margin:4px 0 0;font-size:0.8em;color:#6b7280;">Data: ___________________________</p>
</div>`,
    },
    {
      icon: FileText,
      label: "Cláusula de valor",
      html: `<p>O valor total dos serviços é de <strong>{{contract_value}}</strong>, a ser pago conforme: {{payment_terms}}.</p>`,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">

          <ScrollReveal>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Link href={`/dashboard/contratos/${id}`}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowLeft className="h-3 w-3" /> Voltar ao contrato
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </ScrollReveal>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {hasTemplateVars && (
            <div className="flex items-center justify-between gap-3 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Este contrato ainda contém variáveis por preencher. Use{" "}
                <strong>Pré-visualizar</strong> para conferir e{" "}
                <strong>Aplicar variáveis</strong> para substituí-las.
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyVariables}
                className={`flex-shrink-0 gap-1.5 text-xs ${
                  applied ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
                } text-white`}
              >
                {applied ? (
                  <><CheckCheck className="h-3.5 w-3.5" /> Aplicado!</>
                ) : (
                  <><CheckCheck className="h-3.5 w-3.5" /> Aplicar variáveis</>
                )}
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 items-start">

            {/* ── Editor ─────────────────────────────────────────────── */}
            <ScrollReveal delay={0.1} className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título do contrato *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo do contrato</label>
                <ContractEditor
                  ref={editorRef}
                  value={formData.body}
                  onChange={(val) => {
                    setFormData((p) => ({ ...p, body: val }));
                    const extra = detectExtraVars(val);
                    setExtraVarKeys(extra);
                    setExtraVarValues((prev) => {
                      const next: Record<string, string> = {};
                      extra.forEach((k) => { next[k] = prev[k] ?? ""; });
                      return next;
                    });
                  }}
                  variables={variables}
                />
              </div>
            </ScrollReveal>

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <ScrollReveal delay={0.15} className="space-y-4">

              {/* Dados do cliente */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Dados do cliente</h3>
                <Field label="Nome completo *" type="text" value={formData.clientName}
                  onChange={(v) => setFormData((p) => ({ ...p, clientName: v }))}
                  variable="client_name" />
                <Field label="E-mail *" type="email" value={formData.clientEmail}
                  onChange={(v) => setFormData((p) => ({ ...p, clientEmail: v }))}
                  variable="client_email" />
                <Field label="CPF / CNPJ" type="text" value={formData.clientDocument}
                  onChange={(v) => setFormData((p) => ({ ...p, clientDocument: v }))}
                  placeholder="000.000.000-00" variable="client_document" />
              </div>

              {/* Detalhes */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Detalhes</h3>
                <Field label="Valor (R$)" type="number" value={formData.contractValue}
                  onChange={(v) => setFormData((p) => ({ ...p, contractValue: v }))}
                  placeholder="0,00" variable="contract_value" />
                <Field label="Condições de pagamento" type="text" value={formData.paymentTerms}
                  onChange={(v) => setFormData((p) => ({ ...p, paymentTerms: v }))}
                  placeholder="50% na assinatura, 50% no dia" variable="payment_terms" />
                <Field label="Descrição do serviço" type="text" value={formData.serviceDescription}
                  onChange={(v) => setFormData((p) => ({ ...p, serviceDescription: v }))}
                  placeholder="Ex: ensaio fotográfico" variable="service_description" />
                <Field label="Local do serviço" type="text" value={formData.serviceLocation}
                  onChange={(v) => setFormData((p) => ({ ...p, serviceLocation: v }))}
                  placeholder="São Paulo, SP" variable="service_location" />
                <Field label="Início do serviço" type="date" value={formData.serviceStartDate}
                  onChange={(v) => setFormData((p) => ({ ...p, serviceStartDate: v }))}
                  variable="service_start_date" />
                <Field label="Fim do serviço" type="date" value={formData.serviceEndDate}
                  onChange={(v) => setFormData((p) => ({ ...p, serviceEndDate: v }))}
                  variable="service_end_date" />
                <Field label="Prazo para assinatura" type="date" value={formData.expiresAt}
                  onChange={(v) => setFormData((p) => ({ ...p, expiresAt: v }))}
                  variable="expiry_date" />
              </div>

              {/* Variáveis extras detectadas no corpo */}
              {extraVarKeys.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      Variáveis por preencher
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Detectadas no conteúdo do contrato
                    </p>
                  </div>
                  {extraVarKeys.map((key) => (
                    <Field
                      key={key}
                      label={labelFromKey(key)}
                      type="text"
                      value={extraVarValues[key] ?? ""}
                      onChange={(v) =>
                        setExtraVarValues((prev) => ({ ...prev, [key]: v }))
                      }
                      variable={key}
                    />
                  ))}
                </div>
              )}

              {/* Imagens / Logo */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Imagens / Logotipo
                </h3>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                {logoSrc ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg border overflow-hidden bg-muted/30 p-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoSrc} alt="Logo" className="max-h-20 max-w-full object-contain" />
                      <button type="button" onClick={() => setLogoSrc(null)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => editorRef.current?.insertImage(logoSrc, "Logotipo")}
                      className="w-full gap-1.5 text-xs">
                      <ImageIcon className="h-3.5 w-3.5" /> Inserir logo no contrato
                    </Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-4 rounded-lg border-2 border-dashed text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs">
                    <Upload className="h-5 w-5" />
                    Clique para enviar logo ou imagem
                  </button>
                )}
              </div>

              {/* Blocos */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">Inserir bloco</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Clique ou arraste para o contrato</p>
                </div>
                <div className="space-y-1.5">
                  {BLOCKS.map((b) => (
                    <DraggableBlock key={b.label} icon={b.icon} label={b.label} html={b.html} onInsert={insertBlock} />
                  ))}
                </div>
              </div>

            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
