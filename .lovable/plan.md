# Desktop Layout: Centered Panel + Larger Clocks

## Problem
On wide desktop screens the activity selector, comment field, and DONE button stretch edge-to-edge across the full viewport width, looking sparse and awkward. The clock fonts also stay at their mobile size (`text-7xl` / `text-4xl`) even when the screen has plenty of room, leaving the main visual element feeling small.

## High-level solution
1. Constrain the main control panel (activity selector + comment + DONE button) to a `max-w-md` (28rem) column and center it.
2. Make the Stopwatch and TacticalStopwatch font sizes responsive — larger breakpoints get bigger fonts.

## Rationale
A centered, width-constrained control column matches the focused, single-purpose nature of this screen (it's a timer — one thing at a time). Responsive font scaling lets the clock own the visual hierarchy on large monitors without breaking the mobile layout. Both changes are pure Tailwind responsive classes — no JS, no new components, no design-system tokens needed.

## Layout — Before / After

### Before (desktop, ~1280px wide)
```text
┌──────────────────────────────────────────────────────┐
│                                            [✨]       │
│             [tactical stopwatch]   [↺]               │
│                                                      │
│              00:12:34   (text-7xl)                   │
│                                                      │
│  What are you up to?                                 │
│  ┌──────────────────────────────────────────────┐   │
│  │ Select activity                               │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Add a comment...                              │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │                    DONE                      │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
   ↑ full width, stretched across viewport
```

### After (desktop, ~1280px wide)
```text
┌──────────────────────────────────────────────────────┐
│                                            [✨]       │
│             [tactical stopwatch]   [↺]               │
│                                                      │
│           00:12:34   (text-9xl on lg)                │
│                                                      │
│              What are you up to?                      │
│         ┌──────────────────────────┐                 │
│         │ Select activity           │                 │
│         └──────────────────────────┘                 │
│         ┌──────────────────────────┐                 │
│         │ Add a comment...         │                 │
│         └──────────────────────────┘                 │
│         ┌──────────────────────────┐                 │
│         │         DONE             │                 │
│         └──────────────────────────┘                 │
│                  ↑ max-w-md, centered                │
└──────────────────────────────────────────────────────┘
```

Mobile stays identical — `max-w-md` and responsive font classes don't apply below `md`/`lg`.

## Files to Modify

### 1. `src/components/ClockTab.tsx` (frontend)

**Constrain the control panel width.**

The activity-selector block (currently `w-full space-y-4 mb-8`) → `w-full max-w-md space-y-4 mb-8 mx-auto`.

The DONE-button block (currently `w-full`) → `w-full max-w-md mx-auto`.

(Both are already inside a `flex flex-col items-center` parent, so `mx-auto` plus `max-w-md` centers them.)

### 2. `src/components/Stopwatch.tsx` (frontend)

**Responsive main clock font.**

Current:
```tsx
<div className="font-mono text-7xl font-light tracking-tight text-foreground tabular-nums">
```

New:
```tsx
<div className="font-mono text-7xl md:text-8xl lg:text-9xl font-light tracking-tight text-foreground tabular-nums">
```

### 3. `src/components/TacticalStopwatch.tsx` (frontend)

**Responsive tactical clock font.**

Current:
```tsx
<div className="font-mono text-4xl font-light tracking-tight text-muted-foreground tabular-nums">
```

New:
```tsx
<div className="font-mono text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-muted-foreground tabular-nums">
```

## Post-change local steps
- Frontend-only change — no migration, no edge function deploy, no `npx cap sync`.
- The preview will hot-reload automatically. **Hit Publish** to push the layout change to your live site.
