"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Apple,
  CalendarPlus,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  addIcsConnection,
  checkGoogleAgendaConfig,
  removeCalendarConnection,
  rotateAgendaFeedToken,
  startGoogleAgendaConnect,
  syncCalendars,
  updateCalendarConnection,
  type CalendarConnection,
} from "@/lib/data-service";

// Painel "Sincronização": conectar Google (OAuth) ou qualquer calendário por
// link .ics (iCloud/Apple, Outlook…), gerenciar as conexões e exportar a
// agenda do IsoScanning como feed .ics.

interface CalendarSyncPanelProps {
  connections: CalendarConnection[];
  feedUrl: string | null;
  onChanged: () => Promise<void>;
  notify: (kind: "success" | "error", message: string) => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function statusBadge(conn: CalendarConnection) {
  if (!conn.syncEnabled) return <Badge variant="secondary">Pausado</Badge>;
  if (conn.status === "revoked") return <Badge variant="destructive">Acesso revogado</Badge>;
  if (conn.status === "error") return <Badge variant="destructive">Erro</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">Ativo</Badge>;
}

export function CalendarSyncPanel({ connections, feedUrl, onChanged, notify }: CalendarSyncPanelProps) {
  const [googleConfig, setGoogleConfig] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [icsLabel, setIcsLabel] = useState("");
  const [addingIcs, setAddingIcs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkGoogleAgendaConfig()
      .then(setGoogleConfig)
      .catch(() => setGoogleConfig({ configured: false, missing: [] }));
  }, []);

  const connectGoogle = async () => {
    try {
      setConnectingGoogle(true);
      const { url } = await startGoogleAgendaConnect();
      window.location.href = url;
    } catch (err) {
      notify("error", (err as Error).message);
      setConnectingGoogle(false);
    }
  };

  const addIcs = async () => {
    if (!icsUrl.trim()) return;
    try {
      setAddingIcs(true);
      const result = await addIcsConnection(icsUrl.trim(), icsLabel.trim() || undefined);
      setIcsUrl("");
      setIcsLabel("");
      await onChanged();
      notify(
        "success",
        result.sync?.error
          ? `Calendário conectado, mas a primeira sincronização falhou: ${result.sync.error}`
          : `Calendário conectado — ${result.sync?.busyRows ?? 0} período(s) ocupado(s) importado(s).`
      );
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setAddingIcs(false);
    }
  };

