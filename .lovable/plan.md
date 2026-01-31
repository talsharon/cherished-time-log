
## Disable DONE Button While Editing Comment

### Overview

Add focus state tracking for the comment input field. When the input is focused (user is typing), the DONE button will be disabled to prevent accidental taps.

### Technical Approach

1. Add a new state variable `isCommentFocused` to track when the comment input has focus
2. Add `onFocus` and `onBlur` handlers to the comment Input component
3. Include `isCommentFocused` in the disabled condition for the DONE button

---

### File: `src/components/ClockTab.tsx`

**Add new state variable (after line 62):**
```typescript
const [isCommentFocused, setIsCommentFocused] = useState(false);
```

**Update the comment Input (lines 175-180):**
```tsx
<Input
  placeholder="Add a comment..."
  value={currentComment}
  onChange={(e) => updateComment(e.target.value)}
  onFocus={() => setIsCommentFocused(true)}
  onBlur={() => setIsCommentFocused(false)}
  className="h-12"
/>
```

**Update the DONE button disabled condition (line 214):**
```tsx
disabled={isSaving || !startTime || isCommentFocused}
```

---

### Summary

| Change | Location |
|--------|----------|
| Add `isCommentFocused` state | Line 62 |
| Add `onFocus`/`onBlur` handlers to Input | Lines 175-180 |
| Add `isCommentFocused` to disabled condition | Line 214 |
