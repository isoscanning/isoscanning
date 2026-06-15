"use client";

import { useEffect, useRef } from "react";
import { onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { useAuth } from "./auth-context";
import { registerPushToken } from "./register-push-token";

export function usePushNotifications() {
  const { userProfile } = useAuth();
  const tokenDone = useRef(false);

  useEffect(() => {
    if (!userProfile) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    let unsubOnMessage: (() => void) | undefined;

    (async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Handler foreground: mostra notificação nativa enquanto o app está aberto
        if (Notification.permission === "granted") {
          unsubOnMessage = onMessage(messaging, (payload) => {
            const { title, body } = payload.notification ?? {};
            const clickUrl = (payload.data?.clickUrl as string) ?? "/dashboard";
            const notif = new Notification(title ?? "ISO Scanning", {
              body: body ?? "",
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = clickUrl;
            };
          });
        }

        // Registro de token automático (só se permissão já foi concedida antes)
        // Se ainda não foi concedida, o usuário deve clicar no card do perfil
        if (!tokenDone.current && Notification.permission === "granted") {
          tokenDone.current = true;
          await registerPushToken();
        }
      } catch (err) {
        console.warn("[FCM] Erro ao configurar push:", err);
      }
    })();

    return () => {
      unsubOnMessage?.();
    };
  }, [userProfile]);
}
