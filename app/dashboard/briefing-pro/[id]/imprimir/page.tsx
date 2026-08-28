"use client";

// Exportação em PDF do Briefing Pro (via impressão do navegador).
// - Briefing em andamento: documento completo do briefing.
// - Briefing concluído: RELATÓRIO PÓS-EXECUÇÃO detalhado — quem executou cada
//   item e quando, horários planejados vs reais, intercorrências, comentários,
//   links de materiais e confirmações de leitura.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import { tierAllows } from "@/components/plan/plan-gate";
import { useOwnerPlanTier } from "@/components/social-media/premium-gate";
import {
  BriefingComment,
  BriefingDetail,
  BRIEFING_STATUS_CONFIG,
  BRIEFING_TYPE_LABELS,
  DELIVERABLE_STATUS_CONFIG,
  INCIDENT_SEVERITY_CONFIG,
  ITEM_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
  STORAGE_TYPE_LABELS,
} from "@/lib/briefing-pro-types";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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

const STATUS_GLYPH: Record<string, string> = {
  done: "☑",
  skipped: "⊘",
  in_progress: "◐",
  pending: "☐",
};

export default function BriefingPrintPage() {
  const router = useRouter();
  const params = useParams();
  const briefingId = params.id as string;
  const { userProfile, loading } = useAuth();

  const [detail, setDetail] = useState<BriefingDetail | null>(null);
  const [comments, setComments] = useState<BriefingComment[]>([]);
  const [fetching, setFetching] = useState(true);
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
  const statusCfg = BRIEFING_STATUS_CONFIG[briefing.status];
  const allItems = detail.sections.flatMap((s) => s.items);
  const doneItems = allItems.filter((i) => i.status === "done");
  const skippedItems = allItems.filter((i) => i.status === "skipped");
  const ownerProfile = detail.profiles[briefing.owner_id];
  const approvedByProfile = briefing.approved_by ? detail.profiles[briefing.approved_by] : null;
  const currentReads = detail.read_confirmations.filter((r) => r.version === briefing.version);
  const nameOf = (id: string | null | undefined) =>
    id ? detail.profiles[id]?.display_name ?? "—" : "—";

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Barra de ações — some na impressão */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-700"
          onClick={() => router.push(`/dashboard/briefing-pro/${briefingId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-xs text-gray-500 hidden sm:block">
          Na janela de impressão, escolha &quot;Salvar como PDF&quot; como destino.
        </p>
        <Button size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 text-sm leading-relaxed">
        {/* Cabeçalho do documento */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
            {isReport ? "Relatório pós-execução" : "Briefing de trabalho"}
            {!whiteLabel && " · ISOSCANNING Briefing Pro"}
          </p>
          <h1 className="text-2xl font-bold">{briefing.title}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-xs">
            <p><span className="font-semibold">Cliente:</span> {briefing.client_name ?? "—"}</p>
            <p><span className="font-semibold">Tipo:</span> {BRIEFING_TYPE_LABELS[briefing.briefing_type]}</p>
            <p><span className="font-semibold">Status:</span> {statusCfg.label} (v{briefing.version})</p>
            <p>
              <span className="font-semibold">Execução:</span>{" "}
              {formatDate(briefing.event_date)}
              {briefing.event_time ? ` às ${briefing.event_time}` : ""}
            </p>
            <p><span className="font-semibold">Responsável:</span> {ownerProfile?.display_name ?? "—"}</p>
            <p>
              <span className="font-semibold">Aprovado:</span>{" "}
              {briefing.approved_at
                ? `${approvedByProfile?.display_name ?? "—"} em ${formatDateTime(briefing.approved_at)}`
                : "—"}
            </p>
          </div>
        </div>

        {/* Resumo da execução (só no relatório) */}
        {isReport && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
              Resumo da execução
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="border border-gray-300 rounded p-2">
                <p className="text-xl font-bold">{allItems.length}</p>
                <p className="text-xs text-gray-600">Itens planejados</p>
              </div>
              <div className="border border-gray-300 rounded p-2">
                <p className="text-xl font-bold">{doneItems.length}</p>
                <p className="text-xs text-gray-600">Concluídos</p>
              </div>
              <div className="border border-gray-300 rounded p-2">
                <p className="text-xl font-bold">{skippedItems.length}</p>
                <p className="text-xs text-gray-600">Pulados</p>
              </div>
              <div className="border border-gray-300 rounded p-2">
                <p className="text-xl font-bold">
                  {allItems.length
                    ? Math.round(((doneItems.length + skippedItems.length) / allItems.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-600">Progresso</p>
              </div>
            </div>
            {detail.incidents.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {detail.incidents.length}{" "}
                {detail.incidents.length === 1
                  ? "intercorrência registrada"
                  : "intercorrências registradas"}{" "}
                ({detail.incidents.filter((i) => !i.resolved).length} em aberto) — detalhes ao final.
              </p>
            )}
          </section>
        )}

        {/* Briefing núcleo */}
        {(briefing.objective || briefing.target_audience || briefing.tone || briefing.restrictions || briefing.notes) && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">Sobre o trabalho</h2>
            {briefing.objective && <p className="mb-1"><span className="font-semibold">Objetivo:</span> {briefing.objective}</p>}
            {briefing.target_audience && <p className="mb-1"><span className="font-semibold">Público-alvo:</span> {briefing.target_audience}</p>}
            {briefing.tone && <p className="mb-1"><span className="font-semibold">Tom / estilo:</span> {briefing.tone}</p>}
            {briefing.restrictions && (
              <p className="mb-1 border-l-4 border-red-400 pl-2">
                <span className="font-semibold">⚠ Restrições:</span> {briefing.restrictions}
              </p>
            )}
            {briefing.notes && <p className="mb-1"><span className="font-semibold">Observações:</span> {briefing.notes}</p>}
          </section>
        )}

        {/* Locações e contatos */}
        {(briefing.locations.length > 0 || briefing.contacts.length > 0) && (
          <section className="mb-6 break-inside-avoid grid sm:grid-cols-2 gap-6">
            {briefing.locations.length > 0 && (
              <div>
                <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">Locações</h2>
                {briefing.locations.map((l, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-semibold">{l.name}</p>
                    {l.address && <p className="text-xs text-gray-700">{l.address}</p>}
                    {l.notes && <p className="text-xs text-gray-500 italic">{l.notes}</p>}
                  </div>
                ))}
              </div>
            )}
            {briefing.contacts.length > 0 && (
              <div>
                <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">Contatos-chave</h2>
                {briefing.contacts.map((c, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-semibold">
                      {c.name}
                      {c.role && <span className="font-normal text-gray-600"> — {c.role}</span>}
                    </p>
                    <p className="text-xs text-gray-700">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </p>
                    {c.notes && <p className="text-xs text-gray-500 italic">{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Estrutura / checklist */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
            {isReport ? "Execução detalhada" : "Estrutura do briefing"}
          </h2>
          {detail.sections.map((section) => (
            <div key={section.id} className="mb-4 break-inside-avoid">
              <h3 className="font-bold bg-gray-100 px-2 py-1 rounded">
                {section.title}
                <span className="font-normal text-xs text-gray-600 ml-2">
                  {section.items.filter((i) => i.status === "done" || i.status === "skipped").length}
                  /{section.items.length}
                </span>
              </h3>
              {section.description && (
                <p className="text-xs text-gray-600 px-2 mt-0.5">{section.description}</p>
              )}
              <div className="mt-1">
                {section.items.map((item) => {
                  const itemLinks = detail.links.filter((l) => l.item_id === item.id);
                  return (
                    <div key={item.id} className="px-2 py-1.5 border-b border-gray-100 last:border-0">
                      <p>
                        <span className="font-mono mr-1">{STATUS_GLYPH[item.status] ?? "☐"}</span>
                        {item.scheduled_time && (
                          <span className="font-semibold mr-1">{item.scheduled_time}</span>
                        )}
                        <span className={item.status === "skipped" ? "line-through text-gray-500" : "font-medium"}>
                          {item.title}
                        </span>
                        {item.is_required && <span className="text-xs ml-1">🔒 Obrigatório</span>}
                        {item.priority === "high" && (
                          <span className="text-xs text-red-600 ml-1">● Alta</span>
                        )}
                        {item.item_type !== "task" && (
                          <span className="text-xs text-gray-500 ml-1">[{ITEM_TYPE_LABELS[item.item_type]}]</span>
                        )}
                        {item.assigned_to && (
                          <span className="text-xs text-gray-600 ml-1">
                            → {nameOf(item.assigned_to)}
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-600 ml-5">{item.description}</p>
                      )}
                      {isReport && (item.status === "done" || item.status === "skipped") && (
                        <p className="text-xs text-emerald-700 ml-5">
                          {item.status === "skipped" ? "Pulado" : "Concluído"} por{" "}
                          {nameOf(item.completed_by)}
                          {item.completed_at ? ` às ${formatTime(item.completed_at)}` : ""}
                          {isReport && item.scheduled_time && item.completed_at
                            ? ` (planejado: ${item.scheduled_time})`
                            : ""}
                        </p>
                      )}
                      {item.subitems.length > 0 && (
                        <div className="ml-5 mt-0.5">
                          {item.subitems.map((sub) => (
                            <p key={sub.id} className="text-xs">
                              <span className="font-mono mr-1">
                                {sub.status === "done" ? "☑" : "☐"}
                              </span>
                              {sub.title}
                              {isReport && sub.status === "done" && sub.completed_by && (
                                <span className="text-gray-500"> — {nameOf(sub.completed_by)}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      {itemLinks.length > 0 && (
                        <div className="ml-5 mt-0.5">
                          {itemLinks.map((link) => (
                            <p key={link.id} className="text-xs text-gray-700">
                              🔗 {link.label} ({STORAGE_TYPE_LABELS[link.storage_type]})
                              {link.url ? ` — ${link.url}` : ""}
                              {link.description ? ` — ${link.description}` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Entregáveis */}
        {detail.deliverables.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">Entregáveis</h2>
            {detail.deliverables.map((del) => (
              <div key={del.id} className="mb-3 border-l-2 border-gray-300 pl-3">
                <p className="font-semibold">
                  {del.quantity > 1 ? `${del.quantity}x ` : ""}{del.title}
                  <span className="font-normal text-xs text-gray-600 ml-2">
                    [{DELIVERABLE_STATUS_CONFIG[del.status].label}]
                  </span>
                </p>
                {del.specs && <p className="text-xs text-gray-700">Specs: {del.specs}</p>}
                {del.description && <p className="text-xs text-gray-700">{del.description}</p>}
                <p className="text-xs text-gray-600">
                  {del.due_date && `Prazo: ${formatDate(del.due_date)} · `}
                  {del.deliver_to && `Para: ${del.deliver_to} · `}
                  {del.delivery_method && `Via: ${del.delivery_method} · `}
                  {del.assigned_to && `Responsável: ${nameOf(del.assigned_to)}`}
                </p>
                {detail.links
                  .filter((l) => l.deliverable_id === del.id)
                  .map((link) => (
                    <p key={link.id} className="text-xs text-gray-700">
                      🔗 {link.label} ({STORAGE_TYPE_LABELS[link.storage_type]})
                      {link.url ? ` — ${link.url}` : ""}
                    </p>
                  ))}
              </div>
            ))}
          </section>
        )}

        {/* Materiais gerais */}
        {detail.links.filter((l) => !l.item_id && !l.deliverable_id).length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
              Materiais e links
            </h2>
            {detail.links
              .filter((l) => !l.item_id && !l.deliverable_id)
              .map((link) => (
                <p key={link.id} className="mb-1 text-xs">
                  <span className="font-semibold">{link.label}</span>{" "}
                  ({STORAGE_TYPE_LABELS[link.storage_type]})
                  {link.url ? ` — ${link.url}` : ""}
                  {link.description ? ` — ${link.description}` : ""}
                </p>
              ))}
          </section>
        )}

        {/* Intercorrências (sempre que existirem; obrigatório no relatório) */}
        {detail.incidents.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
              Intercorrências
            </h2>
            {detail.incidents.map((incident) => (
              <div key={incident.id} className="mb-3 border-l-2 border-orange-400 pl-3">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-black">
                    [{INCIDENT_SEVERITY_CONFIG[incident.severity].label}]
                  </span>{" "}
                  {formatDateTime(incident.occurred_at)} · registrada por{" "}
                  {incident.profile?.display_name ?? nameOf(incident.author_id)} ·{" "}
                  {incident.resolved ? "RESOLVIDA" : "EM ABERTO"}
                </p>
                <p className="mt-0.5">{incident.description}</p>
                {incident.resolved && incident.resolution && (
                  <p className="text-xs text-gray-700 mt-0.5">
                    <span className="font-semibold">Resolução</span>
                    {incident.resolved_by ? ` (${nameOf(incident.resolved_by)})` : ""}: {incident.resolution}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Comentários (só no relatório) */}
        {isReport && comments.length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
              Registro de comentários ({comments.length})
            </h2>
            {comments.map((c) => {
              const relatedItem = c.item_id ? allItems.find((i) => i.id === c.item_id) : null;
              return (
                <div key={c.id} className="mb-2 text-xs break-inside-avoid">
                  <p className="text-gray-600">
                    <span className="font-semibold text-black">
                      {c.profile?.display_name ?? "Usuário"}
                    </span>{" "}
                    · {formatDateTime(c.created_at)}
                    {relatedItem && <span> · sobre &quot;{relatedItem.title}&quot;</span>}
                  </p>
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </div>
              );
            })}
          </section>
        )}

        {/* Equipe e confirmações */}
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
            Equipe e confirmações de leitura (v{briefing.version})
          </h2>
          <p className="mb-1 text-xs">
            <span className="font-semibold">{ownerProfile?.display_name ?? "—"}</span> — Dono
            {(() => {
              const read = currentReads.find((r) => r.user_id === briefing.owner_id);
              return read ? ` · confirmou em ${formatDateTime(read.confirmed_at)}` : " · não confirmou";
            })()}
          </p>
          {detail.members.map((m) => {
            const read = currentReads.find((r) => r.user_id === m.user_id);
            return (
              <p key={m.id} className="mb-1 text-xs">
                <span className="font-semibold">{m.profile?.display_name ?? "Usuário"}</span> —{" "}
                {MEMBER_ROLE_LABELS[m.role]}
                {briefing.approver_id === m.user_id ? " · Aprovador" : ""}
                {read ? ` · confirmou em ${formatDateTime(read.confirmed_at)}` : " · não confirmou"}
              </p>
            );
          })}
        </section>

        {/* Rodapé */}
        <div className="border-t border-gray-300 pt-3 mt-8 text-xs text-gray-500 flex justify-between">
          <span>
            {isReport ? "Relatório pós-execução" : "Briefing"} gerado em{" "}
            {new Date().toLocaleString("pt-BR")}
          </span>
          {!whiteLabel && <span>ISOSCANNING · Briefing Pro</span>}
        </div>
      </div>
    </div>
  );
}
