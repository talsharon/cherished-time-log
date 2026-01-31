

## Consolidate Log Dialog into Single Component with Edit/Add Modes

### Overview
Create a unified `LogDialog` component that handles both editing existing logs and creating new ones. The component will accept a `mode` prop to determine its behavior.

---

### Changes Summary

1. **LogDialog.tsx**: New unified component with `edit` and `add` modes
2. **LogItem.tsx**: Remove inline dialog, use LogDialog component
3. **LogsTab.tsx**: Add plus buttons and use LogDialog for adding entries

---

### File: `src/components/LogDialog.tsx` (New File)

A single dialog component that handles both modes:

```typescript
interface LogDialogProps {
  mode: 'edit' | 'add';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // For edit mode
  log?: Log;
  onUpdate?: (id: string, updates: { title?: string; comment?: string; start_time?: string; duration?: number }) => Promise<void>;
  // For add mode
  date?: Date;
  onCreate?: (startTime: Date, duration: number, title: string, comment?: string) => Promise<void>;
}
```

**Behavior by mode:**

| Aspect | Edit Mode | Add Mode |
|--------|-----------|----------|
| Title | "Edit Activity" | "Add Activity" |
| Initial title | From `log.title` | "Idle" |
| Initial comment | From `log.comment` | Empty |
| Initial times | From `log.start_time` and duration | Smart defaults (see below) |
| Save action | Calls `onUpdate(log.id, {...})` | Calls `onCreate(startTime, duration, title, comment)` |

**Smart default times for Add mode:**
- If date is today: Current time rounded to nearest 5 minutes
- If date is in the past: 09:00
- End time: Start time + 1 hour

---

### File: `src/components/LogItem.tsx`

**Simplify to just the list item display + delete confirmation:**

1. Remove all dialog-related state (editTitle, editComment, editStartTime, editEndTime, etc.)
2. Remove the inline Dialog component (lines 177-281)
3. Keep the button display and delete AlertDialog
4. Accept a new prop for opening the edit dialog

```typescript
interface LogItemProps {
  log: Log;
  onEdit: (log: Log) => void;  // New: opens edit dialog
  onDelete: (id: string) => Promise<void>;
}
```

The component now just renders the log item card and calls `onEdit(log)` when clicked.

---

### File: `src/components/LogsTab.tsx`

**Manage both edit and add dialogs:**

```typescript
// State
const [dialogMode, setDialogMode] = useState<'edit' | 'add' | null>(null);
const [selectedLog, setSelectedLog] = useState<Log | null>(null);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);

// Handlers
const handleEditClick = (log: Log) => {
  setSelectedLog(log);
  setDialogMode('edit');
};

const handleAddClick = (date: Date) => {
  setSelectedDate(date);
  setDialogMode('add');
};

const handleCloseDialog = () => {
  setDialogMode(null);
  setSelectedLog(null);
  setSelectedDate(null);
};
```

**Update section headers:**
```tsx
<div className="flex items-center justify-between mb-3">
  <h3 className="text-sm font-medium text-muted-foreground">
    {getSectionTitle(dayLogs[0].start_time)}
  </h3>
  <button
    onClick={() => handleAddClick(new Date(dayLogs[0].start_time))}
    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
  >
    <Plus className="h-4 w-4" />
  </button>
</div>
```

**Render single LogDialog at end:**
```tsx
<LogDialog
  mode={dialogMode === 'edit' ? 'edit' : 'add'}
  isOpen={dialogMode !== null}
  onOpenChange={(open) => !open && handleCloseDialog()}
  log={selectedLog ?? undefined}
  date={selectedDate ?? undefined}
  onUpdate={updateLog}
  onCreate={createLog}
/>
```

---

### Component Structure

```text
LogsTab
├── Day Section Header (with + button)
│   └── onClick -> handleAddClick(date)
├── LogItem (simplified, display only)
│   ├── onClick -> handleEditClick(log)
│   └── Delete AlertDialog (kept here)
└── LogDialog (single instance, mode-based)
    ├── mode="edit" -> shows log data, calls onUpdate
    └── mode="add" -> shows defaults, calls onCreate
```

---

### LogDialog Internal Logic

```typescript
// Initialize values based on mode
useEffect(() => {
  if (!isOpen) return;
  
  if (mode === 'edit' && log) {
    // Use existing log values
    setTitle(log.title);
    setComment(log.comment || '');
    const start = new Date(log.start_time);
    const end = new Date(start.getTime() + log.duration * 1000);
    setStartTime(formatTimeForInput(start));
    setEndTime(formatTimeForInput(end));
  } else if (mode === 'add' && date) {
    // Use smart defaults
    setTitle('Idle');
    setComment('');
    setStartTime(getDefaultStartTime(date));
    setEndTime(getDefaultEndTime(getDefaultStartTime(date)));
  }
  
  setTimeError(null);
}, [isOpen, mode, log, date]);

// Handle save
const handleSave = async () => {
  // Validate times
  const baseDate = mode === 'edit' ? new Date(log!.start_time) : date!;
  const newStart = parseTimeInput(baseDate, startTime);
  const newEnd = parseTimeInput(baseDate, endTime);
  
  if (newEnd <= newStart) {
    setTimeError('End time must be after start time');
    return;
  }
  
  const duration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
  
  setIsSaving(true);
  try {
    // Create title if new
    if (!titles.find(t => t.name === title)) {
      await createTitle(title);
    }
    
    if (mode === 'edit') {
      await onUpdate!(log!.id, {
        title,
        comment: comment || undefined,
        start_time: newStart.toISOString(),
        duration,
      });
    } else {
      await onCreate!(newStart, duration, title, comment || undefined);
    }
    
    onOpenChange(false);
  } catch (error) {
    console.error('Error saving log:', error);
  } finally {
    setIsSaving(false);
  }
};
```

---

### Helper Functions (shared)

Move to LogDialog or a utils file:

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

function getDefaultStartTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  return '09:00';
}

function getDefaultEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = (hours + 1) % 24;
  return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
```

---

### Benefits of Consolidation

1. **Single source of truth** for dialog UI and validation logic
2. **Easier maintenance** - changes apply to both modes
3. **Consistent UX** - identical form layout for edit and add
4. **Less code duplication** - shared state management and handlers
5. **Simpler LogItem** - just handles display and delete

