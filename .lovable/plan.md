

## Update Done Button Style

### Change
Modify the "Done" button in the Clock tab from a circular button (80x80px) to a rounded rectangle that spans almost the full width of the screen.

---

### Current State
The button is currently a 80x80px circle with rounded-full styling:
```tsx
className="h-20 w-20 rounded-full ..."
```

### Updated Design
- Full-width rounded rectangle with horizontal padding (to leave small margins on sides)
- Maintain the same height for easy tapping
- Keep the check icon and loading state
- Preserve the shadow and active scale effect

### File to Update
**src/components/ClockTab.tsx** - Change button className from `h-20 w-20 rounded-full` to `w-full h-16 rounded-xl` and wrap in a container with horizontal padding.

