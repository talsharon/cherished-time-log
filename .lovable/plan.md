

## Fix Fixed Layout with Proper Overflow Control

### Problem Identified

The layout issue is caused by conflicting overflow behaviors:

1. **Global CSS** in `src/index.css` sets `body { overflow: auto }` - this allows the entire page to scroll
2. The `h-screen` container works correctly, but the body's scrollability overrides the intended behavior
3. When any inner content grows, the body scrolls instead of the designated scrollable area

### Root Cause

```css
/* Current in index.css */
body {
  height: 100%;
  overflow: auto;  /* ← This allows page-level scrolling! */
}
```

Combined with the flex layout, this creates a situation where both the body AND the content area can scroll.

---

### Solution

Two changes are needed:

1. **Disable body scrolling** - The app shell should never scroll; only specific content areas should
2. **Ensure root container fills viewport** - Use fixed positioning or proper height constraints

---

### File: `src/index.css`

**Change body overflow from `auto` to `hidden`:**

```css
/* Line 68-72: Change overflow to hidden */
body {
  height: 100%;
  overflow: hidden;  /* Changed from 'auto' */
  -webkit-overflow-scrolling: touch;
}
```

This prevents the body from scrolling while still allowing inner elements with `overflow-auto` to scroll.

---

### File: `src/pages/Index.tsx`

**Add `overflow-hidden` to the main container to reinforce the constraint:**

```tsx
// Line 27: Add overflow-hidden
<div className="flex h-screen flex-col overflow-hidden bg-background safe-area-inset-top safe-area-inset-bottom">
```

This ensures no content can break out of the fixed viewport container.

---

### Visual Layout (After Fix)

```
┌─────────────────────────────────────┐
│  Header (flex-shrink-0)             │  ← Never scrolls, fixed height
├─────────────────────────────────────┤
│                                     │
│  Content Area (flex-1)              │  ← Takes remaining space
│    ClockTab: centered, no scroll    │
│    LogsTab: overflow-auto           │  ← Only this scrolls when needed
│                                     │
├─────────────────────────────────────┤
│  TabsList (flex-shrink-0)           │  ← Never scrolls, fixed height
└─────────────────────────────────────┘
```

---

### Why This Works

- **`overflow: hidden` on body**: Prevents any page-level scrolling
- **`overflow-hidden` on container**: Extra safety to contain all content
- **`h-screen`**: Container is exactly viewport height
- **`flex-1`** on content: Takes remaining space after header/footer
- **`overflow-auto`** in LogsTab: Only the logs list scrolls when content exceeds available space

---

### Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/index.css` | 70 | Change `overflow: auto` to `overflow: hidden` |
| `src/pages/Index.tsx` | 27 | Add `overflow-hidden` to main container class |

