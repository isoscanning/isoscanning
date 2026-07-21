"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { isPlatformAdmin } from "@/lib/admin-config";
import apiClient from "@/lib/api-service";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, MessageCircle, Send, Loader2, Users, AlertTriangle,
  CheckCircle2, XCircle, Clock, RefreshCw, FlaskConical,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Painel do administrador: transmissões de WhatsApp (divulgação do app).
// Usa templates de MARKETING aprovados na Meta. A lista de destinatários é
// colada no formato "Nome, telefone" (um por linha) ou só o telefone.
// A proteção real é o AdminGuard no backend (/whatsapp/* exige ADMIN_EMAIL).

interface Broadcast {
  id: string;
  name: string;
  template_name: string;
  status: "draft" | "sending" | "completed" | "failed" | "cancelled";
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  sending: { label: "Enviando…", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "Concluída", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  failed: { label: "Falhou", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelada", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};

function parseRecipients(raw: string): { name?: string; phone: string }[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Formatos aceitos: "Nome, 11999998888" | "Nome; 11999998888" | "11999998888"
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) return { name: parts[0], phone: parts[parts.length - 1] };
      return { phone: parts[0] };
    })
    .filter((r) => r.phone && r.phone.replace(/\D/g, "").length >= 8);
}

const listFetcher = (url: string) => apiClient.get<Broadcast[]>(url).then((r) => r.data);
const statusFetcher = (url: string) => apiClient.get<{ enabled: boolean }>(url).then((r) => r.data);

export default function AdminWhatsappPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const isAdmin = isPlatformAdmin(userProfile?.email);

  useEffect(() => {
    if (!loading && (!userProfile || !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [loading, userProfile, isAdmin, router]);

  const { data: integration } = useSWR(isAdmin ? "/whatsapp/status" : null, statusFetcher);
  const { data: broadcasts, mutate } = useSWR(isAdmin ? "/whatsapp/broadcasts" : null, listFetcher, {
    refreshInterval: 5000,
  });

  // Formulário de nova transmissão
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("divulgacao_app");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Teste de envio
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const parsedRecipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  const handleCreate = async () => {
    if (!name.trim() || !templateName.trim() || !parsedRecipients.length) {
      toast({ variant: "destructive", title: "Preencha nome, template e a lista de destinatários." });
      return;
    }
    setCreating(true);
    try {
      const res = await apiClient.post("/whatsapp/broadcasts", {
        name: name.trim(),
        templateName: templateName.trim(),
        recipients: parsedRecipients,
      });
      const invalid: string[] = res.data?.invalidPhones ?? [];
      toast({
        title: "Transmissão criada",
        description: invalid.length
          ? `${invalid.length} telefone(s) inválido(s) foram ignorados.`
          : "Revise e clique em Enviar quando estiver pronto.",
      });
      setName("");
      setRecipientsRaw("");
      mutate();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar transmissão",
        description: err?.response?.data?.message ?? "Tente novamente.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      await apiClient.post(`/whatsapp/broadcasts/${id}/send`);
      toast({ title: "Transmissão iniciada", description: "O envio é pausado (~50 msgs/min) para proteger o número." });
      mutate();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar envio",
        description: err?.response?.data?.message ?? "Tente novamente.",
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim() || !templateName.trim()) return;
    setTesting(true);
    try {
      const res = await apiClient.post("/whatsapp/test", {
        phone: testPhone.trim(),
        templateName: templateName.trim(),
        bodyParams: [userProfile?.displayName ?? "Teste"],
      });
      if (res.data?.ok) {
        toast({ title: "Mensagem de teste enviada!", description: `wamid: ${res.data.wamid ?? "-"}` });
      } else {
        toast({ variant: "destructive", title: "Falha no teste", description: res.data?.error ?? "Erro desconhecido" });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: err?.response?.data?.message ?? "Tente novamente.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !userProfile || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Painel Admin
          </Link>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold">Transmissões WhatsApp</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Divulgação do app via WhatsApp Cloud API oficial. Use apenas contatos que consentiram em receber
            mensagens — envios de marketing usam template aprovado e custam ~R$ 0,35/mensagem.
          </p>
        </div>

        {integration && !integration.enabled && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">WhatsApp Cloud API não configurada no servidor</p>
              <p>
                Preencha WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env do backend.
                Veja o guia em <code>isoscanning-backend/docs/whatsapp-setup.md</code>.
              </p>
            </div>
          </div>
        )}

        {/* Nova transmissão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" /> Nova transmissão
            </CardTitle>
            <CardDescription>
              O template precisa estar aprovado na Meta. O {"{{1}}"} do corpo é substituído pelo nome do destinatário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bc-name">Nome interno da campanha</Label>
                <Input id="bc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Divulgação fotógrafos SP — julho" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bc-template">Nome do template (Meta)</Label>
                <Input id="bc-template" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="divulgacao_app" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bc-list">Lista de destinatários — um por linha: <code>Nome, telefone</code> ou só o telefone</Label>
              <Textarea
                id="bc-list"
                value={recipientsRaw}
                onChange={(e) => setRecipientsRaw(e.target.value)}
                className="h-40 font-mono text-xs"
                placeholder={"Maria Silva, 11999998888\nJoão, +55 21 98888-7777\n31977776666"}
              />
              <p className="text-xs text-muted-foreground">
                {parsedRecipients.length} destinatário(s) reconhecido(s). Números sem DDI recebem +55 automaticamente.
                Quem respondeu "SAIR" é pulado automaticamente.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={creating || !parsedRecipients.length} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Criar transmissão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Teste */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-500" /> Enviar teste
            </CardTitle>
            <CardDescription>Envia o template acima para um número seu antes de disparar a lista.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="11999998888" className="sm:max-w-xs" />
            <Button variant="outline" onClick={handleTest} disabled={testing || !testPhone.trim()} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar teste
            </Button>
          </CardContent>
        </Card>

        {/* Lista de transmissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" /> Transmissões
            </CardTitle>
            <CardDescription>O progresso atualiza automaticamente a cada 5 segundos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!broadcasts?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transmissão criada ainda.</p>
            )}
            {broadcasts?.map((b) => {
              const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.draft;
              const progress = b.total_recipients
                ? Math.round(((b.sent_count + b.failed_count + b.skipped_count) / b.total_recipients) * 100)
                : 0;
              return (
                <div key={b.id} className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        template: {b.template_name} · {new Date(b.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      {(b.status === "draft" || b.status === "failed") && (
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleSend(b.id)}
                          disabled={sendingId === b.id}
                        >
                          {sendingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Enviar
                        </Button>
                      )}
                    </div>
                  </div>
                  {b.status === "sending" && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {b.total_recipients} destinatários</span>
                    <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> {b.sent_count} enviados</span>
                    <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> {b.failed_count} falhas</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.skipped_count} pulados (opt-out)</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
