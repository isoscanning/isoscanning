"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

/**
 * Renderizador dos toasts do shadcn (`useToast()` de components/ui/use-toast).
 *
 * Este componente não existia: 16 arquivos chamavam `toast({...})` e nada
 * aparecia na tela — incluindo mensagens de erro de /precos, assinatura,
 * admin e candidaturas. Montado uma única vez em `app/layout.tsx`, junto do
 * `<Toaster />` do sonner (os dois sistemas convivem no projeto).
 */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
