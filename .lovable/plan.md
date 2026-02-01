

## Update Previous Log When Editing Session Start Time

### Overview

When the user edits the current session's start time, the system should also update the most recent log entry's duration so that the previous log's end time equals the new start time. This ensures temporal continuity between the last logged activity and the current session.

### How It Works

```text
Current Behavior:
┌──────────────────┐  ┌──────────────────┐
│   Previous Log   │  │ Active Session   │
│ 10:00 - 11:00    │  │ Started: 11:30   │  ← Gap between 11:00 and 11:30
└──────────────────┘  └──────────────────┘

New Behavior (after editing start time to 11:15):
┌──────────────────┐  ┌──────────────────┐
│   Previous Log   │  │ Active Session   │
│ 10:00 - 11:15    │  │ Started: 11:15   │  ← End time adjusted to match
└──────────────────┘  └──────────────────┘
```

### Technical Changes

#### 1. Modify `handleSaveStartTime` in `ClockTab.tsx`

The function needs to:
1. Get the most recent log entry
2. Calculate the new duration for that log based on the new session start time
3. Update the log's duration in the database
4. Update the active session's start time

#### 2. Access `logs` and `updateLog` from `useLogs` hook

The ClockTab already imports `useLogs` but only uses `createLog`. We need to also use `logs` and `updateLog`.

### Implementation Details

**File: `src/components/ClockTab.tsx`**

```typescript
// Current usage (line 58):
const { createLog } = useLogs();

// Updated usage:
const { logs, createLog, updateLog } = useLogs();
```

**Updated `handleSaveStartTime` function:**

```typescript
const handleSaveStartTime = async () => {
  if (!startTime || !editingStartTimeStr) return;
  
  const [hours, minutes] = editingStartTimeStr.split(':').map(Number);
  const newStartTime = new Date(startTime);
  newStartTime.setHours(hours, minutes, 0, 0);
  
  if (newStartTime > new Date()) {
    toast.error('Start time cannot be in the future');
    return;
  }
  
  // Find the most recent log (logs are ordered by start_time descending)
  const lastLog = logs[0];
  
  if (lastLog) {
    const lastLogStart = new Date(lastLog.start_time);
    
    // Only update if the new start time is after the log's start time
    if (newStartTime > lastLogStart) {
      // Calculate new duration: difference between log start and new session start
      const newDuration = Math.floor((newStartTime.getTime() - lastLogStart.getTime()) / 1000);
      
      await updateLog(lastLog.id, { duration: newDuration });
    }
  }
  
  await updateStartTime(newStartTime);
  setIsStartTimeDialogOpen(false);
  toast.success('Start time updated');
};
```

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No previous logs exist | Only update session start time |
| New start time is before the last log's start time | Only update session start time (don't create negative duration) |
| New start time is after the last log's end time | Extend the last log's duration to meet the new start time |
| New start time is before the last log's end time | Shrink the last log's duration |

### Files Modified

| File | Change |
|------|--------|
| `src/components/ClockTab.tsx` | Update `handleSaveStartTime` to also adjust the previous log's duration |

