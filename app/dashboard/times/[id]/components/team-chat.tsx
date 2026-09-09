"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { MessageInput } from "@/components/chat/MessageInput";
import { playMessageReceived } from "@/lib/chat-sounds";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { initials, type TeamMessage } from "@/lib/teams-types";
import { toast } from "sonner";

/**
 * Chat em grupo do time (canal geral) ou de um job (jobId). Histórico pelo
 * backend; mensagens novas chegam pelo Supabase Realtime (policy de SELECT
 * em team_messages para membros ativos).
 */
export function TeamChat({
  teamId, jobId, currentUserId, disabled, title, onRead,
}: {
  teamId: string;
  jobId?: string;
  currentUserId: string;
  disabled?: boolean;
  title?: string;
  onRead?: () => void;
}) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const senderCache = useRef<Map<string, TeamMessage["sender"]>>(new Map());

  const markRead = useCallback(() => {
    teamsService.markRead(teamId, jobId).then(() => onRead?.()).catch(() => {});
  }, [teamId, jobId, onRead]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    teamsService
      .listMessages(teamId, { job_id: jobId, limit: 50 })
      .then((rows) => {
        if (cancelled) return;
        for (const m of rows) if (m.sender) senderCache.current.set(m.sender_id, m.sender);
        setMessages(rows);
        setHasMore(rows.length >= 50);
        markRead();
      })
      .catch((err) => toast.error(teamsApiError(err, "Não foi possível carregar o chat")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [teamId, jobId, markRead]);

  useEffect(() => {
    const channel = supabase.channel(`team-chat:${teamId}:${jobId ?? "geral"}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` },
      (payload) => {
        const row = payload.new as { id: string; team_id: string; job_offer_id: string | null; sender_id: string; content: string; created_at: string };
        if ((row.job_offer_id ?? null) !== (jobId ?? null)) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, { ...row, sender: senderCache.current.get(row.sender_id) ?? null }];
        });
        if (row.sender_id !== currentUserId) {
          playMessageReceived();
          markRead();
        }
      }
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, jobId, currentUserId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(content: string) {
    setSending(true);
    try {
      const msg = await teamsService.sendMessage(teamId, content, jobId);
      if (msg.sender) senderCache.current.set(msg.sender_id, msg.sender);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível enviar"));
    } finally {
      setSending(false);
    }
  }

  async function loadMore() {
    if (messages.length === 0) return;
    setLoadingMore(true);
    try {
      const older = await teamsService.listMessages(teamId, { job_id: jobId, limit: 50, before: messages[0].created_at });
      for (const m of older) if (m.sender) senderCache.current.set(m.sender_id, m.sender);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length >= 50);
    } catch {
      /* silencioso */
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border bg-background overflow-hidden" style={{ height: "min(70vh, 640px)" }}>
      {title && (
        <div className="shrink-0 border-b px-4 py-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            <p>Nenhuma mensagem ainda.<br />Combine os detalhes com o time por aqui.</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center">
                <button onClick={loadMore} disabled={loadingMore} className="text-xs text-primary hover:underline disabled:opacity-50">
                  {loadingMore ? "Carregando..." : "Ver mensagens anteriores"}
                </button>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = m.sender_id === currentUserId;
              const prev = messages[i - 1];
              const sameSender = prev && prev.sender_id === m.sender_id;
              const name = m.sender?.display_name ?? "Membro";
              return (
                <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {!sameSender && (
                        m.sender?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.sender.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">{initials(name)}</span>
                        )
                      )}
                    </div>
                  )}
                  <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                    {!mine && !sameSender && <p className="text-[11px] font-semibold text-primary mb-0.5">{name}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
      <div className="shrink-0">
        {disabled ? (
          <p className="border-t p-3 text-center text-xs text-muted-foreground">Time arquivado — chat somente leitura.</p>
        ) : (
          <MessageInput onSend={send} onTyping={() => {}} disabled={sending} />
        )}
      </div>
    </div>
  );
}
