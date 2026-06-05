"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Conversation } from "./hooks/useChat";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
}

export function ConversationList({ conversations, activeId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-8 w-8 opacity-40" />
        <p>Nenhuma conversa ainda.</p>
        <p className="text-xs">Inicie um chat a partir do perfil de um profissional ou cliente.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId;
        const name = conv.otherParticipant?.displayName ?? "Usuário";
        const avatar = conv.otherParticipant?.avatarUrl;
        const timeAgo = formatDistanceToNow(new Date(conv.lastMessageAt), {
          addSuffix: true,
          locale: ptBR,
        });

        return (
          <li key={conv.id}>
            <Link
              href={`/dashboard/chat/${conv.id}`}
              className={cn(
                "flex items-center gap-3 p-4 transition-colors hover:bg-muted/60",
                isActive && "bg-muted"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                {conv.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={cn(
                      "truncate text-sm",
                      conv.unreadCount > 0 ? "font-semibold" : "font-medium"
                    )}
                  >
                    {name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo}</span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
