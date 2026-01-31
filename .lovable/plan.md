

## Fix Header and Bottom Tab Bar to Stay Visible During Scroll

### Overview
Make the header and bottom navigation bar always visible while scrolling the logs list. Currently, on longer lists the entire page can scroll, pushing the navigation bars out of view.

---

### Solution

The fix involves changing the layout from `min-h-screen` (grows with content) to `h-screen` (fixed viewport height), ensuring the middle content area is the only scrollable region.

---

### File: `src/pages/Index.tsx`

**Change the main container height constraint:**

| Before | After |
|--------|-------|
| `min-h-screen` | `h-screen` |

This single change constrains the entire layout to the viewport height. Combined with the existing flexbox structure (`flex flex-col` + `flex-1` on tabs), the middle content becomes the only scrollable area.

```tsx
// Line 27: Change this
<div className="flex min-h-screen flex-col bg-background safe-area-inset-top safe-area-inset-bottom">

// To this
<div className="flex h-screen flex-col bg-background safe-area-inset-top safe-area-inset-bottom">
```

---

### Why This Works

The current layout structure is already correct:

```text
┌─────────────────────────────────────┐
│  Header (fixed height)              │  <- border-b, px-4 py-3
├─────────────────────────────────────┤
│                                     │
│  Tabs Content (flex-1 + overflow)   │  <- Takes remaining space
│  └─ LogsTab (overflow-auto)         │  <- Scrolls internally
│                                     │
├─────────────────────────────────────┤
│  TabsList (fixed height)            │  <- border-t, py-3
└─────────────────────────────────────┘
```

With `min-h-screen`: Container can grow beyond viewport, pushing bottom bar down
With `h-screen`: Container is exactly viewport height, content scrolls within

---

### Existing Classes That Make This Work

- **Header**: No `flex-1`, so it stays at its natural height
- **Tabs container**: `flex flex-1 flex-col` - takes remaining space
- **TabsContent for logs**: `flex flex-1 flex-col overflow-hidden` - constrains content
- **LogsTab wrapper**: `flex-1 overflow-auto` - enables scrolling
- **TabsList**: No `flex-1`, so it stays at its natural height at the bottom

---

### Technical Notes

- `h-screen` is equivalent to `height: 100vh`
- On mobile, this works with the safe area insets already in place
- The `overflow-hidden` on TabsContent prevents content from breaking out
- The `overflow-auto` on LogsTab enables the scrollbar only when needed

