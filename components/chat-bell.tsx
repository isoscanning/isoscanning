"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-service";

interface ConversationPreview {
  id: string;
  lastMessageAt: string;
  unreadCount: number;
  otherParticipant: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export function ChatBell() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/chat/conversations");
      const data: ConversationPreview[] = res.data.data ?? [];
      setConversations(data);
      setTotalUnread(data.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0));
    } catch {
      // silencioso — não quebra a UI
    }
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    loadConversations();

    // Escuta mensagens novas recebidas em tempo real
    const channel = supabase
      .channel("chat-bell:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          // Filtra apenas mensagens enviadas por outra pessoa (não por mim)
        },
        (payload) => {
          const row = payload.new as any;
          // Ignora mensagens que eu mesmo enviei
          if (row.sender_id === userProfile.id) return;
          // Recarrega a lista para atualizar contadores
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile, loadConversations]);

  const handleConversationClick = (conv: ConversationPreview) => {
    setIsOpen(false);
    router.push(`/dashboard/chat/${conv.id}`);
    // Recarrega após navegar para zerar o badge
    setTimeout(loadConversations, 800);
  };

  if (!userProfile) return null;

  const conversationsWithUnread = conversations.filter((c) => c.unreadCount > 0);
  const hasUnread = totalUnread > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative group hover:bg-zinc-800 transition-colors"
          aria-label="Mensagens"
        >
          <MessageSquare className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border border-zinc-950">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 mr-4 border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl"
        align="end"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
          <h4 className="font-semibold text-zinc-100">Mensagens</h4>
          {hasUnread && (
            <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {totalUnread} {totalUnread === 1 ? "nova" : "novas"}
            </span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Nenhuma conversa ainda.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] md:max-h-80">
            <div className="flex flex-col py-2">
              {/* Mostra primeiro as com não lidas, depois as demais */}
              {[
                ...conversationsWithUnread,
                ...conversations.filter((c) => c.unreadCount === 0),
              ].map((conv) => {
                const name = conv.otherParticipant?.displayName ?? "Usuário";
                const avatar = conv.otherParticipant?.avatarUrl;
                const timeAgo = formatDistanceToNow(new Date(conv.lastMessageAt), {
                  addSuffix: true,
                  locale: ptBR,
                });

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className={`relative flex items-center gap-3 p-3 px-4 text-left transition-colors hover:bg-zinc-800/50 cursor-pointer ${
                      conv.unreadCount > 0 ? "bg-zinc-900/40" : "opacity-80"
                    }`}
                  >
                    {conv.unreadCount > 0 && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span
                          className={`truncate text-sm ${
                            conv.unreadCount > 0
                              ? "font-semibold text-zinc-100"
                              : "font-medium text-zinc-300"
                          }`}
                        >
                          {name}
                        </span>
                        <span className="shrink-0 text-[10px] text-zinc-500 uppercase tracking-wider">
                          {timeAgo}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="text-xs text-zinc-400">
                          {conv.unreadCount}{" "}
                          {conv.unreadCount === 1 ? "mensagem não lida" : "mensagens não lidas"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-zinc-800/50 px-4 py-2">
          <button
            onClick={() => { setIsOpen(false); router.push("/dashboard/chat"); }}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-100 transition-colors py-1"
          >
            Ver todas as conversas
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
