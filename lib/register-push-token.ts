import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import apiClient from "./api-service";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
export const TOKEN_KEY = "fcm_token_v2";

/** Registra o token FCM para o usuário autenticado. Retorna true em sucesso. */
export async function registerPushToken(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  if (!VAPID_KEY) {
    console.warn("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY não configurada");
    return false;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return false;

  let swReg: ServiceWorkerRegistration;
  try {
    swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/firebase-messaging/",
    });
  } catch {
    swReg = await navigator.serviceWorker.ready;
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });

  if (!token) return false;

  // Evita chamar a API se o token já está registrado
  if (localStorage.getItem(TOKEN_KEY) === token) return true;

  await apiClient.post("/fcm/token", { token });
  localStorage.setItem(TOKEN_KEY, token);
  return true;
}
