"use client";

import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { useChat, useConversations } from "@/components/chat/hooks/useChat";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const { userProfile } = useAuth();
  const { conversations, loading: loadingConvs } = useConversations();
  const { messages, loading, sending, typingOther, sendMessage, broadcastTyping } = useChat(
    conversationId,
    userProfile?.id ?? ""
  );

  const activeConversation = conversations.find((c) => c.id === conversationId);
  const otherName = activeConversation?.otherParticipant?.displayName;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="container mx-auto flex h-[calc(100vh-140px)] max-w-4xl flex-col py-6">
          <div className="flex flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
            {/* Sidebar: lista de conversas (oculta em mobile) */}
            <div className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r md:flex">
              {loadingConvs ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ConversationList conversations={conversations} activeId={conversationId} />
              )}
            </div>

            {/* Thread de mensagens */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Cabeçalho da conversa */}
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Link href="/dashboard/chat" className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                {activeConversation?.otherParticipant?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeConversation.otherParticipant.avatarUrl}
                    alt={otherName ?? ""}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {otherName?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{otherName ?? "Carregando..."}</p>
                  {typingOther && (
                    <p className="text-[11px] italic text-muted-foreground">digitando...</p>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <MessageThread
                messages={messages}
                currentUserId={userProfile?.id ?? ""}
                loading={loading}
                typingOther={typingOther}
                otherParticipantName={otherName}
              />

              {/* Input */}
              <MessageInput
                onSend={sendMessage}
                onTyping={broadcastTyping}
                disabled={sending}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
