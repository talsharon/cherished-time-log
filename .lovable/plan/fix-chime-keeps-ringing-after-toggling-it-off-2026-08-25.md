# Fix: chime keeps ringing after toggling it off

## Problem
The bell button next to the new countdown turns the timer gray and resets it to `0:00`, but the ding keeps playing.

Verified cause: `useIntervalChime()` is called independently in two components — `ChimeCountdown` (the countdown + toggle) and `ChimeSettingsButton` (the bell in the top bar). Each call creates its **own** React state and its **own** 1-second ticker. Turning the chime off in the countdown only disarms that component's ticker; the settings-button instance never learns about the change and keeps firing `playChime()` forever. The same bug makes the two UI elements disagree (top bar bell stays "active" colored).

## High-level solution
Turn the chime into a single shared state for the whole app, so every component reads and writes the exact same on/off value, interval, and countdown — and only **one** ticker exists.

## Rationale
This is a state-ownership bug, not a timer bug. Adding guards inside the ticker would paper over it and still leave two tickers and two out-of-sync UIs. A single shared source of truth fixes the toggle, the double-ding, and the visual mismatch in one change, and keeps the feature frontend-only and per-device as designed.

## Change location
Frontend only. No backend, database, or edge-function changes.

## Technical details
**`src/hooks/useIntervalChime.ts`** — convert from per-component state to a module-level singleton store:
- Hold `settings` and `secondsRemaining` in module scope with a simple subscriber set.
- Run the arm/disarm logic and the single 1-second `setInterval` at module level (started/stopped as subscribers appear and settings change), not inside each component's effect.
- `useIntervalChime()` becomes a thin subscriber via `useSyncExternalStore`, returning the same public API (`enabled`, `intervalMinutes`, `secondsRemaining`, `setEnabled`, `setIntervalMinutes`, `playChime`) so no call sites change.
- Keep the existing localStorage persistence and the `unlockAudio()` on enable (only on explicit user enable, so no extra confirmation ding when state syncs across components).

**`src/components/ChimeCountdown.tsx`** and **`src/components/ChimeSettingsButton.tsx`** — unchanged; they inherit the shared state automatically.

Design-system note: nothing new to extract here — this is internal state plumbing behind an existing hook, and both UI pieces already use shared `Button`/`Switch`/`Popover` primitives.

## After approval
Frontend-only change, so no `npx cap sync` and no function redeploy needed. Once it's in, hit **Publish** to push it live, then hard-refresh the PWA on your phone (close and reopen it) so the new bundle loads.
