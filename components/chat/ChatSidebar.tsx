"use client";

import { useState, useMemo } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Conversation } from "./hooks/useChat";

type Filter = "all" | "unread";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
}

export function ChatSidebar({ conversations, activeId }: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.otherParticipant?.displayName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, search]);

  const unreadTotal = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Título */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-[15px] font-semibold">Mensagens</h2>
        {unreadTotal > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-muted py-1.5 pl-8 pr-7 text-[13px] outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex shrink-0 gap-2 border-b px-3 pb-2">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-0.5 text-[12px] font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {f === "all" ? "Todas" : "Não lidas"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageSquare className="h-7 w-7 opacity-30" />
            <p className="text-xs text-muted-foreground">
              {search || filter === "unread" ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((conv) => {
              const name = conv.otherParticipant?.displayName ?? "Usuário";
              const avatar = conv.otherParticipant?.avatarUrl;
              const isActive = conv.id === activeId;
              const hasUnread = conv.unreadCount > 0;
              const timeAgo = conv.lastMessageAt
                ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: ptBR })
                : "";

              return (
                <li key={conv.id}>
                  <Link
                    href={`/dashboard/chat/${conv.id}`}
                    className={cn(
                      "flex items-center gap-3 border-b border-border/30 px-3 py-2.5 transition-colors hover:bg-muted/60",
                      isActive && "bg-muted"
                    )}
                  >
                    <div className="relative shrink-0">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {hasUnread && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className={cn("truncate text-[13px]", hasUnread ? "font-semibold" : "font-medium")}>
                          {name}
                        </span>
                        <span className={cn("shrink-0 text-[11px]", hasUnread ? "font-medium text-primary" : "text-muted-foreground")}>
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
