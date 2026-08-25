# Interval Chime (per-device)

## Problem
There is no way to get a periodic audible nudge while the clock is running. Nothing in the app plays sound today, and the only bell in the top bar is the push-notification prompt.

## High-level solution
A **frontend-only** feature: a bell button in the top bar opens a small settings popover with an interval stepper (1–120 minutes, default 1) and an on/off switch. While active, the app plays a soft two-tone chime every X minutes. Settings persist in `localStorage`, so each device configures its own and nothing syncs to the backend.

## Rationale
The request is explicitly per-device and non-synced, so `localStorage` + a single timer hook is the smallest correct implementation. Building it as a reusable hook + component (rather than inline in the header) keeps the header clean and lets the chime be reused elsewhere later.

## Layout change (top bar)

Before:
```text
┌──────────────────────────────────────────────┐
│ Time Tracker              [🔔 push] [⎋ out]  │
└──────────────────────────────────────────────┘
```

After:
```text
┌──────────────────────────────────────────────┐
│ Time Tracker      [🔔 chime] [🔔 push] [⎋]   │
└──────────────────────────────────────────────┘
                        │
                        ▼ popover
            ┌───────────────────────────┐
            │ Interval chime            │
            │ Active            [ ⬤—— ] │
            │ Every   [ − ] 1 [ + ] min │
            │        [ Test sound ]     │
            └───────────────────────────┘
```
The chime bell is tinted with the primary color when active and muted when off, so its state is readable without opening the popover (it also uses the `BellRing` icon to stay visually distinct from the existing push bell).

## Sound choice
The chime is synthesized in the browser with the Web Audio API: two short sine tones (roughly A5 → E6) with a soft attack and a ~1s exponential decay — an Apple-notification-like "ding-dong" that is gentle but noticeable. No audio file to download, no extra asset, and volume/timbre stay tweakable from one constant block. If you'd rather have a real recorded sound file instead, say so and I'll swap in an mp3 asset.

Note on mobile browsers: audio can only start after a user gesture. Turning the switch on plays a confirmation chime, which unlocks audio for the rest of the session. If the tab is fully suspended by iOS, chimes resume when the app is in the foreground again.

## Technical details (frontend only)

**New file `src/hooks/useIntervalChime.ts`**
- State persisted to `localStorage` under one key (`timetracker.chime`): `{ enabled: boolean, intervalMinutes: number }`, with defaults `false` / `1` and clamping to 1–120.
- Lazily creates a single shared `AudioContext`, resumes it on enable, and exposes `playChime()`.
- `setInterval` of `intervalMinutes * 60_000` while enabled; cleared/recreated when the interval or enabled flag changes; cleaned up on unmount.
- Returns `{ enabled, setEnabled, intervalMinutes, setIntervalMinutes, playChime }`.

**New file `src/lib/chime.ts`** — design-system-style constants and the Web Audio playback function (tone frequencies, gain, decay), so the sound is defined in one place and reusable.

**New file `src/components/ChimeSettingsButton.tsx`** — the top-bar `Button` + `Popover` containing a `Switch` (active) and a stepper row (`−` / value / `+` buttons around a numeric `Input`, clamped 1–120) plus a "Test sound" button. Uses existing shadcn `popover`, `switch`, `input`, `button` primitives.

**Modified `src/pages/Index.tsx`** — render `<ChimeSettingsButton />` as the first item in the header's right-hand button group.

Why no new design-system token: the popover, switch, input and button primitives already exist in `src/components/ui`, and the button reuses existing semantic colors (`text-primary` / `text-muted-foreground`). The genuinely reusable pieces — the chime sound and the settings state — are extracted into `src/lib/chime.ts` and `src/hooks/useIntervalChime.ts` rather than inlined.

## After the change
Frontend-only: no `npx cap sync` and no edge-function deploy needed. Just **hit Publish** to get it on the live web app. (The iOS/watch apps are unaffected.)
