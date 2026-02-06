
## Increase Tactical Stopwatch and Reset Button Size

### Current Sizing

- **TacticalStopwatch text**: `text-2xl` (approximately 24px)
- **Reset button**: `h-8 w-8` (32x32 pixels) with `h-4 w-4` icon (16x16 pixels)

### Proposed Changes

#### 1. Increase TacticalStopwatch Font Size

Change the text size from `text-2xl` to `text-4xl` in `src/components/TacticalStopwatch.tsx`:
- Current: `className="font-mono text-2xl font-light..."`
- Updated: `className="font-mono text-4xl font-light..."`

This will increase the tactical stopwatch display to approximately 36px, making it more prominent and easier to read.

#### 2. Increase Reset Button Size

Update the button dimensions and icon size in `src/components/ClockTab.tsx` (lines 215-223):
- Button size: Change from `h-8 w-8` to `h-10 w-10` (40x40 pixels)
- Icon size: Change from `h-4 w-4` to `h-5 w-5` (20x20 pixels)

This makes the button more touch-friendly and visually balanced with the larger text.

#### 3. Adjust Container Spacing (Optional)

The gap between the stopwatch and button is already `gap-3`, which should work fine with the larger sizes. The `mb-4` bottom margin can remain as is.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/TacticalStopwatch.tsx` | Change `text-2xl` to `text-4xl` |
| `src/components/ClockTab.tsx` | Change button from `h-8 w-8` to `h-10 w-10` and icon from `h-4 w-4` to `h-5 w-5` |

### Visual Impact

```text
Before:
┌──────────────────────────┐
│  00:05:23  [⟲]          │  ← Smaller, less prominent
└──────────────────────────┘

After:
┌──────────────────────────┐
│   00:05:23   [⟲]        │  ← Larger, more prominent
└──────────────────────────┘
```
