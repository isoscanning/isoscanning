"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "./hooks/useChat";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), "HH:mm", { locale: ptBR });

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
          isMine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            isMine ? "justify-end text-primary-foreground/70" : "justify-end text-muted-foreground"
          )}
        >
          <span>{time}</span>
          {isMine && (
            <CheckCheck
              className={cn("h-3 w-3", message.readAt ? "text-blue-400" : "opacity-60")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
