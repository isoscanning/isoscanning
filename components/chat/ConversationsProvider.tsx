"use client";

import { createContext, useContext } from "react";
import { useConversations } from "./hooks/useChat";
import type { Conversation } from "./hooks/useChat";

interface ConversationsContextValue {
  conversations: Conversation[];
  loading: boolean;
  refetch: () => void;
  startConversation: (participantId: string) => Promise<string>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const value = useConversations();
  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversationsContext must be inside ConversationsProvider");
  return ctx;
}
