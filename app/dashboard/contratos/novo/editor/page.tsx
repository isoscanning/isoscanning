"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  ArrowLeft, Save, Send, AlertCircle, FileText,
  Image as ImageIcon, GripVertical, PenSquare, Minus,
  Upload, X, CheckCheck,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { ContractEditor, type ContractEditorHandle } from "@/components/contracts/contract-editor";

// ─── helpers ────────────────────────────────────────────────────────────────

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

/** Variables that are auto-filled from profile/form — won't appear as dynamic fields */
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

/** Detect {{variable}} markers in HTML and return unique non-standard keys */
function detectExtraVars(html: string): string[] {
  const matches = html.match(/\{\{([^}]+)\}\}/g) ?? [];
  const keys = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
  return keys.filter((k) => !STANDARD_VARS.has(k));
}

/** Snake_case to "Title Case" label (fallback) */
function labelFromKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Portuguese human-readable label for each known variable */
const VAR_LABELS: Record<string, string> = {
  owner_name: "Seu nome",
  owner_email: "Seu e-mail",
  owner_document: "Seu CPF/CNPJ",
  client_name: "Nome do cliente",
  client_email: "E-mail do cliente",
  client_document: "CPF/CNPJ do cliente",
  service_description: "Descrição do serviço",
  service_location: "Local do serviço",
  service_date: "Data do serviço",
  service_start_date: "Data de início",
  service_end_date: "Data de término",
  start_date: "Data de início",
  end_date: "Data de término",
  rental_start_date: "Início da locação",
  rental_end_date: "Fim da locação",
  contract_value: "Valor do contrato",
  contract_value_written: "Valor por extenso",
  payment_terms: "Forma de pagamento",
  expiry_date: "Prazo p/ assinatura",
  city: "Cidade",
  state: "Estado",
  forum_city: "Cidade do foro",
  contract_date: "Data do contrato",
  // template-specific common ones
  delivery_days: "Prazo de entrega (dias)",
  cancellation_days: "Dias p/ cancelamento",
  deposit_value: "Valor da caução",
  equipment_list: "Lista de equipamentos",
  production_title: "Título da produção",
  production_description: "Descrição da produção",
  recording_dates: "Datas de gravação",
  raw_delivery_date: "Entrega do material bruto",
  final_delivery_date: "Entrega final editada",
  usage_rights: "Direitos de uso",
  prohibited_uses: "Usos proibidos",
  revision_rounds: "Rodadas de revisão",
  confidentiality_years: "Anos de confidencialidade",
  capture_context: "Contexto da captação",
  capture_date: "Data da captação",
  authorized_uses: "Usos autorizados",
  authorized_platforms: "Plataformas autorizadas",
  validity_period: "Vigência da autorização",
  compensation_terms: "Termos de remuneração",
};

/** Plain (no HTML) variable substitution — used before saving */
function applyVarsPlain(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value && value.trim()) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }
  return result;
}

// ─── DraggableBlock ──────────────────────────────────────────────────────────

