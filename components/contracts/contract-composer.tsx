"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  ArrowLeft, Save, Send, AlertCircle, FileText,
  Image as ImageIcon, GripVertical, PenSquare, Minus,
  Upload, X, CheckCheck, Lock, Info,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ContractEditor, type ContractEditorHandle } from "@/components/contracts/contract-editor";
import { SaveTemplateDialog } from "@/components/contracts/save-template-dialog";
import {
  VAR_LABELS, labelFromKey, detectExtraVariables, detectVariables, applyVariables,
  formatDateBR, formatCurrencyBR, todayBR, numberToWordsPtBR, imageFileToDataUrl,
} from "@/lib/contracts/contract-utils";

// ─── tipos ──────────────────────────────────────────────────────────────────

export interface ComposerForm {
  title: string;
  clientName: string;
  clientEmail: string;
  clientDocument: string;
  body: string;
  contractValue: string;
  serviceStartDate: string;
  serviceEndDate: string;
  expiresAt: string;
  serviceDescription: string;
  serviceLocation: string;
  paymentTerms: string;
}

export const EMPTY_FORM: ComposerForm = {
  title: "", clientName: "", clientEmail: "", clientDocument: "", body: "",
  contractValue: "", serviceStartDate: "", serviceEndDate: "", expiresAt: "",
  serviceDescription: "", serviceLocation: "", paymentTerms: "",
};

/** O que sai do composer: campos + corpo já com as variáveis preenchidas aplicadas. */
export interface ComposerSubmit {
  form: ComposerForm;
  /** Corpo final (variáveis preenchidas substituídas com escape). */
  body: string;
  /** Variáveis que continuam sem valor no corpo final. */
  unresolved: string[];
}

interface ContractComposerProps {
  mode: "create" | "edit";
  initial?: Partial<ComposerForm>;
  /** Rótulos das variáveis vindos do modelo (key → label). */
  variableLabels?: Record<string, string>;
  /** Modelo PRÓPRIO de origem — habilita "atualizar modelo" no diálogo. */
  sourceTemplate?: { id: string; name: string; category: string; description?: string | null; isSystem: boolean } | null;
  /** Contrato ligado a uma conta: nome/e-mail do destinatário são fixos (backend recusa a troca). */
  recipientLocked?: boolean;
  saving: boolean;
  error: string;
  backHref: string;
  backLabel: string;
  onSubmit: (data: ComposerSubmit, andSend: boolean) => void;
  onValidationError: (message: string) => void;
}

