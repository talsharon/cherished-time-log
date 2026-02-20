/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();
cleanupOutdatedCaches();

// Inject Workbox precache manifest
precacheAndRoute(self.__WB_MANIFEST);

// Runtime cache: Supabase API requests
registerRoute(
  ({ url }) =>
    url.origin === "https://zpjltjjqzkqwpufxceqq.supabase.co",
  new NetworkFirst({
    cacheName: "supabase-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// ─── Push notification handler ───────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Time Tracker", body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "Time Tracker";
  const body = data.body ?? "You have a new notification";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: "time-tracker",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        return self.clients.openWindow("/");
      })
  );
});
