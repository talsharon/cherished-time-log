

## Fix Time Input Field Styling in Edit Dialog

### Issues Identified
1. **Height mismatch**: Time inputs use `h-12` while the "add new title" input uses `h-10`
2. **Inconsistent spacing**: The gap between time inputs and the "to" label is too tight
3. **Alignment**: The flex container needs better centering

---

### Changes

**File: `src/components/LogItem.tsx`**

Update the time input section (lines 223-253) with improved styling:

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Time</label>
  <div className="flex items-center gap-3">
    <Input
      type="time"
      value={editStartTime}
      onChange={(e) => {
        setEditStartTime(e.target.value);
        setTimeError(null);
      }}
      className="flex-1"
    />
    <span className="text-sm text-muted-foreground">to</span>
    <Input
      type="time"
      value={editEndTime}
      onChange={(e) => {
        setEditEndTime(e.target.value);
        setTimeError(null);
      }}
      className="flex-1"
    />
  </div>
  {timeError && (
    <p className="text-sm text-destructive">{timeError}</p>
  )}
</div>
```

---

### Styling Improvements

| Issue | Before | After |
|-------|--------|-------|
| Input height | `h-12` (48px, too tall) | Default height (matches other inputs) |
| Container gap | `gap-2` (8px) | `gap-3` (12px) for better spacing |
| Wrapper divs | Unnecessary `flex-1` wrappers | Direct `flex-1` on inputs |
| "to" label | Regular size | `text-sm` for better proportion |

---

### Visual Result

The time inputs will now:
- Match the default input height used elsewhere in the app
- Have proper spacing between inputs and the "to" separator
- Align cleanly with other form elements in the dialog

