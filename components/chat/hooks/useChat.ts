"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-service";
import { playMessageReceived } from "@/lib/chat-sounds";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  otherParticipant: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/chat/conversations");
      setConversations(res.data.data ?? []);
    } catch {
      setError("Erro ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startConversation = useCallback(async (participantId: string): Promise<string> => {
    const res = await apiClient.post("/chat/conversations", { participantId });
    await fetchConversations();
    return res.data.id as string;
  }, [fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations, startConversation };
}

export function useChat(conversationId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingOther, setTypingOther] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Carrega histórico de mensagens
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/chat/conversations/${conversationId}/messages?limit=50&offset=0`
        );
        setMessages(res.data.data ?? []);
      } catch {
        setError("Erro ao carregar mensagens.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Marca mensagens como lidas ao abrir a conversa
  useEffect(() => {
    if (!conversationId) return;
    apiClient
      .patch(`/chat/conversations/${conversationId}/read`)
      .catch(() => {});
  }, [conversationId]);

  // Subscribe Supabase Realtime: mensagens novas + typing indicator
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    // Escuta INSERTs na tabela messages para esta conversa
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        const newMessage: Message = {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          content: row.content,
          readAt: row.read_at,
          createdAt: row.created_at,
        };
        setMessages((prev) => {
          // Evita duplicatas (caso o remetente já inseriu via REST)
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        // Se a mensagem é de outra pessoa, toca som e marca como lida
        if (row.sender_id !== currentUserId) {
          playMessageReceived();
          apiClient.patch(`/chat/conversations/${conversationId}/read`).catch(() => {});
        }
      }
    );

    // Escuta broadcast de typing
    channel.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.userId !== currentUserId) {
        setTypingOther(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingOther(false), 3000);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || sending) return;
      setSending(true);
      try {
        const res = await apiClient.post("/chat/messages", {
          conversationId,
          content: content.trim(),
        });
        // Adiciona a mensagem localmente (o Realtime também entregará, mas ignoramos duplicatas)
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data as Message];
        });
      } catch {
        setError("Erro ao enviar mensagem.");
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending]
  );

  const broadcastTyping = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  return {
    messages,
    loading,
    sending,
    error,
    typingOther,
    sendMessage,
    broadcastTyping,
  };
}
