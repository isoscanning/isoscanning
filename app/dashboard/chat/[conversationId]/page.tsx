"use client";

import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChat } from "@/components/chat/hooks/useChat";
import { useConversationsContext } from "@/components/chat/ConversationsProvider";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Header } from "@/components/header";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const { userProfile } = useAuth();
  const { conversations, loading: loadingConvs } = useConversationsContext();
  const { messages, loading, sending, typingOther, sendMessage, broadcastTyping } = useChat(
    conversationId,
    userProfile?.id ?? ""
  );

  const activeConversation = conversations.find((c) => c.id === conversationId);
  const other = activeConversation?.otherParticipant;
  const otherName = other?.displayName;

  return (
    <>
      {/* ── MOBILE (< md): tela cheia estilo WhatsApp ── */}
      <div className="fixed inset-0 z-40 flex flex-col bg-background md:hidden">
        {/* Header fixo */}
        <div
          className="flex shrink-0 items-center gap-2 border-b bg-background px-2"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex w-full items-center gap-2 py-2">
            <Link href="/dashboard/chat" aria-label="Voltar">
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted active:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>

            {other?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatarUrl} alt={otherName ?? ""} className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {otherName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {otherName ?? "Carregando..."}
              </p>
              {typingOther && (
                <p className="text-[11px] italic leading-tight text-muted-foreground">digitando...</p>
              )}
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <MessageThread
            messages={messages}
            currentUserId={userProfile?.id ?? ""}
            loading={loading}
            typingOther={typingOther}
            otherParticipantName={otherName}
          />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t bg-background" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <MessageInput onSend={sendMessage} onTyping={broadcastTyping} disabled={sending} />
        </div>
      </div>

      {/* ── DESKTOP (≥ md): layout two-column com Header ── */}
      <div className="hidden min-h-screen flex-col md:flex">
        <Header />
        <main className="flex flex-1 flex-col">
          <div className="container mx-auto flex h-[calc(100vh-80px)] max-w-6xl flex-col py-6">
            <div className="flex flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">

              {/* Sidebar: lista de conversas */}
              <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r">
                {loadingConvs ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ChatSidebar conversations={conversations} activeId={conversationId} />
                )}
              </div>

              {/* Área da conversa ativa */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
                  {other?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={other.avatarUrl} alt={otherName ?? ""} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {otherName?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{otherName ?? "Carregando..."}</p>
                    {typingOther && (
                      <p className="text-[11px] italic text-muted-foreground">digitando...</p>
                    )}
                  </div>
                </div>

                {/* Mensagens */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <MessageThread
                    messages={messages}
                    currentUserId={userProfile?.id ?? ""}
                    loading={loading}
                    typingOther={typingOther}
                    otherParticipantName={otherName}
                  />
                </div>

                {/* Input */}
                <div className="shrink-0 border-t">
                  <MessageInput onSend={sendMessage} onTyping={broadcastTyping} disabled={sending} />
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
