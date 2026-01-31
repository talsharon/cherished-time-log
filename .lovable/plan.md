

## Persist Current Title and Comment to Database

### Overview
Save the currently selected title and comment to the database so that if the user closes or terminates the app, their in-progress activity details are preserved and restored when they return.

---

### Changes Summary

1. **Database Migration**: Add `current_title` and `current_comment` columns to `active_sessions` table
2. **useActiveSession.ts**: Extend to fetch/update the title and comment
3. **ClockTab.tsx**: Initialize from saved values and save changes as user types

---

### Database Migration

Add two new columns to the `active_sessions` table:

```sql
ALTER TABLE public.active_sessions
ADD COLUMN current_title TEXT NOT NULL DEFAULT 'Idle';

ALTER TABLE public.active_sessions
ADD COLUMN current_comment TEXT;
```

---

### File: `src/hooks/useActiveSession.ts`

**1. Update state to include title and comment:**

```typescript
const [startTime, setStartTime] = useState<Date | null>(null);
const [currentTitle, setCurrentTitle] = useState('Idle');
const [currentComment, setCurrentComment] = useState('');
const [loading, setLoading] = useState(true);
```

**2. Update fetchSession to retrieve title and comment:**

```typescript
const { data, error } = await supabase
  .from('active_sessions')
  .select('current_start_time, current_title, current_comment')
  .eq('user_id', user.id)
  .maybeSingle();

if (data) {
  setStartTime(new Date(data.current_start_time));
  setCurrentTitle(data.current_title || 'Idle');
  setCurrentComment(data.current_comment || '');
}
```

**3. Add function to update title:**

```typescript
const updateTitle = useCallback(async (title: string) => {
  setCurrentTitle(title);
  if (!user) return;

  await supabase
    .from('active_sessions')
    .update({ current_title: title })
    .eq('user_id', user.id);
}, [user]);
```

**4. Add function to update comment:**

```typescript
const updateComment = useCallback(async (comment: string) => {
  setCurrentComment(comment);
  if (!user) return;

  await supabase
    .from('active_sessions')
    .update({ current_comment: comment })
    .eq('user_id', user.id);
}, [user]);
```

**5. Update resetSession to clear title and comment:**

```typescript
const resetSession = useCallback(async () => {
  if (!user) return;

  const newStartTime = new Date();
  
  const { error } = await supabase
    .from('active_sessions')
    .update({ 
      current_start_time: newStartTime.toISOString(),
      current_title: 'Idle',
      current_comment: null 
    })
    .eq('user_id', user.id);

  if (error) throw error;

  setStartTime(newStartTime);
  setCurrentTitle('Idle');
  setCurrentComment('');
  return newStartTime;
}, [user]);
```

**6. Update return object:**

```typescript
return { 
  startTime, 
  currentTitle,
  currentComment,
  loading, 
  resetSession, 
  updateTitle,
  updateComment,
  refetch: fetchSession 
};
```

---

### File: `src/components/ClockTab.tsx`

**1. Remove local state for title and comment, use from hook:**

```typescript
// Remove these lines:
// const [selectedTitle, setSelectedTitle] = useState('Idle');
// const [comment, setComment] = useState('');

// Use from hook instead:
const { 
  startTime, 
  currentTitle, 
  currentComment, 
  loading: sessionLoading, 
  resetSession,
  updateTitle,
  updateComment 
} = useActiveSession();
```

**2. Update handleTitleChange:**

```typescript
const handleTitleChange = (value: string) => {
  if (value === CREATE_NEW_VALUE) {
    setIsNewTitleDialogOpen(true);
  } else {
    updateTitle(value);
  }
};
```

**3. Update handleCreateNewTitle:**

```typescript
const handleCreateNewTitle = async () => {
  if (!newTitle.trim()) return;
  await createTitle(newTitle.trim());
  updateTitle(newTitle.trim());
  setNewTitle('');
  setIsNewTitleDialogOpen(false);
};
```

**4. Update comment input:**

```typescript
<Input
  placeholder="Add a comment..."
  value={currentComment}
  onChange={(e) => updateComment(e.target.value)}
  className="h-12"
/>
```

**5. Update Select value:**

```typescript
<Select value={currentTitle} onValueChange={handleTitleChange}>
```

**6. Update handleDone to use hook values:**

```typescript
await createLog(startTime, duration, currentTitle, currentComment || undefined);
// resetSession will automatically clear title and comment
await resetSession();
```

**7. Remove manual reset of title/comment after done (handled by resetSession):**

```typescript
// Remove these lines from handleDone:
// setSelectedTitle('Idle');
// setComment('');
```

---

### Data Flow

```text
User selects title -> updateTitle() -> saves to DB + updates local state
User types comment -> updateComment() -> saves to DB + updates local state
User closes app -> data persists in active_sessions
User reopens app -> fetchSession() -> restores title and comment
User clicks Done -> resetSession() -> clears title/comment in DB
```

---

### Technical Notes

- Updates to the database happen immediately on change (no debouncing for simplicity)
- The `resetSession` function clears both title and comment when logging an activity
- Default title is "Idle" and default comment is null/empty
- Optimistic updates: local state updates immediately, then syncs to database