// ─── Field ──────────────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, variable, hint, varLabel, disabled,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  variable?: string; hint?: string; varLabel?: string; disabled?: boolean;
}) {
  const filled = value.trim().length > 0;
  const badgeText = varLabel ?? (variable ? (VAR_LABELS[variable] ?? labelFromKey(variable)) : null);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {badgeText && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors flex-shrink-0 max-w-[140px] truncate ${
              filled ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" : "bg-muted text-muted-foreground"
            }`}
            title={`Campo: {{${variable}}}`}
          >
            {filled ? "✓ " : "→ "}{badgeText}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className={`w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          filled ? "border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500/30" : "focus:ring-indigo-500/30"
        }`}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── DraggableBlock ─────────────────────────────────────────────────────────

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
      title="Clique para inserir ou arraste para o contrato"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-grab hover:cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 text-xs text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-300 transition-all select-none active:opacity-70"
    >
      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </div>
  );
}

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
    html: `<p>O valor total dos serviços é de <strong>{{contract_value}}</strong> ({{contract_value_written}}), a ser pago conforme: {{payment_terms}}.</p>`,
  },
  {
    icon: FileText,
    label: "Cláusula de local/data",
    html: `<p>Os serviços serão realizados em <strong>{{service_location}}</strong>, no período de {{service_start_date}} a {{service_end_date}}.</p>`,
  },
  {
    icon: FileText,
    label: "Cláusula de assinatura eletrônica",
    html: `<p>As partes reconhecem a validade jurídica da assinatura eletrônica realizada pela plataforma IsoScanning, com registro de data, hora, endereço IP e código de verificação (SHA-256), nos termos da Lei nº 14.063/2020 e da MP nº 2.200-2/2001.</p>`,
  },
];

// ─── Composer ───────────────────────────────────────────────────────────────

export function ContractComposer({
  mode, initial, variableLabels = {}, sourceTemplate, recipientLocked,
  saving, error, backHref, backLabel, onSubmit, onValidationError,
}: ContractComposerProps) {
  const { userProfile } = useAuth();
  const editorRef = useRef<ContractEditorHandle>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ComposerForm>({ ...EMPTY_FORM, ...initial });
  const [ownerDocument, setOwnerDocument] = useState(userProfile?.cpf ?? "");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [applied, setApplied] = useState(false);
  const [extraVarValues, setExtraVarValues] = useState<Record<string, string>>({});

  useEffect(() => { setOwnerDocument(userProfile?.cpf ?? ""); }, [userProfile?.cpf]);

  const set = <K extends keyof ComposerForm>(key: K) => (v: ComposerForm[K]) =>
    setForm((p) => ({ ...p, [key]: v }));

  const extraVarKeys = useMemo(() => detectExtraVariables(form.body), [form.body]);

  // ─── mapa de variáveis (preview + aplicação) ───────────────────────────
  const contractValueNumber = form.contractValue ? parseFloat(form.contractValue) : NaN;
  const variables: Record<string, string> = useMemo(() => ({
    owner_name: userProfile?.displayName ?? "",
    owner_email: userProfile?.email ?? "",
    owner_document: ownerDocument,
    city: userProfile?.city ?? "",
    state: userProfile?.state ?? "",
    forum_city: userProfile?.city ?? "",
    contract_date: todayBR(),
    client_name: form.clientName,
    client_email: form.clientEmail,
    client_document: form.clientDocument,
    service_description: form.serviceDescription,
    service_location: form.serviceLocation,
    service_date: formatDateBR(form.serviceStartDate),
    service_start_date: formatDateBR(form.serviceStartDate),
    service_end_date: formatDateBR(form.serviceEndDate),
    start_date: formatDateBR(form.serviceStartDate),
    end_date: formatDateBR(form.serviceEndDate),
    rental_start_date: formatDateBR(form.serviceStartDate),
    rental_end_date: formatDateBR(form.serviceEndDate),
    contract_value: form.contractValue ? `R$ ${formatCurrencyBR(form.contractValue)}` : "",
    contract_value_written: Number.isFinite(contractValueNumber) ? numberToWordsPtBR(contractValueNumber) : "",
    payment_terms: form.paymentTerms,
    expiry_date: formatDateBR(form.expiresAt),
    ...extraVarValues,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userProfile, ownerDocument, form, extraVarValues, contractValueNumber]);

  const hasTemplateVars = detectVariables(form.body).length > 0;

  const handleApplyVariables = () => {
    const next = applyVariables(form.body, variables);
    setForm((p) => ({ ...p, body: next }));
    editorRef.current?.setContent(next);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  // ─── imagens (redimensionadas no cliente antes de virar data URL) ─────
  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    try {
      setLogoSrc(await imageFileToDataUrl(file));
    } catch (err) {
      setImageError((err as Error).message);
    }
  };

  const insertBlock = (html: string) => editorRef.current?.insertHtml(html);

  // ─── submit ───────────────────────────────────────────────────────────
  const submit = (andSend: boolean) => {
    if (!form.title.trim() || form.title.trim().length < 3) return onValidationError("Dê um título ao contrato (mínimo 3 caracteres).");
    if (!form.clientName.trim()) return onValidationError("O nome da outra parte é obrigatório.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail.trim())) return onValidationError("Informe um e-mail válido da outra parte — ele identifica quem assina.");
    if (!form.body.replace(/<[^>]+>/g, "").trim()) return onValidationError("O conteúdo do contrato é obrigatório.");
    if (form.serviceStartDate && form.serviceEndDate && form.serviceEndDate < form.serviceStartDate) {
      return onValidationError("A data de término não pode ser anterior à de início.");
    }
    if (form.expiresAt && new Date(`${form.expiresAt}T23:59:59`).getTime() <= Date.now()) {
      return onValidationError("O prazo para assinatura precisa ser uma data futura.");
    }

    // As variáveis preenchidas são aplicadas sempre — o que se vê no preview é o que vai para assinatura.
    const body = applyVariables(form.body, variables);
    const unresolved = detectVariables(body);
    if (andSend && unresolved.length > 0) {
      return onValidationError(
        `Ainda há campos sem preencher no contrato: ${unresolved.map((k) => VAR_LABELS[k] ?? variableLabels[k] ?? labelFromKey(k)).join(", ")}. ` +
        "Preencha-os ou remova as marcações {{...}} antes de enviar."
      );
    }
    onSubmit({ form, body, unresolved }, andSend);
  };

  const unfilledStandard = Object.entries(variables).filter(([k, v]) => !v.trim() && detectVariables(form.body).includes(k)).length;

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href={backHref} className="hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-3 w-3" /> {backLabel}
          </Link>
          <div className="flex flex-wrap gap-2">
            <SaveTemplateDialog
              body={form.body}
              defaultName={form.title}
              existingTemplate={sourceTemplate && !sourceTemplate.isSystem ? sourceTemplate : null}
            />
            <Button variant="outline" onClick={() => submit(false)} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : mode === "create" ? "Salvar rascunho" : "Salvar alterações"}
            </Button>
            {mode === "create" && (
              <Button onClick={() => submit(true)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Send className="h-4 w-4" />
                {saving ? "Enviando..." : "Salvar e enviar"}
              </Button>
            )}
          </div>
        </div>
      </ScrollReveal>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {hasTemplateVars && (
        <div className="flex items-center justify-between gap-3 text-sm bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 rounded-lg px-4 py-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>
              Preencha os campos à direita — eles são aplicados automaticamente ao salvar.
              {unfilledStandard > 0 && <> <strong>{unfilledStandard}</strong> campo(s) ainda em branco.</>}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyVariables}
            className={`flex-shrink-0 gap-1.5 text-xs ${applied ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
          >
            <CheckCheck className="h-3.5 w-3.5" /> {applied ? "Aplicado!" : "Aplicar no texto agora"}
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* ── Editor ─────────────────────────────────────────────────── */}
        <ScrollReveal delay={0.1} className="md:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título do contrato *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Ex: Contrato de Fotografia — Casamento Silva"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo do contrato *</label>
            <ContractEditor
              ref={editorRef}
              value={form.body}
              onChange={(val) => {
                set("body")(val);
                setExtraVarValues((prev) => {
                  const keys = detectExtraVariables(val);
                  const next: Record<string, string> = {};
                  keys.forEach((k) => { next[k] = prev[k] ?? ""; });
                  return next;
                });
              }}
              variables={variables}
            />
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Depois de enviado, o texto fica congelado com um código de verificação (SHA-256). Para alterar, gere uma nova versão.
            </p>
          </div>
        </ScrollReveal>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <ScrollReveal delay={0.15} className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Outra parte (contratante)</h3>
              {recipientLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            {recipientLocked && (
              <p className="text-[11px] text-muted-foreground">
                Contrato vinculado à conta da outra parte — nome e e-mail não podem ser alterados.
              </p>
            )}
            <Field label="Nome completo *" type="text" value={form.clientName} onChange={set("clientName")}
              placeholder="João da Silva" variable="client_name" disabled={recipientLocked} />
            <Field label="E-mail *" type="email" value={form.clientEmail} onChange={set("clientEmail")}
              placeholder="cliente@email.com" variable="client_email" disabled={recipientLocked}
              hint="Identifica quem assina. O link de assinatura é compartilhado por você (WhatsApp, e-mail…) — a plataforma não envia e-mail." />
            <Field label="CPF / CNPJ" type="text" value={form.clientDocument} onChange={set("clientDocument")}
              placeholder="000.000.000-00" variable="client_document" />
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Detalhes</h3>
            <Field label="Valor (R$)" type="number" value={form.contractValue} onChange={set("contractValue")}
              placeholder="1500.00" variable="contract_value"
              hint={Number.isFinite(contractValueNumber) && contractValueNumber > 0 ? `Por extenso: ${numberToWordsPtBR(contractValueNumber)}` : undefined} />
            <Field label="Condições de pagamento" type="text" value={form.paymentTerms} onChange={set("paymentTerms")}
              placeholder="50% na assinatura, 50% no dia" variable="payment_terms" />
            <Field label="Descrição do serviço" type="text" value={form.serviceDescription} onChange={set("serviceDescription")}
              placeholder="Ensaio fotográfico de casamento" variable="service_description" />
            <Field label="Local do serviço" type="text" value={form.serviceLocation} onChange={set("serviceLocation")}
              placeholder="São Paulo, SP" variable="service_location" />
            <Field label="Início do serviço" type="date" value={form.serviceStartDate} onChange={set("serviceStartDate")}
              variable="service_start_date" />
            <Field label="Fim do serviço" type="date" value={form.serviceEndDate} onChange={set("serviceEndDate")}
              variable="service_end_date" hint="Com as duas datas, a agenda é bloqueada quando todos assinarem." />
            <Field label="Prazo para assinatura" type="date" value={form.expiresAt} onChange={set("expiresAt")}
              variable="expiry_date" hint="Depois desse dia o link deixa de aceitar assinatura." />
          </div>

          {extraVarKeys.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  Campos do modelo
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Específicos deste texto</p>
              </div>
              {extraVarKeys.map((key) => {
                const lbl = variableLabels[key] ?? VAR_LABELS[key] ?? labelFromKey(key);
                return (
                  <Field
                    key={key}
                    label={lbl}
                    type="text"
                    value={extraVarValues[key] ?? ""}
                    onChange={(v) => setExtraVarValues((prev) => ({ ...prev, [key]: v }))}
                    variable={key}
                    varLabel={lbl}
                  />
                );
              })}
            </div>
          )}

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Seus dados (contratado)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Nome e e-mail vêm do perfil automaticamente</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Nome", value: userProfile?.displayName ?? "—" },
                { label: "E-mail", value: userProfile?.email ?? "—" },
                { label: "Cidade / foro", value: userProfile?.city ?? "—" },
                { label: "Data do contrato", value: todayBR() },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium truncate max-w-[160px]">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t">
              <Field
                label="Seu CPF / CNPJ"
                type="text"
                value={ownerDocument}
                onChange={setOwnerDocument}
                placeholder="000.000.000-00"
                variable="owner_document"
                varLabel="Seu CPF/CNPJ no contrato"
                hint={!userProfile?.cpf ? "Não encontrado no perfil — preencha aqui" : undefined}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Imagens / Logotipo
            </h3>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleLogoFile} />
            {logoSrc ? (
              <div className="space-y-2">
                <div className="relative rounded-lg border overflow-hidden bg-muted/30 p-2 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt="Logo" className="max-h-20 max-w-full object-contain" />
                  <button type="button" onClick={() => setLogoSrc(null)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-red-500 transition-colors">
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
                <span className="opacity-60">PNG ou JPG — redimensionada automaticamente</span>
              </button>
            )}
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Inserir bloco</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Clique ou arraste para dentro do contrato</p>
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
  );
}
