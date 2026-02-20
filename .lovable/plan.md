
## Implementation Plan: Web Push Notifications with Your VAPID Keys

### What I'll do

1. Store your VAPID keys as secure secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
2. Create the `send-push-notification` edge function
3. Update `generate-insights` to call it after saving insights
4. Create a custom service worker (`src/sw.ts`) that handles push events
5. Switch `vite.config.ts` to `injectManifest` mode so our custom SW is used
6. Create the `usePushNotifications` hook that requests permission and saves the subscription
7. Wire the hook into `Index.tsx` with a discreet "Enable notifications" button in the header

---

### Step-by-step breakdown

**Secrets (stored securely in Lovable Cloud):**
- `VAPID_PUBLIC_KEY` = `BApU5xo2mMuYFAqTWGNbE5hHBwCY_ON0V4pujGuWD4FSoNWGa1qjxKqSx3vOAxnbKPzyXsUIVEW4prO_YgMJc_M`
- `VAPID_PRIVATE_KEY` = `IfDUSvZ5d5-ccraLYlrOMttX-r-hofYgzCwjbMXYRHg`
- `VAPID_SUBJECT` = `mailto:talsharonts@gmail.com`

**New edge function — `send-push-notification`:**
- Accepts `{ user_id, title, body }` in the request body (called internally by `generate-insights` using the service role key)
- Fetches the user's push subscription from the `push_subscriptions` table
- Signs the request with the VAPID keys using the Web Crypto API (no external dependencies)
- Sends the encrypted Web Push message to the browser's push endpoint

**Updated `generate-insights`:**
- After the successful `weekly_insights` upsert, calls `send-push-notification` with:
  - `title`: `"Time Tracker"`
  - `body`: `"Your weekly insights are ready! 📊"`

**Custom service worker (`src/sw.ts`):**
- Imports the Workbox precache manifest (`self.__WB_MANIFEST`) — same caching as before
- Adds a `push` event listener that calls `showNotification()` with the payload
- Adds a `notificationclick` listener that opens the app when the user taps the notification

**`vite.config.ts` update:**
- Switches from `generateSW` (default) to `injectManifest` strategy
- Points `srcDir` to `src` and `filename` to `sw.ts` — Workbox injects the precache manifest into our custom SW at build time
- All existing runtime caching rules are moved into `src/sw.ts` using Workbox's `registerRoute`

**New hook — `src/hooks/usePushNotifications.ts`:**
- Checks if `PushManager` is supported in this browser
- If permission is `granted`, re-subscribes and upserts to `push_subscriptions` (handles subscription rotation)
- Exposes `{ permission, subscribe }` so the UI can show an "Enable notifications" button
- The `subscribe()` function calls `pushManager.subscribe()` with the VAPID public key and saves the result to the database

**`Index.tsx` changes:**
- Calls `usePushNotifications()` at the top
- Adds a `Bell` icon button next to the logout button in the header — only shown if `permission !== 'granted'`
- Tapping the bell calls `subscribe()` which triggers the browser's native permission dialog

---

### Technical note on VAPID signing in Deno

Since Deno doesn't have the `web-push` npm package, the `send-push-notification` function implements the VAPID JWT signing using Deno's built-in Web Crypto API:
1. Import the private key as an EC P-256 CryptoKey
2. Build a JWT with `{"typ":"JWT","alg":"ES256"}` header and `{"aud", "exp", "sub"}` claims
3. Sign with `crypto.subtle.sign("ECDSA", key, data)`
4. Encrypt the push payload using the subscription's `p256dh` and `auth` keys (RFC 8291)
5. POST to the push endpoint with the `Authorization: vapid ...` header

This is a self-contained implementation with zero external imports.
