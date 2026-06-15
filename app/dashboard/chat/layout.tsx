import type { Viewport } from "next";
import { ConversationsProvider } from "@/components/chat/ConversationsProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ConversationsProvider>{children}</ConversationsProvider>;
}
