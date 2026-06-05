"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./hooks/useChat";

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  typingOther: boolean;
  otherParticipantName?: string;
}

export function MessageThread({
  messages,
  currentUserId,
  loading,
  typingOther,
  otherParticipantName,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingOther]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
        <p>
          Nenhuma mensagem ainda.
          <br />
          Seja o primeiro a enviar!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isMine={message.senderId === currentUserId}
        />
      ))}

      {typingOther && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-muted-foreground">
            <span className="italic">
              {otherParticipantName ?? "Usuário"} está digitando
            </span>
            <span className="ml-1 animate-pulse">...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
