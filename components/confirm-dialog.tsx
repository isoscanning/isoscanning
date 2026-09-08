"use client";

// Confirmação de ações (excluir, remover, arquivar...) com trava anti-clique
// duplo: enquanto a ação roda, os botões ficam desabilitados com spinner e o
// modal não fecha. Substitui o confirm() nativo do navegador.
//
// Uso:
//   const { confirm, dialog } = useConfirmDialog();
//   confirm({ title: "Excluir?", destructive: true, onConfirm: async () => {...} });
//   ... e renderize {dialog} uma vez na árvore do componente.

import { useCallback, useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export interface ConfirmRequest {
  title: string;
  /** Texto simples (vira um <p>). */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão vermelho para ações irreversíveis. */
  destructive?: boolean;
  /** A ação em si. Trate o erro (toast) aqui dentro; o modal fecha ao terminar. */
  onConfirm: () => Promise<unknown> | unknown;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);

  async function run() {
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      setBusy(false);
      setRequest(null);
    }
  }

  const dialog = (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open && !busy) setRequest(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? (
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{request?.cancelLabel ?? "Cancelar"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void run();
            }}
            disabled={busy}
            className={
              request?.destructive
                ? "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
                : undefined
            }
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguarde...
              </>
            ) : (
              request?.confirmLabel ?? "Confirmar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog, busy };
}
