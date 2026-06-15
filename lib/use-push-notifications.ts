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
    attempted.current = true;

    (async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Pede permissão ao usuário
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Obtém o token FCM do dispositivo
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: "/" }
          ),
        });

        if (!token) return;

        // Evita registrar o mesmo token toda vez
        if (localStorage.getItem(REGISTERED_KEY) === token) return;

        await apiClient.post("/fcm/token", { token });
        localStorage.setItem(REGISTERED_KEY, token);
      } catch (err) {
        // Silencioso — não interrompe a UX se FCM falhar
        console.warn("[FCM] Push setup failed:", err);
      }
    })();
  }, [userProfile]);
}
