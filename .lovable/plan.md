

## Group Logs by Day with Section Headers

### Overview
Split the logs list into sections grouped by day. Each section will have a header showing the date in a user-friendly format: Today, Yesterday, day name (Sunday-Saturday) for dates within the last week, or the exact date in dd/mm/yyyy format for older entries.

---

### Date Label Logic

| Condition | Label Example |
|-----------|---------------|
| Same day as today | Today |
| Previous day | Yesterday |
| Within last 7 days | Sunday, Monday, etc. |
| Older than 7 days | 15/01/2024 |

---

### Changes Summary

1. **LogsTab.tsx**: Add grouping logic and render section headers
2. **LogItem.tsx**: Simplify `formatTimeRange` to only show times (no day prefix)

---

### File: `src/components/LogsTab.tsx`

**Add helper functions:**

```typescript
function getSectionTitle(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.floor((nowStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  
  // Format as dd/mm/yyyy
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLogsByDate(logs: Log[]): Map<string, Log[]> {
  const groups = new Map<string, Log[]>();
  
  for (const log of logs) {
    const key = getDateKey(log.start_time);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(log);
  }
  
  return groups;
}
```

**Update render to show grouped sections:**

```tsx
return (
  <div className="flex-1 overflow-auto px-4 py-4">
    <div className="space-y-6">
      {Array.from(groupLogsByDate(logs).entries()).map(([dateKey, dayLogs]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {getSectionTitle(dayLogs[0].start_time)}
          </h3>
          <div className="space-y-3">
            {dayLogs.map((log) => (
              <LogItem key={log.id} log={log} onUpdate={updateLog} onDelete={deleteLog} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

---

### File: `src/components/LogItem.tsx`

**Simplify `formatTimeRange` to remove day prefix:**

```typescript
function formatTimeRange(startTime: string, durationSeconds: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return `${startStr} - ${endStr}`;
}
```

---

### Visual Result

```text
Today
+----------------------------------------------------+
| (dot) Work                       1h 30m   [trash]  |
| Fixed login bug                                    |
| 10:00 - 11:30                                      |
+----------------------------------------------------+

Yesterday
+----------------------------------------------------+
| (dot) Coding                     2h 15m   [trash]  |
| 14:00 - 16:15                                      |
+----------------------------------------------------+

Sunday
+----------------------------------------------------+
| (dot) Reading                    1h       [trash]  |
| 20:00 - 21:00                                      |
+----------------------------------------------------+

20/01/2026
+----------------------------------------------------+
| (dot) Exercise                   45m      [trash]  |
| 07:00 - 07:45                                      |
+----------------------------------------------------+
```

