# Prevent Clock Content From Overlapping App Bars

## Problem
The clock screen currently enlarges both timers based on screen **width** and vertically centers the entire stack. On a wide TV with a shorter effective browser height or display scaling, that stack can exceed the space between the 61px header and 65px bottom tab bar, allowing the DONE area to collide with the bottom navigation.

The current 2657×1262 preview fits, so the change must remain adaptive for TV/browser configurations with less usable height rather than applying a blanket size reduction.

## High-level solution
Make the clock screen fit the available content area between the fixed bars:
1. Size all three timers responsively from available **height**, with upper and lower limits.
2. Tighten vertical gaps only on short-height screens.
3. Keep the content centered when it fits, but allow the clock area itself to scroll when it cannot, so neither the header nor bottom bar is covered.

This is a **frontend-only** change.

## Rationale
Width breakpoints alone are a poor fit for TVs because a very wide viewport can still have limited vertical room. Height-aware `clamp()` sizing preserves the large-screen hierarchy while shrinking only as needed. A contained scroll fallback guarantees access to every control even under browser zoom, unusual aspect ratios, or OS display scaling.

## Layout change

### Before
```text
┌────────────────────────────────────────┐
│ TOP BAR                                │
├────────────────────────────────────────┤
│                                        │
│          chime countdown               │
│          tactical timer                │
│          VERY LARGE MAIN TIMER         │
│          task selector                 │
│          comment                       │
│          DONE                          │  ← can extend into bar
├────────────────────────────────────────┤
│ BOTTOM TAB BAR                         │
└────────────────────────────────────────┘
```

### After
```text
┌────────────────────────────────────────┐
│ TOP BAR                                │
├────────────────────────────────────────┤
│  safe padding                          │
│          chime countdown               │
│          tactical timer                │
│          HEIGHT-AWARE MAIN TIMER        │
│          task selector                 │
│          comment                       │
│          DONE                          │
│  safe padding / scroll only if needed  │
├────────────────────────────────────────┤
│ BOTTOM TAB BAR                         │
└────────────────────────────────────────┘
```

## Implementation details

### `src/index.css` — frontend design system
Add reusable timer typography utilities for the primary, secondary, and countdown displays. Their sizes will use height-aware CSS `clamp()` values, with sensible minimums and desktop maximums, instead of width-only `md`/`lg` jumps.

This belongs in the design system because timer sizing is shared by three components and should follow one consistent hierarchy. No new color tokens are needed because existing semantic foreground tokens remain unchanged.

### `src/components/ClockTab.tsx` — frontend layout
- Make the tab body `min-h-0 flex-1 overflow-y-auto` so it is strictly contained between the header and bottom tabs.
- Add an inner `min-h-full` centered layout with safe top/bottom padding.
- Use height-responsive spacing for the countdown, tactical timer, main timer, selector, and DONE button.
- Preserve the centered `max-w-md` control column.

### `src/components/Stopwatch.tsx` — frontend typography
Replace the width-only `text-7xl md:text-8xl lg:text-9xl` sizing with the shared height-aware primary timer class.

### `src/components/TacticalStopwatch.tsx` — frontend typography
Replace the width-only responsive sizing with the shared secondary timer class.

### `src/components/ChimeCountdown.tsx` — frontend typography
Apply the shared countdown timer class so the third timer scales consistently on short displays.

## Verification
- Check the authenticated Clock tab at the current TV viewport (2657×1262).
- Check wide, short TV-like viewports to confirm the timers shrink before controls collide.
- Confirm the DONE button remains fully above the bottom bar and all controls remain reachable by scrolling at extreme heights.
- Recheck mobile to ensure touch sizing, safe areas, and the existing layout remain intact.

## Post-change local steps
- Frontend web change only: no database migration, edge-function deployment, or `npx cap sync` is needed.
- The preview will update automatically.
- **Hit Publish** after verification to apply the fix to the live web app shown on the TV.
