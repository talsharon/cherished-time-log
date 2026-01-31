

## Match Clock Page Input Styles to Logs Page Edit Dialog

### Overview
Update the dropdown and comment input field on the Clock page to use the same styling as the edit dialog on the Logs page, removing the semi-transparent secondary background.

---

### Current vs Target Styling

| Element | Clock Page (Current) | Logs Page Edit Dialog (Target) |
|---------|---------------------|--------------------------------|
| SelectTrigger | `h-12 bg-secondary/50` | `h-12` |
| Comment Input | `h-12 bg-secondary/50` | Default (no extra bg) |

The edit dialog uses the default `bg-background` (from base Input/Select components), while Clock page uses `bg-secondary/50`.

---

### Changes to `src/components/ClockTab.tsx`

1. **Line 129 - SelectTrigger:**
   - Change: `className="h-12 bg-secondary/50"`
   - To: `className="h-12"`

2. **Line 167 - Comment Input:**
   - Change: `className="h-12 bg-secondary/50"`
   - To: `className="h-12"`

---

### Result
Both the activity dropdown and comment input will have the same appearance as the form fields in the edit dialog on the Logs page - using the standard background color instead of the semi-transparent secondary background.

