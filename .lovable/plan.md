# Chime countdown timer + inline toggle

## Problem
When the interval chime is active there is no visible indication of how long until the next ding — you only hear it when it fires. You also have to open the top-bar popover to toggle it on/off.

## High-level solution
Add a third, smaller countdown timer above the tactical stopwatch in the Clock tab that counts down to the next chime. Next to it is a small button that toggles the chime on/off. When off, the timer shows `0:00` and is grayed out; when on, it counts down live and is tinted with the primary color.

## Rationale
The countdown needs the "next fire" timestamp, which the chime hook currently doesn't track. Unifying the fire logic around a single `nextFireAt` timestamp makes the countdown the single source of truth for *when* the chime plays, eliminating drift between a display timer and a separate fire timer. The inline toggle button gives a one-tap on/off without opening the popover (the popover remains for changing the interval).

## Layout change (Clock tab, top of the stack)

Before:
```text
        [TacticalStopwatch] [↺ reset]
        [      Main Stopwatch      ]
```

After:
```text
        [1:00 chime] [🔔 toggle]      <- new row, above tactical
        [TacticalStopwatch] [↺ reset]
        [      Main Stopwatch      ]
```

- When chime **on**: countdown shows live `M:SS` (or `H:MM:SS` when ≥ 1 h), tinted `text-primary`.
- When chime **off**: countdown shows `0:00`, `text-muted-foreground/40` (grayed), toggle button muted.
- Toggle button: `BellRing` icon when active (`text-primary`), `BellOff` icon when inactive (`text-muted-foreground`). Same `setEnabled` used by the popover switch, so the two stay in sync.

## Technical details (frontend only)

**Modified `src/hooks/useIntervalChime.ts`**
- Add `nextFireAt: number | null` state and a `secondsRemaining: number` value (0 when disabled).
- Replace the current fire-on-`setInterval` logic with a single 1-second ticker driven by `nextFireAt`:
  - When `enabled` turns true (or `intervalMinutes` changes while enabled), set `nextFireAt = Date.now() + intervalMinutes * 60_000`.
  - Each tick: if `Date.now() >= nextFireAt` → `playChime()` and set `nextFireAt = Date.now() + intervalMinutes * 60_000`; otherwise update `secondsRemaining = max(0, round((nextFireAt - now)/1000))`.
  - When `enabled` turns false: clear `nextFireAt`, `secondsRemaining = 0`.
- Keep `localStorage` persistence and `setEnabled`'s audio-unlock-on-enable behavior.
- Expose `secondsRemaining` in the returned object (in addition to existing fields).

**New file `src/components/ChimeCountdown.tsx`**
- Uses `useIntervalChime()` for `enabled`, `secondsRemaining`, `setEnabled`.
- Formats remaining as `M:SS` (< 1 h) or `H:MM:SS` (≥ 1 h); shows `0:00` when disabled.
- Row layout: `[countdown text] [toggle icon button]`, mirroring the tactical stopwatch's row style (mono font, `text-2xl`/`text-3xl`, smaller than tactical).
- Toggle button: `BellRing` (active, `text-primary`) / `BellOff` (inactive, `text-muted-foreground`), `variant="ghost"`, `size="icon"`, `h-9 w-9`.
- Countdown text color: `text-primary` when active, `text-muted-foreground/40` when off.

**Modified `src/components/ClockTab.tsx`**
- Import and render `<ChimeCountdown />` in a new row directly above the existing tactical stopwatch row (the `div` with `flex items-center gap-3 mb-4`).

No new design-system token needed: reuses `text-primary` / `text-muted-foreground` semantic colors and existing button primitives. The countdown formatting is local to the new component.

## After the change
Frontend-only: no `npx cap sync`, no edge-function deploy. Just **hit Publish** to get it on the live web app. (iOS/watch apps are unaffected.)
