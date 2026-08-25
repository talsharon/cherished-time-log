# TV shows an old version of the app

## Problem
The TV browser keeps rendering an older build even after refreshes, and the top-bar bell (chime settings) is missing there. The bell button was added in a recent change, so the TV is running code from before that change.

Two things can cause this, and they stack:

1. **Publish state** — frontend changes only reach the live `.lovable.app` URL after hitting Publish. If the last Publish predates the bell/layout work, the TV is correctly serving old code.
2. **Service worker precache (frontend)** — the app is a PWA (`vite-plugin-pwa`, `injectManifest`, `src/sw.ts`). `precacheAndRoute(self.__WB_MANIFEST)` precaches `index.html`, so navigations are served from cache first. A returning device can keep showing the previous HTML/JS until the new worker installs and the tab is fully closed and reopened — a plain refresh often is not enough.

## High-level solution
1. First confirm the publish state — no code change helps if the new build was never deployed.
2. If it is published and the TV is still stale, fix the stale-HTML behavior: stop serving navigations from precache and serve them `NetworkFirst`, so a refresh always picks up new HTML while assets stay cached.

## Rationale
Cache-first HTML is the standard cause of "refresh does not update" on installed/returning PWA clients. Switching navigations to network-first with a cache fallback keeps offline behavior but guarantees a refreshed device gets the latest build. This is the smallest change that removes the stale-HTML class of bug rather than patching one symptom.

## What will be implemented if approved
Default: the **service worker fix** (frontend, `src/sw.ts`), plus the publish check.

Changes in `src/sw.ts`:
- Keep `precacheAndRoute(self.__WB_MANIFEST)` for hashed assets.
- Add an explicit `NetworkFirst` route for navigation requests (`request.mode === "navigate"`), with a short network timeout and a cached fallback, so HTML never comes from cache first.
- Keep `clientsClaim()`, `skipWaiting()`, `cleanupOutdatedCaches()` and the push/notificationclick handlers untouched.

No changes to the manifest, icons, push notifications, or any UI component.

## Note on the missing bell
There are two bells in the header:
- **Chime settings bell** (`ChimeSettingsButton`) — always rendered. Absent on TV = stale build.
- **Push-notification bell** — rendered only when the browser supports push and permission is not granted. Most TV browsers do not support Web Push, so that one is expected to be missing on a TV even on the newest build.

## After the change (local/user steps)
1. Hit **Publish** — service worker changes only take effect on the live URL.
2. On the TV: refresh once (installs the new worker), then close the browser tab/app completely and reopen it. From then on, a single refresh is enough.
