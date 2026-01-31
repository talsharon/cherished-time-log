

## Add Gap Detection with "What were you up to?" Cards

### Overview
Detect time gaps between consecutive logs within each day and display placeholder cards asking "What were you up to?" that allow users to quickly fill in missing time periods. These gap cards look similar to regular log cards but without a delete button.

---

### Changes Summary

1. **GapItem.tsx**: New component for rendering gap placeholder cards
2. **LogsTab.tsx**: Add gap detection logic and integrate gap cards
3. **LogDialog.tsx**: Extend to accept pre-populated start/end times for gap mode

---

### Gap Detection Logic

A gap exists when the end time of one log doesn't match the start time of the next log within the same day.

```typescript
interface Gap {
  startTime: Date;  // End of previous log
  endTime: Date;    // Start of next log
  duration: number; // In seconds
}

function detectGaps(dayLogs: Log[], minGapMinutes: number = 1): (Log | Gap)[] {
  const items: (Log | Gap)[] = [];
  
  // Sort by start_time descending (most recent first, matching current order)
  const sorted = [...dayLogs].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    items.push(current);
    
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const currentStart = new Date(current.start_time);
      const nextEnd = new Date(new Date(next.start_time).getTime() + next.duration * 1000);
      
      const gapMs = currentStart.getTime() - nextEnd.getTime();
      const gapMinutes = gapMs / (1000 * 60);
      
      if (gapMinutes >= minGapMinutes) {
        items.push({
          startTime: nextEnd,
          endTime: currentStart,
          duration: Math.floor(gapMs / 1000),
        });
      }
    }
  }
  
  return items;
}
```

---

### File: `src/components/GapItem.tsx` (New File)

A simplified card component for gap placeholders:

```typescript
interface GapItemProps {
  gap: {
    startTime: Date;
    endTime: Date;
    duration: number;
  };
  onClick: () => void;
}
```

**Visual Design:**
- Same card styling as LogItem (rounded-xl, bg-secondary/50, p-4)
- No colored dot (or use a dashed/muted style)
- Title text: "What were you up to?" in muted/italic style
- Time range displayed same as regular logs
- Duration shown same as regular logs
- No delete button
- Slightly different visual treatment (e.g., dashed border or muted background)

```tsx
export function GapItem({ gap, onClick }: GapItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-secondary/30 p-4 text-left transition-colors active:bg-secondary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-dashed border-muted-foreground/50 flex-shrink-0" />
            <span className="font-medium text-muted-foreground italic">
              What were you up to?
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatTimeRange(gap.startTime, gap.endTime)}
          </p>
        </div>
        <span className="font-mono text-lg font-medium text-muted-foreground">
          {formatDuration(gap.duration)}
        </span>
      </div>
    </button>
  );
}
```

---

### File: `src/components/LogDialog.tsx`

**Extend to accept pre-populated times:**

Add optional `initialStartTime` and `initialEndTime` props:

```typescript
interface LogDialogProps {
  mode: 'edit' | 'add';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  log?: Log;
  onUpdate?: (...) => Promise<void>;
  date?: Date;
  onCreate?: (...) => Promise<void>;
  // New: for gap mode
  initialStartTime?: string;  // HH:MM format
  initialEndTime?: string;    // HH:MM format
}
```

**Update initialization logic:**

```typescript
useEffect(() => {
  if (!isOpen) return;
  
  if (mode === 'edit' && log) {
    // ... existing edit mode logic
  } else if (mode === 'add' && date) {
    setTitle('Idle');
    setComment('');
    
    // Use provided times if available, otherwise use defaults
    if (initialStartTime && initialEndTime) {
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
    } else {
      const defaultStart = getDefaultStartTime(date);
      setStartTime(defaultStart);
      setEndTime(getDefaultEndTime(defaultStart));
    }
  }
  
  setTimeError(null);
  setNewTitle('');
}, [isOpen, mode, log, date, initialStartTime, initialEndTime]);
```

---

### File: `src/components/LogsTab.tsx`

**1. Import new component:**
```typescript
import { GapItem } from '@/components/GapItem';
```

**2. Add type guard and gap detection:**
```typescript
interface Gap {
  startTime: Date;
  endTime: Date;
  duration: number;
}

function isGap(item: Log | Gap): item is Gap {
  return 'startTime' in item && item.startTime instanceof Date;
}

function getLogsWithGaps(dayLogs: Log[], minGapMinutes: number = 1): (Log | Gap)[] {
  // Implementation as described above
}
```

**3. Add state for gap times:**
```typescript
const [gapStartTime, setGapStartTime] = useState<string | undefined>(undefined);
const [gapEndTime, setGapEndTime] = useState<string | undefined>(undefined);
```

**4. Add handler for gap click:**
```typescript
const handleGapClick = (gap: Gap) => {
  setSelectedDate(gap.startTime);
  setGapStartTime(formatTimeForInput(gap.startTime));
  setGapEndTime(formatTimeForInput(gap.endTime));
  setDialogMode('add');
};
```

**5. Update close handler to clear gap times:**
```typescript
const handleCloseDialog = () => {
  setDialogMode(null);
  setSelectedLog(null);
  setSelectedDate(null);
  setGapStartTime(undefined);
  setGapEndTime(undefined);
};
```

**6. Update rendering logic:**
```tsx
<div className="space-y-3">
  {getLogsWithGaps(dayLogs).map((item, index) => (
    isGap(item) ? (
      <GapItem
        key={`gap-${item.startTime.getTime()}`}
        gap={item}
        onClick={() => handleGapClick(item)}
      />
    ) : (
      <LogItem
        key={item.id}
        log={item}
        onEdit={handleEditClick}
        onDelete={deleteLog}
      />
    )
  ))}
</div>
```

**7. Pass gap times to dialog:**
```tsx
<LogDialog
  mode={dialogMode === 'edit' ? 'edit' : 'add'}
  isOpen={dialogMode !== null}
  onOpenChange={(open) => !open && handleCloseDialog()}
  log={selectedLog ?? undefined}
  date={selectedDate ?? undefined}
  onUpdate={updateLog}
  onCreate={createLog}
  initialStartTime={gapStartTime}
  initialEndTime={gapEndTime}
/>
```

---

### Visual Comparison

| Aspect | Regular LogItem | GapItem |
|--------|-----------------|---------|
| Background | bg-secondary/50 | bg-secondary/30 |
| Border | none | border-dashed border-muted-foreground/30 |
| Color dot | Solid with title color | Dashed circle, no fill |
| Title | Activity title | "What were you up to?" (italic) |
| Comment | Optional | None |
| Time range | Shown | Shown |
| Duration | Shown | Shown |
| Delete button | Yes | No |

---

### Edge Cases

1. **Minimum gap threshold**: Only show gaps >= 1 minute (configurable)
2. **Overlapping logs**: If logs overlap, don't show a gap
3. **Same-second boundaries**: Treat logs that end exactly when the next starts as continuous

---

### Data Flow

```text
User views Logs page
  -> groupLogsByDate(logs)
  -> For each day: getLogsWithGaps(dayLogs)
  -> Render mixed list of LogItem and GapItem
  
User clicks GapItem
  -> handleGapClick(gap)
  -> Sets date + initialStartTime + initialEndTime
  -> Opens LogDialog in 'add' mode with times pre-filled
  
User saves
  -> onCreate(startTime, duration, title, comment)
  -> Gap disappears as new log fills the time slot
```

