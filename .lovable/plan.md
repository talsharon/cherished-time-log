

## Align Card Content to Top and Normalize Minimum Heights

### Changes Required

#### 1. Vertical Alignment Fix

Change `justify-center` to `justify-start` in both components to align content to the top of the card.

#### 2. Minimum Height Normalization

Increase the base height from 80px to 96px to ensure logs with comments fit within the minimum height without expanding.

---

### File: `src/components/LogItem.tsx`

**Line 85: Change class to align content to top**
```tsx
// Change from:
className="... flex flex-col justify-center"

// To:
className="... flex flex-col justify-start"
```

**Line 24: Increase base height**
```typescript
// Change from:
const baseHeight = 80;

// To:
const baseHeight = 96;
```

---

### File: `src/components/GapItem.tsx`

**Line 48: Change class to align content to top**
```tsx
// Change from:
className="... flex flex-col justify-center"

// To:
className="... flex flex-col justify-start"
```

**Line 15: Increase base height**
```typescript
// Change from:
const baseHeight = 80;

// To:
const baseHeight = 96;
```

---

### Summary

| File | Line | Change |
|------|------|--------|
| `src/components/LogItem.tsx` | 24 | Change `baseHeight` from 80 to 96 |
| `src/components/LogItem.tsx` | 85 | Change `justify-center` to `justify-start` |
| `src/components/GapItem.tsx` | 15 | Change `baseHeight` from 80 to 96 |
| `src/components/GapItem.tsx` | 48 | Change `justify-center` to `justify-start` |