function DraggableBlock({
  icon: Icon, label, html, onInsert,
}: {
  icon: React.ElementType;
  label: string;
  html: string;
  onInsert: (html: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/html", html);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onInsert(html)}
      title="Clique para inserir ou arraste para o contrato"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-grab hover:cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 text-xs text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-300 transition-all select-none active:opacity-70"
    >
      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </div>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, variable, hint, varLabel,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  variable?: string; hint?: string;
  /** Override the Portuguese badge label; falls back to VAR_LABELS[variable] */
  varLabel?: string;
}) {
  const filled = value.trim().length > 0;
  const badgeText = varLabel
    ?? (variable ? (VAR_LABELS[variable] ?? labelFromKey(variable)) : null);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {badgeText && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded transition-colors flex-shrink-0 max-w-[140px] truncate ${
            filled
              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
              : "bg-muted text-muted-foreground"
          }`} title={`Campo: {{${variable}}}`}>
            {filled ? "✓ " : "→ "}{badgeText}
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
          filled
            ? "border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500/30"
            : "focus:ring-indigo-500/30"
        }`}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NovoEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const isUpload = searchParams.get("upload") === "1";
  const { userProfile, loading } = useAuth();

  const editorRef = useRef<ContractEditorHandle>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  // Owner document — editable override (pre-filled from profile)
  const [ownerDocument, setOwnerDocument] = useState("");
  useEffect(() => { setOwnerDocument(userProfile?.cpf ?? ""); }, [userProfile]);

  // Extra variables detected from the template (non-standard keys)
  const [extraVarKeys, setExtraVarKeys] = useState<string[]>([]);
  const [extraVarValues, setExtraVarValues] = useState<Record<string, string>>({});
  // Portuguese labels from the template's variables array
  const [extraVarLabels, setExtraVarLabels] = useState<Record<string, string>>({});

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
    if (!templateId || !userProfile) return;
    const fetchTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const res = await apiClient.get(`/contracts/templates`);
        const all = [
          ...(res.data.systemTemplates ?? []),
          ...(res.data.userTemplates ?? []),
        ];
        const tpl = all.find(
          (t: { id: string; name: string; body: string }) => t.id === templateId
        );
        if (tpl) {
          setFormData((p) => ({ ...p, body: tpl.body, title: tpl.name }));
          // Detect non-standard variables from template body
          const extra = detectExtraVars(tpl.body);
          setExtraVarKeys(extra);
          setExtraVarValues(Object.fromEntries(extra.map((k) => [k, ""])));
          // Build label map from template's variables array
          const tplVars: { key: string; label: string }[] = tpl.variables ?? [];
          const labelMap: Record<string, string> = {};
          tplVars.forEach(({ key, label }) => {
            const bare = key.replace(/\{\{|\}\}/g, "").trim();
            labelMap[bare] = label;
          });
          setExtraVarLabels(labelMap);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTemplate(false);
      }
    };
    fetchTemplate();
  }, [templateId, userProfile]);

  // ─── variables for live preview ─────────────────────────────────────────

  const variables: Record<string, string> = {
    owner_name: userProfile?.displayName ?? "",
    owner_email: userProfile?.email ?? "",
    owner_document: ownerDocument,
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

  // ─── apply all variables permanently to body ─────────────────────────────

  const handleApplyVariables = () => {
    const applied = applyVarsPlain(formData.body, variables);
    setFormData((p) => ({ ...p, body: applied }));
    editorRef.current?.setContent(applied);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  // ─── insert helpers ──────────────────────────────────────────────────────

  const insertBlock = (html: string) => editorRef.current?.insertHtml(html);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── save / send ─────────────────────────────────────────────────────────

  const handleSave = async (andSend = false) => {
    if (!formData.title.trim()) { setError("O título do contrato é obrigatório."); return; }
    if (!formData.clientName.trim()) { setError("O nome do cliente é obrigatório."); return; }
    if (!formData.clientEmail.trim()) { setError("O e-mail do cliente é obrigatório."); return; }
    if (!formData.body.trim()) { setError("O conteúdo do contrato é obrigatório."); return; }

    setSaving(true);
    setError("");
    try {
      const payload = {
        title: formData.title,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientDocument: formData.clientDocument || undefined,
        body: formData.body,
        templateId: templateId || undefined,
        source: "standalone",
        creationType: isUpload ? "upload" : "editor",
        contractValue: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
        serviceStartDate: formData.serviceStartDate || undefined,
        serviceEndDate: formData.serviceEndDate || undefined,
        expiresAt: formData.expiresAt ? `${formData.expiresAt}T23:59:59Z` : undefined,
      };

      const res = await apiClient.post("/contracts", payload);
      const newId = res.data.id;
      if (andSend) await apiClient.post(`/contracts/${newId}/send`);
      router.push(`/dashboard/contratos/${newId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Erro ao criar contrato.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userProfile) return null;

  // ─── pending unfilled variables count ────────────────────────────────────

  const unfilledCount = Object.entries(variables).filter(
    ([, v]) => !v.trim()
  ).length + (formData.body.match(/\{\{[^}]+\}\}/g)?.length ?? 0);

  // ─── content blocks ──────────────────────────────────────────────────────

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
      label: "Bloco de partes",
      html: `<p><strong>CONTRATANTE:</strong> {{client_name}}, portador(a) do CPF/CNPJ {{client_document}}, e-mail {{client_email}}.</p>
<p><strong>CONTRATADO:</strong> {{owner_name}}, portador(a) do CPF/CNPJ {{owner_document}}, e-mail {{owner_email}}.</p>`,
    },
    {
      icon: FileText,
      label: "Cláusula de valor",
      html: `<p>O valor total dos serviços é de <strong>{{contract_value}}</strong>, a ser pago conforme: {{payment_terms}}.</p>`,
    },
    {
      icon: FileText,
      label: "Cláusula de local/data",
      html: `<p>Os serviços serão realizados em <strong>{{service_location}}</strong>, no período de {{service_start_date}} a {{service_end_date}}.</p>`,
    },
  ];

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">

          <ScrollReveal>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                  href="/dashboard/contratos/novo"
                  className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Novo Contrato
                </Link>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar rascunho"}
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Send className="h-4 w-4" />
                  {saving ? "Enviando..." : "Salvar e enviar"}
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {templateId && (
            <div className="flex items-center justify-between gap-3 text-sm bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileText className="h-4 w-4 flex-shrink-0" />
                Preencha os campos à direita. Clique em{" "}
                <strong>Pré-visualizar</strong> para ver o resultado em tempo real.
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyVariables}
                className={`flex-shrink-0 gap-1.5 text-xs ${
                  applied
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
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

            {/* ── Editor (2/3) ─────────────────────────────────────────── */}
            <ScrollReveal delay={0.1} className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título do contrato *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Ex: Contrato de Fotografia — Casamento Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo do contrato *</label>
                {loadingTemplate ? (
                  <div className="h-64 rounded-xl bg-muted animate-pulse" />
                ) : (
                  <ContractEditor
                    ref={editorRef}
                    value={formData.body}
                    onChange={(val) => {
                      setFormData((p) => ({ ...p, body: val }));
                      // Re-detect extra vars as user edits
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
                )}
              </div>
            </ScrollReveal>

            {/* ── Sidebar (1/3) ────────────────────────────────────────── */}
            <ScrollReveal delay={0.15} className="space-y-4">

              {/* Dados do cliente */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Dados do cliente</h3>
                <Field label="Nome completo *" type="text" value={formData.clientName}
                  onChange={(v) => setFormData((p) => ({ ...p, clientName: v }))}
                  placeholder="João da Silva" variable="client_name" />
                <Field label="E-mail *" type="email" value={formData.clientEmail}
                  onChange={(v) => setFormData((p) => ({ ...p, clientEmail: v }))}
                  placeholder="cliente@email.com" variable="client_email" />
                <Field label="CPF / CNPJ" type="text" value={formData.clientDocument}
                  onChange={(v) => setFormData((p) => ({ ...p, clientDocument: v }))}
                  placeholder="000.000.000-00" variable="client_document" />
              </div>

              {/* Detalhes */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Detalhes</h3>
                <Field label="Valor (R$)" type="number" value={formData.contractValue}
                  onChange={(v) => setFormData((p) => ({ ...p, contractValue: v }))}
                  placeholder="1500,00" variable="contract_value" />
                <Field label="Condições de pagamento" type="text" value={formData.paymentTerms}
                  onChange={(v) => setFormData((p) => ({ ...p, paymentTerms: v }))}
                  placeholder="50% na assinatura, 50% no dia" variable="payment_terms" />
                <Field label="Descrição do serviço" type="text" value={formData.serviceDescription}
                  onChange={(v) => setFormData((p) => ({ ...p, serviceDescription: v }))}
                  placeholder="Ensaio fotográfico de casamento" variable="service_description" />
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

              {/* Variáveis extras do template */}
              {extraVarKeys.length > 0 && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm">Campos do modelo</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Específicos deste modelo de contrato
                    </p>
                  </div>
                  {extraVarKeys.map((key) => {
                    // Prefer label from template, then VAR_LABELS, then snake_case conversion
                    const lbl =
                      extraVarLabels[key] ??
                      VAR_LABELS[key] ??
                      labelFromKey(key);
                    return (
                      <Field
                        key={key}
                        label={lbl}
                        type="text"
                        value={extraVarValues[key] ?? ""}
                        onChange={(v) =>
                          setExtraVarValues((prev) => ({ ...prev, [key]: v }))
                        }
                        variable={key}
                        varLabel={lbl}
                      />
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground pt-1 border-t">
                    <span className="text-indigo-600 font-medium">Dica:</span> Após preencher, clique em{" "}
                    <strong>Aplicar variáveis</strong> para inserir os valores no contrato.
                  </p>
                </div>
              )}

              {/* Dados do prestador (você) */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">Seus dados (contratado)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nome e e-mail vêm do perfil automaticamente
                  </p>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Nome", badge: "Seu nome no contrato", value: userProfile.displayName },
                    { label: "E-mail", badge: "Seu e-mail no contrato", value: userProfile.email },
                    { label: "Cidade", badge: "Cidade / Cidade do foro", value: userProfile.city ?? "—" },
                    { label: "Data do contrato", badge: "Preenchida automaticamente", value: todayFormatted() },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium truncate max-w-[90px]">{item.value}</span>
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* CPF/CNPJ do prestador — editável aqui */}
                <div className="pt-2 border-t">
                  <Field
                    label="Seu CPF / CNPJ"
                    type="text"
                    value={ownerDocument}
                    onChange={setOwnerDocument}
                    placeholder="000.000.000-00"
                    variable="owner_document"
                    varLabel="Seu CPF/CNPJ no contrato"
                    hint={!userProfile.cpf ? "Não encontrado no perfil — preencha aqui" : undefined}
                  />
                </div>
              </div>

              {/* Imagens / Logo */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Imagens / Logotipo
                </h3>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFile}
                />
                {logoSrc ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg border overflow-hidden bg-muted/30 p-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoSrc} alt="Logo" className="max-h-20 max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogoSrc(null)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editorRef.current?.insertImage(logoSrc, "Logotipo")}
                      className="w-full gap-1.5 text-xs"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Inserir logo no contrato
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-4 rounded-lg border-2 border-dashed text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs"
                  >
                    <Upload className="h-5 w-5" />
                    Clique para enviar logo ou imagem
                    <span className="opacity-60">PNG, JPG, SVG até 5 MB</span>
                  </button>
                )}
              </div>

              {/* Blocos arrastáveis */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">Inserir bloco</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clique ou arraste para dentro do contrato
                  </p>
                </div>
                <div className="space-y-1.5">
                  {BLOCKS.map((b) => (
                    <DraggableBlock
                      key={b.label}
                      icon={b.icon}
                      label={b.label}
                      html={b.html}
                      onInsert={insertBlock}
                    />
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
