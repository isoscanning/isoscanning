"use client";

import { useEffect, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { useAuth } from "./auth-context";
import apiClient from "./api-service";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
// Chave v2 para limpar tokens antigos em cache que podem estar inválidos
const TOKEN_KEY = "fcm_token_v2";

export function usePushNotifications() {
  const { userProfile } = useAuth();
  const tokenDone = useRef(false);

  useEffect(() => {
    if (!userProfile) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    let unsubOnMessage: (() => void) | undefined;

    (async () => {
      try {
        // 1. Solicita permissão (no-op se o usuário já decidiu)
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("[FCM] Permissão negada pelo usuário");
          return;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.warn("[FCM] Firebase Messaging não suportado neste browser");
          return;
        }

        // 2. Handler de foreground: mostra notificação nativa enquanto o app está aberto
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

        // 3. Registro do token FCM (somente uma vez por sessão)
        if (tokenDone.current || !VAPID_KEY) return;
        tokenDone.current = true;

        // Registra o firebase-messaging-sw.js em scope próprio para evitar
        // conflito com o sw.js gerado pelo next-pwa (que não tem código Firebase).
        // Com scope próprio, pushes são entregues diretamente a esse SW.
        let swReg: ServiceWorkerRegistration;
        try {
          swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
            scope: "/firebase-messaging/",
          });
        } catch {
          // Fallback: usa o SW ativo (dev sem next-pwa)
          swReg = await navigator.serviceWorker.ready;
        }

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token) {
          console.warn("[FCM] Não foi possível obter token FCM");
          return;
        }

        // Evita registrar o mesmo token duas vezes
        if (localStorage.getItem(TOKEN_KEY) === token) return;

        await apiClient.post("/fcm/token", { token });
        localStorage.setItem(TOKEN_KEY, token);
        console.log("[FCM] Push notifications ativadas");
      } catch (err) {
        console.warn("[FCM] Erro ao configurar push:", err);
      }
    })();

    return () => {
      unsubOnMessage?.();
    };
  }, [userProfile]);
}
