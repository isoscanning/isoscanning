"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, MessageSquare, Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useConversationsContext } from "@/components/chat/ConversationsProvider";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Header } from "@/components/header";

type Filter = "all" | "unread";

export default function ChatListPage() {
  const { conversations, loading } = useConversationsContext();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();

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
    <>
      {/* ── MOBILE (< md): tela cheia estilo WhatsApp ── */}
      <div className="fixed inset-0 z-40 flex flex-col bg-background md:hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4"
          style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex w-full items-center gap-3 py-3">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="Voltar ao sistema"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted active:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-[17px] font-semibold">Mensagens</h1>
            {unreadTotal > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b bg-background px-4 py-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              inputMode="search"
              placeholder="Pesquisar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full bg-muted py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3" aria-label="Limpar">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex shrink-0 gap-2 border-b bg-background px-4 py-2.5">
          {(["all", "unread"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-4 py-1 text-xs font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {f === "all" ? "Todas" : `Não lidas${unreadTotal > 0 ? ` (${unreadTotal})` : ""}`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-sm text-muted-foreground">
                {search || filter === "unread" ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((conv) => {
                const name = conv.otherParticipant?.displayName ?? "Usuário";
                const avatar = conv.otherParticipant?.avatarUrl;
                const hasUnread = conv.unreadCount > 0;
                const timeAgo = conv.lastMessageAt
                  ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: ptBR })
                  : "";

                return (
                  <li key={conv.id}>
                    <Link
                      href={`/dashboard/chat/${conv.id}`}
                      className="flex items-center gap-3 border-b border-border/30 px-4 py-3 transition-colors active:bg-muted/60"
                    >
                      <div className="relative shrink-0">
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-[15px]", hasUnread ? "font-semibold" : "font-medium")}>
                            {name}
                          </span>
                          <span className={cn("shrink-0 text-[12px]", hasUnread ? "font-medium text-primary" : "text-muted-foreground")}>
                            {timeAgo}
                          </span>
                        </div>
                        {hasUnread && (
                          <div className="mt-0.5 flex justify-end">
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="shrink-0 bg-background" style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>

      {/* ── DESKTOP (≥ md): layout two-column com Header ── */}
      <div className="hidden min-h-screen flex-col md:flex">
        <Header />
        <main className="flex flex-1 flex-col">
          <div className="container mx-auto flex h-[calc(100vh-80px)] max-w-6xl flex-col py-6">
            <div className="flex flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
              {/* Sidebar */}
              <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r">
                {loading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ChatSidebar conversations={conversations} />
                )}
              </div>

              {/* Empty state */}
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
