"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerPushToken, TOKEN_KEY } from "@/lib/register-push-token";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function NotificationPermissionCard() {
  const [status, setStatus] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PermissionState);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setStatus(result as PermissionState);
      if (result === "granted") {
        // Força novo registro limpando o cache — garante token atualizado
        localStorage.removeItem(TOKEN_KEY);
        await registerPushToken();
      }
    } catch (err) {
      console.warn("[FCM] Erro ao solicitar permissão:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unsupported") return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          status === "granted" ? "bg-green-500/10 text-green-500" :
          status === "denied"  ? "bg-destructive/10 text-destructive" :
                                 "bg-primary/10 text-primary"
        }`}>
          {status === "granted" ? <BellRing className="h-5 w-5" /> :
           status === "denied"  ? <BellOff className="h-5 w-5" /> :
                                  <Bell className="h-5 w-5" />}
        </div>

        <div className="flex-1">
          <p className="font-semibold text-sm">Notificações push</p>

          {status === "granted" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Ativas — você receberá alertas de mensagens, vagas e equipamentos mesmo com o app fechado.
            </p>
          )}

          {status === "default" && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Receba alertas de mensagens, vagas e equipamentos diretamente no celular, mesmo com o app fechado.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={handleEnable}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ativando...</>
                ) : (
                  <><Bell className="mr-2 h-4 w-4" />Ativar notificações</>
                )}
              </Button>
            </>
          )}

          {status === "denied" && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                As notificações estão bloqueadas neste dispositivo. Para ativar:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li><span className="font-medium">Chrome/Android:</span> toque no cadeado na barra de endereço → Permissões → Notificações → Permitir</li>
                <li><span className="font-medium">Safari/iOS:</span> Ajustes → Safari → Notificações → Permitir para este site</li>
              </ul>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => {
                  // Recarrega o estado — o usuário pode ter alterado nas configurações do browser
                  setStatus(Notification.permission as PermissionState);
                }}
              >
                Verificar novamente
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
