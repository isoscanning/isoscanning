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
    vibrate: [200, 100, 200],
  });
});

// Ao clicar na notificação, navega para a URL correta
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.clickUrl ?? "/dashboard";
  const url = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.focus();
          if ("navigate" in client) return client.navigate(url);
        }
        return clients.openWindow(url);
      })
  );
});
