

## Add Activity Selector to Clock Page

### Overview
Add a "What are you up to?" section on the Clock page with a dropdown for selecting titles and a free text input for comments. Users can set these before tapping "Done", and "Idle" will be selected by default.

---

### UI Changes

**New Section Layout (between stopwatch and Done button):**
1. Label: "What are you up to?"
2. Dropdown selector with all available titles (default: "Idle")
3. Text input field for optional comment/notes

---

### Implementation Details

**File: `src/components/ClockTab.tsx`**

1. **Add new state variables:**
   - `selectedTitle` - defaults to "Idle"
   - `comment` - free text input, defaults to empty string

2. **Import required components:**
   - `useTitles` hook for accessing titles list
   - `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from UI components
   - `Input` or `Textarea` for comment field
   - `Label` for the question text

3. **Add UI section between stopwatch and button:**
   - "What are you up to?" label styled as a heading
   - Title dropdown showing colored dots next to each title name (matching LogItem pattern)
   - Text input for comment below the dropdown

4. **Update `handleDone` function:**
   - Pass `selectedTitle` instead of hardcoded 'Idle'
   - Pass `comment` to the log creation
   - Reset `selectedTitle` back to "Idle" and `comment` to empty after logging

---

### Technical Notes

- Uses existing `useTitles` hook to fetch available titles
- Follows same Select component pattern as LogItem for consistency
- Title dropdown shows colored indicator dot for each title
- Comment field is optional (can be left empty)
- After logging, both fields reset to defaults for the next activity

