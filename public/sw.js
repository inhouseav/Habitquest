// Fuel the Fun — minimal service worker, just enough to receive push
// notifications (no offline caching; this app always talks to the live API).

self.addEventListener("push", (event) => {
  let data = { title: "Fuel the Fun 🌱", body: "" };
  try {
    data = event.data.json();
  } catch (err) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fuel the Fun 🌱", {
      body: data.body || "",
      icon: data.icon || undefined,
      badge: data.badge || undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
