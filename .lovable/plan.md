

## Edit Current Start Time (Time Only)

### Overview

Allow users to tap on the "Started [time]" text in the Stopwatch to open a dialog where they can edit the session's start time. Only the time component is editable - the date remains unchanged.

### User Flow

```text
User sees: "Started 2:30:45 PM"
     |
     | (taps)
     v
+------------------------+
|  Edit Start Time       |
|                        |
|  Time: [14:30]         |
|                        |
|  [Cancel]    [Save]    |
+------------------------+
     |
     | (saves)
     v
Stopwatch updates with new elapsed time
```

---

### Technical Approach

#### 1. Add `updateStartTime` to `useActiveSession` hook

Create a new function that updates the `current_start_time` in the database and local state.

#### 2. Make "Started" text tappable in Stopwatch

Add an `onStartTimeClick` callback prop to `Stopwatch` component and style the text as interactive.

#### 3. Add Start Time Edit Dialog in ClockTab

Create a simple dialog with just a time input. Preserve the original date and only update the hours/minutes.

---

### File Changes

#### `src/hooks/useActiveSession.ts`

Add new `updateStartTime` function:

```typescript
const updateStartTime = useCallback(async (newStartTime: Date) => {
  setStartTime(newStartTime);
  if (!user) return;

  await supabase
    .from('active_sessions')
    .update({ current_start_time: newStartTime.toISOString() })
    .eq('user_id', user.id);
}, [user]);
```

Export it in the return object.

---

#### `src/components/Stopwatch.tsx`

Update props interface:

```typescript
interface StopwatchProps {
  startTime: Date | null;
  onStartTimeClick?: () => void;
}
```

Make the "Started" text tappable:

```tsx
{startTime ? (
  <button
    type="button"
    onClick={onStartTimeClick}
    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
  >
    Started {startTime.toLocaleTimeString()}
  </button>
) : (
  <span className="text-sm text-muted-foreground">Not running</span>
)}
```

---

#### `src/components/ClockTab.tsx`

**Add new state:**
```typescript
const [isStartTimeDialogOpen, setIsStartTimeDialogOpen] = useState(false);
const [editingStartTimeStr, setEditingStartTimeStr] = useState('');
```

**Add `updateStartTime` to hook destructuring:**
```typescript
const { 
  startTime, 
  currentTitle, 
  currentComment, 
  loading: sessionLoading, 
  resetSession,
  updateTitle,
  updateComment,
  updateStartTime  // <-- add this
} = useActiveSession();
```

**Add handler functions:**

```typescript
const handleStartTimeClick = () => {
  if (!startTime) return;
  setEditingStartTimeStr(
    `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
  );
  setIsStartTimeDialogOpen(true);
};

const handleSaveStartTime = async () => {
  if (!startTime || !editingStartTimeStr) return;
  
  const [hours, minutes] = editingStartTimeStr.split(':').map(Number);
  const newStartTime = new Date(startTime); // Keep original date
  newStartTime.setHours(hours, minutes, 0, 0);
  
  // Validate: start time cannot be in the future
  if (newStartTime > new Date()) {
    toast.error('Start time cannot be in the future');
    return;
  }
  
  await updateStartTime(newStartTime);
  setIsStartTimeDialogOpen(false);
  toast.success('Start time updated');
};
```

**Update Stopwatch usage:**

```tsx
<Stopwatch 
  startTime={startTime} 
  onStartTimeClick={handleStartTimeClick}
/>
```

**Add new dialog (after the Create New Title dialog):**

```tsx
<Dialog open={isStartTimeDialogOpen} onOpenChange={setIsStartTimeDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Start Time</DialogTitle>
    </DialogHeader>
    <div className="space-y-2">
      <Label>Time</Label>
      <Input
        type="time"
        value={editingStartTimeStr}
        onChange={(e) => setEditingStartTimeStr(e.target.value)}
        className="h-12"
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsStartTimeDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSaveStartTime} disabled={!editingStartTimeStr}>
        Save
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Summary

| File | Changes |
|------|---------|
| `src/hooks/useActiveSession.ts` | Add `updateStartTime` function to update start time in DB and state |
| `src/components/Stopwatch.tsx` | Add `onStartTimeClick` prop, make "Started" text tappable with hover styles |
| `src/components/ClockTab.tsx` | Add start time edit dialog with time-only input, validation for future times |

