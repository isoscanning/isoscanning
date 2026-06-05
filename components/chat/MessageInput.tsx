"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Throttle de typing broadcast (máximo 1 evento por segundo)
    if (!typingRef.current) {
      onTyping();
      typingRef.current = setTimeout(() => {
        typingRef.current = null;
      }, 1000);
    }
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    await onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem... (Enter para enviar)"
        rows={1}
        disabled={disabled}
        className={cn(
          "max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border-muted bg-muted/40 py-2 text-sm focus-visible:ring-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      <Button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        size="icon"
        className="h-10 w-10 shrink-0 rounded-xl"
        aria-label="Enviar mensagem"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
