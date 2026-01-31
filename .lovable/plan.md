

## Add End Time Display and Delete Functionality to Log Cards

### Overview
Update log cards to show start and end times in format "[start time] - [end time]", and add the ability to delete logs with a trash icon and confirmation dialog.

---

### Changes Summary

1. Add RLS policy to allow users to delete their own logs
2. Add `deleteLog` function to `useLogs` hook
3. Update time display to show time range (start - end)
4. Add trash icon to log cards with delete confirmation dialog
5. Update both LogItem component and ClockTab's last log display

---

### Database Changes

**Add DELETE RLS Policy for logs table:**

```sql
CREATE POLICY "Users can delete their own logs"
ON public.logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

### File: `src/hooks/useLogs.ts`

Add a new `deleteLog` function after `updateLog`:

```typescript
const deleteLog = useCallback(async (id: string) => {
  if (!user) return;

  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting log:', error);
    throw error;
  }

  await fetchLogs();
}, [user, fetchLogs]);
```

Update the return statement to include `deleteLog`.

---

### File: `src/components/LogItem.tsx`

1. **Update imports:**
   - Add `Trash2, Loader2` to lucide-react imports
   - Import AlertDialog components from `@/components/ui/alert-dialog`

2. **Update props interface:**
   - Add `onDelete: (id: string) => Promise<void>`

3. **Replace `formatDate` with `formatTimeRange`:**
   ```typescript
   function formatTimeRange(startTime: string, durationSeconds: number): string {
     const start = new Date(startTime);
     const end = new Date(start.getTime() + durationSeconds * 1000);
     const now = new Date();
     const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
     
     const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
     const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
     
     let dayPrefix = '';
     if (diffDays === 0) {
       dayPrefix = 'Today, ';
     } else if (diffDays === 1) {
       dayPrefix = 'Yesterday, ';
     } else {
       dayPrefix = start.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ';
     }
     
     return `${dayPrefix}${startStr} - ${endStr}`;
   }
   ```

4. **Add state:**
   - `isDeleteDialogOpen` - controls delete confirmation dialog
   - `isDeleting` - loading state for delete action

5. **Add handlers:**
   - `handleDelete` - calls onDelete and closes dialog
   - `handleTrashClick` - uses stopPropagation and opens delete dialog

6. **Update card layout:**
   - Change the right side to include both duration and trash icon
   - Use flex with gap to align them

7. **Add AlertDialog for delete confirmation:**
   - Title: "Delete Activity"
   - Description: "Are you sure you want to delete this activity? This action cannot be undone."
   - Cancel and Delete buttons (Delete uses destructive variant)

---

### File: `src/components/LogsTab.tsx`

- Destructure `deleteLog` from useLogs hook
- Pass `deleteLog` as `onDelete` prop to LogItem components

---

### File: `src/components/ClockTab.tsx`

- Replace `formatDate` function with `formatTimeRange` (same implementation as LogItem)
- Update the last log display to use `formatTimeRange(lastLog.start_time, lastLog.duration)`

---

### UI Layout for Log Card

```text
+----------------------------------------------------+
| (dot) Title                    Duration   [trash]  |
| Comment text (if any)                              |
| Today, 10:00 AM - 11:30 AM                         |
+----------------------------------------------------+
```

---

### Delete Confirmation Dialog

```text
+------------------------------------------+
|        Delete Activity                   |
|                                          |
| Are you sure you want to delete this     |
| activity? This action cannot be undone.  |
|                                          |
|              [Cancel]  [Delete]          |
+------------------------------------------+
```

