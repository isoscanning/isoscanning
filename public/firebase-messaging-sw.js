importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ⚠️  Substitua pelos valores do seu projeto Firebase Console
// (Project Settings → General → Your apps → SDK setup and configuration)
firebase.initializeApp({
  apiKey:            "AIzaSyAmB_IrxP1IIOJ0meQXQURZSX0q946I6LM",
  authDomain:        "isoscanner-a9cc7.firebaseapp.com",
  projectId:         "isoscanner-a9cc7",
  storageBucket:     "isoscanner-a9cc7.firebasestorage.app",
  messagingSenderId: "14549206083",
  appId:             "1:14549206083:web:62abe30fe35e84bea740f6",
});

const messaging = firebase.messaging();

// Notificações quando o app está em background / fechado
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const clickUrl = payload.data?.clickUrl ?? "/dashboard";

  self.registration.showNotification(title ?? "ISO Scanning", {
    body: body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { clickUrl },
    requireInteraction: false,
  });
});

// Ao clicar na notificação, abre/foca a URL correta
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.clickUrl ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
