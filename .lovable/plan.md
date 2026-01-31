

## Fix Vertical Spacing Issue Between Header and Content

### Problem Identified

The issue stems from two factors:

1. **Default `mt-2` on TabsContent**: The Radix Tabs component has a default `margin-top: 0.5rem` that adds unwanted spacing
2. **Inactive tab taking space**: Both TabsContent elements are in the DOM with `flex-1`, and the inactive one may be affecting layout

### Current Structure
```
Header (fixed height)
├─ Tabs (flex flex-1 flex-col)
│   ├─ TabsContent[clock] (m-0 flex flex-1 flex-col)     ← hidden when on logs
│   ├─ TabsContent[logs] (m-0 flex flex-1 flex-col)      ← active
│   └─ TabsList (bottom bar)
```

Even though `m-0` is set, inactive TabsContent with `flex-1` can still compete for space.

---

### Solution

Force inactive tabs to not participate in flex layout by adding `data-[state=inactive]:hidden`:

### File: `src/pages/Index.tsx`

**Update both TabsContent elements:**

```tsx
// Line 43-44: Add data-[state=inactive]:hidden
<TabsContent value="clock" className="m-0 flex flex-1 flex-col data-[state=inactive]:hidden">
  <ClockTab />
</TabsContent>

// Line 46-47: Add data-[state=inactive]:hidden  
<TabsContent value="logs" className="m-0 flex flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
  <LogsTab />
</TabsContent>
```

---

### Why This Works

Radix UI Tabs use a `data-state` attribute to indicate `active` or `inactive` state:
- `data-[state=inactive]:hidden` applies `display: none` when the tab is not selected
- This removes the inactive tab from the flex layout entirely
- Only the active tab participates in the `flex-1` space distribution

---

### Visual Before/After

**Before:**
```
┌─────────────────────────────┐
│  Header                     │
├─────────────────────────────┤
│  (invisible clock tab)      │  ← Taking flex-1 space!
├─────────────────────────────┤
│  Logs content               │  ← Also flex-1
│                             │
│                             │
├─────────────────────────────┤
│  Bottom Tab Bar             │  ← Pushed out of view
└─────────────────────────────┘
```

**After:**
```
┌─────────────────────────────┐
│  Header                     │
├─────────────────────────────┤
│  Logs content               │  ← Only active tab in layout
│                             │
│                             │
│                             │
├─────────────────────────────┤
│  Bottom Tab Bar             │  ← Visible in viewport
└─────────────────────────────┘
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `data-[state=inactive]:hidden` to both TabsContent elements |

