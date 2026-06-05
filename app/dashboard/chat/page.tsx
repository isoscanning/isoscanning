"use client";

import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConversationList } from "@/components/chat/ConversationList";
import { useConversations } from "@/components/chat/hooks/useChat";
import { Loader2, MessageSquare } from "lucide-react";

export default function ChatPage() {
  const { userProfile } = useAuth();
  const { conversations, loading } = useConversations();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="container mx-auto flex h-[calc(100vh-140px)] max-w-4xl flex-col py-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Mensagens</h1>
          </div>

          <div className="flex flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
            {/* Lista de conversas (coluna esquerda em telas maiores) */}
            <div className="flex w-full flex-col overflow-y-auto md:w-80 md:border-r">
              {loading ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ConversationList conversations={conversations} />
              )}
            </div>

            {/* Placeholder para telas maiores quando nenhuma conversa está selecionada */}
            <div className="hidden flex-1 items-center justify-center text-center text-muted-foreground md:flex">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-10 w-10 opacity-30" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
