
## Add New Title Input to Clock Page

### Overview
Add a free text input field below the title dropdown on the Clock page, allowing users to create new titles directly while setting up their activity (matching the pattern used in the log edit dialog).

---

### UI Changes

**Add below the title dropdown:**
- Text input field with placeholder "Or add new title..."
- "Add" button next to it
- Same styling pattern as LogItem.tsx

---

### Implementation Details

**File: `src/components/ClockTab.tsx`**

1. **Add new state variable:**
   - `newTitle` - for the new title input text

2. **Import `createTitle` from useTitles hook:**
   - Already using `useTitles`, just need to destructure `createTitle`

3. **Add `handleAddNewTitle` function:**
   - Create the new title using `createTitle()`
   - Set `selectedTitle` to the new title name
   - Clear the `newTitle` input

4. **Add UI elements after the Select dropdown:**
   - Flex container with Input and Button
   - Input: placeholder "Or add new title...", same height as other inputs
   - Button: "Add" text, disabled when input is empty

---

### Technical Notes

- Follows the exact same pattern as LogItem.tsx for consistency
- New title gets a random color automatically (handled by useTitles hook)
- After adding, the new title becomes the selected title
- The new title will immediately appear in the dropdown for future use
