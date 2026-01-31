

## Handle Multi-Day Events and Empty Days

### Overview
Address scenarios where activities span multiple days and handle days with no logged activities by showing appropriate gap cards.

---

### Changes Summary

1. **LogItem.tsx**: Update `formatTimeRange` to show "+N" for multi-day events
2. **GapItem.tsx**: Update `formatTimeRange` to show "+N" if gap spans midnight
3. **LogsTab.tsx**: 
   - Modify `getLogsWithGaps` to handle overnight logs from previous day
   - Add logic to detect and display empty days with full-day gap cards

---

### File: `src/components/LogItem.tsx`

**Update `formatTimeRange` function to show day offset:**

```typescript
function formatTimeRange(startTime: string, durationSeconds: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Check if event spans to next day(s)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 0) {
    return `${startStr} - ${endStr} (+${daysDiff})`;
  }
  
  return `${startStr} - ${endStr}`;
}
```

---

### File: `src/components/GapItem.tsx`

**Update `formatTimeRange` to handle cross-midnight gaps:**

```typescript
function formatTimeRange(startTime: Date, endTime: Date): string {
  const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Check if gap spans to next day(s)
  const startDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
  const endDate = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 0) {
    return `${startStr} - ${endStr} (+${daysDiff})`;
  }
  
  return `${startStr} - ${endStr}`;
}
```

---

### File: `src/components/LogsTab.tsx`

#### 1. New Function: Generate All Days Including Empty Ones

```typescript
interface DaySection {
  dateKey: string;
  dateLabel: string;
  logs: Log[];
  isEmptyDay: boolean;
}

function generateDaySections(logs: Log[]): DaySection[] {
  if (logs.length === 0) return [];
  
  const sections: DaySection[] = [];
  const logsByDate = groupLogsByDate(logs);
  
  // Find the date range (earliest log to today)
  const sortedDates = Array.from(logsByDate.keys()).sort();
  const earliestDateKey = sortedDates[0];
  const [ey, em, ed] = earliestDateKey.split('-').map(Number);
  const earliestDate = new Date(ey, em, ed);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Iterate from today backwards to earliest date
  const current = new Date(today);
  
  while (current >= earliestDate) {
    const dateKey = getDateKey(current.toISOString());
    const dayLogs = logsByDate.get(dateKey) || [];
    
    sections.push({
      dateKey,
      dateLabel: getSectionTitle(current.toISOString()),
      logs: dayLogs,
      isEmptyDay: dayLogs.length === 0,
    });
    
    current.setDate(current.getDate() - 1);
  }
  
  return sections;
}
```

#### 2. Updated Gap Detection with Overnight Log Handling

```typescript
function getLogsWithGaps(
  dayLogs: Log[], 
  allLogs: Log[], 
  dateKey: string, 
  minGapMinutes: number = 1
): (Log | Gap)[] {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month, day, 23, 59, 59, 999);
  
  // Find overnight log from previous day extending into this day
  const overnightLog = allLogs.find(log => {
    const logStart = new Date(log.start_time);
    const logEnd = new Date(logStart.getTime() + log.duration * 1000);
    const logDateKey = getDateKey(log.start_time);
    
    return logDateKey !== dateKey && 
           logStart < dayStart && 
           logEnd > dayStart;
  });
  
  // Effective day start (after overnight log ends, if any)
  let effectiveDayStart = dayStart;
  if (overnightLog) {
    const overnightEnd = new Date(
      new Date(overnightLog.start_time).getTime() + overnightLog.duration * 1000
    );
    if (overnightEnd > dayStart) {
      effectiveDayStart = overnightEnd;
    }
  }
  
  // If no logs for this day, return single full-day gap
  if (dayLogs.length === 0) {
    return [{
      startTime: effectiveDayStart,
      endTime: dayEnd,
      duration: Math.floor((dayEnd.getTime() - effectiveDayStart.getTime()) / 1000),
    }];
  }
  
  const items: (Log | Gap)[] = [];
  
  // Sort by start_time descending (most recent first)
  const sorted = [...dayLogs].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  // Process gaps between consecutive logs
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
  
  // Check for gap at the start of day (before first log)
  const earliestLog = sorted[sorted.length - 1];
  const earliestLogStart = new Date(earliestLog.start_time);
  
  const startGapMs = earliestLogStart.getTime() - effectiveDayStart.getTime();
  const startGapMinutes = startGapMs / (1000 * 60);
  
  if (startGapMinutes >= minGapMinutes) {
    items.push({
      startTime: effectiveDayStart,
      endTime: earliestLogStart,
      duration: Math.floor(startGapMs / 1000),
    });
  }
  
  return items;
}
```

#### 3. Updated Rendering Logic

```tsx
export function LogsTab() {
  const { logs, loading, updateLog, deleteLog, createLog } = useLogs();
  // ... existing state
  
  const daySections = useMemo(() => generateDaySections(logs), [logs]);
  
  // ... existing handlers
  
  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      <div className="space-y-6">
        {daySections.map((section) => (
          <div key={section.dateKey}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {section.dateLabel}
              </h3>
              <button
                onClick={() => handleAddClick(new Date(/* parse dateKey */))}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {getLogsWithGaps(section.logs, logs, section.dateKey).map((item) => (
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
          </div>
        ))}
      </div>
      
      <LogDialog ... />
    </div>
  );
}
```

---

### Visual Examples

**Empty Day:**
```
┌─────────────────────────────────────┐
│  Wednesday                      [+] │
├─────────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │ ○  What were you up to?    24h│ │
│  │    00:00 - 23:59               │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
└─────────────────────────────────────┘
```

**Overnight Log Display:**
```
┌─────────────────────────────────────┐
│  Yesterday                      [+] │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ ● Gaming           4h         │  │
│  │   23:00 - 03:00 (+1)          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Today                          [+] │
├─────────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │ ○  What were you up to?    6h │ │
│  │    03:00 - 09:00               │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│  ┌───────────────────────────────┐  │
│  │ ● Work             8h         │  │
│  │   09:00 - 17:00               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### Edge Cases Handled

1. **Multi-day events**: Show "+N" indicator on time display
2. **Empty days**: Show full-day gap card (00:00 - 23:59)
3. **Empty day after overnight log**: Gap starts from overnight log end time, not 00:00
4. **No logs at all**: Show empty state (existing behavior unchanged)
5. **Gaps between consecutive logs**: Existing logic preserved

---

### Technical Notes

- Empty days are only shown between the earliest logged day and today
- The `23:59:59.999` end time ensures we cover the full day without overlapping into the next
- Performance: `generateDaySections` runs once per render, uses memoization
- The overnight log lookup searches all logs but could be optimized with a date index if needed

