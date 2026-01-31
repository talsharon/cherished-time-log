

## Replace Inline Title Input with Modal Dialog

### Overview
Change the Clock page so that creating a new title is done via a modal dialog instead of the inline input field. The dropdown will have "Create new..." as the first option, which opens a dialog with a text input field.

---

### Current State
- Dropdown with "Idle" and other titles
- Separate input field + "Add" button below dropdown for creating new titles

### New Design
- Dropdown with "Create new..." as the first option (with a + icon)
- Clicking "Create new..." opens a modal dialog
- Dialog contains a text input field and Create/Cancel buttons
- After creating, the new title is automatically selected

---

### Changes to `src/components/ClockTab.tsx`

1. **Add dialog state:**
   - `isNewTitleDialogOpen` - controls modal visibility

2. **Update Select onValueChange handler:**
   - Detect when "\_\_create\_new\_\_" is selected
   - Open the dialog instead of setting as selected title
   - Keep previous selection until new title is created

3. **Add "Create new..." option in dropdown:**
   - First item in SelectContent
   - Special value like "\_\_create\_new\_\_" to distinguish from real titles
   - Include a Plus icon for visual clarity

4. **Add Dialog component:**
   - Import Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter from existing UI components
   - Text input for new title name
   - "Cancel" and "Create" buttons
   - On create: call createTitle, set as selectedTitle, close dialog

5. **Remove inline input field:**
   - Delete the flex container with Input and "Add" button (lines 98-114)

---

### UI Flow

```text
User taps dropdown
    |
    v
+------------------------+
| + Create new...        |  <-- First option
| (dot) Idle             |
| (dot) Work             |
| (dot) Exercise         |
+------------------------+
    |
    v (if "Create new..." selected)
+------------------------+
|   Create New Title     |
|                        |
|  [Enter title name]    |
|                        |
|  [Cancel]   [Create]   |
+------------------------+
    |
    v (on Create)
New title selected in dropdown
```

---

### Technical Notes

- Uses existing Dialog component from `@/components/ui/dialog`
- Special value "\_\_create\_new\_\_" ensures it doesn't conflict with real title names
- Plus icon from lucide-react for visual affordance
- Dialog input auto-focuses when opened
- Create button disabled when input is empty

