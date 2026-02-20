
## Push Notifications for Weekly Insights

### What needs to be built

When the weekly insights are generated (both automatically via cron and manually via the sparkle button), the user receives a push notification: **"Your weekly insights are ready"**.

This requires building a complete Web Push pipeline:

1. **VAPID key pair** — cryptographic keys required by the Web Push protocol for authentication
2. **Push subscription storage** — save each user's browser push subscription in the database
3. **Service worker** — receives and displays push notifications (the PWA already has one via vite-plugin-pwa, but we need to add push event handling)
4. **Frontend subscription flow** — request permission and register the push subscription when the user is authenticated
5. **Backend function** — a new edge function `send-push-notification` that sends push messages using the VAPID keys
6. **Wire it into `generate-insights`** — after saving the weekly insight, call the push function for that user

---

### Architecture Overview

```text
User's browser (PWA)
  └─ Service Worker (push listener)
       └─ Displays notification when push event arrives

Frontend App
  └─ On login: request push permission → subscribe → save to DB

generate-insights edge function (existing)
  └─ After saving insight → calls send-push-notification

send-push-notification edge function (new)
  └─ Loads VAPID keys from secrets
  └─ Fetches user's push subscription from DB
  └─ Sends Web Push message via web-push protocol
```

---

### Step 1: VAPID Keys (Secrets)

VAPID (Voluntary Application Server Identification) keys are needed to authenticate your push server with browser push services. Two secrets will be added:
- `VAPID_PUBLIC_KEY` — shared with the browser
- `VAPID_PRIVATE_KEY` — kept secret on the server

We'll generate them using the standard `web-push` library format and store them as secrets.

---

### Step 2: Database — `push_subscriptions` table

A new table to store each user's push subscription object (which contains the browser's push endpoint URL + encryption keys):

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,  -- the full PushSubscription JSON
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only read/write their own subscription
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()::text);
```

Using `UNIQUE` on `user_id` means one subscription per user (upserted on each login/refresh).

---

### Step 3: New Edge Function — `send-push-notification`

This function:
1. Receives `{ user_id, title, body }` in the request body
2. Loads VAPID keys from environment secrets
3. Fetches the user's push subscription from the `push_subscriptions` table
4. Sends the Web Push message using the Web Push protocol (RFC 8030)

Since Deno doesn't have a native `web-push` library, we'll implement the VAPID signing manually using the Web Crypto API (available in Deno). This avoids adding npm dependencies to the edge function.

The payload sent to the browser will be:
```json
{
  "title": "Time Tracker",
  "body": "Your weekly insights are ready! 📊",
  "icon": "/pwa-192x192.png",
  "badge": "/pwa-192x192.png",
  "tag": "weekly-insights",
  "url": "/"
}
```

---

### Step 4: Wire into `generate-insights`

After the `adminClient.from("weekly_insights").upsert(...)` succeeds inside `processUserInsights`, call the `send-push-notification` function for that user:

```typescript
// After successful insight save
await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseServiceKey}`,
  },
  body: JSON.stringify({
    user_id: userId,
    title: 'Time Tracker',
    body: 'Your weekly insights are ready! 📊',
  }),
});
```

---

### Step 5: Frontend — Subscribe to Push Notifications

A new hook `usePushNotifications` that:
1. After user authentication, checks if push is supported
2. Gets the current `Notification.permission` state
3. On first load (or when permission is `default`), prompts the user to allow notifications
4. If granted, calls `pushManager.subscribe()` with the VAPID public key
5. Saves the subscription to the `push_subscriptions` table via the Supabase client

The hook is called in `src/pages/Index.tsx` (the authenticated main page) so it runs once the user is logged in.

A small UI element: a discreet "Enable notifications" button shown in the header (only if permission is `default` or `denied`), so the user can trigger it manually if they dismiss the auto-prompt.

---

### Step 6: Service Worker — Handle Push Events

The vite-plugin-pwa generates a service worker automatically. We need to add a **custom service worker** that extends the generated one with push event handling.

In `vite.config.ts`, we switch from `generateSW` (auto-generate) to `injectManifest` mode, which lets us write our own `src/sw.ts` that includes both workbox caching and push notification handling:

```typescript
// src/sw.ts
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Time Tracker', {
      body: data.body || 'Your weekly insights are ready!',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      tag: data.tag || 'weekly-insights',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | `push_subscriptions` table with RLS |
| `supabase/functions/send-push-notification/index.ts` | Create | New edge function for Web Push |
| `supabase/functions/generate-insights/index.ts` | Modify | Call push notification after saving insight |
| `src/sw.ts` | Create | Custom service worker with push event handling |
| `vite.config.ts` | Modify | Switch to `injectManifest` mode, add custom SW |
| `src/hooks/usePushNotifications.ts` | Create | Hook to subscribe to push and save to DB |
| `src/pages/Index.tsx` | Modify | Call `usePushNotifications` hook |

---

### Technical Notes

- **VAPID key generation**: The `VAPID_PUBLIC_KEY` must be in uncompressed EC point format (base64url-encoded, 65 bytes). We'll generate a key pair using an online VAPID key generator (the standard approach), then store both keys as secrets.
- **`injectManifest` vs `generateSW`**: Switching modes gives us full control over the service worker while still using Workbox for precaching. The existing caching rules from `vite.config.ts` will be migrated to the custom SW file.
- **Subscription update**: Each time the user loads the app, if they already granted permission, we re-subscribe and upsert. This handles cases where the browser rotates the push subscription.
- **Graceful degradation**: If push is not supported (some browsers, especially iOS Safari before 16.4) or permission is denied, the app continues to work normally — insights still generate, just without the notification.
- **iOS PWA**: Push notifications work on iOS 16.4+ when the app is added to the home screen as a PWA. A banner prompting "Add to Home Screen" is shown to iOS users to improve the experience.