  const toggle = async (conn: CalendarConnection, enabled: boolean) => {
    try {
      setBusyId(conn.id);
      await updateCalendarConnection(conn.id, { syncEnabled: enabled });
      await onChanged();
      notify("success", enabled ? "Sincronização retomada." : "Sincronização pausada — as datas foram reabertas.");
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const syncOne = async (conn: CalendarConnection) => {
    try {
      setBusyId(conn.id);
      const summary = await syncCalendars(conn.id);
      await onChanged();
      const r = summary.results[0];
      if (r?.error) notify("error", r.error);
      else notify("success", `Sincronizado: ${r?.busyRows ?? 0} período(s) ocupado(s).`);
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const syncAll = async () => {
    try {
      setSyncingAll(true);
      const summary = await syncCalendars();
      await onChanged();
      notify(
        summary.failed ? "error" : "success",
        `${summary.synced} calendário(s) sincronizado(s)${summary.failed ? `, ${summary.failed} com erro` : ""}.`
      );
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setSyncingAll(false);
    }
  };

  const remove = async (conn: CalendarConnection) => {
    try {
      setBusyId(conn.id);
      await removeCalendarConnection(conn.id);
      await onChanged();
      notify("success", "Calendário desconectado.");
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const rotateFeed = async () => {
    try {
      setRotating(true);
      await rotateAgendaFeedToken();
      await onChanged();
      notify("success", feedUrl ? "Novo link gerado — o anterior parou de funcionar." : "Link do feed gerado.");
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setRotating(false);
    }
  };

  const copyFeed = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("error", "Não consegui copiar — selecione o link e copie manualmente.");
    }
  };

  const activeCount = connections.filter((c) => c.syncEnabled && c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* ── Importar: calendários externos → IsoScanning ── */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Fechar datas automaticamente</CardTitle>
          <CardDescription className="text-base">
            Conecte sua agenda e os compromissos dela passam a bloquear o horário no seu perfil,
            sem você precisar marcar nada. Só os horários são lidos — nunca o conteúdo dos eventos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Google */}
            <div className="flex flex-col justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <GoogleIcon className="h-5 w-5" /> Google Agenda
                </div>
                <p className="text-sm text-muted-foreground">
                  Um clique. Sincroniza sozinho a cada 30 minutos e sempre que você pedir.
                </p>
                {googleConfig && !googleConfig.configured && (
                  <p className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Integração ainda não configurada no servidor
                      {googleConfig.missing.length ? ` (falta: ${googleConfig.missing.join(", ")})` : ""}.
                      Enquanto isso, use o link .ics ao lado — funciona com o Google também.
                    </span>
                  </p>
                )}
              </div>
              <Button
                type="button"
                onClick={connectGoogle}
                disabled={connectingGoogle || !googleConfig?.configured}
                className="w-full"
              >
                {connectingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                Conectar Google Agenda
              </Button>
            </div>

            {/* ICS */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Apple className="h-5 w-5" /> iCloud / Apple, Outlook e outros (link .ics)
                </div>
                <p className="text-sm text-muted-foreground">
                  Cole o link de assinatura do calendário (<code>webcal://</code> ou <code>https://…ics</code>).
                </p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="webcal://p12-caldav.icloud.com/published/2/…"
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                  aria-label="Link .ics"
                />
                <Input
                  placeholder="Nome (opcional) — ex.: iPhone pessoal"
                  value={icsLabel}
                  onChange={(e) => setIcsLabel(e.target.value)}
                  aria-label="Nome da conexão"
                />
              </div>
              <Button type="button" variant="outline" onClick={addIcs} disabled={addingIcs || !icsUrl.trim()}>
                {addingIcs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Conectar por link
              </Button>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">Onde encontro esse link?</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    <strong>iCloud / Apple:</strong> no app Calendário (Mac ou iPhone), toque no calendário →
                    "Calendário público" → copie o link <code>webcal://</code>.
                  </li>
                  <li>
                    <strong>Google (sem OAuth):</strong> Configurações → o calendário → "Endereço secreto no
                    formato iCal".
                  </li>
                  <li>
                    <strong>Outlook:</strong> Configurações → Calendário → Calendários compartilhados →
                    Publicar → copie o link ICS.
                  </li>
                </ul>
              </details>
            </div>
          </div>

          {/* Conexões */}
          {connections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Calendários conectados{" "}
                  <span className="text-sm font-normal text-muted-foreground">({activeCount} ativo{activeCount === 1 ? "" : "s"})</span>
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={syncAll} disabled={syncingAll || activeCount === 0}>
                  {syncingAll ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                  Sincronizar tudo
                </Button>
              </div>
              <div className="space-y-2">
                {connections.map((conn) => {
                  const working = busyId === conn.id;
                  return (
                    <div key={conn.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center">
                      <div className="flex flex-1 items-start gap-3">
                        {conn.provider === "google" ? <GoogleIcon className="mt-0.5 h-5 w-5" /> : <Link2 className="mt-0.5 h-5 w-5 text-muted-foreground" />}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{conn.label || (conn.provider === "google" ? "Google Agenda" : "Calendário .ics")}</span>
                            {statusBadge(conn)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {conn.lastSyncedAt
                              ? `Sincronizado ${formatDistanceToNow(new Date(conn.lastSyncedAt), { addSuffix: true, locale: ptBR })}`
                              : "Ainda não sincronizado"}
                          </p>
                          {conn.lastError && (
                            <p className="text-xs text-destructive">{conn.lastError}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        {conn.status === "revoked" && conn.provider === "google" ? (
                          <Button type="button" size="sm" variant="outline" onClick={connectGoogle} disabled={connectingGoogle}>
                            Reconectar
                          </Button>
                        ) : (
                          <>
                            <Switch
                              checked={conn.syncEnabled}
                              onCheckedChange={(v) => toggle(conn, v)}
                              disabled={working}
                              aria-label="Sincronização ligada"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => syncOne(conn)}
                              disabled={working || !conn.syncEnabled}
                              aria-label="Sincronizar agora"
                              title="Sincronizar agora"
                            >
                              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="text-destructive" disabled={working} aria-label="Desconectar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Desconectar este calendário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                As datas fechadas por ele voltam a ficar livres no seu perfil.
                                {conn.provider === "google" && " O acesso ao Google também é revogado."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(conn)} className="bg-destructive hover:bg-destructive/90">
                                Desconectar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Exportar: IsoScanning → calendário pessoal ── */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Ver a agenda do IsoScanning no seu calendário</CardTitle>
          <CardDescription className="text-base">
            Assine este link no Google Agenda, Apple Calendar ou Outlook: suas janelas publicadas e os
            agendamentos aparecem lá e se atualizam sozinhos. Funciona sem conectar nenhuma conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedUrl ? (
            <div className="space-y-2">
              <Label>Seu link privado</Label>
              <div className="flex gap-2">
                <Input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyFeed} aria-label="Copiar link">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Quem tiver este link vê sua agenda. Se ele vazar, gere um novo — o antigo para de funcionar.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não gerou o link do feed.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={feedUrl ? "outline" : "default"} onClick={rotateFeed} disabled={rotating}>
              {rotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              {feedUrl ? "Gerar novo link" : "Gerar link do feed"}
            </Button>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Como assinar</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li><strong>Google Agenda:</strong> Outros calendários → "+" → "Por URL" → cole o link. (O Google atualiza feeds externos a cada ~12–24 h.)</li>
              <li><strong>Apple Calendar:</strong> Arquivo → Nova assinatura de calendário → cole o link. No iPhone: Ajustes → Calendário → Contas → Adicionar calendário assinado.</li>
              <li><strong>Outlook:</strong> Adicionar calendário → Assinar da Web → cole o link.</li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
