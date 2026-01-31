

## Make Log Card Heights Proportional to Time Spent

### Overview

Cards in the logs list will have heights that visually represent time spent, making it easy to see at a glance which activities took longer.

### Height Calculation Rules

| Duration | Rounded To | Height Multiplier |
|----------|------------|-------------------|
| 0-44 min | 30 min | 1x (minimum) |
| 45-74 min | 1h | 2x |
| 75-104 min | 1.5h | 3x |
| 105-134 min | 2h | 4x |
| 135-164 min | 2.5h | 5x |
| 165+ min | 3h | 6x (maximum) |

### Technical Approach

Create a utility function to calculate card height based on duration:

```typescript
function getCardMinHeight(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  
  // Round to nearest 30 minutes
  const roundedHalfHours = Math.round(durationMinutes / 30);
  
  // Clamp between 1 (30 min) and 6 (3 hours)
  const clampedHalfHours = Math.max(1, Math.min(6, roundedHalfHours));
  
  // Base height for 30 minutes = 80px (roughly current card size)
  const baseHeight = 80;
  
  return baseHeight * clampedHalfHours;
}
```

---

### File Changes

#### 1. `src/components/LogItem.tsx`

**Add height calculation function:**
```typescript
function getCardMinHeight(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  const roundedHalfHours = Math.round(durationMinutes / 30);
  const clampedHalfHours = Math.max(1, Math.min(6, roundedHalfHours));
  const baseHeight = 80;
  return baseHeight * clampedHalfHours;
}
```

**Apply dynamic height to card button:**
```tsx
<button
  onClick={() => onEdit(log)}
  className="w-full rounded-xl bg-secondary/50 p-4 text-left transition-colors active:bg-secondary flex flex-col justify-center"
  style={{ minHeight: getCardMinHeight(log.duration) }}
>
```

#### 2. `src/components/GapItem.tsx`

**Add the same height calculation function:**
```typescript
function getCardMinHeight(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  const roundedHalfHours = Math.round(durationMinutes / 30);
  const clampedHalfHours = Math.max(1, Math.min(6, roundedHalfHours));
  const baseHeight = 80;
  return baseHeight * clampedHalfHours;
}
```

**Apply dynamic height to gap card:**
```tsx
<button
  onClick={onClick}
  className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-secondary/30 p-4 text-left transition-colors active:bg-secondary/50 flex flex-col justify-center"
  style={{ minHeight: getCardMinHeight(gap.duration) }}
>
```

---

### Visual Result

```
┌─────────────────────────────────────┐
│  ● Meeting (2h)                     │
│    Team standup                     │  ← Tall card (4x height)
│    09:00 - 11:00                    │
│                             2h 0m   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ● Email (25min)            25m     │  ← Short card (1x height)
│    08:35 - 09:00                    │
└─────────────────────────────────────┘
```

---

### Summary

| File | Changes |
|------|---------|
| `src/components/LogItem.tsx` | Add `getCardMinHeight()` function, apply dynamic `minHeight` style |
| `src/components/GapItem.tsx` | Add `getCardMinHeight()` function, apply dynamic `minHeight` style |

