"use client";

// Exportação em PDF do Briefing Pro (impressão do navegador) — documento
// pensado para ser enviado ao cliente e à equipe: capa com a marca, ficha
// resumida, cronograma por seção com quem faz o quê, entregáveis, materiais,
// intercorrências e equipe. Briefing concluído vira RELATÓRIO PÓS-EXECUÇÃO
// (quem executou cada item e quando, planejado vs real, comentários,
// confirmações de leitura).
//
// White-label (Ultra): a marca IsoScanning some e o cabeçalho leva o nome do
// dono do briefing.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import { crewIndex, effectiveCrewIds, jobRoleTone } from "@/lib/briefing-pro-crew";
import { tierAllows } from "@/components/plan/plan-gate";
import { useOwnerPlanTier } from "@/components/social-media/premium-gate";
import {
  BriefingComment,
  BriefingCrew,
  BriefingDetail,
  BriefingItem,
  BRIEFING_STATUS_CONFIG,
  BRIEFING_TYPE_LABELS,
  DELIVERABLE_STATUS_CONFIG,
  INCIDENT_OUTCOME_CONFIG,
  INCIDENT_SEVERITY_CONFIG,
  UNRESOLVED_REASON_LABELS,
  ITEM_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
  STORAGE_TYPE_LABELS,
} from "@/lib/briefing-pro-types";

// ─── Formatação ──────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

/** "sábado, 15 de novembro de 2026" — descritivo para o cliente. */
function formatLongDate(value: string | null | undefined): string {
  if (!value) return "A definir";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  const text = new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const STATUS_GLYPH: Record<string, string> = {
  done: "☑",
  skipped: "⊘",
  in_progress: "◐",
  pending: "☐",
};

const STATUS_LABEL: Record<string, string> = {
  done: "Concluído",
  skipped: "Pulado",
  in_progress: "Em andamento",
  pending: "Pendente",
};

/** Cores de função sem as variantes dark (o PDF é sempre claro). */
function printRoleTone(role: string): string {
  return jobRoleTone(role)
    .split(" ")
    .filter((c) => !c.startsWith("dark:"))
    .join(" ");
}

// Margens do PDF sem depender da janela de impressão: @page fica em 0 (assim o
// resultado é igual com "Padrão" ou "Nenhuma" e sem cabeçalho/rodapé do
// navegador), a folha carrega a margem lateral e o thead/tfoot do .print-frame
// — que o navegador repete em TODAS as páginas — dá a margem superior/inferior.
const PRINT_STYLES = `
@media print {
  @page { margin: 0; }
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-sheet { box-shadow: none !important; max-width: none !important; margin: 0 !important; padding: 0 14mm !important; border-radius: 0 !important; }
  .print-frame { display: table; width: 100%; }
  .print-frame > thead { display: table-header-group; }
  .print-frame > tfoot { display: table-footer-group; }
  a { text-decoration: none; color: inherit; }
}
`;

// ─── Blocos visuais ──────────────────────────────────────────────────────────

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center gap-2 break-after-avoid">
      <span className="h-3.5 w-1 rounded-full bg-rose-500 shrink-0" />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-600">{children}</h2>
      <span className="flex-1 border-t border-gray-200 ml-2" />
      {aside && <span className="text-[10px] text-gray-500 whitespace-nowrap">{aside}</span>}
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 break-inside-avoid">
      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-[13px] font-semibold text-gray-900 mt-0.5 leading-snug">{value}</p>
      {hint && <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-px text-[9.5px] font-semibold leading-4 whitespace-nowrap ${className ?? "border-gray-300 bg-white text-gray-700"}`}
    >
      {children}
    </span>
  );
}

function CrewPills({ crew, inherited = false }: { crew: BriefingCrew[]; inherited?: boolean }) {
  if (crew.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {crew.map((member) => (
        <span
          key={member.id}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9.5px] font-semibold leading-4 whitespace-nowrap ${printRoleTone(member.job_role)} ${inherited ? "opacity-70" : ""}`}
          title={inherited ? "Herdado da seção" : undefined}
        >
          {member.name}
          {member.job_role && <span className="font-normal opacity-80">· {member.job_role}</span>}
        </span>
      ))}
    </span>
  );
}

