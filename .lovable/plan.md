

## Add Start Time and End Time Editing to Log Cards

### Overview
Add the ability to edit the start time and end time for each log entry using the existing edit dialog. The duration will be calculated automatically from the start and end times. Validation will ensure the end time is always after the start time (error only shown when validation fails).

---

### Changes Summary

1. **useLogs.ts**: Extend the `updateLog` function to accept `start_time` and `duration` fields
2. **LogItem.tsx**: Add time input fields to the edit dialog with validation

---

### File: `src/hooks/useLogs.ts`

**Update the `updateLog` function signature (line 65) to accept additional fields:**

```typescript
const updateLog = useCallback(async (id: string, updates: { 
  title?: string; 
  comment?: string;
  start_time?: string;
  duration?: number;
}) => {
  // existing implementation remains the same
}, [user, fetchLogs]);
```

---

### File: `src/components/LogItem.tsx`

**1. Update props interface (line 22):**

```typescript
interface LogItemProps {
  log: Log;
  onUpdate: (id: string, updates: { 
    title?: string; 
    comment?: string;
    start_time?: string;
    duration?: number;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
```

**2. Add helper functions (after formatTimeRange):**

```typescript
function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTimeInput(baseDate: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
```

**3. Add new state variables (after line 55):**

```typescript
const [editStartTime, setEditStartTime] = useState('');
const [editEndTime, setEditEndTime] = useState('');
const [timeError, setTimeError] = useState<string | null>(null);
```

**4. Add useEffect to initialize time values when dialog opens:**

```typescript
useEffect(() => {
  if (isOpen) {
    const start = new Date(log.start_time);
    const end = new Date(start.getTime() + log.duration * 1000);
    setEditStartTime(formatTimeForInput(start));
    setEditEndTime(formatTimeForInput(end));
    setTimeError(null);
  }
}, [isOpen, log.start_time, log.duration]);
```

**5. Update handleSave to include time validation and changes:**

```typescript
const handleSave = async () => {
  // Validate times
  const baseDate = new Date(log.start_time);
  const newStart = parseTimeInput(baseDate, editStartTime);
  const newEnd = parseTimeInput(baseDate, editEndTime);
  
  if (newEnd <= newStart) {
    setTimeError('End time must be after start time');
    return;
  }
  
  setIsSaving(true);
  try {
    if (editTitle !== log.title && !titles.find(t => t.name === editTitle)) {
      await createTitle(editTitle);
    }
    
    const newDuration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
    
    await onUpdate(log.id, {
      title: editTitle,
      comment: editComment || undefined,
      start_time: newStart.toISOString(),
      duration: newDuration,
    });
    setIsOpen(false);
  } catch (error) {
    console.error('Error updating log:', error);
  } finally {
    setIsSaving(false);
  }
};
```

**6. Add time inputs to the dialog (between Title and Comment sections, after line 181):**

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Time</label>
  <div className="flex items-center gap-2">
    <div className="flex-1">
      <Input
        type="time"
        value={editStartTime}
        onChange={(e) => {
          setEditStartTime(e.target.value);
          setTimeError(null);
        }}
        className="h-12"
      />
    </div>
    <span className="text-muted-foreground">to</span>
    <div className="flex-1">
      <Input
        type="time"
        value={editEndTime}
        onChange={(e) => {
          setEditEndTime(e.target.value);
          setTimeError(null);
        }}
        className="h-12"
      />
    </div>
  </div>
  {timeError && (
    <p className="text-sm text-destructive">{timeError}</p>
  )}
</div>
```

**7. Add useEffect import (line 1):**

```typescript
import { useState, useEffect } from 'react';
```

---

### Updated Dialog Layout

```text
+------------------------------------------+
|        Edit Activity                 [X] |
|                                          |
| Title                                    |
| [Select dropdown     v]                  |
| [Or add new title...    ] [Add]          |
|                                          |
| Time                                     |
| [10:00]  to  [11:30]                     |
|                                          |
| Comment                                  |
| [                                    ]   |
| [                                    ]   |
|                                          |
|     [Cancel]          [Save]             |
+------------------------------------------+
```

---

### Validation Rules

1. End time must be strictly greater than start time
2. Error message only displayed when validation fails (no permanent hint label)
3. Save button triggers validation before saving
4. Error clears when user modifies either time input

