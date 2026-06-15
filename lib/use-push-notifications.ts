"use client";

import { useEffect, useRef } from "react";
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { useAuth } from "./auth-context";
import apiClient from "./api-service";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const REGISTERED_KEY = "fcm_token_registered";

export function usePushNotifications() {
  const { userProfile } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!userProfile || attempted.current) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    attempted.current = true;

    (async () => {
      try {
        // 1. Pede permissão primeiro — independente do Firebase
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("[FCM] Permissão de notificação negada");
          return;
        }

        // 2. Verifica se Firebase Messaging é suportado
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.warn("[FCM] Firebase Messaging não suportado neste browser");
          return;
        }

        if (!VAPID_KEY) {
          console.warn("[FCM] VAPID key não configurada (NEXT_PUBLIC_FIREBASE_VAPID_KEY)");
          return;
        }

        // 3. Obtém o SW ativo (next-pwa em prod, firebase-messaging-sw.js em dev)
        let swReg: ServiceWorkerRegistration;
        try {
          // Em produção o next-pwa registra sw.js — usamos ele
          swReg = await navigator.serviceWorker.ready;
        } catch {
          swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        }

        // 4. Obtém o token FCM
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token) {
          console.warn("[FCM] Não foi possível obter o token FCM");
          return;
        }

        // 5. Evita registrar o mesmo token duas vezes
        if (localStorage.getItem(REGISTERED_KEY) === token) return;

        await apiClient.post("/fcm/token", { token });
        localStorage.setItem(REGISTERED_KEY, token);
        console.log("[FCM] Push notifications ativadas com sucesso");
      } catch (err) {
        console.warn("[FCM] Erro ao configurar push:", err);
      }
    })();
  }, [userProfile]);
}