function StatTile({ value, label, tone }: { value: ReactNode; label: string; tone: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-center ${tone}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-1 opacity-80">{label}</p>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function BriefingPrintPage() {
  const router = useRouter();
  const params = useParams();
  const briefingId = params.id as string;
  const { userProfile, loading } = useAuth();

  const [detail, setDetail] = useState<BriefingDetail | null>(null);
  const [comments, setComments] = useState<BriefingComment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [issuedAt] = useState(() => new Date());
  // White-label (Ultra): a marca IsoScanning some do PDF quando o DONO do briefing tem o recurso
  const ownerTier = useOwnerPlanTier(detail?.briefing.owner_id);
  const whiteLabel = ownerTier !== null && tierAllows(ownerTier, "whiteLabel");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const load = useCallback(async () => {
    try {
      const [data, commentList] = await Promise.all([
        briefingProService.getDetail(briefingId),
        briefingProService.listComments(briefingId),
      ]);
      setDetail(data);
      setComments(commentList);
    } catch {
      toast.error("Erro ao carregar o briefing");
      router.push("/dashboard/briefing-pro");
    } finally {
      setFetching(false);
    }
  }, [briefingId, router]);

  useEffect(() => {
    if (!userProfile) return;
    load();
  }, [userProfile, load]);

  if (loading || fetching || !detail || ownerTier === null) {
    return (
      <div className="min-h-screen bg-white p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const { briefing } = detail;
  const isReport = briefing.status === "completed";
  const docType = isReport ? "Relatório pós-execução" : "Briefing de trabalho";
  const statusCfg = BRIEFING_STATUS_CONFIG[briefing.status];
  const allItems = detail.sections.flatMap((s) => s.items);
  const crewById = crewIndex(detail.crew);
  const crewOf = (ids: string[]) =>
    ids.map((id) => crewById.get(id)).filter((c): c is BriefingCrew => Boolean(c));
  const doneItems = allItems.filter((i) => i.status === "done");
  const skippedItems = allItems.filter((i) => i.status === "skipped");
  const requiredItems = allItems.filter((i) => i.is_required);
  const ownerProfile = detail.profiles[briefing.owner_id];
  const approvedByProfile = briefing.approved_by ? detail.profiles[briefing.approved_by] : null;
  const currentReads = detail.read_confirmations.filter((r) => r.version === briefing.version);
  const nameOf = (id: string | null | undefined) =>
    id ? detail.profiles[id]?.display_name ?? "—" : "—";
  const timed = allItems.map((i) => i.scheduled_time).filter((t): t is string => Boolean(t)).sort();
  const scheduleRange =
    timed.length > 0
      ? `${timed[0]} – ${timed[timed.length - 1]}`
      : briefing.event_time
        ? `Início ${briefing.event_time}`
        : "A definir";
  const generalLinks = detail.links.filter((l) => !l.item_id && !l.deliverable_id);
  const openIncidents = detail.incidents.filter((i) => !i.resolved).length;
  const unresolvedIncidents = detail.incidents.filter(
    (i) => i.resolved && i.outcome === "unresolved"
  ).length;
  const progress = allItems.length
    ? Math.round(((doneItems.length + skippedItems.length) / allItems.length) * 100)
    : 0;

  const renderItemRow = (item: BriefingItem, sectionCrewIds: string[]) => {
    const itemLinks = detail.links.filter((l) => l.item_id === item.id);
    const who = effectiveCrewIds(item, { crew_ids: sectionCrewIds });
    const isSkipped = item.status === "skipped";
    const closed = item.status === "done" || isSkipped;
    return (
      <tr key={item.id} className="border-t border-gray-100 align-top break-inside-avoid">
        <td className="py-1.5 pr-2 whitespace-nowrap">
          {item.scheduled_time ? (
            <>
              <span className="font-semibold tabular-nums text-gray-900">{item.scheduled_time}</span>
              {item.duration_minutes ? (
                <span className="block text-[9.5px] text-gray-500">{formatDuration(item.duration_minutes)}</span>
              ) : null}
            </>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="py-1.5 pr-3">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-mono text-gray-500" title={STATUS_LABEL[item.status]}>
              {STATUS_GLYPH[item.status] ?? "☐"}
            </span>
            <span className={isSkipped ? "line-through text-gray-500" : "font-semibold text-gray-900"}>
              {item.title}
            </span>
            {item.item_type !== "task" && <Pill>{ITEM_TYPE_LABELS[item.item_type]}</Pill>}
            {item.is_required && (
              <Pill className="border-purple-200 bg-purple-50 text-purple-700">Obrigatório</Pill>
            )}
            {item.priority === "high" && (
              <Pill className="border-red-200 bg-red-50 text-red-700">Prioridade alta</Pill>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{item.description}</p>
          )}
          {isReport && closed && (
            <p className="text-[10.5px] text-emerald-700 mt-0.5">
              {isSkipped ? "Pulado" : "Concluído"} por {nameOf(item.completed_by)}
              {item.completed_at ? ` às ${formatTime(item.completed_at)}` : ""}
              {item.scheduled_time && item.completed_at ? ` · planejado ${item.scheduled_time}` : ""}
            </p>
          )}
          {item.subitems.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.subitems.map((sub) => (
                <li key={sub.id} className="text-[11px] text-gray-700 pl-1">
                  <span className="font-mono mr-1 text-gray-500">{sub.status === "done" ? "☑" : "☐"}</span>
                  {sub.title}
                  {isReport && sub.status === "done" && sub.completed_by && (
                    <span className="text-gray-500"> — {nameOf(sub.completed_by)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {itemLinks.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {itemLinks.map((link) => (
                <li key={link.id} className="text-[10.5px] text-gray-600 pl-1 break-all">
                  ↗ {link.label} · {STORAGE_TYPE_LABELS[link.storage_type]}
                  {link.url ? ` · ${link.url}` : ""}
                  {link.description ? ` — ${link.description}` : ""}
                </li>
              ))}
            </ul>
          )}
        </td>
        <td className="py-1.5 w-[30%]">
          {who.ids.length > 0 ? (
            <CrewPills crew={crewOf(who.ids)} inherited={who.inherited} />
          ) : (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white text-gray-900">
      <style>{PRINT_STYLES}</style>

      {/* Barra de ações — some na impressão */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-700 -ml-2"
          onClick={() => router.push(`/dashboard/briefing-pro/${briefingId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-xs text-gray-500 hidden md:block">
          Na janela de impressão, escolha &quot;Salvar como PDF&quot; como destino.
        </p>
        <Button size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Folha */}
      <div className="print-sheet max-w-[210mm] mx-auto my-6 bg-white shadow-lg rounded-md px-10 py-9 text-[12px] leading-relaxed">
        {/* thead/tfoot só existem na impressão e se repetem em cada página:
            são a margem superior e inferior do PDF (ver PRINT_STYLES). */}
        <table className="print-frame w-full border-collapse">
          <thead className="hidden print:table-header-group">
            <tr><td className="p-0"><div className="h-[12mm]" /></td></tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0 align-top">
        {/* Cabeçalho com marca */}
        <header className="flex items-start justify-between gap-6 pb-4 border-b-2 border-gray-900">
          <div className="min-w-0">
            {whiteLabel ? (
              <p className="text-xl font-bold tracking-tight text-gray-900 truncate">
                {ownerProfile?.display_name ?? "Briefing"}
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo-cortada.png" alt="IsoScanning" className="h-9 w-auto" />
            )}
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              {docType}
            </p>
          </div>
          <div className="text-right text-[10.5px] text-gray-500 shrink-0 leading-5">
            <p>
              <span className="font-semibold text-gray-700">{statusCfg.label}</span> · versão {briefing.version}
            </p>
            <p>Emitido em {formatDateTime(issuedAt.toISOString())}</p>
            {!whiteLabel && <p>Preparado com IsoScanning Briefing Pro</p>}
          </div>
        </header>

        {/* Título */}
        <div className="mt-6">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-gray-900">
            {briefing.title}
          </h1>
          <p className="mt-1 text-[13px] text-gray-600">
            {briefing.client_name ? <>Para <span className="font-semibold text-gray-800">{briefing.client_name}</span> · </> : null}
            {BRIEFING_TYPE_LABELS[briefing.briefing_type]}
            {briefing.ai_generated && !isReport ? " · estruturado com apoio de IA" : ""}
          </p>
        </div>

        {/* Ficha resumida */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          <Fact label="Data da execução" value={formatLongDate(briefing.event_date)} />
          <Fact
            label="Cronograma"
            value={scheduleRange}
            hint={briefing.event_time ? `Início oficial ${briefing.event_time}` : undefined}
          />
          <Fact label="Preparado por" value={ownerProfile?.display_name ?? "—"} />
          <Fact
            label="Aprovação"
            value={briefing.approved_at ? approvedByProfile?.display_name ?? "Aprovado" : "Pendente"}
            hint={briefing.approved_at ? `em ${formatDateTime(briefing.approved_at)}` : undefined}
          />
          <Fact
            label="Equipe"
            value={detail.crew.length ? `${detail.crew.length} ${detail.crew.length === 1 ? "pessoa" : "pessoas"}` : "A definir"}
            hint={
              detail.crew.length
                ? [...new Set(detail.crew.map((c) => c.job_role).filter(Boolean))].slice(0, 4).join(" · ")
                : undefined
            }
          />
          <Fact
            label="Atividades"
            value={`${allItems.length} ${allItems.length === 1 ? "item" : "itens"}`}
            hint={`${detail.sections.length} ${detail.sections.length === 1 ? "seção" : "seções"}${requiredItems.length ? ` · ${requiredItems.length} obrigatórios` : ""}`}
          />
          <Fact
            label="Entregáveis"
            value={detail.deliverables.length ? String(detail.deliverables.length) : "—"}
            hint={
              detail.deliverables.length
                ? `${detail.deliverables.filter((d) => d.status === "approved" || d.status === "delivered").length} entregues`
                : undefined
            }
          />
          <Fact
            label="Locações"
            value={briefing.locations.length ? briefing.locations.map((l) => l.name).join(", ") : "—"}
          />
        </div>

        {/* Resumo da execução (só no relatório) */}
        {isReport && (
          <section className="break-inside-avoid">
            <SectionTitle>Resumo da execução</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              <StatTile value={allItems.length} label="Planejados" tone="border-gray-200 bg-gray-50 text-gray-800" />
              <StatTile value={doneItems.length} label="Concluídos" tone="border-emerald-200 bg-emerald-50 text-emerald-800" />
              <StatTile value={skippedItems.length} label="Pulados" tone="border-amber-200 bg-amber-50 text-amber-800" />
              <StatTile value={`${progress}%`} label="Progresso" tone="border-blue-200 bg-blue-50 text-blue-800" />
            </div>
            {detail.incidents.length > 0 && (
              <p className="text-[11px] text-gray-600 mt-2">
                {detail.incidents.length} {detail.incidents.length === 1 ? "intercorrência registrada" : "intercorrências registradas"}
                {unresolvedIncidents ? ` · ${unresolvedIncidents} sem solução` : ""}
                {openIncidents ? ` · ${openIncidents} em aberto` : ""} — detalhes ao final.
              </p>
            )}
          </section>
        )}

        {/* Sobre o trabalho */}
        {(briefing.objective || briefing.target_audience || briefing.tone || briefing.restrictions || briefing.notes) && (
          <section className="break-inside-avoid">
            <SectionTitle>Sobre o trabalho</SectionTitle>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {briefing.objective && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Objetivo</dt>
                  <dd className="text-[12.5px] text-gray-800 leading-relaxed">{briefing.objective}</dd>
                </div>
              )}
              {briefing.target_audience && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Público-alvo</dt>
                  <dd className="text-gray-800">{briefing.target_audience}</dd>
                </div>
              )}
              {briefing.tone && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tom e estilo</dt>
                  <dd className="text-gray-800">{briefing.tone}</dd>
                </div>
              )}
              {briefing.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Observações</dt>
                  <dd className="text-gray-800 whitespace-pre-wrap">{briefing.notes}</dd>
                </div>
              )}
            </dl>
            {briefing.restrictions && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Restrições — atenção</p>
                <p className="text-red-900 whitespace-pre-wrap">{briefing.restrictions}</p>
              </div>
            )}
          </section>
        )}

        {/* Locações e contatos */}
        {(briefing.locations.length > 0 || briefing.contacts.length > 0) && (
          <section className="break-inside-avoid">
            <SectionTitle>Locações e contatos</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-4">
              {briefing.locations.length > 0 && (
                <div className="space-y-2">
                  {briefing.locations.map((l, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Locação</p>
                      <p className="font-semibold text-gray-900">{l.name}</p>
                      {l.address && <p className="text-[11px] text-gray-700">{l.address}</p>}
                      {l.map_url && <p className="text-[10px] text-gray-500 break-all">{l.map_url}</p>}
                      {l.notes && <p className="text-[11px] text-gray-500 italic mt-0.5">{l.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {briefing.contacts.length > 0 && (
                <div className="space-y-2">
                  {briefing.contacts.map((c, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {c.role || "Contato"}
                      </p>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {(c.phone || c.email) && (
                        <p className="text-[11px] text-gray-700">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {c.notes && <p className="text-[11px] text-gray-500 italic mt-0.5">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Equipe e funções */}
        {detail.crew.length > 0 && (
          <section className="break-inside-avoid">
            <SectionTitle aside={`${detail.crew.length} ${detail.crew.length === 1 ? "pessoa" : "pessoas"}`}>
              Equipe e funções
            </SectionTitle>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-wider text-gray-500 text-left">
                  <th className="py-1 pr-3 font-semibold">Nome</th>
                  <th className="py-1 pr-3 font-semibold">Função</th>
                  <th className="py-1 font-semibold">Contato</th>
                </tr>
              </thead>
              <tbody>
                {detail.crew.map((member) => (
                  <tr key={member.id} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-semibold text-gray-900">{member.name}</td>
                    <td className="py-1.5 pr-3">
                      {member.job_role ? (
                        <span className={`inline-flex rounded-full px-2 py-px text-[10px] font-semibold ${printRoleTone(member.job_role)}`}>
                          {member.job_role}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-[11px] text-gray-700">{member.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Cronograma / estrutura */}
        <section>
          <SectionTitle
            aside={
              isReport
                ? `${doneItems.length + skippedItems.length}/${allItems.length} itens`
                : `${allItems.length} ${allItems.length === 1 ? "item" : "itens"}`
            }
          >
            {isReport ? "Execução detalhada" : "Cronograma e atividades"}
          </SectionTitle>
          {detail.sections.length === 0 && (
            <p className="text-gray-500">Nenhuma seção cadastrada.</p>
          )}
          {detail.sections.map((section, index) => {
            const sectionDone = section.items.filter(
              (i) => i.status === "done" || i.status === "skipped"
            ).length;
            const sectionTimes = section.items
              .map((i) => i.scheduled_time)
              .filter((t): t is string => Boolean(t))
              .sort();
            return (
              <div key={section.id} className="mb-5">
                <div className="rounded-lg bg-gray-100 px-3 py-2 break-inside-avoid break-after-avoid">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[13px] font-bold text-gray-900">
                      <span className="text-gray-400 font-semibold mr-1.5">{String(index + 1).padStart(2, "0")}</span>
                      {section.title}
                    </h3>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {sectionTimes.length > 0 ? `${sectionTimes[0]} – ${sectionTimes[sectionTimes.length - 1]} · ` : ""}
                      {sectionDone}/{section.items.length}
                    </span>
                  </div>
                  {section.description && (
                    <p className="text-[11px] text-gray-600 mt-0.5">{section.description}</p>
                  )}
                  {section.crew_ids.length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
                      <span className="uppercase tracking-wider font-semibold mr-1">Equipe</span>
                      <CrewPills crew={crewOf(section.crew_ids)} />
                    </p>
                  )}
                </div>
                {section.items.length === 0 ? (
                  <p className="text-[11px] text-gray-400 px-3 py-2">Sem itens nesta seção.</p>
                ) : (
                  <table className="w-full border-collapse mt-1">
                    <thead>
                      <tr className="text-[9.5px] uppercase tracking-wider text-gray-500 text-left">
                        <th className="py-1 pr-2 w-14 font-semibold">Hora</th>
                        <th className="py-1 pr-3 font-semibold">Atividade</th>
                        <th className="py-1 font-semibold">Quem faz</th>
                      </tr>
                    </thead>
                    <tbody>{section.items.map((item) => renderItemRow(item, section.crew_ids))}</tbody>
                  </table>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-gray-500">
            Legenda: ☐ pendente · ◐ em andamento · ☑ concluído · ⊘ pulado. Pessoas em tom claro ao lado
            de um item vieram da equipe da seção.
          </p>
        </section>

        {/* Entregáveis */}
        {detail.deliverables.length > 0 && (
          <section className="break-inside-avoid">
            <SectionTitle aside={`${detail.deliverables.length} ${detail.deliverables.length === 1 ? "item" : "itens"}`}>
              Entregáveis
            </SectionTitle>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-wider text-gray-500 text-left">
                  <th className="py-1 pr-3 font-semibold">Entregável</th>
                  <th className="py-1 pr-3 font-semibold w-24">Prazo</th>
                  <th className="py-1 pr-3 font-semibold w-36">Entrega</th>
                  <th className="py-1 font-semibold w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.deliverables.map((del) => {
                  const delLinks = detail.links.filter((l) => l.deliverable_id === del.id);
                  return (
                    <tr key={del.id} className="border-t border-gray-100 align-top break-inside-avoid">
                      <td className="py-1.5 pr-3">
                        <p className="font-semibold text-gray-900">
                          {del.quantity > 1 ? `${del.quantity}× ` : ""}{del.title}
                        </p>
                        {del.specs && <p className="text-[11px] text-gray-700">Specs: {del.specs}</p>}
                        {del.description && <p className="text-[11px] text-gray-600">{del.description}</p>}
                        {del.assigned_to && (
                          <p className="text-[10.5px] text-gray-500">Responsável: {nameOf(del.assigned_to)}</p>
                        )}
                        {delLinks.map((link) => (
                          <p key={link.id} className="text-[10.5px] text-gray-600 break-all">
                            ↗ {link.label} · {STORAGE_TYPE_LABELS[link.storage_type]}
                            {link.url ? ` · ${link.url}` : ""}
                          </p>
                        ))}
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-800">{formatDate(del.due_date)}</td>
                      <td className="py-1.5 pr-3 text-[11px] text-gray-700">
                        {del.deliver_to && <p>Para: {del.deliver_to}</p>}
                        {del.delivery_method && <p>Via: {del.delivery_method}</p>}
                        {!del.deliver_to && !del.delivery_method && "—"}
                      </td>
                      <td className="py-1.5">
                        <Pill
                          className={
                            del.status === "approved"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : del.status === "delivered"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : del.status === "in_production"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : undefined
                          }
                        >
                          {DELIVERABLE_STATUS_CONFIG[del.status].label}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Materiais gerais */}
        {generalLinks.length > 0 && (
          <section className="break-inside-avoid">
            <SectionTitle>Materiais e links</SectionTitle>
            <ul className="space-y-1">
              {generalLinks.map((link) => (
                <li key={link.id} className="text-[11.5px] break-all">
                  <span className="font-semibold text-gray-900">{link.label}</span>
                  <span className="text-gray-500"> · {STORAGE_TYPE_LABELS[link.storage_type]}</span>
                  {link.url ? <span className="text-gray-700"> · {link.url}</span> : null}
                  {link.description ? <span className="text-gray-500"> — {link.description}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Intercorrências */}
        {detail.incidents.length > 0 && (
          <section>
            <SectionTitle
              aside={[
                openIncidents ? `${openIncidents} em aberto` : null,
                unresolvedIncidents ? `${unresolvedIncidents} sem solução` : null,
              ].filter(Boolean).join(" · ") || undefined}
            >
              Intercorrências
            </SectionTitle>
            <div className="space-y-2">
              {detail.incidents.map((incident) => {
                const outcome = incident.resolved ? incident.outcome ?? "resolved" : null;
                const tone =
                  outcome === "unresolved"
                    ? "border-red-300"
                    : outcome === "workaround"
                      ? "border-amber-300"
                      : outcome === "resolved"
                        ? "border-emerald-300"
                        : "border-orange-300";
                return (
                  <div key={incident.id} className={`rounded-lg border-l-4 border border-gray-200 ${tone} px-3 py-2 break-inside-avoid`}>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                      <Pill
                        className={
                          incident.severity === "high"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : incident.severity === "medium"
                              ? "border-orange-200 bg-orange-50 text-orange-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {INCIDENT_SEVERITY_CONFIG[incident.severity].label}
                      </Pill>
                      <Pill
                        className={
                          outcome === "unresolved"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : outcome === "workaround"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : outcome === "resolved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-orange-200 bg-orange-50 text-orange-700"
                        }
                      >
                        {outcome ? INCIDENT_OUTCOME_CONFIG[outcome].label : "Em aberto"}
                      </Pill>
                      <span>
                        {formatDateTime(incident.occurred_at)} · registrada por{" "}
                        {incident.profile?.display_name ?? nameOf(incident.author_id)}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{incident.description}</p>
                    {outcome === "unresolved" && (
                      <p className="text-[11px] text-gray-700 mt-1">
                        <span className="font-semibold">Motivo:</span>{" "}
                        {incident.unresolved_reason
                          ? UNRESOLVED_REASON_LABELS[incident.unresolved_reason]
                          : "não informado"}
                        {incident.resolution ? ` — ${incident.resolution}` : ""}
                        {incident.resolved_by ? ` (${nameOf(incident.resolved_by)})` : ""}
                      </p>
                    )}
                    {outcome && outcome !== "unresolved" && incident.resolution && (
                      <p className="text-[11px] text-gray-700 mt-1">
                        <span className="font-semibold">{outcome === "workaround" ? "Contorno:" : "Resolução:"}</span>{" "}
                        {incident.resolution}
                        {incident.resolved_by ? ` (${nameOf(incident.resolved_by)})` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Comentários (só no relatório) */}
        {isReport && comments.length > 0 && (
          <section>
            <SectionTitle aside={`${comments.length} ${comments.length === 1 ? "mensagem" : "mensagens"}`}>
              Registro de comentários
            </SectionTitle>
            <div className="space-y-1.5">
              {comments.map((c) => {
                const relatedItem = c.item_id ? allItems.find((i) => i.id === c.item_id) : null;
                return (
                  <div key={c.id} className="text-[11px] break-inside-avoid border-l-2 border-gray-200 pl-2">
                    <p className="text-gray-500">
                      <span className="font-semibold text-gray-900">{c.profile?.display_name ?? "Usuário"}</span>
                      {" · "}{formatDateTime(c.created_at)}
                      {relatedItem && <span> · sobre &quot;{relatedItem.title}&quot;</span>}
                    </p>
                    <p className="whitespace-pre-wrap text-gray-800">{c.content}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Acesso e confirmações de leitura */}
        <section className="break-inside-avoid">
          <SectionTitle aside={`${currentReads.length}/${detail.members.length + 1} confirmaram a v${briefing.version}`}>
            Acesso e confirmações de leitura
          </SectionTitle>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-wider text-gray-500 text-left">
                <th className="py-1 pr-3 font-semibold">Pessoa</th>
                <th className="py-1 pr-3 font-semibold w-28">Papel</th>
                <th className="py-1 font-semibold w-44">Leitura da versão {briefing.version}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: briefing.owner_id, name: ownerProfile?.display_name ?? "—", role: "Dono", userId: briefing.owner_id },
                ...detail.members.map((m) => ({
                  key: m.id,
                  name: m.profile?.display_name ?? "Usuário",
                  role: `${MEMBER_ROLE_LABELS[m.role]}${briefing.approver_id === m.user_id ? " · Aprovador" : ""}`,
                  userId: m.user_id,
                })),
              ].map((row) => {
                const read = currentReads.find((r) => r.user_id === row.userId);
                return (
                  <tr key={row.key} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-semibold text-gray-900">{row.name}</td>
                    <td className="py-1.5 pr-3 text-[11px] text-gray-700">{row.role}</td>
                    <td className="py-1.5 text-[11px]">
                      {read ? (
                        <span className="text-emerald-700">✓ {formatDateTime(read.confirmed_at)}</span>
                      ) : (
                        <span className="text-gray-400">não confirmou</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Rodapé */}
        <footer className="mt-10 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
          <span>
            {docType} · {briefing.title} · v{briefing.version} · emitido em {formatDateTime(issuedAt.toISOString())}
          </span>
          {!whiteLabel && (
            <span className="inline-flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-cortada.png" alt="" className="h-3.5 w-auto opacity-70" />
              <span>isoscanning.com · Briefing Pro</span>
            </span>
          )}
        </footer>
              </td>
            </tr>
          </tbody>
          <tfoot className="hidden print:table-footer-group">
            <tr><td className="p-0"><div className="h-[14mm]" /></td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
